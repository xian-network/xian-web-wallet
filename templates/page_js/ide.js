// Assumes global vars: code_storage, current_tab, deployment_started (needs proper scoping if not global),
//                    editor, pyodide (from pyodide-linting.js), RPC, EXPLORER, CHAIN_ID,
//                    locked, unencryptedMnemonic, selectedAccountIndex, accounts, tx_history
// Assumes functions: saveCode, addTab, removeTab, changeTab, refreshTabList, showDropdown,
//                    getContractCode, getContractFunctions, getStampRate, signTransaction,
//                    broadcastTransaction, prependToTransactionHistory, changePage, toast,
//                    getSelectedAccount, execute_balance_of (needs to be available)

var code_storage = JSON.parse(localStorage.getItem('code_storage')) || { "contract.py": "@construct\ndef seed():\n    pass\n\n@export\ndef test():\n    return 'Hello, World!'" }; // Default with .py extension
var current_tab = Object.keys(code_storage)[0];
// Scope deployment_started properly if it's meant to be per-tab state persisted across sessions
var deployment_started = JSON.parse(sessionStorage.getItem('deployment_started')) || {}; // Use sessionStorage for temporary state


function saveCode() {
    if (editor && current_tab && !current_tab.endsWith('(Read-Only)')) { // Only save writable tabs
        code_storage[current_tab] = editor.getValue();
        localStorage.setItem('code_storage', JSON.stringify(code_storage));
    }
}

function saveDeploymentState() {
    sessionStorage.setItem('deployment_started', JSON.stringify(deployment_started));
}


function addTab(tab_name, code = '') {
    // Basic validation for tab name
    if (!tab_name || typeof tab_name !== 'string' || tab_name.trim().length === 0) {
        console.error("Invalid tab name provided.");
        return;
    }
    // Prevent adding duplicate names
     if (code_storage.hasOwnProperty(tab_name)) {
         console.warn(`Tab "${tab_name}" already exists.`);
         return;
     }
    code_storage[tab_name] = code;
    localStorage.setItem('code_storage', JSON.stringify(code_storage));
    // Reset deployment state for the new tab if it exists
    if (deployment_started.hasOwnProperty(tab_name)) {
        delete deployment_started[tab_name];
        saveDeploymentState();
    }
}

function removeTab(tab_name) {
    if (Object.keys(code_storage).length <= 1) {
        toast('warning', 'Cannot remove the last file.');
        return; // Don't remove the last tab
    }
    if (code_storage.hasOwnProperty(tab_name)) {
        delete code_storage[tab_name]; // Remove the tab
        localStorage.setItem('code_storage', JSON.stringify(code_storage)); // Update storage
         // Remove associated deployment state
         if (deployment_started.hasOwnProperty(tab_name)) {
             delete deployment_started[tab_name];
             saveDeploymentState();
         }
        return true; // Indicate success
    }
    return false; // Indicate tab not found
}


function changeTab(tab_name) {
     if (!code_storage.hasOwnProperty(tab_name)) {
          console.error(`Attempted to switch to non-existent tab: ${tab_name}`);
          // Optionally switch to the first available tab
          const firstTab = Object.keys(code_storage)[0];
          if (firstTab) {
             current_tab = firstTab;
             editor.setValue(code_storage[current_tab] || '');
          } else {
               // Handle case where there are no tabs left (shouldn't happen with removeTab check)
               editor.setValue(''); // Clear editor
               current_tab = null;
          }
     } else {
         current_tab = tab_name;
         editor.setValue(code_storage[current_tab]);
     }

    const isReadOnly = current_tab && current_tab.endsWith('(Read-Only)');
    const submissionForm = document.getElementById('submission-form');
    const functionBoxes = document.getElementById('function-boxes');
    const submitContractNameWrapper = document.getElementById('submitContractNameWrapper');
    const submitContractstampLimitWrapper = document.getElementById('submitContractstampLimitWrapper');
    const submitContractconstructorKwargsWrapper = document.getElementById('submitContractconstructorKwargsWrapper');
    const submitButton = document.getElementById('btn-ide-submit-contract');


    editor.setOption('readOnly', isReadOnly);
    // Disable linting for read-only as it might be irrelevant or slow
    editor.setOption('lint', !isReadOnly && typeof pythonLinter === 'function');

    submissionForm.style.display = isReadOnly ? 'none' : 'block';
    functionBoxes.style.display = isReadOnly ? 'flex' : 'none';
    functionBoxes.innerHTML = ''; // Clear previous function boxes

    if (isReadOnly) {
        buildFunctionBoxes(); // Build function boxes for read-only contracts
    } else {
        // Handle deployment state display for writable tabs
        if (deployment_started[current_tab]) {
            submitContractNameWrapper.style.display = 'block';
            // Pre-fill contract name based on tab name (remove .py if exists)
            document.getElementById("submitContractName").value = current_tab.replace(/\.py$/i, '');
            submitContractstampLimitWrapper.style.display = 'block';
            submitContractconstructorKwargsWrapper.style.display = 'block';
            submitButton.innerHTML = 'Deploy Contract';
        } else {
            submitContractNameWrapper.style.display = 'none';
            submitContractstampLimitWrapper.style.display = 'none';
            submitContractconstructorKwargsWrapper.style.display = 'none';
            submitButton.innerHTML = 'Start Deployment';
        }
    }

    refreshTabList(); // Update the visual state of tabs
}


