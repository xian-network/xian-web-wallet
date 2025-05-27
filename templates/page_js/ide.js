var code_storage = JSON.parse(localStorage.getItem('code_storage')) || { "contract": "@construct\ndef seed():\n    pass\n\n@export\ndef test():\n    return 'Hello, World!'" };
var current_tab = Object.keys(code_storage)[0];

function saveCode() {
    code_storage[current_tab] = editor.getValue();
    localStorage.setItem('code_storage', JSON.stringify(code_storage));
}

function addTab(tab_name, code = '') {
    code_storage[tab_name] = code;
    localStorage.setItem('code_storage', JSON.stringify(code_storage));
}

function removeTab(tab_name) {
    let old_code_storage = code_storage;
    code_storage = {};
    Object.keys(old_code_storage).forEach((tab) => {
        if (tab !== tab_name) {
            console.log(tab, tab_name);
            code_storage[tab] = old_code_storage[tab];
            console.log('Adding tab:', tab);
        }
    }
    );

    localStorage.setItem('code_storage', JSON.stringify(code_storage));
}

function changeTab(tab_name) {
    current_tab = tab_name;
    editor.setValue(code_storage[current_tab]);
    if (current_tab.endsWith('(Read-Only)')) {
        editor.setOption('readOnly', true);
        editor.setOption('lint', false);
        document.getElementById('submission-form').style.display = 'none';
        buildFunctionBoxes();
        document.getElementById('function-boxes').style.display = 'flex';
    }
    else if (current_tab.startsWith('test_')) {
        editor.setOption('readOnly', false);
        editor.setOption('lint', false); // Disable linting for test files
        document.getElementById('submission-form').style.display = 'block';
        document.getElementById('function-boxes').style.display = 'none';
    }
    else {
        editor.setOption('readOnly', false);
        editor.setOption('lint', true);
        document.getElementById('submission-form').style.display = 'block';
        document.getElementById('function-boxes').style.display = 'none';
    }
    refreshTabList();
}

function addNewTab() {
    let dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
        dropdown.remove();
    }

    let tab_name = prompt('Enter new file name:');
    if (tab_name === null) {
        return;
    }

    if (Object.keys(code_storage).includes(tab_name)) {
        alert('File already exists!');
        return;
    }

    if (tab_name.trim() === '') {
        alert('File name cannot be empty!');
        return;
    }

    addTab(tab_name);
    changeTab(tab_name);
    refreshTabList();
}

function addNewTokenTab() {
    let dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
        dropdown.remove();
    }

    let tab_name = prompt('Enter new file name:');
    if (tab_name === null) {
        return;
    }

    if (Object.keys(code_storage).includes(tab_name)) {
        alert('File already exists!');
        return;
    }

    if (tab_name.trim() === '') {
        alert('File name cannot be empty!');
        return;
    }

    fetch('https://raw.githubusercontent.com/xian-network/xian-standard-contracts/refs/heads/main/XSC001_standard_token/XSC0001.py').then((response) => {
        if (!response.ok) {
            alert('Error loading token contract!');
            return;
        }
        response.text().then((response) => {
            addTab(tab_name, response);
            changeTab(tab_name);
            refreshTabList();
        }).catch((error) => {
            console.error('Error loading token contract:', error.message);
            alert('Error loading token contract!');
        });
    });
}

function addNewTestTab() {
    let dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
        dropdown.remove();
    }

    let tab_name = prompt('Enter test file name (should start with "test_"):');
    if (tab_name === null) {
        return;
    }

    if (!tab_name.startsWith('test_')) {
        tab_name = 'test_' + tab_name;
    }

    if (Object.keys(code_storage).includes(tab_name)) {
        alert('File already exists!');
        return;
    }

    if (tab_name.trim() === '') {
        alert('File name cannot be empty!');
        return;
    }

    // Template for a test file
    const testTemplate = `import unittest
from contracting.client import ContractingClient

class SimpleTest(unittest.TestCase):
    def setUp(self):
        # Create a new client
        self.client = ContractingClient()
        
        # Get the currency contract
        self.currency = self.client.get_contract('currency')
        
        # Get the submission contract
        self.submission = self.client.get_contract('submission')
    
    def test_example(self):
        """Simple test example"""
        # This is a basic test that always passes
        self.assertEqual(1, 1)
        
        # Test currency balance
        self.assertEqual(self.currency.balance_of(account='sys'), 1_000_000)
        
        # Test currency transfer
        self.currency.transfer(amount=100, to='user1', signer='sys')
        self.assertEqual(self.currency.balance_of(account='user1'), 100)
        
        # Test your submission contract
        # Example:
        # result = self.submission.some_method(param1='value1', signer='user1')
        # self.assertEqual(result, expected_value)

if __name__ == '__main__':
    unittest.main()
`;

    addTab(tab_name, testTemplate);
    changeTab(tab_name);
    refreshTabList();
}

