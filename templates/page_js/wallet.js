// Global reference for the current page, assumed from router.js
// Assumes global vars: accounts, selectedAccountIndex, unencryptedMnemonic, locked, RPC, EXPLORER, tx_history, token_list

var token_list = JSON.parse(localStorage.getItem("token_list")) || ["currency"];

async function getNFTData(nftKey) {
    let graphQLEndpoint = RPC + "/graphql";
    let nftData = await fetch(graphQLEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: `query MyQuery {
                        i_0: allStates(
                        filter: {key: {startsWith: "con_pixel_frames_info.S:`+nftKey+`"}}
                        ) {
                        nodes {
                            key
                            value
                        }
                        }
                    }
            `
        })
    });
    const nftData_ = await nftData.json();
    return nftData_;
}

async function loadNFTPage() {
    const selectedAccount = await getSelectedAccount();
    document.getElementById("wallet-refresh-all").querySelector("i").classList.add("fa-spin");

    let nftList = document.getElementById("wallet-nfts");
    nftList.innerHTML = `<div class="title-container">
        <h2 class="token-list-title">NFTs</h2>
    </div>`;
    nftList.innerHTML += `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading NFTs...</div>`;

    // Fetch nft list
    let graphQLEndpoint = RPC + "/graphql";

    // POST request to GraphQL endpoint
    let response = await fetch(graphQLEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: `
  query MyQuery {
      allStates(
        filter: {
          key: { startsWith: "con_pixel_frames_info.S", endsWith: "owner" }
          value: {
            equalTo: "`+selectedAccount.vk+`"
          }
        }
        offset: 0
        first: 100
        orderBy: UPDATED_DESC
      ) {
        nodes {
          key
        }
      }
    }
  `
        })
    });
    const data = await response.json();
    let nfts = data.data.allStates.nodes;
    nftList.innerHTML = nftList.innerHTML.replace('<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading NFTs...</div>', '');
    if (nfts.length === 0) {
        nftList.innerHTML += `<div class="loading-spinner">No NFTs found</div>`;
    }
    let containerNFTs = document.createElement("div");
    containerNFTs.classList.add("container");
    containerNFTs.classList.add("row");
    nftList.appendChild(containerNFTs);
    nfts.forEach(nft => {
        let nftAddress = nft.key.split("S:")[1].split(":")[0];
        getNFTData(nftAddress).then((nftData) => {
            let nftName = nftData.data.i_0.nodes[9].value;
            let nftDescription = nftData.data.i_0.nodes[3].value;
            containerNFTs.innerHTML += `
            <div class="col-xl-3 col-lg-4 col-md-4 col-sm-6 col-12" style="margin-bottom:30px;">
                <div class="card" style="background-color:transparent;    border: 1px solid #8a8b8e;height: 100%;" data-contract="${nftAddress}">
                    <img class="card-img-top" src="https://pixelsnek.xian.org/gif/${nftAddress}.gif" alt="Card image cap">
                    <div class="card-body" style="    flex-direction: column;
    justify-content: space-between;    gap: 1rem;"
                        <div class="token-title-container">
                            <div class="token-name"><span class="token-symbol">${nftName}</span><br><span style="font-weight:400">${nftDescription}</span></div>
                        </div>
                        <a class="btn send-btn" style="
    background-color: #ffffff;
    width: unset;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    " data-contract="${nftAddress}" href="https://pixelsnek.xian.org/frames/${nftAddress}" target="_blank"><i class="fas fa-eye"></i> View</a>
                    </div>
                </div>
            </div>`;
        });

    });

    document.getElementById("wallet-refresh-all").querySelector("i").classList.remove("fa-spin");
}


// --- Account Management UI ---

