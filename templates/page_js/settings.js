var customRPCs = JSON.parse(localStorage.getItem('customRPCs')) || [];
var renameModalInstance = null; // To hold the Bootstrap Modal instance

// --- RPC Management (Largely unchanged, minor tweaks) ---

function saveSettings() {
    let settingsSuccess = document.getElementById('settingsSuccess');
    let settingsError = document.getElementById('settingsError');
    settingsSuccess.style.display = 'none';
    settingsError.style.display = 'none';

    let selectedOptionValue = document.getElementById('rpc_select').value;
    let [rpc, explorer] = selectedOptionValue.split(','); // Destructure assignment

    if (!rpc || !explorer) {
        settingsError.innerHTML = 'Invalid network selection.';
        settingsError.style.display = 'block';
        return;
    }

    // Validation (already present, keep it)
    if (!rpc.startsWith('http')) { /* ... */ return; }
    if (rpc.endsWith('/')) { /* ... */ return; }
    if (!explorer.startsWith('http')) { /* ... */ return; }
    if (explorer.endsWith('/')) { /* ... */ return; }

    // Save to localStorage (still okay for non-sensitive RPC/Explorer URLs)
    localStorage.setItem("explorer", explorer);
    localStorage.setItem("rpc", rpc);
    RPC = rpc; // Update global RPC
    EXPLORER = explorer; // Update global Explorer

    // Update Online Status Indicator
    let online_status_element = document.getElementById("onlineStatus");
    if (online_status_element) {
        online_status_element.innerHTML = `<div class='mt-1px'><div class='grey-circle' title='Checking Status...'></div></div> <div>${RPC.replace("https://", "").replace("http://", "")}</div>`; // Initial state
        ping().then(online_status => {
            const statusIndicator = online_status
                ? "<div class='mt-1px'><div class='online-circle' title='Node is Online'></div></div>"
                : "<div class='mt-1px'><div class='offline-circle' title='Node is Offline'></div></div>";
            online_status_element.innerHTML = `${statusIndicator} <div>${RPC.replace("https://", "").replace("http://", "")}</div>`;
        }).catch(error => {
            online_status_element.innerHTML = "<div class='mt-1px'><div class='offline-circle' title='Node is Offline'></div></div> <div>" + RPC.replace("https://", "").replace("http://", "") + "</div>";
        });
    }

    // Verify Chain ID after changing RPC
    getChainID().then(chain_id => { // This will update global CHAIN_ID
        if (chain_id === null) {
            settingsError.style.display = 'block';
            settingsError.innerHTML = 'Error getting chain ID from the new RPC. Please check the URL.';
        } else {
            settingsSuccess.style.display = 'block';
            settingsSuccess.innerHTML = 'Network changed successfully!';
            // Optionally reload parts of the UI that depend on Chain ID or RPC data
            // e.g., reload wallet page if balance/tokens might differ
            if (app_page === 'wallet') {
                 loadWalletPage(); // If wallet page has this function globally accessible
            } else {
                 // Maybe just refresh balances if possible without full page reload
            }
        }
    });
}

function addCustomRPC() {
    let settingsSuccess = document.getElementById('settingsSuccess');
    let settingsError = document.getElementById('settingsError');
    settingsSuccess.style.display = 'none';
    settingsError.style.display = 'none';
    let customrpc_input = document.getElementById('add_rpc_input');
    let explorer_input = document.getElementById('add_explorer_input');
    let rpc = customrpc_input.value.trim();
    let explorer = explorer_input.value.trim();

    // Validation... (keep existing validation)
    if (rpc === "" || explorer === "") { /* ... */ return; }
    if (!rpc.startsWith('http')) { /* ... */ return; }
    if (rpc.endsWith('/')) { /* ... */ return; }
    if (!explorer.startsWith('http')) { /* ... */ return; }
    if (explorer.endsWith('/')) { /* ... */ return; }

    // Check if RPC already exists
    const exists = [...customRPCs, ["https://node.xian.org","dummy"], ["https://testnet.xian.org","dummy"]] // Include defaults for check
                     .some(network => network[0] === rpc);
    if (exists) {
        settingsError.innerHTML = 'This RPC URL is already in the list.';
        settingsError.style.display = 'block';
        return;
    }

    customRPCs.push([rpc, explorer]);
    localStorage.setItem('customRPCs', JSON.stringify(customRPCs)); // Save updated list
    customrpc_input.value = '';
    explorer_input.value = '';

    // Add to dropdown and select it
    let rpc_select = document.getElementById('rpc_select');
    let option = document.createElement('option');
    // Extract a user-friendly name from the URL
    let networkName = rpc.replace("https://", "").replace("http://", "").split('.')[0] || 'Custom';
    option.text = `Custom - ${networkName}`;
    option.value = `${rpc},${explorer}`;
    rpc_select.add(option);
    rpc_select.value = option.value; // Select the newly added option

    saveSettings(); // Trigger save and status update
    toast('success', 'Custom network added.');
}