function loadSampleTestFile() {
    let dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
        dropdown.remove();
    }

    // Load the sample test code
    fetch('templates/page_js/sample_test.js')
        .then(response => response.text())
        .then(text => {
            // Extract the sample test code from the file
            const match = text.match(/const sampleTestCode = `([\s\S]*?)`;/);
            if (match && match[1]) {
                const sampleCode = match[1];
                
                // Create a new tab with the sample test code
                let tab_name = 'test_marketplace';
                
                // Check if the file already exists
                if (Object.keys(code_storage).includes(tab_name)) {
                    // Append a number to make it unique
                    let counter = 1;
                    while (Object.keys(code_storage).includes(tab_name + counter)) {
                        counter++;
                    }
                    tab_name = tab_name + counter;
                }
                
                addTab(tab_name, sampleCode);
                changeTab(tab_name);
                refreshTabList();
            } else {
                alert('Error loading sample test code!');
            }
        })
        .catch(error => {
            console.error('Error loading sample test:', error);
            alert('Error loading sample test!');
        });
}

function loadSampleContractFile() {
    let dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
        dropdown.remove();
    }

    // Load the sample contract code
    fetch('templates/page_js/sample_contract.js')
        .then(response => response.text())
        .then(text => {
            // Extract the sample contract code from the file
            const match = text.match(/const sampleContractCode = `([\s\S]*?)`;/);
            if (match && match[1]) {
                const sampleCode = match[1];
                
                // Create a new tab with the sample contract code
                let tab_name = 'con_xns_marketplace';
                
                // Check if the file already exists
                if (Object.keys(code_storage).includes(tab_name)) {
                    // Append a number to make it unique
                    let counter = 1;
                    while (Object.keys(code_storage).includes(tab_name + counter)) {
                        counter++;
                    }
                    tab_name = tab_name + counter;
                }
                
                addTab(tab_name, sampleCode);
                changeTab(tab_name);
                refreshTabList();
            } else {
                alert('Error loading sample contract code!');
            }
        })
        .catch(error => {
            console.error('Error loading sample contract:', error);
            alert('Error loading sample contract!');
        });
}

function loadSampleCurrencyFile() {
    let dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
        dropdown.remove();
    }

    // Load the sample currency code
    fetch('templates/page_js/sample_currency.js')
        .then(response => response.text())
        .then(text => {
            // Extract the sample currency code from the file
            const match = text.match(/const sampleCurrencyCode = `([\s\S]*?)`;/);
            if (match && match[1]) {
                const sampleCode = match[1];
                
                // Create a new tab with the sample currency code
                let tab_name = 'currency';
                
                // Check if the file already exists
                if (Object.keys(code_storage).includes(tab_name)) {
                    // Append a number to make it unique
                    let counter = 1;
                    while (Object.keys(code_storage).includes(tab_name + counter)) {
                        counter++;
                    }
                    tab_name = tab_name + counter;
                }
                
                addTab(tab_name, sampleCode);
                changeTab(tab_name);
                refreshTabList();
            } else {
                alert('Error loading sample currency code!');
            }
        })
        .catch(error => {
            console.error('Error loading sample currency:', error);
            alert('Error loading sample currency!');
        });
}

function loadSampleNameServiceFile() {
    let dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
        dropdown.remove();
    }

    // Load the sample name service code
    fetch('templates/page_js/sample_nameservice.js')
        .then(response => response.text())
        .then(text => {
            // Extract the sample name service code from the file
            const match = text.match(/const sampleNameServiceCode = `([\s\S]*?)`;/);
            if (match && match[1]) {
                const sampleCode = match[1];
                
                // Create a new tab with the sample name service code
                let tab_name = 'con_nameservice';
                
                // Check if the file already exists
                if (Object.keys(code_storage).includes(tab_name)) {
                    // Append a number to make it unique
                    let counter = 1;
                    while (Object.keys(code_storage).includes(tab_name + counter)) {
                        counter++;
                    }
                    tab_name = tab_name + counter;
                }
                
                addTab(tab_name, sampleCode);
                changeTab(tab_name);
                refreshTabList();
            } else {
                alert('Error loading sample name service code!');
            }
        })
        .catch(error => {
            console.error('Error loading sample name service:', error);
            alert('Error loading sample name service!');
        });
}