function populateAccountSwitcher() {
    const dropdownMenu = document.getElementById('accountListDropdown');
    if (!dropdownMenu) {
        console.error("Account dropdown menu element (#accountListDropdown) not found!");
        return;
    }

    // *** Add check for static items before clearing ***
    const createAccountLink = document.getElementById('wallet-add-account-btn');
    const divider = dropdownMenu.querySelector('li hr.dropdown-divider');
    if (!createAccountLink || !divider) {
        console.error("Static 'Create Account' link or divider missing from dropdown menu structure!");
        // Avoid proceeding if the base structure is broken
        return;
    }
    // *** End check ***


    // Ensure global accounts array is available and is an array
    if (typeof accounts === 'undefined' || !Array.isArray(accounts)) {
        console.error("Global 'accounts' variable is missing or not an array during populateAccountSwitcher.");
        return;
    }

    // Clear only dynamic items
    dropdownMenu.querySelectorAll('li.dynamic-account-item').forEach(item => item.remove());

    // Sort accounts (optional, e.g., by type then name or original index)
    // Let's keep the original sort for now, but be mindful derived indices aren't sequential if imports exist
    const sortedAccounts = [...accounts].sort((a, b) => (a.index ?? Infinity) - (b.index ?? Infinity)); // Sort derived first, then imported

    console.log("Populating dropdown with accounts:", sortedAccounts);

    const createAccountListItem = createAccountLink.closest('li');

    sortedAccounts.forEach(account => {
        // Validate account object (check for vk)
        if (!account || !account.vk) {
            console.warn("Skipping invalid account object during dropdown population:", account);
            return;
        }

        const listItem = document.createElement('li');
        listItem.classList.add('dynamic-account-item');

        const link = document.createElement('a');
        link.className = 'dropdown-item d-flex justify-content-between align-items-center';
        link.href = '#';
        // Store VK in dataset for the click listener
        link.dataset.vk = account.vk;

        const nameSpan = document.createElement('span');
        // Determine default name based on type
        let defaultName = account.type === 'imported' ? `Imported Account` : `Account ${account.index + 1}`;
        if (account.type === 'imported' && !account.index) { // Add a visual cue for imported potentially
             // Find its position in the sorted array to give a pseudo-index for display if needed
             const displayIndex = sortedAccounts.findIndex(a => a.vk === account.vk);
             defaultName = `Imported ${displayIndex + 1}`;
        }
        nameSpan.textContent = account.name || defaultName;
        nameSpan.title = account.vk; // Tooltip shows full VK
        nameSpan.classList.add('text-truncate');
        nameSpan.style.flexGrow = "1";
        nameSpan.style.marginRight = "10px";
        nameSpan.style.maxWidth = "calc(100% - 35px)";

        link.appendChild(nameSpan);

        // Use selectedAccountVk for checkmark
        if (account.vk === selectedAccountVk) {
            const checkIcon = document.createElement('i');
            checkIcon.className = 'fas fa-check text-success flex-shrink-0';
            link.appendChild(checkIcon);
        }

        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Call switchAccount with the VK stored in the dataset
            switchAccount(e.currentTarget.dataset.vk);
        });

        listItem.appendChild(link);

        if (createAccountListItem) {
            dropdownMenu.insertBefore(listItem, createAccountListItem);
        } else {
            dropdownMenu.appendChild(listItem);
        }
    });
}

async function switchAccount(vkToSwitchTo) { // Parameter is now VK
    if (vkToSwitchTo === selectedAccountVk) return; // No change needed

    selectedAccountVk = vkToSwitchTo;
    await saveSelectedAccountVk(vkToSwitchTo); // Save the new VK persistently
    const switchedAccount = accounts.find(a => a.vk === vkToSwitchTo);
    toast('info', `Switched to ${switchedAccount?.name || 'Account'}`);
    changePage('wallet'); // Reload wallet page to reflect the change
}

async function createNewAccount() {
    if (locked || !unencryptedMnemonic) {
        toast('warning', 'Wallet must be unlocked to create a new derived account.');
        // Wallet must be unlocked and mnemonic available to derive new keys.
        return;
    }

    const createButton = document.getElementById('wallet-add-account-btn');
    if (createButton) {
        // Disable button visually during creation
        createButton.innerHTML = '<i class="fas fa-spinner fa-spin fa-fw me-2"></i>Creating...';
        createButton.style.pointerEvents = 'none';
    }

    try {
        // --- CORRECTED INDEX CALCULATION ---
        // 1. Filter the accounts array to get only the ones derived from the mnemonic
        const derivedAccounts = accounts.filter(acc => acc.type === 'derived' && typeof acc.index === 'number');

        // 2. Calculate the next available derivation index
        // If there are existing derived accounts, find the max index and add 1.
        // If there are no derived accounts yet, start with index 0.
        const nextIndex = derivedAccounts.length > 0
            ? Math.max(...derivedAccounts.map(a => a.index)) + 1
            : 0;
        // --- END CORRECTION ---

        console.log(`Attempting to derive new account at index: ${nextIndex}`);

        // Derive the key pair for the *new derived* account index
        const newKeyPair = deriveKeyPairFromMnemonic(unencryptedMnemonic, nextIndex);

        // Create the new account object, ensuring type is 'derived'
        const newAccount = {
            index: nextIndex, // Store the calculated derivation index
            vk: toHexString(newKeyPair.vk),
            name: `Account ${nextIndex + 1}`, // Default name using the index
            type: 'derived'                 // Explicitly set the type
        };

        // Add the new account to the global list and save
        accounts.push(newAccount);
        await saveAccounts(accounts); // Persist the updated list

        toast('success', `Account "${newAccount.name}" created successfully.`);

        // Switch to the newly created account using its VK
        // switchAccount handles saving the new selected VK and reloading the page
        switchAccount(newAccount.vk);

    } catch (error) {
        console.error("Error creating new derived account:", error);
        toast('danger', `Failed to create new account: ${error.message}`);
        // Restore button state on error
        if (createButton) {
             createButton.innerHTML = '<i class="fas fa-plus fa-fw me-2"></i>Create Account';
             createButton.style.pointerEvents = 'auto';
        }
    }
    // On success, the page reload initiated by switchAccount will restore the button state.
}