function addNewTab() {
    let dropdown = document.querySelector('.dropdown-content');
    if (dropdown) dropdown.remove();

    let tab_name = prompt('Enter new file name (e.g., my_contract.py):');
    if (tab_name === null) return; // User cancelled

    tab_name = tab_name.trim();
    if (tab_name === '') {
        toast('warning', 'File name cannot be empty!');
        return;
    }
    // Suggest adding .py if not present
     if (!tab_name.toLowerCase().endsWith('.py')) {
         tab_name += '.py';
     }

    if (code_storage.hasOwnProperty(tab_name)) {
        toast('warning', `File "${tab_name}" already exists!`);
        return;
    }

    // Add with default code or empty string
    const defaultCode = "@construct\ndef seed():\n    pass\n\n@export\ndef my_function():\n    # Your code here\n    return 0";
    addTab(tab_name, defaultCode);
    changeTab(tab_name); // Switch to the new tab
    refreshTabList(); // Update UI
}

function addNewTokenTab() {
     let dropdown = document.querySelector('.dropdown-content');
     if (dropdown) dropdown.remove();

     let tab_name = prompt('Enter new token file name (e.g., my_token.py):');
     if (tab_name === null) return; // User cancelled

     tab_name = tab_name.trim();
      if (tab_name === '') {
         toast('warning', 'File name cannot be empty!');
         return;
     }
      if (!tab_name.toLowerCase().endsWith('.py')) {
         tab_name += '.py';
     }


     if (code_storage.hasOwnProperty(tab_name)) {
          toast('warning', `File "${tab_name}" already exists!`);
         return;
     }

     // Fetch standard token code
      fetch('https://raw.githubusercontent.com/xian-network/xian-standard-contracts/refs/heads/main/XSC001_standard_token/XSC0001.py')
          .then((response) => {
              if (!response.ok) {
                   throw new Error(`HTTP error! status: ${response.status}`);
              }
              return response.text();
          })
          .then((code) => {
              addTab(tab_name, code);
              changeTab(tab_name);
              refreshTabList();
               toast('success', 'Standard token contract loaded.');
          })
          .catch((error) => {
               console.error('Error loading standard token contract:', error);
               toast('danger', 'Error loading token template. Please try again.');
          });
}

function loadContractFromExplorer() {
    let dropdown = document.querySelector('.dropdown-content');
    if (dropdown) dropdown.remove();

    let contract = prompt('Enter contract name to load:');
    if (contract === null) return;

    contract = contract.trim();
    if (contract === '') {
         toast('warning', 'Contract name cannot be empty.');
        return;
    }

    const tab_name = contract + '(Read-Only)';
    if (code_storage.hasOwnProperty(tab_name)) {
        toast('warning', `Contract "${contract}" is already open (read-only).`);
         changeTab(tab_name); // Switch to existing tab
        return;
    }

     // Show loading indicator?
     toast('info', `Loading contract ${contract}...`);

    getContractCode(contract).then((contractCode) => { // Assumes getContractCode is async
        if (contractCode === null || contractCode === '' || contractCode === "\x9Eée") {
            toast('danger', `Contract "${contract}" not found or could not be loaded.`);
            return;
        }

        addTab(tab_name, contractCode);
        changeTab(tab_name); // Switch to the newly loaded tab
        refreshTabList();
        toast('success', `Contract ${contract} loaded (read-only).`);

    }).catch((error) => {
        console.error('Error loading contract:', error);
        toast('danger', `Error loading contract ${contract}: ${error.message}`);
    });
}