function removeCustomRPC() {
    let settingsSuccess = document.getElementById('settingsSuccess');
    let settingsError = document.getElementById('settingsError');
    settingsSuccess.style.display = 'none';
    settingsError.style.display = 'none';
    let rpc_select = document.getElementById('rpc_select');
    let selectedValue = rpc_select.value;
    let [rpcToRemove, explorerToRemove] = selectedValue.split(',');

    // Prevent removing default networks
    if (rpcToRemove === "https://node.xian.org" || rpcToRemove === "https://testnet.xian.org") {
        settingsError.innerHTML = 'Standard networks cannot be removed.';
        settingsError.style.display = 'block';
        return;
    }

    // Find and remove from customRPCs array
    let initialLength = customRPCs.length;
    customRPCs = customRPCs.filter(network => network[0] !== rpcToRemove);

    if (customRPCs.length === initialLength) {
        settingsError.innerHTML = 'Selected network not found in custom list.'; // Should not happen if defaults check passed
        settingsError.style.display = 'block';
        return;
    }

    localStorage.setItem('customRPCs', JSON.stringify(customRPCs)); // Save updated list

    // Remove from dropdown
    for (let i = 0; i < rpc_select.options.length; i++) {
        if (rpc_select.options[i].value === selectedValue) {
            rpc_select.remove(i);
            break;
        }
    }

    // Select the first option (Mainnet) as default after removal
    rpc_select.selectedIndex = 0;
    saveSettings(); // Trigger save and status update for Mainnet
    toast('info', 'Custom network removed.');
}


// --- View Recovery Phrase ---
function setupRecoveryPhraseView() {
    const viewLink = document.getElementById('view_recovery_phrase_link');
    const confirmationDiv = document.getElementById('recovery_phrase_confirmation');
    const passwordInput = document.getElementById('recovery_phrase_password');
    const confirmButton = document.getElementById('confirm_view_recovery_phrase');
    const cancelButton = document.getElementById('cancel_view_recovery_phrase');
    const displayArea = document.getElementById('recovery_phrase_display_area');
    const phraseTextSpan = document.getElementById('recovery_phrase_text');
    const hideButton = document.getElementById('hide_recovery_phrase');
    const settingsError = document.getElementById('settingsError');

    viewLink.addEventListener('click', (e) => {
        e.preventDefault();
        settingsError.style.display = 'none'; // Clear previous errors
        // Hide display area if it was somehow left open
        displayArea.style.display = 'none';
        phraseTextSpan.textContent = '';
        // Show confirmation section
        confirmationDiv.style.display = 'block';
        passwordInput.value = ''; // Clear password field
        passwordInput.focus();
    });

    cancelButton.addEventListener('click', () => {
        confirmationDiv.style.display = 'none';
        passwordInput.value = '';
    });

    hideButton.addEventListener('click', () => {
        displayArea.style.display = 'none';
        phraseTextSpan.textContent = '';
    });

    confirmButton.addEventListener('click', async () => {
        const password = passwordInput.value;
        if (!password) {
            settingsError.innerHTML = 'Password is required.';
            settingsError.style.display = 'block';
            return;
        }

        confirmButton.disabled = true;
        confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        settingsError.style.display = 'none';


        try {
            const storedEncryptedSeed = await readEncryptedSeed();
            if (!storedEncryptedSeed) {
                throw new Error("Encrypted seed not found.");
            }

            // Attempt decryption
            const decryptedMnemonic = decryptSeed(storedEncryptedSeed, password);

            if (decryptedMnemonic === null) {
                settingsError.innerHTML = 'Incorrect password.';
                settingsError.style.display = 'block';
                passwordInput.value = ''; // Clear password on failure
                passwordInput.focus();
            } else {
                // Success! Display the phrase
                phraseTextSpan.textContent = decryptedMnemonic;
                displayArea.style.display = 'block';
                confirmationDiv.style.display = 'none'; // Hide confirmation
                passwordInput.value = '';
            }
        } catch (error) {
            console.error("Error viewing recovery phrase:", error);
            settingsError.innerHTML = 'Failed to retrieve recovery phrase. ' + error.message;
            settingsError.style.display = 'block';
        } finally {
            // Re-enable button
            confirmButton.disabled = false;
            confirmButton.innerHTML = 'Confirm';
        }
    });
}

