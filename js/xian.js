var RPC = localStorage.getItem("rpc") || "https://testnet.xian.org";
var CHAIN_ID = localStorage.getItem("chain_id") || "xian-testnet-2";

function toHexString(byteArray) {
    return Array.from(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}

function fromHexString(hexString) {
    return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

function encryptPrivateKey(privateKey, password) {
    // Convert password to a hash and ensure it's the correct size for a key
    let hash = nacl.hash(fromHexString(password));
    let key = hash.slice(0, 32); // Assuming nacl.hash returns a Uint8Array, adjust to 32 bytes for the key
    let nonce = nacl.randomBytes(24);
    let encryptedPrivateKey = nacl.secretbox(privateKey, nonce, key);
    return toHexString(nonce) + toHexString(encryptedPrivateKey);
}

function decryptPrivateKey(encryptedPrivateKey, password, publicKey) {
    let hash = nacl.hash(fromHexString(password));
    let key = hash.slice(0, 32); // Key for secretbox must be 32 bytes
    let nonce = fromHexString(encryptedPrivateKey.slice(0, 48));
    let message = fromHexString(encryptedPrivateKey.slice(48));
    let decrypted = nacl.secretbox.open(message, nonce, key);
    
    if (decrypted) {
        decrypted = fromHexString(toHexString(decrypted).slice(0, 64)); // Ensure the private key is the correct size
        let keyPair = nacl.sign.keyPair.fromSeed(decrypted)
        if (toHexString(keyPair.publicKey) === publicKey) {
            return decrypted; // Correct password and private key size
        }
    }
    return null; // Incorrect password or private key size
}

function createKeyPair(password) {
    let keyPair = nacl.sign.keyPair()
    let _unencryptedPrivateKey = keyPair.secretKey;
    let encryptedPrivateKey = encryptPrivateKey(_unencryptedPrivateKey, password);
    return {
        publicKey: toHexString(keyPair.publicKey),
        encryptedPrivateKey: encryptedPrivateKey,
        unencryptedPrivateKey: _unencryptedPrivateKey
    };
}

function createKeyPairFromSK(privateKey, password) {
    let _unencryptedPrivateKey = fromHexString(privateKey);
    let encryptedPrivateKey = encryptPrivateKey(_unencryptedPrivateKey, password);
    let keyPair = nacl.sign.keyPair.fromSeed(_unencryptedPrivateKey);
    return {
        publicKey: toHexString(keyPair.publicKey),
        encryptedPrivateKey: encryptedPrivateKey,
        unencryptedPrivateKey: _unencryptedPrivateKey
    };
}

function getNonce() {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", RPC + '/abci_query?path="/get_next_nonce/'+readSecureCookie('publicKey')+'"', false);
    xhr.send();
    let response = JSON.parse(xhr.responseText);
    if (response.result.response.value === "AA==") {
        return 0;
    }
    return parseInt(atob(response.result.response.value), 10);
}

function signTransaction(transaction, privateKey) {
    transaction.payload.nonce = getNonce();
    transaction.payload.sender = readSecureCookie("publicKey");

    let serializedTransaction = JSON.stringify(transaction.payload);
    let transactionUint8Array = new TextEncoder().encode(serializedTransaction);

    let combinedKey = new Uint8Array(64);
    combinedKey.set(privateKey);
    combinedKey.set(fromHexString(transaction.payload.sender), 32);


    // Use nacl.sign.detached to get the signature
    let signatureUint8Array = nacl.sign.detached(
      transactionUint8Array,
      combinedKey
    );

    // Convert the signature into a hex string
    transaction.metadata.signature = toHexString(signatureUint8Array);

    return transaction;
}

function broadcastTransaction(signedTransaction) {
    // Broadcast the transaction as hex
    signedTransaction = toHexString(new TextEncoder().encode(JSON.stringify(signedTransaction)));

    let xhr = new XMLHttpRequest();
    xhr.open("POST", RPC + '/broadcast_tx_commit?tx="' + signedTransaction + '"', false);
    xhr.send();
    
    let response = JSON.parse(xhr.responseText);
    return response;
    
}

function getVariable(contract, variable, key){
    let xhr = new XMLHttpRequest();
    xhr.open("POST", RPC + '/abci_query?path="/get/'+contract+'.'+variable+':'+key+'"', false);
    xhr.send();
    let response = JSON.parse(xhr.responseText);
    if (response.result.response.value === "AA==") {
        return null;
    }
    let decoded = atob(response.result.response.value);
    return decoded;
}