function showDropdown() {
    // Close existing dropdowns first
    const existingDropdown = document.querySelector('.dropdown-content');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    const addButton = document.querySelector('.add-tab-button');
    if (!addButton) return;

    let dropdown = document.createElement('div');
    // Styling and positioning logic (keep as is, assuming it works)
    dropdown.className = 'dropdown-content';
    // ... (rest of the styling) ...
    dropdown.style.display = 'flex';
    dropdown.style.flexDirection = 'column';
    dropdown.style.gap = '10px';
    dropdown.style.position = 'absolute'; // Make sure it's absolute
    dropdown.style.backgroundColor = document.body.classList.contains('dark-mode') ? '#202020' : '#fff';
    dropdown.style.border = '1px solid #8a8b8e';
    dropdown.style.borderRadius = '8px';
    dropdown.style.padding = '0.5rem';
    dropdown.style.zIndex = '10000'; // High z-index
    dropdown.style.minWidth = '150px'; // Give it some min width


    let buttonRect = addButton.getBoundingClientRect();
    dropdown.style.left = `${buttonRect.left}px`;
    // Position below the button, accounting for scroll position
    dropdown.style.top = `${buttonRect.bottom + window.scrollY}px`;

    document.body.appendChild(dropdown); // Append to body

    // Adjust position if it goes off-screen (simple right edge check)
    const dropdownRect = dropdown.getBoundingClientRect();
    if (dropdownRect.right > window.innerWidth) {
        dropdown.style.left = 'auto';
        dropdown.style.right = '10px'; // Adjust with some padding
    }
     if (dropdownRect.bottom > window.innerHeight) {
          dropdown.style.top = 'auto';
          dropdown.style.bottom = '10px';
     }


    // Dropdown items
    let newTab = document.createElement('div');
    newTab.innerHTML = '<i class="fas fa-file fa-fw me-2"></i>New Blank File';
    newTab.addEventListener('click', addNewTab);
    newTab.style.cursor = 'pointer';
    newTab.className = 'dropdown-hover-item'; // Add class for hover effect if desired

    let newTokenTab = document.createElement('div');
    newTokenTab.innerHTML = '<i class="fas fa-coins fa-fw me-2"></i>New Token';
    newTokenTab.addEventListener('click', addNewTokenTab);
    newTokenTab.style.cursor = 'pointer';
    newTokenTab.className = 'dropdown-hover-item';

    let loadContract = document.createElement('div');
    loadContract.innerHTML = '<i class="fas fa-download fa-fw me-2"></i>Load Contract';
    loadContract.addEventListener('click', loadContractFromExplorer);
    loadContract.style.cursor = 'pointer';
    loadContract.className = 'dropdown-hover-item';

    dropdown.appendChild(newTab);
    dropdown.appendChild(newTokenTab);
    dropdown.appendChild(loadContract);

     // Close dropdown when clicking outside
     setTimeout(() => { // Use setTimeout to allow the current click event to finish
          document.addEventListener('click', handleOutsideClickForDropdown, { once: true });
     }, 0);
}

function handleOutsideClickForDropdown(event) {
    const dropdown = document.querySelector('.dropdown-content');
    const addButton = document.querySelector('.add-tab-button');
    // Check if click is outside dropdown AND outside the add button
    if (dropdown && !dropdown.contains(event.target) && addButton && !addButton.contains(event.target)) {
        dropdown.remove();
    } else if (dropdown) {
         // If click was inside, re-attach listener for the next click
         document.addEventListener('click', handleOutsideClickForDropdown, { once: true });
    }
}


// --- Linter Setup (assuming pyodide-linting.js handles this) ---
// Ensure pythonLinter is defined before CodeMirror initialization if lint:true is used.
// var pythonLinter = (text, options, cm) => { ... } // From pyodide-linting.js

var editor; // Declare editor globally within this script's scope