// --- Import Account with Private Key ---
async function importPrivateKeyAccount() {
    const privateKeyInput = document.getElementById('importPrivateKeyInput');
    const accountNameInput = document.getElementById('importAccountNameInput');
    const passwordConfirmInput = document.getElementById('importPasswordConfirm');
    const importSkError = document.getElementById('importSkError');
    const importSkSuccess = document.getElementById('importSkSuccess');
    const importButton = document.getElementById('setting-import-private-key-btn');

    const privateKeyHex = privateKeyInput.value.trim();
    const accountName = accountNameInput.value.trim();
    const password = passwordConfirmInput.value; // Don't trim password

    // Reset messages
    importSkError.style.display = 'none';
    importSkSuccess.style.display = 'none';

    // --- Basic Validation ---
    if (!privateKeyHex || privateKeyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(privateKeyHex)) {
        importSkError.innerHTML = 'Invalid private key format (must be 64 hex characters).';
        importSkError.style.display = 'block';
        return;
    }
    if (!accountName) {
        importSkError.innerHTML = 'Account name cannot be empty.';
        importSkError.style.display = 'block';
        return;
    }
     if (accountName.length > 32) { // Add a reasonable length limit
         importSkError.innerHTML = 'Account name is too long (max 32 characters).';
         importSkError.style.display = 'block';
         return;
     }
    if (!password) {
        importSkError.innerHTML = 'Wallet password confirmation is required to encrypt the private key.';
        importSkError.style.display = 'block';
        return;
    }
    // --- End Basic Validation ---

    importButton.disabled = true;
    importButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';

    try {
        // Derive VK from SK using nacl
        const privateKeyBytes = fromHexString(privateKeyHex);
        // Use fromSeed to get the full keypair, including the public key part
        const keyPair = nacl.sign.keyPair.fromSeed(privateKeyBytes);
        const publicKeyHex = toHexString(keyPair.publicKey);

        // Check if account with this VK already exists
        if (accounts.some(acc => acc.vk === publicKeyHex)) {
            importSkError.innerHTML = 'This account (derived from the private key) already exists in your wallet.';
            importSkError.style.display = 'block';
            importButton.disabled = false;
            importButton.innerHTML = '<i class="fas fa-key"></i> Import Account';
            return;
        }

        // Encrypt the private key using the verified password
        const encryptedSk = encryptSk(privateKeyHex, password);

        // Create new account object
        const newAccount = {
            vk: publicKeyHex,
            name: accountName,
            encryptedSk: encryptedSk,
            type: 'imported', // Mark as imported
            // No 'index' field for imported accounts
        };

        // Add to accounts array and save
        accounts.push(newAccount);
        await saveAccounts(accounts);

        // If wallet is currently unlocked, add the decrypted key to the temporary store
        if (!locked) {
            unencryptedImportedSks[publicKeyHex] = privateKeyHex;
        }

        toast('success', `Account "${accountName}" imported successfully!`);

        // Clear the form fields
        privateKeyInput.value = '';
        accountNameInput.value = '';
        passwordConfirmInput.value = '';

        // Refresh the accounts list displayed on the settings page (if it exists)
        // loadAccountsList(); // You might need to implement/call this if you add a list to settings.html

    } catch (error) {
        console.error("Error importing private key:", error);
        importSkError.innerHTML = `Failed to import account: ${error.message}`;
        importSkError.style.display = 'block';
        toast('danger', `Failed to import account: ${error.message}`);
    } finally {
        importButton.disabled = false;
        importButton.innerHTML = '<i class="fas fa-key"></i> Import Account';
    }
}

