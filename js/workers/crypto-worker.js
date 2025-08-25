// Crypto Web Worker to prevent main thread blocking during cryptographic operations
importScripts('../providers/nacl.js');

// Helper functions
function toHexString(byteArray) {
    return Array.from(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}

function fromHexString(hexString) {
    return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

// Cryptographic operations
const cryptoOperations = {
    encryptPrivateKey: (privateKey, password) => {
        let passwordBytes = new TextEncoder().encode(password);
        let hash = nacl.hash(passwordBytes);
        let key = hash.slice(0, 32);
        let nonce = nacl.randomBytes(24);
        let encryptedPrivateKey = nacl.secretbox(privateKey, nonce, key);
        return toHexString(nonce) + toHexString(encryptedPrivateKey);
    },

    decryptPrivateKey: (encryptedPrivateKey, password, publicKey) => {
        // First, try case-sensitive decryption
        let passwordBytes = new TextEncoder().encode(password);
        let hash = nacl.hash(passwordBytes);
        let key = hash.slice(0, 32);
        let nonce = fromHexString(encryptedPrivateKey.slice(0, 48));
        let message = fromHexString(encryptedPrivateKey.slice(48));
        let decrypted = nacl.secretbox.open(message, nonce, key);
        
        // If case-sensitive decryption fails, fall back to the old case-insensitive method
        if (!decrypted) {
            let oldHash = nacl.hash(fromHexString(password));
            let oldKey = oldHash.slice(0, 32);
            decrypted = nacl.secretbox.open(message, nonce, oldKey);
        }

        // Proceed if decryption was successful
        if (decrypted) {
            decrypted = fromHexString(toHexString(decrypted).slice(0, 64));
            let keyPair = nacl.sign.keyPair.fromSeed(decrypted);
            if (toHexString(keyPair.publicKey) === publicKey) {
                return decrypted;
            }
        }

        return null;
    },

    createKeyPair: (password) => {
        let keyPair = nacl.sign.keyPair();
        let _unencryptedPrivateKey = keyPair.secretKey;
        let encryptedPrivateKey = cryptoOperations.encryptPrivateKey(_unencryptedPrivateKey, password);
        return {
            publicKey: toHexString(keyPair.publicKey),
            encryptedPrivateKey: encryptedPrivateKey,
            unencryptedPrivateKey: _unencryptedPrivateKey
        };
    },

    createKeyPairFromSK: (privateKey, password) => {
        let _unencryptedPrivateKey = fromHexString(privateKey);
        let encryptedPrivateKey = cryptoOperations.encryptPrivateKey(_unencryptedPrivateKey, password);
        let keyPair = nacl.sign.keyPair.fromSeed(_unencryptedPrivateKey);
        return {
            publicKey: toHexString(keyPair.publicKey),
            encryptedPrivateKey: encryptedPrivateKey,
            unencryptedPrivateKey: _unencryptedPrivateKey
        };
    },

    signTransaction: (transaction, privateKey, publicKey, nonce) => {
        transaction.payload.nonce = nonce;
        transaction.payload.sender = publicKey;

        // Sort the keys in payload (for deterministic signature generation)
        let orderedPayload = {};
        Object.keys(transaction.payload).sort().forEach(function(key) {
            orderedPayload[key] = transaction.payload[key];
        });

        let serializedTransaction = JSON.stringify(orderedPayload);
        let transactionUint8Array = new TextEncoder().encode(serializedTransaction);

        let combinedKey = new Uint8Array(64);
        combinedKey.set(privateKey);
        combinedKey.set(fromHexString(publicKey), 32);

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
    },

    signMessage: (message, privateKey) => {
        let messageUint8Array = new TextEncoder().encode(message);
        let signatureUint8Array = nacl.sign.detached(messageUint8Array, privateKey);
        return toHexString(signatureUint8Array);
    }
};

// Handle messages from main thread
self.addEventListener('message', async (event) => {
    const { id, type, data } = event.data;
    
    try {
        let result;
        
        switch (type) {
            case 'ENCRYPT_PRIVATE_KEY':
                result = cryptoOperations.encryptPrivateKey(
                    new Uint8Array(data.privateKey), 
                    data.password
                );
                break;
                
            case 'DECRYPT_PRIVATE_KEY':
                result = cryptoOperations.decryptPrivateKey(
                    data.encryptedPrivateKey, 
                    data.password, 
                    data.publicKey
                );
                break;
                
            case 'CREATE_KEY_PAIR':
                result = cryptoOperations.createKeyPair(data.password);
                // Convert Uint8Array to regular array for transfer
                result.unencryptedPrivateKey = Array.from(result.unencryptedPrivateKey);
                break;
                
            case 'CREATE_KEY_PAIR_FROM_SK':
                result = cryptoOperations.createKeyPairFromSK(
                    data.privateKey, 
                    data.password
                );
                result.unencryptedPrivateKey = Array.from(result.unencryptedPrivateKey);
                break;
                
            case 'SIGN_TRANSACTION':
                result = cryptoOperations.signTransaction(
                    data.transaction,
                    new Uint8Array(data.privateKey),
                    data.publicKey,
                    data.nonce
                );
                break;
                
            case 'SIGN_MESSAGE':
                result = cryptoOperations.signMessage(
                    data.message,
                    new Uint8Array(data.privateKey)
                );
                break;
                
            default:
                throw new Error(`Unknown operation: ${type}`);
        }
        
        self.postMessage({ 
            id, 
            type: 'SUCCESS', 
            data: result 
        });
        
    } catch (error) {
        self.postMessage({ 
            id, 
            type: 'ERROR', 
            error: error.message 
        });
    }
});