function initializeEditor() {
     if (editor) {
         console.log("Editor already initialized.");
         return; // Avoid re-initialization
     }
      const editorElement = document.querySelector('#editor');
      if (!editorElement) {
           console.error("Editor container element not found!");
           return;
      }

     editor = CodeMirror(editorElement, {
        value: code_storage[current_tab] || '', // Ensure there's a fallback value
        mode: 'python',
        lineNumbers: true,
        indentUnit: 4,
        gutters: ["CodeMirror-lint-markers"],
        // Enable linting only if the linter function is ready
        lint: typeof pythonLinter === 'function',
        // Other options...
        lineWrapping: true, // Optional: wrap long lines
        theme: document.body.classList.contains('dark-mode') ? 'material-darker' : 'default' // Example theme based on dark mode
     });
     // Override line number formatting and gutter marker (keep existing logic)
     // ... (line number mapping and gutter marker override code) ...
     editor.setSize('100%', '100%'); // Let the container control the height

     // Save code on change (debounced)
     editor.on('change', debounce(saveCode, 1000)); // Debounce saving

     // Initial setup based on current tab
     changeTab(current_tab);
}


// --- Function Box Building and Execution (Read-Only View) ---
async function buildFunctionBoxes() {
    const functionBoxesContainer = document.getElementById('function-boxes');
    if (!functionBoxesContainer) return;
    functionBoxesContainer.innerHTML = '<div class="text-center p-3"><i class="fas fa-spinner fa-spin"></i> Loading functions...</div>'; // Loading state

    const contractName = current_tab.replace('(Read-Only)', '');

    try {
        const functionsInfo = await getContractFunctions(contractName);
        functionBoxesContainer.innerHTML = ''; // Clear loading/previous

        if (!functionsInfo || !functionsInfo.methods || functionsInfo.methods.length === 0) {
            functionBoxesContainer.innerHTML = '<div class="text-center p-3 text-muted">No public functions found for this contract.</div>';
            return;
        }

        functionsInfo.methods
            .filter(func => !func.name.startsWith('_')) // Filter out private/internal
            .sort((a, b) => a.name.localeCompare(b.name)) // Sort
            .forEach((func) => {
                const functionBox = document.createElement('div');
                functionBox.className = 'function-box';
                functionBox.innerHTML = `<h5>${func.name}</h5>`; // Use h5 for title

                const functionArgs = document.createElement('div');
                functionArgs.className = 'function-args mb-2'; // Add margin

                // Add inputs for function arguments
                 if (func.arguments && func.arguments.length > 0) {
                    func.arguments.forEach((arg) => {
                        const argElement = document.createElement('div');
                        argElement.className = 'mb-2'; // Spacing between args
                        argElement.innerHTML = `
                             <label for="${contractName}-${func.name}-${arg.name}" class="form-label small mb-0">${arg.name} (${arg.type})</label>
                             <input type="text" class="function-arg-value form-control form-control-sm" id="${contractName}-${func.name}-${arg.name}" placeholder="Value for ${arg.name}">
                         `;
                        functionArgs.appendChild(argElement);
                    });
                 } else {
                      functionArgs.innerHTML = `<p class="text-muted small mb-2">No arguments required.</p>`;
                 }

                // Always add a stamp limit field
                const stampElement = document.createElement('div');
                 stampElement.className = 'mb-2';
                 stampElement.innerHTML = `
                     <label for="${contractName}-${func.name}-stamp_limit" class="form-label small mb-0">Stamp Limit (Optional)</label>
                     <input type="number" class="function-arg-value form-control form-control-sm" id="${contractName}-${func.name}-stamp_limit" placeholder="e.g., 50000">
                 `;
                functionArgs.appendChild(stampElement);
                functionBox.appendChild(functionArgs);

                // Execute button
                const functionButton = document.createElement('button');
                functionButton.className = 'btn btn-sm btn-primary w-100'; // Full width small button
                functionButton.innerHTML = 'Execute';
                functionButton.addEventListener('click', () => executeContractFunction(contractName, func, functionButton)); // Pass button for disabling

                functionBox.appendChild(functionButton);
                functionBoxesContainer.appendChild(functionBox);
            });
    } catch (error) {
        console.error(`Error building function boxes for ${contractName}:`, error);
        functionBoxesContainer.innerHTML = `<div class="alert alert-danger">Error loading functions for ${contractName}.</div>`;
    }
}

