let pyodide = null;
        
async function initPyodide(){
    try{
    pyodide = await loadPyodide();
    await pyodide.loadPackage("micropip");
    await pyodide.runPythonAsync(`
        import micropip
        await micropip.install('pyflakes')
    `);
    try {
        await pyodide.runPythonAsync(`
        import micropip
        await micropip.install("/python3-dist/xian_contracting_linter-0.1.0-py3-none-any.whl")
        `);
        
        // Test import to ensure package is properly installed
        await pyodide.runPythonAsync(`
from xian_contracting_linter import lintCode
`);
    } catch (error) {
        console.error('Package installation error:', error);
        throw new Error('Failed to load the linter package: ' + error.message);
    }
    } catch (error) {
    console.error('Initialization error:', error);
    }
}

initPyodide();

async function lintCode(code){
    
    try{
        const result = await pyodide.runPythonAsync(`
from xian_contracting_linter import lintCode
lintCode("""${code}""")
`);   
        let lintinfo = result.toJs();
        lintinfo = lintinfo.get('stdout') + lintinfo.get('stderr');
        console.log(lintinfo);
        return parseLintOutput(lintinfo);
        
    } catch (error) {
        console.error('Error linting code:', error.message);
        return [];
    }
}

async function pythonLinter(text, options, cm) {
    try {
        const errors = await lintCode(text);
        console.log(errors);
        let lintErrors = errors.map(error => ({
            message: error.message,
            severity: error.severity,
            from: CodeMirror.Pos(error.line, error.col),
            to: CodeMirror.Pos(error.line, error.col)
        }));
        return lintErrors;
    } catch (error) {
        console.error('Error in pythonLinter:', error.message);
        return [];
    }
}

CodeMirror.registerHelper("lint", "python", pythonLinter);