function loadSampleSubmissionFile() {
    let dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
        dropdown.remove();
    }

    // Load the sample submission code
    fetch('templates/page_js/sample_submission.js')
        .then(response => response.text())
        .then(text => {
            // Extract the sample submission code from the file
            const match = text.match(/const sampleSubmissionCode = `([\s\S]*?)`;/);
            if (match && match[1]) {
                const sampleCode = match[1];
                
                // Create a new tab with the sample submission code
                let tab_name = 'submission.s';
                
                // Check if the file already exists
                if (Object.keys(code_storage).includes(tab_name)) {
                    // Append a number to make it unique
                    let counter = 1;
                    while (Object.keys(code_storage).includes(tab_name + counter)) {
                        counter++;
                    }
                    tab_name = tab_name + counter;
                }
                
                addTab(tab_name, sampleCode);
                changeTab(tab_name);
                refreshTabList();
            } else {
                alert('Error loading sample submission code!');
            }
        })
        .catch(error => {
            console.error('Error loading sample submission:', error);
            alert('Error loading sample submission!');
        });
}



function loadContractFromExplorer() {
    let dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
        dropdown.remove();
    }
    let contract = prompt('Enter contract name:');

    if (contract === null) {
        return;
    }

    getContractCode(contract).then((contractCode) => {
        if (contractCode === null || contractCode === '' || contractCode === "\x9Eée") {
            alert('Contract not found!');
            return;
        }

        let tab_name = contract + '(Read-Only)';
        if (Object.keys(code_storage).includes(tab_name)) {
            alert('File already exists!');
            return;
        }
        addTab(tab_name, contractCode);
        changeTab(tab_name);
        refreshTabList();

    }).catch((error) => {
        console.error('Error loading contract:', error.message);
        alert('Error loading contract!');
    });
}


function showDropdown() {
    if (document.querySelector('.dropdown-content')) {
        document.querySelector('.dropdown-content').remove();
        return;
    }

    let dropdown = document.createElement('div');
    dropdown.className = 'dropdown-content';
    dropdown.style.display = 'flex';
    dropdown.style.flexDirection = 'column';
    dropdown.style.gap = '10px';
    dropdown.style.position = 'absolute';
    dropdown.style.width = '10rem';
    dropdown.style.zIndex = '100000';
    dropdown.classList.add('dropdown-content');
    dropdown.style.borderRadius = '8px';
    dropdown.style.padding = '0.5rem';

    // Append dropdown directly to body
    document.body.appendChild(dropdown);

    let buttonRect = document.querySelector('.add-tab-button').getBoundingClientRect();
    dropdown.style.left = buttonRect.left + 'px';
    dropdown.style.top = buttonRect.bottom + 'px';

    // Check if the dropdown extends beyond the right edge of the viewport
    const dropdownWidth = dropdown.offsetWidth;
    const viewportWidth = window.innerWidth;
    const dropdownRight = buttonRect.left + dropdownWidth;

    if (dropdownRight > viewportWidth) {
        // If it extends beyond the viewport's right edge, adjust its position
        dropdown.style.left = 'auto';
        dropdown.style.right = '0';
    }

    let newTab = document.createElement('div');
    newTab.innerHTML = 'New Blank File';
    newTab.addEventListener('click', addNewTab);
    newTab.style.cursor = 'pointer';

    let newTokenTab = document.createElement('div');
    newTokenTab.innerHTML = 'New Token';
    newTokenTab.addEventListener('click', addNewTokenTab);
    newTokenTab.style.cursor = 'pointer';

    let newTestTab = document.createElement('div');
    newTestTab.innerHTML = 'New Test File';
    newTestTab.addEventListener('click', addNewTestTab);
    newTestTab.style.cursor = 'pointer';

    let loadContract = document.createElement('div');
    loadContract.innerHTML = 'Load Contract';
    loadContract.addEventListener('click', loadContractFromExplorer);
    loadContract.style.cursor = 'pointer';

    dropdown.appendChild(newTab);
    dropdown.appendChild(newTokenTab);
    dropdown.appendChild(newTestTab);
    dropdown.appendChild(loadContract);
}

// var whitelistedPatterns = [
//     'export',
//     'construct',
//     'Hash',
//     'Variable',
//     'ctx',
//     'now',
//     'random',
//     'ForeignHash',
//     'ForeignVariable',
//     'block_num',
//     'block_hash',
//     'importlib',
//     'hashlib',
//     'datetime',
//     'crypto',
//     'decimal',
//     'Any',
//     'LogEvent'
// ];