// --- Execute Function (Called from Read-Only View) ---
async function executeContractFunction(contractName, funcInfo, executeButton) {
    const errorContainer = document.getElementById('submitContractError'); // Use IDE's error display
    const successContainer = document.getElementById('submitContractSuccess');
    errorContainer.style.display = 'none';
    successContainer.style.display = 'none';

    // Check lock state
    if (locked || !unencryptedMnemonic) {
        toast('warning', 'Wallet is locked. Unlock to execute functions.');
        return;
    }
    const selectedAccount = getSelectedAccount();
    if (!selectedAccount) {
        toast('danger', 'No account selected.');
        return;
    }

    // --- Build Kwargs ---
    let kwargs = {};
    let validationError = false;
    try {
         if (funcInfo.arguments && funcInfo.arguments.length > 0) {
             for (const arg of funcInfo.arguments) {
                 const inputElement = document.getElementById(`${contractName}-${funcInfo.name}-${arg.name}`);
                 if (!inputElement) {
                      throw new Error(`Missing input for argument '${arg.name}'.`);
                 }
                 const valueStr = inputElement.value;
                 kwargs[arg.name] = parseArgumentValue(valueStr, arg.type, arg.name); // Use helper
             }
         }
    } catch (error) {
         validationError = true;
         errorContainer.innerHTML = error.message;
         errorContainer.style.display = 'block';
         window.scrollTo(0, 0); // Scroll to show error
         return;
    }
    // --- End Build Kwargs ---

    // --- Get Stamp Limit ---
    const stampLimitInput = document.getElementById(`${contractName}-${funcInfo.name}-stamp_limit`);
    let stampsSupplied = parseInt(stampLimitInput.value, 10);

    if (isNaN(stampsSupplied) || stampsSupplied <= 0) {
         toast('info', 'No stamp limit provided, attempting estimation...');
          // If no stamp limit, try to estimate
          try {
             // Need to create a dummy payload for signing, then estimate
             let estimationPayload = { payload: { chain_id: CHAIN_ID, contract: contractName, function: funcInfo.name, kwargs: kwargs, stamps_supplied: 200000 }, metadata: { signature: "" } };
             const signedForEst = await signTransaction(estimationPayload, unencryptedMnemonic, selectedAccount.index);
             const estimateResult = await estimateStamps(signedForEst);
             if (!estimateResult.success || estimateResult.stamps === null) {
                 throw new Error(`Estimation failed: ${estimateResult.tx_result || 'Unknown reason'}`);
             }
             stampsSupplied = estimateResult.stamps + 50; // Add buffer
             toast('success', `Estimated stamp cost: ${stampsSupplied}`);
             stampLimitInput.value = stampsSupplied; // Update input field
          } catch (estError) {
               errorContainer.innerHTML = `Cannot execute: Stamp limit required or estimation failed. ${estError.message}`;
               errorContainer.style.display = 'block';
               window.scrollTo(0, 0);
               return;
          }
    }
     // --- End Get Stamp Limit ---

     // Check balance for fee
     try {
          const nativeBalanceStr = await execute_balance_of('currency', selectedAccount.vk);
          const nativeBalance = parseFloat(nativeBalanceStr);
          const stampRate = await getStampRate();
          if (isNaN(nativeBalance) || !stampRate || (stampsSupplied / stampRate) > nativeBalance) {
               errorContainer.innerHTML = `Insufficient XIAN balance for fee (${(stampsSupplied / stampRate).toFixed(4)} Xian needed).`;
               errorContainer.style.display = 'block';
               window.scrollTo(0, 0);
               return;
          }
     } catch (e) {
          errorContainer.innerHTML = `Error checking balance for fee: ${e.message}`;
          errorContainer.style.display = 'block';
          window.scrollTo(0, 0);
          return;
     }


    // --- Confirmation and Execution ---
    let conf = confirm(`Execute ${contractName}.${funcInfo.name}? Fee: ~${(stampsSupplied / await getStampRate()).toFixed(4)} Xian`);
    if (!conf) return;

    executeButton.disabled = true;
    executeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Executing...';
    window.scrollTo(0, 0); // Scroll to top to see status messages

    let payload = {
        payload: {
            chain_id: CHAIN_ID,
            contract: contractName,
            function: funcInfo.name,
            kwargs: kwargs,
            stamps_supplied: stampsSupplied
        },
        metadata: { signature: "" }
    };

    try {
        const signedTx = await signTransaction(payload, unencryptedMnemonic, selectedAccount.index);
        const response = await broadcastTransaction(signedTx);

         // Handle response (similar to sendAdvTx)
         if (response.error === 'timeout') {
             successContainer.innerHTML = 'Transaction broadcast timed out. Check Explorer.';
             successContainer.style.display = 'block';
             prependToTransactionHistory("TIMEOUT", contractName, funcInfo.name, kwargs, 'pending', new Date().toLocaleString());
         } else if (response && response.result && response.result.hash) {
            const hash = response.result.hash;
            let status = 'pending';
            let logMessage = response.result.log || "";

            if (response.result.code !== 0) {
                 status = 'error';
                 errorContainer.innerHTML = `Execution failed: ${logMessage}`;
                 errorContainer.style.display = 'block';
                 toast('danger', `Execution failed: ${logMessage.substring(0,100)}...`);
            } else {
                 successContainer.innerHTML = `Transaction sent! Hash: <a class='explorer-url text-light' href='${EXPLORER}/tx/${hash}' target='_blank' rel='noopener noreferrer'>${hash}</a>`;
                 successContainer.style.display = 'block';
                 toast('success', `Transaction sent: ${hash.substring(0,10)}...`);
            }
            prependToTransactionHistory(hash, contractName, funcInfo.name, kwargs, status, new Date().toLocaleString());
         } else {
            throw new Error('Unexpected response from network.');
         }

    } catch (error) {
        console.error("Error executing contract function:", error);
        errorContainer.innerHTML = `Error executing function: ${error.message}`;
        errorContainer.style.display = "block";
        toast('danger', `Error: ${error.message}`);
    } finally {
        executeButton.disabled = false;
        executeButton.innerHTML = 'Execute';
    }
}

