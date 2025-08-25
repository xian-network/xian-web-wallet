// Pyodide Worker Manager - handles communication with the Pyodide web worker
class PyodideWorkerManager {
    constructor() {
        this.worker = null;
        this.messageId = 0;
        this.pendingMessages = new Map();
        this.isInitialized = false;
        this.initializationPromise = null;
    }

    async initialize() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = new Promise((resolve, reject) => {
            try {
                this.worker = new Worker('js/workers/pyodide-worker.js');
                
                this.worker.addEventListener('message', (event) => {
                    this.handleWorkerMessage(event);
                });

                this.worker.addEventListener('error', (error) => {
                    console.error('Pyodide worker error:', error);
                    reject(error);
                });

                // Send initialization message
                this.sendMessage('INIT', {}).then(() => {
                    this.isInitialized = true;
                    resolve();
                }).catch(reject);

            } catch (error) {
                reject(error);
            }
        });

        return this.initializationPromise;
    }

    handleWorkerMessage(event) {
        const { id, type, success, data, error } = event.data;
        
        if (this.pendingMessages.has(id)) {
            const { resolve, reject } = this.pendingMessages.get(id);
            this.pendingMessages.delete(id);

            if (success) {
                resolve(data);
            } else {
                reject(new Error(error));
            }
        }
    }

    async sendMessage(type, data) {
        if (!this.worker) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            const id = ++this.messageId;
            this.pendingMessages.set(id, { resolve, reject });

            // Set timeout for message
            setTimeout(() => {
                if (this.pendingMessages.has(id)) {
                    this.pendingMessages.delete(id);
                    reject(new Error('Worker message timeout'));
                }
            }, 30000); // 30 second timeout

            this.worker.postMessage({ id, type, data });
        });
    }

    async lintCode(code) {
        try {
            return await this.sendMessage('LINT_CODE', { code });
        } catch (error) {
            console.error('Error linting code:', error);
            return [];
        }
    }

    async runPython(code) {
        try {
            return await this.sendMessage('RUN_PYTHON', { code });
        } catch (error) {
            console.error('Error running Python code:', error);
            throw error;
        }
    }

    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.isInitialized = false;
            this.initializationPromise = null;
            this.pendingMessages.clear();
        }
    }
}

// Global instance
let pyodideWorkerManager = null;

// Initialize the worker manager
async function initializePyodideWorker() {
    if (!pyodideWorkerManager) {
        pyodideWorkerManager = new PyodideWorkerManager();
        try {
            await pyodideWorkerManager.initialize();
            console.log('Pyodide worker initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Pyodide worker:', error);
            // Fallback to main thread if worker fails
            pyodideWorkerManager = null;
        }
    }
    return pyodideWorkerManager;
}

// Wrapper functions for backward compatibility
async function lintCode(code) {
    const manager = await initializePyodideWorker();
    if (manager) {
        return await manager.lintCode(code);
    } else {
        // Fallback to original implementation if worker fails
        console.warn('Using fallback linting on main thread');
        return await fallbackLintCode(code);
    }
}

// Fallback function for when worker is not available
async function fallbackLintCode(code) {
    try {
        // This would use the original pyodide implementation
        if (typeof pyodide !== 'undefined' && pyodide) {
            const result = await pyodide.runPythonAsync(`
from xian_contracting_linter import lint_code
lint_code("""${code}""")
            `);
            return result.toJs();
        }
        return [];
    } catch (error) {
        console.error('Fallback linting error:', error);
        return [];
    }
}