async function lintCode(code){   
    try{
        // Skip linting for test files
        if (current_tab && current_tab.startsWith('test_')) {
            return [];
        }
        
        const result = await pyodide.runPythonAsync(`
from xian_contracting_linter import lint_code
lint_code("""${code}""")
`);   
        let lintinfo = result.toJs();
        return lintinfo;    
    } catch (error) {
        console.error('Error linting code:', error.message);
        return [];
    }
}

async function pythonLinter(text, options, cm) {
    try {
        const errors = await lintCode(text);
        let lintErrors = errors.map(error => ({
            message: error.get("message"),
            severity: error.get("severity"),
            from: CodeMirror.Pos(error.get("line")),
            to: CodeMirror.Pos(error.get("line"))
        }));
        console.log(lintErrors)
        return lintErrors;
    } catch (error) {
        console.error('Error in pythonLinter:', error.get("message"));
        return [];
    }
}

CodeMirror.registerHelper("lint", "python", pythonLinter);

var editor = CodeMirror(document.querySelector('#editor'), {
    value: code_storage[current_tab],
    mode: 'python',
    lineNumbers: true,
    indentUnit: 4,
    gutters: ["CodeMirror-lint-markers"],
    lint: true,
});

// Create a mapping between actual and displayed line numbers
if (typeof lineNumberMapping === 'undefined') {
    var lineNumberMapping = new Map();
}
if (typeof reverseLineNumberMapping === 'undefined') {
    var reverseLineNumberMapping = new Map();
}
function updateLineNumberMappings() {
    lineNumberMapping.clear();
    reverseLineNumberMapping.clear();
    
    let displayedNumber = 1;
    for (let i = 1; i <= editor.lineCount(); i++) {
        const prevLineContent = i > 1 ? editor.getLine(i - 2) : '';
        
        if (!(prevLineContent && prevLineContent.trim().endsWith('\\'))) {
            lineNumberMapping.set(i, displayedNumber);
            reverseLineNumberMapping.set(displayedNumber, i);
            displayedNumber++;
        } else {
            lineNumberMapping.set(i, displayedNumber - 1);
        }
    }
}

// Override the line number formatting
editor.setOption('lineNumberFormatter', function(line) {
    updateLineNumberMappings();
    const prevLineContent = line > 1 ? editor.getLine(line - 2) : '';
    
    // If previous line ends with backslash, don't show line number
    if (prevLineContent && prevLineContent.trim().endsWith('\\')) {
        return '';
    }

    return lineNumberMapping.get(line).toString();
});

// Override the default lint placement
if (typeof originalLint === 'undefined') {
var originalSetGutterMarker = editor.setGutterMarker.bind(editor);
}
editor.setGutterMarker = function(line, gutterID, value) {
    updateLineNumberMappings();
    // If this is a line number that should be empty (continuation line)
    const prevLineContent = line > 0 ? editor.getLine(line - 1) : '';
    if (prevLineContent && prevLineContent.trim().endsWith('\\')) {
        // Find the next non-continuation line
        let targetLine = line;
        while (targetLine < editor.lineCount()) {
            const content = editor.getLine(targetLine - 1);
            if (!(content && content.trim().endsWith('\\'))) {
                break;
            }
            targetLine++;
        }
        return originalSetGutterMarker(targetLine, gutterID, value);
    }
    return originalSetGutterMarker(line, gutterID, value);
};

editor.setSize('100%', null);
if (current_tab.endsWith('(Read-Only)')) {
    editor.setOption('readOnly', true);
    document.getElementById('submission-form').style.display = 'none';
    buildFunctionBoxes();
}

