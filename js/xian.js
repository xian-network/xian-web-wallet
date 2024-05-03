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
  return Promise.all([readSecureCookie("publicKey")]).then((values) => {
      return new Promise((resolve, reject) => {
          let xhr = new XMLHttpRequest();
          xhr.open("POST", RPC + '/abci_query?path="/get_next_nonce/'+values[0]+'"', true); // Should be true for asynchronous
          xhr.onload = function() {
              if (xhr.status >= 200 && xhr.status < 300) {
                  let response = JSON.parse(xhr.responseText);
                  if (response.result.response.value === "AA==") {
                      resolve(0);
                  } else {
                      resolve(parseInt(atob(response.result.response.value), 10));
                  }
              } else {
                  reject("Failed to fetch nonce: HTTP status " + xhr.status);
              }
          };
          xhr.onerror = function() {
              reject("Network error");
          };
          xhr.send();
      });
  });
}


function signTransaction(transaction, privateKey) {
    return Promise.all([readSecureCookie("publicKey"), getNonce()]).then((values) => {
      transaction.payload.nonce = values[1];
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
    signedTransaction = signedTransaction[0];
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

function getContractCode(contract) {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", RPC + '/abci_query?path="/contract/' + contract + '"', false);
    xhr.send();
    let response = JSON.parse(xhr.responseText);
    if (response.result.response.value === "AA==") {
        return null;
    }
    let decoded = atob(response.result.response.value);
    return decoded;
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

async function ping() {
  try {
    const response = await fetch(RPC + '/status');
    return response.ok;
  } catch {
    return false;
  }
}

async function getTokenInfo(contract) {
  let tokenInfo = { contract: contract };

  if (contract === "currency") {
      tokenInfo["name"] = "Xian";
      tokenInfo["symbol"] = "Xian";
      return tokenInfo;
  }

  try {
      const nameResponse = await fetch(RPC + '/abci_query?path="/get/' + contract + '.metadata:token_name"');
      if (nameResponse.status === 200) {
          const nameData = await nameResponse.json();
          if (nameData.result.response.value === "AA==") {
              tokenInfo["name"] = null;
          } else {
              let tokenName = atob(nameData.result.response.value);
              tokenInfo["name"] = tokenName;
          }
      }

      const symbolResponse = await fetch(RPC + '/abci_query?path="/get/' + contract + '.metadata:token_symbol"');
      if (symbolResponse.status === 200) {
          const symbolData = await symbolResponse.json();
          if (symbolData.result.response.value === "AA==") {
              tokenInfo["symbol"] = null;
          } else {
              let tokenSymbol = atob(symbolData.result.response.value);
              tokenInfo["symbol"] = tokenSymbol;
          }
      }

      return tokenInfo;
  } catch (error) {
      console.error("Error retrieving token info:", error);
      return tokenInfo;
  }
}

async function getStampRate() {
  try {
      const response = await fetch(RPC + '/abci_query?path="/get/stamp_cost.S:value"');
      const data = await response.json();
      if (data.result.response.value === "AA==") {
          return null;
      }
      return parseInt(atob(data.result.response.value), 10);
  } catch (error) {
      console.error("Error fetching stamp rate:", error);
      return null;
  }
}