// --- Account Management ---

async function loadAccountsList() {
    const listContainer = document.getElementById('account-list-settings');
    const loadingIndicator = document.getElementById('accounts-loading');

    if (!listContainer) return;

    // Show loading indicator
    loadingIndicator.style.display = 'block';
    // Clear previous list items except loading indicator
    listContainer.querySelectorAll('.list-group-item:not(#accounts-loading)').forEach(item => item.remove());

    try {
        accounts = await readAccounts(); // Refresh global accounts from storage
        selectedAccountVk = await readSelectedAccountVk(); // Refresh selected index

        if (accounts.length === 0) {
             listContainer.innerHTML = '<div class="list-group-item text-muted">No accounts found. Create one!</div>'; // Handle empty state
             return;
        }

        loadingIndicator.style.display = 'none'; // Hide loading

        accounts.sort((a, b) => a.index - b.index); // Ensure accounts are sorted by index

        accounts.forEach(account => {
            const item = document.createElement('div');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            if (account.vk === selectedAccountVk) {
                item.classList.add('active'); // Highlight selected account
            }

            const nameAndAddressDiv = document.createElement('div');
            nameAndAddressDiv.style.overflow = 'hidden'; // Prevent long names/addresses from breaking layout

            const nameSpan = document.createElement('span');
            nameSpan.textContent = account.name || `Account ${account.vk + 1}`; // Display name or default
            nameSpan.className = 'fw-bold'; // Make name bold

            const addressSpan = document.createElement('span');
            addressSpan.textContent = `${account.vk.substring(0, 6)}...${account.vk.substring(account.vk.length - 4)}`; // Truncated address
            addressSpan.className = 'text-muted small ms-2'; // Styling for address
            addressSpan.title = account.vk; // Show full address on hover

            nameAndAddressDiv.appendChild(nameSpan);
            nameAndAddressDiv.appendChild(addressSpan);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'btn-group btn-group-sm'; // Group buttons

            const renameButton = document.createElement('button');
            renameButton.className = 'btn btn-sm btn-outline-secondary';
            renameButton.innerHTML = '<i class="fas fa-pencil-alt"></i>';
            renameButton.title = 'Rename Account';
            renameButton.addEventListener('click', () => openRenameModal(account.vk, account.name));

            const switchButton = document.createElement('button');
            switchButton.className = 'btn btn-sm btn-outline-primary';
            switchButton.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
            switchButton.title = 'Switch to this Account';
             if (account.vk === selectedAccountVk) {
                 switchButton.disabled = true; // Disable switch for already selected account
             }
            switchButton.addEventListener('click', async () => {
                await saveSelectedAccountVk(account.vk);
                selectedAccountVk = account.vk; // Update global state
                toast('info', `Switched to account ${account.name || `Account ${account.vk + 1}`}`);
                loadAccountsList(); // Refresh list highlighting
                 // Optionally reload main wallet view: changePage('wallet');
            });

            actionsDiv.appendChild(renameButton);
            actionsDiv.appendChild(switchButton);

            item.appendChild(nameAndAddressDiv);
            item.appendChild(actionsDiv);

            listContainer.appendChild(item);
        });

    } catch (error) {
        console.error("Error loading accounts list:", error);
        loadingIndicator.textContent = 'Error loading accounts.';
        toast('danger', 'Failed to load accounts.');
    }
}


// async function createNewAccountSettings() {
//     const createButton = document.getElementById('setting-create-account-btn');
//     const settingsWarning = document.getElementById('settingsWarning');
//     settingsWarning.style.display = 'none'; // Hide warning

//     // Check if wallet is unlocked by checking for the unencryptedMnemonic
//     if (locked || !window.unencryptedMnemonic) {
//         settingsWarning.innerHTML = 'Please unlock your wallet to create a new account.';
//         settingsWarning.style.display = 'block';
//         // Optionally redirect to unlock page:
//         // changePage('password-input');
//         return;
//     }

//     createButton.disabled = true;
//     createButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

