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

    let loadContract = document.createElement('div');
    loadContract.innerHTML = 'Load Contract';
    loadContract.addEventListener('click', loadContractFromExplorer);
    loadContract.style.cursor = 'pointer';

    dropdown.appendChild(newTab);
    dropdown.appendChild(newTokenTab);
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
        closeTab.className = 'fas fa-times';

        closeTab.addEventListener('click', function (event) {
            event.stopPropagation(); // Prevent click event from propagating to the tab itself

            // Prompt user if they want to remove the tab
            if (!confirm('Are you sure you want to remove this file?')) {
                return;
            }

            // If it's the last tab, don't allow removal
            if (Object.keys(code_storage).length === 1) {
                alert('Cannot remove last file!');
                return;
            }

            // Retrieve the tab name from the parent element (tabElement)
            let tabNameToRemove = tabElement.textContent.trim();

            removeTab(tabNameToRemove);
            tabElement.remove();

            // Change current tab if the removed tab was active
            if (tabNameToRemove === current_tab) {
                changeTab(Object.keys(code_storage)[0]);
            }
        });

        tabElement.appendChild(closeTab);
    });
    let addTabButton = document.createElement('div');
    addTabButton.className = 'add-tab-button';
    addTabButton.innerHTML = '<i class="fas fa-plus"></i>';
    addTabButton.addEventListener('click', showDropdown);

    document.getElementById('tabs-editor').appendChild(addTabButton);
}

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