// --- Submit Contract (Deployment) ---
async function submitContract() { // Made async
    const contractError = document.getElementById("submitContractError");
    const contractSuccess = document.getElementById("submitContractSuccess");
    const submitButton = document.getElementById('btn-ide-submit-contract');

    // Reset messages
    contractError.style.display = 'none';
    contractSuccess.style.display = 'none';
    window.scrollTo(0, 0); // Scroll to top

    // Check lock state
    if (locked || !unencryptedMnemonic) {
        contractError.innerHTML = 'Wallet is locked. Please unlock to deploy contracts.';
        contractError.style.display = 'block';
        return;
    }
    const selectedAccount = getSelectedAccount();
    if (!selectedAccount) {
        contractError.innerHTML = 'No account selected.';
        contractError.style.display = 'block';
        return;
    }

    // Get form values
    const contractNameInput = document.getElementById("submitContractName");
    const stampLimitInput = document.getElementById("submitContractstampLimit");
    const constructorKwargsInput = document.getElementById("submitContractconstructorKwargs");

    const contract = contractNameInput.value.trim();
    const stampLimitStr = stampLimitInput.value.trim();
    const constructorKwargsStr = constructorKwargsInput.value.trim();
    const contractCode = editor.getValue(); // Get code from CodeMirror

    // --- Validation ---
    if (contract === "" || !contract.startsWith('con_')) {
        contractError.innerHTML = 'Contract name is required and must start with "con_".';
        contractError.style.display = 'block';
        contractNameInput.focus();
        return;
    }
    if (stampLimitStr === "") {
        contractError.innerHTML = 'Stamp limit is required for deployment.';
        contractError.style.display = 'block';
        stampLimitInput.focus();
        return;
    }
    let stampLimit;
    try {
        stampLimit = parseInt(stampLimitStr, 10);
        if (isNaN(stampLimit) || stampLimit <= 0) throw new Error();
    } catch {
        contractError.innerHTML = 'Invalid stamp limit. Please enter a positive number.';
        contractError.style.display = 'block';
        stampLimitInput.focus();
        return;
    }
    let constructorKwargs = {};
    if (constructorKwargsStr !== "") {
        try {
            constructorKwargs = JSON.parse(constructorKwargsStr);
            if (typeof constructorKwargs !== 'object' || constructorKwargs === null) {
                 throw new Error("Constructor Kwargs must be a valid JSON object.");
            }
        } catch (error) {
            contractError.innerHTML = `Invalid constructor kwargs JSON: ${error.message}`;
            contractError.style.display = 'block';
            constructorKwargsInput.focus();
            return;
        }
    }
     // Check balance for deployment fee
     try {
          const nativeBalanceStr = await execute_balance_of('currency', selectedAccount.vk);
          const nativeBalance = parseFloat(nativeBalanceStr);
          const stampRate = await getStampRate();
          if (isNaN(nativeBalance) || !stampRate || (stampLimit / stampRate) > nativeBalance) {
               contractError.innerHTML = `Insufficient XIAN balance for deployment fee (${(stampLimit / stampRate).toFixed(4)} Xian needed).`;
               contractError.style.display = 'block';
               return;
          }
     } catch (e) {
          contractError.innerHTML = `Error checking balance for deployment fee: ${e.message}`;
          contractError.style.display = 'block';
          return;
     }
    // --- End Validation ---

    // Disable button
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deploying...';

    // --- Create Payload ---
    let payload = {
        payload: {
            chain_id: CHAIN_ID,
            contract: 'submission', // Target the submission contract
            function: 'submit_contract',
            kwargs: {
                name: contract,
                code: contractCode
            },
            stamps_supplied: stampLimit
            // nonce and sender added by signTransaction
        },
        metadata: { signature: "" }
    };
    // Add constructor args only if they were provided
    if (Object.keys(constructorKwargs).length > 0) {
        payload.payload.kwargs.constructor_args = constructorKwargs;
    }

    // --- Sign and Broadcast ---
    try {
        const signedTx = await signTransaction(payload, unencryptedMnemonic, selectedAccount.index);
        const response = await broadcastTransaction(signedTx);

         // Handle response (similar to other transactions)
          if (response.error === 'timeout') {
              successContainer.innerHTML = 'Deployment broadcast timed out. Check Explorer.';
              successContainer.style.display = 'block';
              prependToTransactionHistory("TIMEOUT", 'submission', 'submit_contract', { name: contract }, 'pending', new Date().toLocaleString()); // Simplified history for timeout
          } else if (response && response.result && response.result.hash) {
             const hash = response.result.hash;
             let status = 'pending';
             let logMessage = response.result.log || "";

             if (response.result.code !== 0) {
                  status = 'error';
                  contractError.innerHTML = `Deployment failed: ${logMessage}`;
                  contractError.style.display = 'block';
                  toast('danger', `Deployment failed: ${logMessage.substring(0,100)}...`);
             } else {
                  contractSuccess.innerHTML = `Deployment transaction sent! Hash: <a class='explorer-url text-light' href='${EXPLORER}/tx/${hash}' target='_blank' rel='noopener noreferrer'>${hash}</a>`;
                  contractSuccess.style.display = 'block';
                  toast('success', `Deployment sent: ${hash.substring(0,10)}...`);
                   // Optionally reset deployment state for this tab on success
                   delete deployment_started[current_tab];
                   saveDeploymentState();
                   changeTab(current_tab); // Refresh UI state
             }
             prependToTransactionHistory(hash, 'submission', 'submit_contract', { name: contract /* Optionally include code hash? */ }, status, new Date().toLocaleString());
          } else {
             throw new Error('Unexpected response from network during deployment.');
          }

    } catch (error) {
        console.error("Error submitting contract:", error);
        contractError.innerHTML = `Error submitting contract: ${error.message}`;
        contractError.style.display = "block";
        toast('danger', `Deployment Error: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        // Restore button text based on deployment state AFTER potential failure
        submitButton.innerHTML = deployment_started[current_tab] ? 'Deploy Contract' : 'Start Deployment';
    }
}


// --- Stamp Rate Loading ---
function loadStampRate() {
     const stampRateElement = document.getElementById("stampRate");
     if (!stampRateElement) return;
     stampRateElement.innerHTML = "<i class='fas fa-spinner fa-spin fa-xs'></i>"; // Loading indicator

    getStampRate().then((rate) => {
        if (rate === null) {
            stampRateElement.innerHTML = "ERR";
            toast('warning', 'Could not fetch current stamp rate.');
        } else {
            stampRateElement.innerHTML = rate.toLocaleString(); // Format rate
        }
    }).catch((error) => {
        console.error("Error getting stamp rate:", error);
        stampRateElement.innerHTML = "ERR";
         toast('danger', 'Error fetching stamp rate.');
    });
}

// --- Tab List Refresh ---
function refreshTabList() {
    const tabsEditor = document.getElementById('tabs-editor');
    if (!tabsEditor) return;
    tabsEditor.innerHTML = ''; // Clear existing tabs

    // Add existing tabs from code_storage
    Object.keys(code_storage).forEach((tab) => {
        let tabElement = document.createElement('div');
        tabElement.className = 'tab-editor';
        if (tab === current_tab) {
            tabElement.classList.add('active'); // Highlight current tab
        }
        tabElement.title = tab; // Show full name on hover

        // Tab Name (truncated)
        let tabNameSpan = document.createElement('span');
         // Shorten name for display if needed
         let displayName = tab.length > 20 ? tab.substring(0, 18) + '...' : tab;
         tabNameSpan.textContent = displayName;
         tabNameSpan.style.overflow = 'hidden';
         tabNameSpan.style.textOverflow = 'ellipsis';
         tabNameSpan.style.whiteSpace = 'nowrap';
         tabNameSpan.style.cursor = 'pointer';
         tabNameSpan.addEventListener('click', function () {
             if (current_tab !== tab) { // Avoid unnecessary reloads
                 changeTab(tab);
             }
         });

         tabElement.appendChild(tabNameSpan);


        // Close Button
        let closeTab = document.createElement('i');
        closeTab.className = 'fas fa-times ms-2'; // Added margin start
        closeTab.style.cursor = 'pointer';
        closeTab.style.fontSize = '0.8em'; // Make smaller
        closeTab.title = `Close ${tab}`;
        closeTab.addEventListener('click', function (event) {
            event.stopPropagation(); // Prevent tab switch on close click

            if (Object.keys(code_storage).length <= 1) {
                toast('warning', 'Cannot close the last file!');
                return;
            }

            if (confirm(`Are you sure you want to close "${tab}"? Unsaved changes might be lost if auto-save failed.`)) {
                const removed = removeTab(tab); // Attempt removal
                 if (removed) {
                     // If the removed tab was the current one, switch to the first available tab
                     if (tab === current_tab) {
                         const firstTab = Object.keys(code_storage)[0];
                         changeTab(firstTab); // This will also refresh the list
                     } else {
                         refreshTabList(); // Just refresh the list if a different tab was closed
                     }
                     toast('info', `Closed file "${tab}".`);
                 }
            }
        });

        tabElement.appendChild(closeTab);
        tabsEditor.appendChild(tabElement);
    });

    // Add the '+' button
    let addTabButton = document.createElement('div');
    addTabButton.className = 'add-tab-button';
    addTabButton.innerHTML = '<i class="fas fa-plus"></i>';
    addTabButton.title = 'New/Load File';
    addTabButton.addEventListener('click', showDropdown); // Use existing function to show options
    tabsEditor.appendChild(addTabButton);
}


// --- Event Listeners ---
document.getElementById('btn-ide-submit-contract')?.addEventListener('click', function () {
    const nameWrapper = document.getElementById('submitContractNameWrapper');
    const submitButton = document.getElementById('btn-ide-submit-contract');

    if (locked) {
        toast('warning', 'Wallet locked. Unlock to deploy.');
        return;
    }

    if (nameWrapper.style.display === 'none' || !deployment_started[current_tab]) {
        // Transition to deployment details state
        document.getElementById('submitContractNameWrapper').style.display = 'block';
        document.getElementById("submitContractName").value = current_tab.replace(/\.py$/i, ''); // Pre-fill name
        document.getElementById('submitContractstampLimitWrapper').style.display = 'block';
        document.getElementById('submitContractconstructorKwargsWrapper').style.display = 'block';
        submitButton.innerHTML = 'Deploy Contract';
        deployment_started[current_tab] = true; // Mark this tab as started
        saveDeploymentState(); // Persist state
    } else {
        // Already in deployment state, trigger submission
        submitContract(); // Call async submission function
    }
});

document.getElementById('btn-ide-go-to-wallet')?.addEventListener('click', function () {
    changePage('wallet'); // Use changePage for navigation
});

document.getElementById('ide-send-adv-tx')?.addEventListener('click', function () {
    changePage('send-advanced-transaction');
});


// --- Initialization ---
initializeEditor(); // Initialize CodeMirror
loadStampRate(); // Load initial stamp rate
refreshTabList(); // Build initial tab list

// Optional: Add listener for dark mode changes to update editor theme
// document.body.addEventListener('classChanged', function(e) { // Assuming a custom event or MutationObserver
//     if (editor) {
//         editor.setOption('theme', document.body.classList.contains('dark-mode') ? 'material-darker' : 'default');
//     }
// });