var RPC = localStorage.getItem("rpc") || "https://testnet.xian.org";
var CHAIN_ID = localStorage.getItem("chain_id") || "xian-testnet-1";

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
    Promise.all([readSecureCookie("publicKey")]).then((values) => {
      let xhr = new XMLHttpRequest();
      xhr.open("POST", RPC + '/abci_query?path="/get_next_nonce/'+values[0]+'"', false);
      xhr.send();
      let response = JSON.parse(xhr.responseText);
      if (response.result.response.value === "AA==") {
          return 0;
      }
      return parseInt(atob(response.result.response.value), 10);
    });
}

function signTransaction(transaction, privateKey) {
    Promise.all([readSecureCookie("publicKey")]).then((values) => {
    transaction.payload.nonce = getNonce();
    transaction.payload.sender = values[0];

    // sort the keys in payload (for deterministic signature generation)
    let orderedPayload = {};
    Object.keys(transaction.payload).sort().forEach(function(key) {
        orderedPayload[key] = transaction.payload[key];
    });

    let serializedTransaction = JSON.stringify(orderedPayload);
    let transactionUint8Array = new TextEncoder().encode(serializedTransaction);

    let combinedKey = new Uint8Array(64);
    combinedKey.set(privateKey);
    combinedKey.set(fromHexString(transaction.payload.sender), 32);


    // Use nacl.sign.detached to get the signature
    let signatureUint8Array = nacl.sign.detached(
      transactionUint8Array,
      combinedKey
    );
    
    // Add the ordered payload to the transaction
    transaction.payload = orderedPayload;

    // Convert the signature into a hex string
    transaction.metadata.signature = toHexString(signatureUint8Array);

    return transaction;
});
}

function broadcastTransaction(signedTransaction) {
    // Broadcast the transaction as hex
    signedTransaction = toHexString(new TextEncoder().encode(JSON.stringify(signedTransaction)));

    let xhr = new XMLHttpRequest();
    xhr.open("POST", RPC + '/broadcast_tx_sync?tx="' + signedTransaction + '"', false);
    xhr.send();
    
    let response = JSON.parse(xhr.responseText);
    return response;
    
}

function getContractFunctions(contract) {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", RPC + '/abci_query?path="/contract_methods/' + contract + '"', false);
    xhr.send();
  let response = JSON.parse(xhr.responseText);
    if (response.result.response.value === "AA==" || response.result.response.value === null) {
        return null;
    }
  
    let decoded = atob(response.result.response.value);
    return JSON.parse(decoded);
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

function ping() {
  try {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", RPC + '/status', false);
    xhr.send();
    return true;
  }
  catch(e){
    return false;
  }
}

function getTokenInfo(contract) {
  let tokenInfo = { contract: contract };

  if (contract === "currency") {
    tokenInfo["name"] = "Xian";
    tokenInfo["symbol"] = "Xian";
    return tokenInfo;
  }

  let request = new XMLHttpRequest();
  request.open(
    "GET",
    RPC + '/abci_query?path="/get/' + contract + '.metadata:token_name"',
    false
  );
  request.send();
  if (request.status === 200) {
    let response = JSON.parse(request.responseText);
    if (response.result.response.value === "AA==") {
      tokenInfo["name"] = null;
    } else {
      let tokenName = atob(response.result.response.value);
      tokenInfo["name"] = tokenName;
    }
  }

  request = new XMLHttpRequest();
  request.open(
    "GET",
    RPC + '/abci_query?path="/get/' + contract + '.metadata:token_symbol"',
    false
  );
  request.send();
  if (request.status === 200) {
    let response = JSON.parse(request.responseText);
    if (response.result.response.value === "AA==") {
      tokenInfo["symbol"] = null;
    } else {
      let tokenSymbol = atob(response.result.response.value);
      tokenInfo["symbol"] = tokenSymbol;
    }
  }
  return tokenInfo;
}

function getStampRate() {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", RPC + '/abci_query?path="/get/stamp_cost.S:value"', false);
    xhr.send();
    let response = JSON.parse(xhr.responseText);
    if (response.result.response.value === "AA==") {
        return null;
    }
    return parseInt(atob(response.result.response.value), 10);
}