function buildFunctionBoxes() {
    getContractFunctions(current_tab.replace('(Read-Only)', '')).then((functions) => {
        let functionBoxes = document.getElementById('function-boxes');
        functionBoxes.innerHTML = '';
        console.log(functions);
        functions.methods.forEach((func) => {
            let functionBox = document.createElement('div');
            functionBox.className = 'function-box';
            // func.name is the function name
            // func.arguments is the list of arguments
            
            functionBox.innerHTML = `<h3>` + func.name + `</h3>`;

            let functionArgs = document.createElement('div');
            functionArgs.className = 'function-args';
            func.arguments.forEach((arg) => {
                let argElement = document.createElement('div');
                argElement.innerHTML = arg.name + ' (' + arg.type + ')';
                argElement.className = 'form-group kwarg-group';

                let argValue = document.createElement('input');
                argValue.type = 'text';
                argValue.className = 'function-arg-value form-control';
                argValue.id = current_tab + '-' + func.name + '-' + arg.name;

                argElement.appendChild(argValue);
                functionArgs.appendChild(argElement);
            });
            // Always add a stamp limit field
            let argElement = document.createElement('div');
            argElement.innerHTML = 'stamp_limit (int)';
            argElement.className = 'function-arg kwarg-group';

            let argValue = document.createElement('input');
            argValue.type = 'text';
            argValue.className = 'function-arg-value form-control';
            argValue.id = current_tab + '-' + func.name + '-stamp_limit';

            argElement.appendChild(argValue);
            functionArgs.appendChild(argElement);
            functionBox.appendChild(functionArgs);

            let functionButton = document.createElement('button');
            functionButton.className = 'btn btn-primary';
            functionButton.innerHTML = 'Execute';
            functionButton.addEventListener('click', function () {
                let prompt = confirm('Are you sure you want to execute this function?');
                if (!prompt) {
                    return;
                }
                let contractName = current_tab.replace('(Read-Only)', '');
                let functionName = func.name;
                let stampLimit = document.getElementById(current_tab + '-' + func.name + '-stamp_limit').value;
                let error = document.getElementById('submitContractError');
                let success = document.getElementById('submitContractSuccess');

                error.style.display = 'none';
                success.style.display = 'none';

                let args = {};
                func.arguments.forEach((arg) => {
                    let value = document.getElementById(current_tab + '-' + func.name + '-' + arg.name).value;
                    let expectedType = arg.type;
                    if (value === "") {
                        error.innerHTML = "All fields are required!";
                        error.style.display = "block";
                        return;
                    }
                    if (expectedType === "int") {
                        if (isNaN(value)) {
                            error.innerHTML = "Invalid value for " + arg.name + "!";
                            error.style.display = "block";
                            return;
                        }
                        value = parseInt(value);
                    }
                    if (expectedType === "float") {
                        if (isNaN(value)) {
                            error.innerHTML = "Invalid value for " + arg.name + "!";
                            error.style.display = "block";
                            return;
                        }
                        value = parseFloat(value);
                    }
                    if (expectedType === "bool") {
                        if (value !== "true" && value !== "false") {
                            error.innerHTML = "Invalid value for " + arg.name + "!";
                            error.style.display = "block";
                            return;
                        }
                        value = value === "true";
                    }
                    if (expectedType === "str") {
                        value = value.toString();
                    }
                    if (expectedType === "dict" || expectedType === "list") {
                        try {
                            value = JSON.parse(value);
                        } catch (e) {
                            error.innerHTML = "Invalid value for " + arg.name + "!";
                            error.style.display = "block";
                            return;
                        }
                    }
                    if (expectedType === "Any") {
                        try {
                            value = JSON.parse(value);
                        } catch (e) {
                            value = value.toString();
                        }
                    }
                    args[arg.name] = value;
                });

                let payload = {
                    payload: {
                        chain_id: CHAIN_ID,
                        contract: contractName,
                        function: functionName,
                        kwargs: args,
                        stamps_supplied: parseInt(stampLimit)
                    },
                    metadata: {
                        signature: "",
                    }
                };
                window.scrollTo(0, 0);
                Promise.all([signTransaction(payload, unencryptedPrivateKey)]).then((signed_tx) => {
                    broadcastTransaction(signed_tx).then((response) => {
                        hash = response['result']['hash'];
                        let status = 'pending'
                        if (response['result']['code'] == 1) {
                            status = 'error';
                        }
                        prependToTransactionHistory(hash, contractName, functionName, args, status, new Date().toLocaleString());
                        if (response["result"]["code"] == 1) {
                            error.innerHTML = response["result"]["log"];
                            error.style.display = "block";
                            return;
                        } else {
                            success.innerHTML =
                                "Transaction sent successfully! Explorer: " +
                                "<a class='explorer-url' href='"+EXPLORER+"/tx/" +
                                hash +
                                "' target='_blank'>" +
                                hash +
                                "</a>";
                            success.style.display = "block";
                        }
                    }).catch((error) => {
                        console.error("Error executing contract function:", error.message);
                        error.innerHTML = "Error executing contract function!";
                        error.style.display = "block";
                    });
                }).catch((error) => {
                    console.error("Error executing contract function:", error.message);
                    error.innerHTML = "Error executing contract function!";
                    error.style.display = "block";
                });
                });

            functionBox.appendChild(functionButton);
            functionBoxes.appendChild(functionBox);
        });
        
    }).catch((error) => {
        console.error('Error getting contract functions:', error.message);
    });
}