//     try {
//         // Determine the next index
//         const nextIndex = accounts.length > 0 ? Math.max(...accounts.map(a => a.index)) + 1 : 0;

//         // Derive the key pair for the new index
//         const newKeyPair = deriveKeyPairFromMnemonic(window.unencryptedMnemonic, nextIndex); // Use global mnemonic

//         const newAccount = {
//             index: nextIndex,
//             vk: toHexString(newKeyPair.vk),
//             name: `Account ${nextIndex + 1}` // Default name
//         };

//         // Add to global accounts array and save
//         accounts.push(newAccount);
//         await saveAccounts(accounts);

//         toast('success', `Account "${newAccount.name}" created.`);
//         loadAccountsList(); // Refresh the list in settings

//     } catch (error) {
//         console.error("Error creating new account:", error);
//         toast('danger', 'Failed to create new account: ' + error.message);
//     } finally {
//         createButton.disabled = false;
//         createButton.innerHTML = '<i class="fas fa-plus"></i> Create New Account';
//     }
// }

function openRenameModal(index, currentName) {
     // Initialize modal if it hasn't been already
     if (!renameModalInstance) {
        const modalElement = document.getElementById('renameAccountModal');
         if (modalElement) {
            renameModalInstance = new bootstrap.Modal(modalElement);
         } else {
             console.error("Rename modal element not found");
             return;
         }
     }

    document.getElementById('renameAccountIndex').value = index;
    document.getElementById('renameAccountName').value = currentName || `Account ${index + 1}`;
    renameModalInstance.show();
    // Focus the input field when modal is shown
     document.getElementById('renameAccountModal').addEventListener('shown.bs.modal', function () {
        document.getElementById('renameAccountName').focus();
        document.getElementById('renameAccountName').select();
    }, { once: true }); // Use 'once' to avoid attaching multiple listeners
}

async function saveNewAccountName() {
    const indexToRename = parseInt(document.getElementById('renameAccountIndex').value, 10);
    const newName = document.getElementById('renameAccountName').value.trim();

    if (isNaN(indexToRename)) {
        toast('danger', 'Invalid account index for rename.');
        return;
    }
    if (!newName) {
        toast('warning', 'Account name cannot be empty.');
        return;
    }
     if (newName.length > 32) { // Add a reasonable length limit
         toast('warning', 'Account name is too long (max 32 characters).');
         return;
     }


    try {
        // Find the account and update its name
        const accountIndexInArray = accounts.findIndex(acc => acc.index === indexToRename);
        if (accountIndexInArray === -1) {
            throw new Error("Account to rename not found in the list.");
        }

        accounts[accountIndexInArray].name = newName;

        // Save the updated accounts array
        await saveAccounts(accounts);

        toast('success', 'Account renamed successfully.');
        renameModalInstance.hide(); // Close the modal
        loadAccountsList(); // Refresh the list to show the new name

         // Also update the name in the main wallet header if it was the selected account
         if (indexToRename === selectedAccountVk && typeof updateSelectedAccountDisplay === 'function') {
            updateSelectedAccountDisplay(); // Assumes a function exists to update header/wallet view name
         }


    } catch (error) {
        console.error("Error renaming account:", error);
        toast('danger', 'Failed to rename account: ' + error.message);
    }
}


// --- Remove Wallet (HD Version) ---
async function removeWalletHD() { // Renamed to avoid conflict if old one is kept temporarily
    let confirm_delete = confirm("Are you sure you want to remove the wallet from this browser? This action will erase your encrypted recovery phrase and all derived accounts from this device. It cannot be undone without your original recovery phrase.");
    if (!confirm_delete) {
        return;
    }

    try {
        // Remove all HD wallet related data using async functions
        await removeEncryptedSeed();
        await removeAccounts();
        await removeSelectedAccountVk();
        // Clear transaction history (kept in localStorage for now)
        localStorage.removeItem('tx_history');

        // Reset global state variables immediately
        unencryptedMnemonic = null;
        encryptedSeed = null;
        accounts = [];
        selectedAccountVk = 0;
        locked = true;
        tx_history = [];

        toast('success', 'Wallet removed successfully.');
        changePage('get-started'); // Navigate to the initial setup page

    } catch (error) {
        console.error("Error removing wallet:", error);
        toast('danger', 'Failed to remove all wallet data.');
        // Still attempt to navigate away even if removal failed partially
        changePage('get-started');
    }
}