// --- Token List and Balance Refresh (Adapted for Selected Account) ---

async function refreshBalance(contract) {
    const selectedAccount = await getSelectedAccount();
    if (!selectedAccount) return; // No account selected or wallet locked

    const balanceElement = document.getElementById(`${contract}Balance`);
    if (!balanceElement) return; // Element not found

    balanceElement.innerHTML = `<i class='fas fa-spinner fa-spin fa-xs'></i>`; // Loading indicator

    try {
        // Use execute_balance_of which now takes the address directly
        let balance = await execute_balance_of(contract, selectedAccount.vk);
         if (balance === null || balance === undefined) {
             balanceElement.innerHTML = 'Error'; // Indicate error if null/undefined returned
             console.warn(`Null balance returned for ${contract} on account ${selectedAccount.index}`);
         } else {
             // Ensure balance is a number string, format it
             let formattedBalance = parseFloat(balance);
             if (isNaN(formattedBalance)) {
                 balanceElement.innerHTML = 'Invalid'; // Handle NaN case
                 console.warn(`Invalid balance value received for ${contract}: ${balance}`);
             } else {
                // Format with commas and decimals
                 balanceElement.innerHTML = formattedBalance.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 });
             }
         }
    } catch (error) {
        console.error(`Error fetching balance for ${contract}:`, error);
        balanceElement.innerHTML = 'Error'; // Display error in UI
    }
}

// --- Main Wallet Page Loading Logic ---

