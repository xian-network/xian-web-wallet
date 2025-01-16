let pyodide;
        
async function setUpLinter(){
    try{
        pyodide = await loadPyodide();
        await pyodide.loadPackage(['micropip', 'pyflakes']);
        await pyodide.runPythonAsync(`
            import micropip
            await micropip.install(['/python3-dist/xian_contracting_linter-0.2.14-py3-none-any.whl'])
        `);
    
    } catch (error) {
        console.error('Initialization error:', error);
    }
}

setUpLinter();