function submitContract() {
    let contract = document.getElementById("submitContractName").value;
    let contractError = document.getElementById("submitContractError");
    let contractSuccess = document.getElementById("submitContractSuccess");
    let stampLimit = document.getElementById("submitContractstampLimit").value;
    let constructorKwargs = document.getElementById("submitContractconstructorKwargs").value;
    contractError.style.display = 'none';
    contractSuccess.style.display = 'none';

    window.scrollTo(0, 0);

    if (contract === "") {
        contractError.innerHTML = 'Contract name is required!';
        contractError.style.display = 'block';
        return;
    }

    if (!contract.startsWith('con_')) {
        contractError.innerHTML = 'Contract name must start with con_';
        contractError.style.display = 'block';
        return;
    }

    if (stampLimit === "") {
        contractError.innerHTML = 'Stamp limit is required!';
        contractError.style.display = 'block';
        return;
    }

    let contractCode = editor.getValue();

    let payload = {
        payload: {
            chain_id: CHAIN_ID,
            contract: 'submission',
            function: 'submit_contract',
            kwargs: {
                name: contract,
                code: contractCode
            },
            stamps_supplied: parseInt(stampLimit)
        },
        metadata: {
            signature: "",
        }
    };

    if (constructorKwargs !== "") {
        try {
            payload.payload.kwargs.constructor_args = JSON.parse(constructorKwargs);
        }
        catch (error) {
            contractError.innerHTML = 'Invalid constructor kwargs!';
            contractError.style.display = 'block';
            return;
        }
    }

    Promise.all([signTransaction(payload, unencryptedPrivateKey)]).then((signed_tx) => {
        broadcastTransaction(signed_tx).then((response) => {
            hash = response['result']['hash'];
            let status = 'pending'
            if (response['result']['code'] == 1) {
                status = 'error';
            }
            prependToTransactionHistory(hash, 'submission', 'submit_contract', { name: contract, code: contractCode }, status, new Date().toLocaleString());
            if (response["result"]["code"] == 1) {
                contractError.innerHTML = response["result"]["log"];
                contractError.style.display = "block";
                return;
            } else {
                contractSuccess.innerHTML =
                    "Transaction sent successfully! Explorer: " +
                    "<a class='explorer-url' href='"+EXPLORER+"/tx/" +
                    hash +
                    "' target='_blank'>" +
                    hash +
                    "</a>";
                contractSuccess.style.display = "block";
            }
        }).catch((error) => {
            console.error("Error submitting contract:", error.message);
            contractError.innerHTML = "Error submitting contract!";
            contractError.style.display = "block";
        });
    });
}

// Get current stamp rate
// Get current stamp rate
getStampRate().then((rate) => {
    if (rate === null) {
        document.getElementById("stampRate").innerHTML = "ERR";
        return;
    }
    document.getElementById("stampRate").innerHTML = rate;
}).catch((error) => {
    console.error("Error getting stamp rate:", error.message);
    document.getElementById("stampRate").innerHTML = "ERR";
});

document.getElementById('btn-ide-submit-contract').addEventListener('click', function () {
    if( document.getElementById('submitContractNameWrapper').style.display === 'none' ) {
        document.getElementById('submitContractNameWrapper').style.display = 'block';
        document.getElementById('submitContractstampLimitWrapper').style.display = 'block';
        document.getElementById('submitContractconstructorKwargsWrapper').style.display = 'block';
        document.getElementById('btn-ide-submit-contract').innerHTML = 'Deploy Contract';
    }
    else {
        submitContract();
    }
});
document.getElementById('btn-ide-go-to-wallet').addEventListener('click', function () {
    goToWallet();
});

document.getElementById('ide-send-adv-tx').addEventListener('click', function () {
    changePage('send-advanced-transaction');
});

function refreshTabList() {
    document.getElementById('tabs-editor').innerHTML = '';
    Object.keys(code_storage).forEach((tab) => {
        let tabElement = document.createElement('div');
        tabElement.className = 'tab-editor';
        tabElement.innerHTML = tab;
        tabElement.addEventListener('click', function () {
            changeTab(tab);

        });
        document.getElementById('tabs-editor').appendChild(tabElement);

        if (tab === current_tab) {
            tabElement.classList.add('active');
        }

        let closeTab = document.createElement('i');
        closeTab.className = 'icon';
        closeTab.dataset.lucide = 'x';


        tabElement.appendChild(closeTab);
    });
    let addTabButton = document.createElement('div');
    addTabButton.className = 'add-tab-button';
    addTabButton.innerHTML = '<i class="icon" data-lucide="plus"></i>';
    addTabButton.addEventListener('click', showDropdown);

    document.getElementById('tabs-editor').appendChild(addTabButton);
    lucide.createIcons();
}