async function loadWalletPage() {
    const selectedAccount = await getSelectedAccount(); // Get current account {index, vk, name}
    const refreshIcon = document.getElementById("wallet-refresh-all")?.querySelector("i");

    if (!selectedAccount) {
        console.log("Wallet locked or no account selected, cannot load wallet page.");
        if (!locked) changePage('password-input'); // Redirect to unlock if possible
        return;
    }

    if (refreshIcon) refreshIcon.classList.add("fa-spin");

    // Update Wallet Info Card
    document.getElementById("walletAddress").innerHTML = selectedAccount.vk;
    document.getElementById("selectedAccountName").innerHTML = selectedAccount.name || (selectedAccount.type === 'imported' ? 'Imported Account' : `Account ${selectedAccount.index + 1}`);
    populateAccountSwitcher(); // Populate the account dropdown

    // --- Load Tokens ---
    const tokenListElement = document.getElementById("wallet-tokens");
    tokenListElement.innerHTML = `
        <div class="title-container">
            <div class="create-token-link" style="font-size:1rem; cursor: pointer;">
                <i class="fas fa-coins" title="Create Token"></i> Create Token
            </div>
            <h2 class="token-list-title">Tokens</h2>
            <div class="cogwheel-icon add-token-link" style="font-size:1rem; cursor: pointer;">
                <i class="fas fa-plus-circle" title="Add Token"></i> Add Token
            </div>
        </div>
        <div class="loading-spinner" id="token-loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading tokens...</div>`;

    try {
        // Fetch info for all tokens concurrently
        const tokenInfoPromises = token_list.map(tokenContract => getTokenInfo(tokenContract));
        const tokenInfos = await Promise.all(tokenInfoPromises);

        // Clear spinner
        const spinner = document.getElementById('token-loading-spinner');
        if (spinner) spinner.remove();

        let tokenHtml = '';
        tokenInfos.forEach(tokenInfo => {
            // Skip tokens that failed to load (marked with special name/symbol)
             if (!tokenInfo || tokenInfo.name === "\x9Eée" || tokenInfo.symbol === "\x9Eée") {
                 console.warn(`Skipping token rendering for contract: ${tokenInfo?.contract || 'unknown'}`);
                 return;
             }

            const isXian = tokenInfo.contract === "currency";
            const iconSrc = isXian ? "assets/xian-white.svg" : (tokenInfo.token_logo_url || ''); // Use '' if null
            const placeholderIcon = placeholder.getData({ text: (tokenInfo.symbol || '?').charAt(0).toUpperCase(), bgcolor: '#333', color: '#fff', ffamily: 'Roboto Mono', size: '64x64' });

            tokenHtml += `
                <div class="token-item" data-contract="${tokenInfo.contract}">
                    <div class="token-details">
                        <div class="token-title-container">
                            <img class="token-icon" src="${iconSrc}" alt="${tokenInfo.symbol || '?'}" onerror="this.onerror=null; this.src='${placeholderIcon}';">
                            <div class="token-name">
                                <span class="token-symbol">${tokenInfo.symbol || '???'}</span><br>
                                <a class="small" style="font-weight:400; color: #aaa;" target="_blank" rel="noopener noreferrer" href="${EXPLORER}/contracts/${tokenInfo.contract}">${tokenInfo.name || tokenInfo.contract}</a>
                             </div>
                        </div>
                    </div>
                    <div class="token-balance"><span id="${tokenInfo.contract}Balance"><i class='fas fa-spinner fa-spin fa-xs'></i></span> <span>${tokenInfo.symbol || ''}</span></div>
                    <div class="token-actions">
                        ${!isXian ? `<button class="btn remove-btn btn-sm btn-danger" data-contract="${tokenInfo.contract}" title="Remove Token"><i class="fas fa-minus-circle"></i></button>` : ''}
                        <button class="btn send-btn btn-sm" style="background-color: #ffffff;" data-contract="${tokenInfo.contract}"><i class="fas fa-paper-plane"></i> Send</button>
                        <!-- Receive button might be less necessary if address is always visible -->
                        <!-- <button class="btn receive-btn btn-sm" style="background-color: #ffffff;" data-contract="${tokenInfo.contract}"><i class="fas fa-download"></i> Receive</button> -->
                    </div>
                </div>`;
        });
        tokenListElement.innerHTML += tokenHtml; // Append all generated HTML at once

        // Refresh balances for all displayed tokens
        tokenInfos.forEach(tokenInfo => {
            if (tokenInfo && tokenInfo.name !== "\x9Eée") {
                refreshBalance(tokenInfo.contract);
            }
        });

        setupTokenEventListeners(); // Setup listeners after elements are in DOM

    } catch (error) {
        console.error("Error loading token list:", error);
         const spinner = document.getElementById('token-loading-spinner');
         if (spinner) spinner.innerHTML = `<i class="fas fa-exclamation-circle"></i> Error loading tokens.`;
         else tokenListElement.innerHTML += `<div class="text-center p-3 text-danger">Error loading tokens.</div>`;
         toast('danger', 'Failed to load token list.');
    }
        
    let local_activity = document.getElementById("local-activity-list");
    local_activity.innerHTML = "";
    tx_history.forEach((tx) => {
        local_activity.innerHTML += `
        <div class="activity-item">
            <div class="activity-details">
                <div class="activity-hash">`+tx["hash"]+`</div>
                <div class="activity-contract">`+tx["contract"]+`</div>
                <div class="activity-function">`+tx["function"]+`</div>
                <div class="activity-status">`+tx["status"]+`</div>
                <div class="activity-timestamp">`+tx["timestamp"]+`</div>
            </div>
            <div class="activity-actions">
                <a href="`+EXPLORER+`/tx/`+tx["hash"]+`" target="_blank"><i class="fas fa-eye"></i> View</a>
            </div>
        </div>`;
    });

    if (local_activity.innerHTML === "") {
        local_activity.innerHTML = `<div class="activity-item">
            <div class="activity-details">
                <div class="activity-hash">No recent activity</div>
            </div>
        </div>`;
    }
    
    document.getElementById("wallet-refresh-all").querySelector("i").classList.remove("fa-spin");       
}

