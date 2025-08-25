// Crypto Worker Manager - handles communication with the crypto web worker
class CryptoWorkerManager {
    constructor() {
        this.worker = null;
        this.messageId = 0;
        this.pendingMessages = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            this.worker = new Worker('js/workers/crypto-worker.js');
            
            this.worker.addEventListener('message', (event) => {
                this.handleWorkerMessage(event);
            });

            this.worker.addEventListener('error', (error) => {
                console.error('Crypto worker error:', error);
            });

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize crypto worker:', error);
            throw error;
        }
    }

    handleWorkerMessage(event) {
        const { id, type, data, error } = event.data;
        
        if (this.pendingMessages.has(id)) {
            const { resolve, reject } = this.pendingMessages.get(id);
            this.pendingMessages.delete(id);

            if (type === 'SUCCESS') {
                resolve(data);
            } else if (type === 'ERROR') {
                reject(new Error(error));
            }
        }
    }

    async sendMessage(type, data) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            const id = ++this.messageId;
            this.pendingMessages.set(id, { resolve, reject });

            // Set timeout for message
            setTimeout(() => {
                if (this.pendingMessages.has(id)) {
                    this.pendingMessages.delete(id);
                    reject(new Error('Crypto worker timeout'));
                }
            }, 10000); // 10 second timeout

            this.worker.postMessage({ id, type, data });
        });
    }

    async encryptPrivateKey(privateKey, password) {
        return await this.sendMessage('ENCRYPT_PRIVATE_KEY', {
            privateKey: Array.from(privateKey),
            password
        });
    }

    async decryptPrivateKey(encryptedPrivateKey, password, publicKey) {
        const result = await this.sendMessage('DECRYPT_PRIVATE_KEY', {
            encryptedPrivateKey,
            password,
            publicKey
        });
        return result ? new Uint8Array(result) : null;
    }

    async createKeyPair(password) {
        const result = await this.sendMessage('CREATE_KEY_PAIR', { password });
        if (result && result.unencryptedPrivateKey) {
            result.unencryptedPrivateKey = new Uint8Array(result.unencryptedPrivateKey);
        }
        return result;
    }

    async createKeyPairFromSK(privateKey, password) {
        const result = await this.sendMessage('CREATE_KEY_PAIR_FROM_SK', {
            privateKey,
            password
        });
        if (result && result.unencryptedPrivateKey) {
            result.unencryptedPrivateKey = new Uint8Array(result.unencryptedPrivateKey);
        }
        return result;
    }

    async signTransaction(transaction, privateKey, publicKey, nonce) {
        return await this.sendMessage('SIGN_TRANSACTION', {
            transaction,
            privateKey: Array.from(privateKey),
            publicKey,
            nonce
        });
    }

    async signMessage(message, privateKey) {
        return await this.sendMessage('SIGN_MESSAGE', {
            message,
            privateKey: Array.from(privateKey)
        });
    }

    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
            this.pendingMessages.clear();
        }
    }
}

// Global crypto worker manager instance
let cryptoWorkerManager = null;

// Initialize the crypto worker manager
async function initializeCryptoWorker() {
    if (!cryptoWorkerManager) {
        cryptoWorkerManager = new CryptoWorkerManager();
        try {
            await cryptoWorkerManager.initialize();
            console.log('Crypto worker initialized successfully');
        } catch (error) {
            console.error('Failed to initialize crypto worker:', error);
            // Fallback to main thread if worker fails
            cryptoWorkerManager = null;
        }
    }
    return cryptoWorkerManager;
}

// Enhanced crypto functions that use workers when available
async function encryptPrivateKeyAsync(privateKey, password) {
    const manager = await initializeCryptoWorker();
    if (manager) {
        return await manager.encryptPrivateKey(privateKey, password);
    } else {
        // Fallback to original implementation
        return encryptPrivateKey(privateKey, password);
    }
}

async function decryptPrivateKeyAsync(encryptedPrivateKey, password, publicKey) {
    const manager = await initializeCryptoWorker();
    if (manager) {
        return await manager.decryptPrivateKey(encryptedPrivateKey, password, publicKey);
    } else {
        // Fallback to original implementation
        return decryptPrivateKey(encryptedPrivateKey, password, publicKey);
    }
}

async function createKeyPairAsync(password) {
    const manager = await initializeCryptoWorker();
    if (manager) {
        return await manager.createKeyPair(password);
    } else {
        // Fallback to original implementation
        return createKeyPair(password);
    }
}

async function createKeyPairFromSKAsync(privateKey, password) {
    const manager = await initializeCryptoWorker();
    if (manager) {
        return await manager.createKeyPairFromSK(privateKey, password);
    } else {
        // Fallback to original implementation
        return createKeyPairFromSK(privateKey, password);
    }
}

async function signTransactionAsync(transaction, privateKey, publicKey, nonce) {
    const manager = await initializeCryptoWorker();
    if (manager) {
        return await manager.signTransaction(transaction, privateKey, publicKey, nonce);
    } else {
        // Fallback to original implementation
        transaction.payload.nonce = nonce;
        transaction.payload.sender = publicKey;
        return signTransaction(transaction, privateKey);
    }
}