document.getElementById('tabs-editor').addEventListener('click', (e) => {
  // Did the user click the X icon?  (works before *and* after Lucide replacement)
  const icon = e.target.closest('svg[data-lucide="x"], i[data-lucide="x"]');
  if (!icon) return;                 // click wasn’t on the close icon

  e.stopPropagation();               // don’t switch tabs

  const tabEl   = icon.closest('.tab-editor'); // parent <div class="tab-editor">
  const tabName = tabEl.textContent.trim();    // file name text

  if (!confirm(`Remove ${tabName}?`)) return;
  if (Object.keys(code_storage).length === 1) {
    return alert('Cannot remove last file!');
  }

  removeTab(tabName);
  if (current_tab === tabName) {
    changeTab(Object.keys(code_storage)[0]);
  }
  refreshTabList();                  // rebuild the list
});

// Clicking anywhere outside the dropdown should close it
document.addEventListener('click', function (event) {
    // Check if the click event was triggered by the add-tab button or any of its children
    if (!event.target.matches('.add-tab-button') && !event.target.closest('.add-tab-button')) {
        let dropdown = document.querySelector('.dropdown-content');
        if (dropdown) {
            dropdown.remove();
        }
    }
});


// Save code on change
editor.on('change', saveCode);

refreshTabList();

// Test runner functionality
document.getElementById('btn-ide-run-tests').addEventListener('click', runTests);

async function runTests() {
    // Show the test results container
    document.getElementById('test-results').style.display = 'block';
    const testOutput = document.getElementById('test-output');
    testOutput.innerHTML = 'Running tests...\n';
    
    // Save all files first
    saveCode();
    
    try {
        // Get all files from code_storage
        const files = {};
        Object.keys(code_storage).forEach(filename => {
            // Skip read-only files
            if (!filename.endsWith('(Read-Only)')) {
                files[filename] = code_storage[filename];
            }
        });
        
        // Check if there are any test files (files that start with 'test_')
        const testFiles = Object.keys(files).filter(filename => filename.startsWith('test_'));
        
        if (testFiles.length === 0) {
            testOutput.innerHTML += 'No test files found. Test files should start with "test_".\n';
            return;
        }
        
        // Load sample files if they don't exist
        // First, load the sample currency code if it doesn't exist
        if (!Object.keys(files).includes('currency.py') && !Object.keys(files).includes('currency')) {
            testOutput.innerHTML += 'Loading sample currency file...\n';
            try {
                const response = await fetch('templates/page_js/sample_currency.js');
                const text = await response.text();
                const match = text.match(/const sampleCurrencyCode = `([\s\S]*?)`;/);
                if (match && match[1]) {
                    files['currency.py'] = match[1];
                }
            } catch (error) {
                testOutput.innerHTML += `Error loading sample currency: ${error.message}\n`;
            }
        }
        
        // Then, load the sample submission code if it doesn't exist
        if (!Object.keys(files).includes('submission.s.py') && !Object.keys(files).includes('submission.s')) {
            testOutput.innerHTML += 'Loading sample submission file...\n';
            try {
                const response = await fetch('templates/page_js/sample_submission.js');
                const text = await response.text();
                const match = text.match(/const sampleSubmissionCode = `([\s\S]*?)`;/);
                if (match && match[1]) {
                    files['submission.s.py'] = match[1];
                }
            } catch (error) {
                testOutput.innerHTML += `Error loading sample submission: ${error.message}\n`;
            }
        }
        
        // For each test file, run the tests
        for (const testFile of testFiles) {
            testOutput.innerHTML += `\nRunning tests from ${testFile}...\n`;
            
            // Create a Python environment with the necessary imports
            const testCode = files[testFile];
            
            // Find all other files that might be needed by the test
            const otherFiles = {};
            Object.keys(files).forEach(filename => {
                if (filename !== testFile && !filename.endsWith('(Read-Only)')) {
                    otherFiles[filename] = files[filename];
                }
            });
            
            // Run the test using pyodide
            try {
                const result = await runTestWithPyodide(testCode, otherFiles);
                testOutput.innerHTML += result;
            } catch (error) {
                testOutput.innerHTML += `Error running tests: ${error.message}\n`;
            }
        }
    } catch (error) {
        testOutput.innerHTML += `Error: ${error.message}\n`;
    }
}