// --- Event Listener Setup ---
function setupTokenEventListeners() {
    // Error handling for token icons (already present, ensure placeholder logic is robust)
    document.querySelectorAll('.token-icon').forEach(icon => {
        icon.addEventListener('error', function handleImageError() {
             // Generate placeholder dynamically based on alt text (symbol)
             const symbol = this.alt || '?';
             const placeholderIcon = placeholder.getData({ text: symbol.charAt(0).toUpperCase(), bgcolor: '#333', color: '#fff', ffamily: 'Roboto Mono', size: '64x64' });
            this.src = placeholderIcon;
            this.onerror = null; // Prevent infinite loop if placeholder also fails
        });
         // If src is initially empty, set placeholder
         if (!icon.getAttribute('src')) {
             const symbol = icon.alt || '?';
             const placeholderIcon = placeholder.getData({ text: symbol.charAt(0).toUpperCase(), bgcolor: '#333', color: '#fff', ffamily: 'Roboto Mono', size: '64x64' });
             icon.src = placeholderIcon;
         }
    });

    // Send button listeners
    document.querySelectorAll('.token-item .send-btn').forEach(button => {
        button.addEventListener('click', function() {
            const contract = this.getAttribute('data-contract');
            // Pass the contract name to the send token screen
            changePage('send-token', contract);
        });
    });

    // Remove button listeners
    document.querySelectorAll('.token-item .remove-btn').forEach(button => {
        button.addEventListener('click', function() {
            const contract = this.getAttribute('data-contract');
            removeToken(contract); // Call remove function
        });
    });

     // Add Token link listener
     const addTokenLink = document.querySelector('.add-token-link');
     if (addTokenLink) {
         addTokenLink.addEventListener('click', function() {
             changePage('add-to-token-list');
         });
     } else { console.warn("Add token link not found"); }

     // Create Token link listener
     const createTokenLink = document.querySelector('.create-token-link');
      if (createTokenLink) {
          createTokenLink.addEventListener('click', function() {
              changePage('create-token');
          });
      } else { console.warn("Create token link not found"); }

      // Add account button listener (in dropdown)
      const addAccountBtn = document.getElementById('wallet-add-account-btn');
       if (addAccountBtn) {
           addAccountBtn.addEventListener('click', (e) => {
               e.preventDefault();
               createNewAccount();
           });
       } else { console.warn("Add account button not found"); }
}

// --- Tab Switching Logic ---
function changeWalletTab(tabId) {
    const tabs = ['wallet-tokens', 'wallet-nfts', 'local-activity'];
    const tabLinks = {
        'wallet-tokens': 'wallet-tokens-tab',
        'wallet-nfts': 'wallet-nfts-tab',
        'local-activity': 'local-activity-tab'
    };

    tabs.forEach(id => {
        const element = document.getElementById(id);
        const link = document.getElementById(tabLinks[id]);
        if (element && link) {
            if (id === tabId) {
                element.style.display = 'flex'; // Assuming flex is the default display
                link.classList.add('active');
                 if (id === 'wallet-nfts') { // Load NFTs only when tab is activated
                    loadNFTPage();
                 }
            } else {
                element.style.display = 'none';
                link.classList.remove('active');
            }
        }
    });
}

// --- Action Functions ---

function clearLocalActivity() {
    let confirm_clear = confirm("Are you sure you want to clear the local activity history?");
    if (!confirm_clear) return;

    tx_history = []; // Clear global array
    localStorage.removeItem('tx_history'); // Clear persistent storage
    loadWalletPage(); // Reload to show empty state
    toast('info', 'Local activity cleared.');
}

function removeToken(contract) {
    // Prevent removing the native currency
    if (contract === 'currency') {
        toast('warning', 'Cannot remove the native Xian token.');
        return;
    }

    let confirmation = confirm(`Are you sure you want to remove token "${contract}" from the list? This will not affect your balance.`);
    if (!confirmation) return;

    token_list = token_list.filter((token) => token !== contract);
    localStorage.setItem("token_list", JSON.stringify(token_list));
    loadWalletPage(); // Reload the wallet page to reflect the change
    toast('info', `Token ${contract} removed from list.`);
}

// --- Event Listeners attached at the end or in setup ---

document.getElementById('wallet-tokens-tab')?.addEventListener('click', (e) => { e.preventDefault(); changeWalletTab('wallet-tokens'); });
document.getElementById('wallet-nfts-tab')?.addEventListener('click', (e) => { e.preventDefault(); changeWalletTab('wallet-nfts'); });
document.getElementById('local-activity-tab')?.addEventListener('click', (e) => { e.preventDefault(); changeWalletTab('local-activity'); });

document.getElementById('wallet-clear-local-activity')?.addEventListener('click', clearLocalActivity);

document.getElementById('wallet-refresh-all')?.addEventListener('click', (e) => { e.preventDefault(); loadWalletPage(); });

document.getElementById('wallet-copy-address')?.addEventListener('click', (e) => { e.preventDefault(); copyToClipboard('walletAddress'); });

document.getElementById('wallet-send-adv-tx')?.addEventListener('click', (e) => { e.preventDefault(); changePage('send-advanced-transaction'); });


// Initial load when the script runs (assuming it's loaded via changePage)
loadWalletPage();