// --- Version Loading (Unchanged) ---
function readTextFile(file) {
    try {
        var rawFile = new XMLHttpRequest();
        var allText = null;
        rawFile.open("GET", file, false); // Synchronous request
        rawFile.onreadystatechange = function () {
            if (rawFile.readyState === 4) {
                if (rawFile.status === 200 || rawFile.status == 0) { // Allow 0 for local file access
                    allText = rawFile.responseText;
                } else {
                    console.error("Error reading file " + file + ": Status " + rawFile.status);
                }
            }
        }
        rawFile.send(null);
        return allText;
    } catch (e) {
        console.error("Exception reading file " + file + ":", e);
        return null; // Return null on error
    }
}

function loadWalletVersion() {
     const versionElement = document.getElementById('version');
     if (!versionElement) return;

     if (runningAsExtension()) {
         // Get version from extension manifest
         try {
             const manifest = chrome.runtime.getManifest();
             versionElement.innerHTML = manifest.version || 'N/A';
         } catch (e) {
             console.error("Could not get extension manifest:", e);
             versionElement.innerHTML = 'Error';
         }
     } else {
         // Attempt to fetch manifest.json (might fail due to CORS or path issues in web context)
         // Best practice for web would be to embed version during build process
         fetch('manifest.json') // Adjust path if needed
             .then(response => {
                 if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                 return response.json();
             })
             .then(manifest => {
                 versionElement.innerHTML = manifest.version || 'N/A';
             })
             .catch(error => {
                 console.warn("Could not fetch manifest.json for version:", error);
                 versionElement.innerHTML = 'N/A'; // Fallback for web
             });
     }
}


// --- Initial Load and Event Listeners ---
function loadSettingsPage() {
    // Load custom RPCs into dropdown
    let rpc_select = document.getElementById('rpc_select');
    // Clear existing custom options before adding new ones
    rpc_select.querySelectorAll('option').forEach(opt => {
         if (!opt.value.includes("node.xian.org") && !opt.value.includes("testnet.xian.org")) {
             opt.remove();
         }
     });
    if (customRPCs.length > 0) {
        customRPCs.forEach(rpcData => {
            let option = document.createElement('option');
            let networkName = rpcData[0].replace("https://", "").replace("http://", "").split('.')[0] || 'Custom';
            option.text = `Custom - ${networkName}`; // Display format
            option.value = `${rpcData[0]},${rpcData[1]}`;
            rpc_select.add(option);
        });
    }

    // Set selected RPC option
    const currentRPCValue = `${RPC},${EXPLORER}`;
    if ([...rpc_select.options].some(opt => opt.value === currentRPCValue)) {
         rpc_select.value = currentRPCValue;
    } else {
        // If current RPC isn't in list (e.g., removed custom), default to Mainnet
         console.warn("Current RPC not found in options, defaulting to Mainnet.");
         rpc_select.selectedIndex = 0; // Select Mainnet
         saveSettings(); // Update storage and global state
    }

    document.getElementById('setting-import-private-key-btn')?.addEventListener('click', importPrivateKeyAccount);

    loadWalletVersion(); // Load and display wallet version
    setupRecoveryPhraseView(); // Set up listeners for recovery phrase section
    loadAccountsList(); // Load and display accounts

    // Initialize rename modal instance (if not already done)
     if (!renameModalInstance) {
        const modalElement = document.getElementById('renameAccountModal');
         if (modalElement) {
            renameModalInstance = new bootstrap.Modal(modalElement);
         }
     }
}

// Attach event listeners
document.getElementById('rpc_select')?.addEventListener('change', saveSettings);
document.getElementById('add_rpc_button')?.addEventListener('click', addCustomRPC);
document.getElementById('remove_rpc_button')?.addEventListener('click', removeCustomRPC);
document.getElementById('remove_wallet_export')?.addEventListener('click', removeWalletHD);
// document.getElementById('setting-create-account-btn')?.addEventListener('click', createNewAccountSettings);
// document.getElementById('saveAccountNameBtn')?.addEventListener('click', saveNewAccountName);


// Initial load
loadSettingsPage();