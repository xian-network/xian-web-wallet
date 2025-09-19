// Pyodide Web Worker to prevent main thread blocking
let pyodide;
let isInitialized = false;
let initializationPromise = null;

// Initialize Pyodide in the worker
async function initializePyodide() {
    if (initializationPromise) {
        return initializationPromise;
    }
    
    initializationPromise = (async () => {
        try {
            // Import Pyodide
            importScripts('../providers/pyodide-0.25.1/pyodide.js');
            
            // Load Pyodide
            pyodide = await loadPyodide({
                indexURL: '../providers/pyodide-0.25.1/'
            });
            
            // Load required packages
            await pyodide.loadPackage(['micropip', 'pyflakes']);
            
            // Install custom linter package
            await pyodide.runPythonAsync(`
                import micropip
                await micropip.install(['/python3-dist/xian_contracting_linter-0.2.15-py3-none-any.whl'])
            `);
            
            isInitialized = true;
            return true;
        } catch (error) {
            console.error('Pyodide initialization error:', error);
            throw error;
        }
    })();
    
    return initializationPromise;
}

// Handle messages from main thread
self.addEventListener('message', async (event) => {
    const { id, type, data } = event.data;
    
    try {
        switch (type) {
            case 'INIT':
                await initializePyodide();
                self.postMessage({ id, type: 'INIT_COMPLETE', success: true });
                break;
                
            case 'LINT_CODE':
                if (!isInitialized) {
                    await initializePyodide();
                }
                
                const result = await pyodide.runPythonAsync(`
from xian_contracting_linter import lint_code
lint_code("""${data.code}""")
                `);
                
                const lintInfo = result.toJs();
                self.postMessage({ 
                    id, 
                    type: 'LINT_COMPLETE', 
                    success: true, 
                    data: lintInfo 
                });
                break;
                
            case 'RUN_PYTHON':
                if (!isInitialized) {
                    await initializePyodide();
                }
                
                const pythonResult = await pyodide.runPythonAsync(data.code);
                self.postMessage({ 
                    id, 
                    type: 'PYTHON_COMPLETE', 
                    success: true, 
                    data: pythonResult 
                });
                break;
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({ 
            id, 
            type: 'ERROR', 
            success: false, 
            error: error.message 
        });
    }
});

// Start initialization immediately
initializePyodide().catch(error => {
    console.error('Failed to initialize Pyodide worker:', error);
});