async function runTestWithPyodide(testCode, otherFiles) {
    try {
        // Create a Python script that sets up the test environment
        let setupScript = `
import sys
import io
import unittest
from js import console

# Redirect stdout to capture test output
sys.stdout = io.StringIO()

# Create a mock contracting module
sys.modules['contracting'] = type('', (), {})()
sys.modules['contracting.client'] = type('', (), {})()
sys.modules['contracting.stdlib'] = type('', (), {})()
sys.modules['contracting.stdlib.bridge'] = type('', (), {})()
sys.modules['contracting.stdlib.bridge.time'] = type('', (), {})()

# Mock ContractingClient class
class MockContract:
    def __init__(self, name):
        self.name = name
        self._state = {}
        
    def get(self):
        return self._state.get('value', 1)
        
    def balance_of(self, account):
        return self._state.get(f'balance:{account}', 1_000_000)
        
    def allowance(self, owner, spender):
        return self._state.get(f'allowance:{owner}:{spender}', 50)
        
    def transfer(self, amount, to, signer):
        self._state[f'balance:{signer}'] = self.balance_of(signer) - amount
        self._state[f'balance:{to}'] = self.balance_of(to) + amount
        return True
        
    def approve(self, amount, to, signer):
        self._state[f'allowance:{signer}:{to}'] = amount
        return True
        
    def transfer_from(self, amount, to, main_account, signer):
        self._state[f'balance:{main_account}'] = self.balance_of(main_account) - amount
        self._state[f'balance:{to}'] = self.balance_of(to) + amount
        self._state[f'allowance:{main_account}:{signer}'] = self.allowance(main_account, signer) - amount
        return True
        
    def set_enabled(self, state, signer):
        self._state['enabled'] = state
        
    def set_contract_allowlist(self, contracts, signer):
        self._state['allowlist'] = contracts
        
    def set_fee_percent(self, pct, signer):
        self._state['fee_percent'] = pct
        
    def mint_name(self, name, signer):
        self._state[f'owner:{name}'] = signer
        return True
        
    def is_owner(self, name, address):
        return self._state.get(f'owner:{name}') == address
        
    def list_name(self, name, price, signer):
        self._state[f'listing:{name}'] = {'seller': signer, 'price': price}
        return True
        
    def get_listing(self, name):
        return self._state.get(f'listing:{name}')
        
    def buy_name(self, name, signer):
        listing = self.get_listing(name)
        if listing:
            self._state[f'owner:{name}'] = signer
            self._state.pop(f'listing:{name}', None)
        return True
        
    def cancel_listing(self, name, signer):
        self._state.pop(f'listing:{name}', None)
        return True

class MockContractingClient:
    def __init__(self):
        # Create a proper mock for raw_driver with correct lambda functions
        self.raw_driver = type('MockDriver', (), {})()
        self.raw_driver.flush_full = lambda: None
        self.raw_driver.set_contract = lambda name, code: None
        self._contracts = {}
        
    def submit(self, code, name, constructor_args=None, signer=None):
        self._contracts[name] = MockContract(name)
        return True
        
    def get_contract(self, name):
        if name not in self._contracts:
            self._contracts[name] = MockContract(name)
        return self._contracts[name]

# Add the mock classes to the contracting module
sys.modules['contracting.client'].ContractingClient = MockContractingClient
sys.modules['contracting.stdlib.bridge.time'].Timedelta = lambda days=0: days * 24 * 60 * 60

# Create files needed for tests
`;

        // Add all the other files that might be needed
        Object.keys(otherFiles).forEach(filename => {
            setupScript += `
with open("${filename}", "w") as f:
    f.write("""${otherFiles[filename].replace(/"""/g, '\\"\\"\\"')}""")
`;
        });

        // Add the test file
        setupScript += `
# Create the test file
with open("current_test.py", "w") as f:
    f.write("""${testCode.replace(/"""/g, '\\"\\"\\"')}""")

# Define a function to run the tests
def run_tests():
    try:
        import current_test
        # Run the tests
        test_runner = unittest.TextTestRunner(verbosity=2)
        test_suite = unittest.defaultTestLoader.loadTestsFromModule(current_test)
        test_result = test_runner.run(test_suite)
        
        # Get the output
        output = sys.stdout.getvalue()
        
        # Add summary
        if test_result.wasSuccessful():
            output += "\\n✅ All tests passed!\\n"
        else:
            output += f"\\n❌ {len(test_result.failures) + len(test_result.errors)} tests failed.\\n"
        
        # Return the output
        sys.stdout = sys.__stdout__  # Reset stdout
        return output
    except Exception as e:
        sys.stdout = sys.__stdout__  # Reset stdout
        return f"Error running tests: {str(e)}"

# Call the function and get the result
result = run_tests()
result  # Return the result to JavaScript
`;

        // Run the script
        const result = await pyodide.runPythonAsync(setupScript);
        return result;
    } catch (error) {
        console.error('Error in runTestWithPyodide:', error);
        return `Error: ${error.message}\n`;
    }
}

