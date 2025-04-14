// Global reference for the current page, assumed from router.js
// Assumes global vars: accounts, selectedAccountIndex, unencryptedMnemonic, locked, RPC, EXPLORER, tx_history, token_list

var token_list = JSON.parse(localStorage.getItem("token_list")) || ["currency"];

// --- NFT Loading (Adapted for Selected Account) ---
async function getNFTData(nftKey) {
    // This function seems specific to a particular NFT standard (con_pixel_frames_info)
    // It remains largely unchanged internally but is called by the adapted loadNFTPage.
    let graphQLEndpoint = RPC + "/graphql"; // Ensure RPC is current
    try {
        let nftDataRes = await fetchWithTimeout(graphQLEndpoint, { // Use fetchWithTimeout
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `query NFTInfo {
                    allStates(
                        filter: { key: { startsWith: "con_pixel_frames_info.S:${nftKey}" } }
                    ) {
                        nodes { key value }
                    }
                }` // Simplified query name
            })
        });
        if (!nftDataRes.ok) throw new Error(`GraphQL query failed: ${nftDataRes.statusText}`);
        const nftData = await nftDataRes.json();
        // Basic check for expected data structure
        if (!nftData || !nftData.data || !nftData.data.allStates || !nftData.data.allStates.nodes) {
             console.warn(`Unexpected NFT data structure for key ${nftKey}:`, nftData);
             return null; // Return null if structure is wrong
        }
        // Extract specific fields based on assumed order/key names (fragile!)
        // It's better to filter by key name explicitly if possible.
        const nodes = nftData.data.allStates.nodes;
        const findValue = (keySuffix) => nodes.find(n => n.key.endsWith(keySuffix))?.value;

        return {
            name: findValue("name") || 'Unknown NFT', // Provide defaults
            description: findValue("description") || '',
            // Add other relevant fields if needed
        };
    } catch (error) {
        console.error(`Error fetching NFT data for key ${nftKey}:`, error);
        toast('danger', `Failed to load details for NFT ${nftKey.substring(0, 8)}...`);
        return null; // Return null on error
    }
}


async function loadNFTPage() {
    const nftListElement = document.getElementById("wallet-nfts");
    const refreshIcon = document.getElementById("wallet-refresh-all")?.querySelector("i");
    const selectedAccount = getSelectedAccount(); // Use helper from router.js

    if (!nftListElement || !selectedAccount) {
        console.error("NFT list element or selected account not found.");
        return;
    }

    // Start loading indicator
    nftListElement.innerHTML = `<div class="title-container"><h2 class="token-list-title">NFTs</h2></div>`;
    nftListElement.innerHTML += `<div class="loading-spinner" id="nft-loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading NFTs...</div>`;
    if (refreshIcon) refreshIcon.classList.add("fa-spin");

    let graphQLEndpoint = RPC + "/graphql";

    try {
        const response = await fetchWithTimeout(graphQLEndpoint, { // Use fetchWithTimeout
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `
                  query OwnedNFTs($ownerAddress: String!) {
                    allStates(
                      filter: {
                        key: { startsWith: "con_pixel_frames_info.S:", endsWith: ":owner" } # Adjusted key format assumption
                        value: { equalTo: $ownerAddress }
                      }
                      offset: 0
                      first: 100 # Consider pagination for large collections
                      orderBy: KEY_ASC # Or UPDATED_DESC if applicable
                    ) {
                      nodes { key }
                    }
                  }
                `,
                variables: { ownerAddress: selectedAccount.vk } // Pass selected VK as variable
            })
        });

        if (!response.ok) throw new Error(`GraphQL query failed: ${response.statusText}`);

        const data = await response.json();

        // Stop loading indicator
        const spinner = document.getElementById('nft-loading-spinner');
        if (spinner) spinner.remove();

        if (!data || !data.data || !data.data.allStates) {
             throw new Error("Unexpected GraphQL response structure for NFTs.");
        }

        const nfts = data.data.allStates.nodes;

        if (nfts.length === 0) {
            nftListElement.innerHTML += `<div class="text-center p-3">No NFTs found for this account.</div>`;
            return;
        }

        // Prepare container for NFT cards
        let containerNFTs = document.createElement("div");
        containerNFTs.className = "container row p-0 m-0"; // Added Bootstrap row class, reset padding/margin
         nftListElement.appendChild(containerNFTs);

        // Fetch details for each NFT concurrently
        const nftDetailPromises = nfts.map(async (nft) => {
            // Extract the NFT key (e.g., frame ID) - This depends heavily on the key structure
            // Example: "con_pixel_frames_info.S:FRAMEID123:owner" -> "FRAMEID123"
             const keyParts = nft.key.split(':');
             const nftAddress = keyParts.length >= 2 ? keyParts[keyParts.length - 2] : null; // Adjust index based on actual key structure


            if (!nftAddress) {
                console.warn("Could not extract NFT address from key:", nft.key);
                return null; // Skip if key format is unexpected
            }

            const nftData = await getNFTData(nftAddress);
            if (!nftData) return null; // Skip if data fetch failed

             // Create card HTML - ensure template literals handle potential nulls gracefully
             return `
             <div class="col-xl-3 col-lg-4 col-md-6 col-sm-6 col-12 mb-4"> <!-- Use Bootstrap grid and margin -->
                 <div class="card h-100" data-contract="${nftAddress || ''}" style="background-color:transparent; border: 1px solid #8a8b8e;"> <!-- Added h-100 for equal height -->
                     <img class="card-img-top" src="https://pixelsnek.xian.org/gif/${nftAddress || 'error'}.gif" alt="${nftData.name || 'NFT Image'}" onerror="this.style.display='none'"> <!-- Basic error handling -->
                     <div class="card-body d-flex flex-column justify-content-between"> <!-- Flex column for layout -->
                          <div> <!-- Group title and description -->
                             <h5 class="card-title token-symbol">${nftData.name}</h5>
                             <p class="card-text small">${nftData.description || ''}</p>
                          </div>
                         <a class="btn btn-sm send-btn mt-2" style="background-color: #ffffff; width: 100%; border-radius: 0 0 .25rem .25rem;" href="https://pixelsnek.xian.org/frames/${nftAddress || ''}" target="_blank" rel="noopener noreferrer"><i class="fas fa-eye"></i> View</a>
                     </div>
                 </div>
             </div>`;
        });

        // Wait for all details to be fetched and render
        const nftCardsHtml = (await Promise.all(nftDetailPromises)).filter(Boolean).join('');
        containerNFTs.innerHTML = nftCardsHtml;

    } catch (error) {
        console.error("Error loading NFTs:", error);
        const spinner = document.getElementById('nft-loading-spinner');
        if (spinner) spinner.innerHTML = `<i class="fas fa-exclamation-circle"></i> Error loading NFTs.`;
        else nftListElement.innerHTML += `<div class="text-center p-3 text-danger">Error loading NFTs.</div>`;
         toast('danger', 'Failed to load NFTs.');
    } finally {
        if (refreshIcon) refreshIcon.classList.remove("fa-spin");
    }
}


// --- Account Management UI ---

function populateAccountSwitcher() {
    const dropdownMenu = document.getElementById('accountListDropdown');
    if (!dropdownMenu) return;

    // Clear existing accounts (keeping the "Create Account" and divider)
    const existingItems = dropdownMenu.querySelectorAll('li:not(:first-child):not(:nth-child(2))');
    existingItems.forEach(item => item.remove());

    // Add current accounts
    accounts.forEach(account => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'dropdown-item d-flex justify-content-between align-items-center'; // Use flex for layout
        link.href = '#';
        link.dataset.index = account.index; // Store index for switching

        const nameSpan = document.createElement('span');
        nameSpan.textContent = account.name;
        nameSpan.style.overflow = 'hidden';
        nameSpan.style.textOverflow = 'ellipsis';
        nameSpan.style.whiteSpace = 'nowrap';
        nameSpan.style.flexGrow = '1';
        nameSpan.style.marginRight = '10px'; // Space before checkmark

        link.appendChild(nameSpan);


        if (account.index === selectedAccountIndex) {
            const checkIcon = document.createElement('i');
            checkIcon.className = 'fas fa-check text-success'; // Checkmark for selected
            link.appendChild(checkIcon);
            link.classList.add('active'); // Highlight selected
        }

        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchAccount(account.index);
        });

        listItem.appendChild(link);
        dropdownMenu.appendChild(listItem);
    });
}

async function switchAccount(index) {
    if (index === selectedAccountIndex) return; // No change needed

    selectedAccountIndex = index;
    await saveSelectedAccountIndex(index); // Save the new index persistently
    toast('info', `Switched to ${accounts.find(a=>a.index === index)?.name || 'Account'}`);
    changePage('wallet'); // Reload wallet page to reflect the change
}

async function createNewAccount() {
     if (locked || !unencryptedMnemonic) {
         toast('warning', 'Wallet must be unlocked to create a new account.');
         return;
     }

     const createButton = document.getElementById('wallet-add-account-btn');
     if (createButton) {
         createButton.innerHTML = '<i class="fas fa-spinner fa-spin fa-fw me-2"></i>Creating...';
         createButton.style.pointerEvents = 'none'; // Disable clicking
     }

     try {
         const nextIndex = accounts.length > 0 ? Math.max(...accounts.map(a => a.index)) + 1 : 0;
         const newKeyPair = deriveKeyPairFromMnemonic(unencryptedMnemonic, nextIndex); // Derive next key

         const newAccount = {
             index: nextIndex,
             vk: toHexString(newKeyPair.vk),
             name: `Account ${nextIndex + 1}` // Default name
         };

         accounts.push(newAccount);
         await saveAccounts(accounts); // Save updated accounts list

         toast('success', `Account "${newAccount.name}" created.`);
         switchAccount(nextIndex); // Switch to the new account and reload

     } catch (error) {
         console.error("Error creating new account:", error);
         toast('danger', 'Failed to create new account.');
          if (createButton) { // Restore button on error
               createButton.innerHTML = '<i class="fas fa-plus fa-fw me-2"></i>Create Account';
               createButton.style.pointerEvents = 'auto';
          }
     }
     // Button state is handled by the page reload via switchAccount on success
}


// --- Token List and Balance Refresh (Adapted for Selected Account) ---

async function refreshBalance(contract) {
    const selectedAccount = getSelectedAccount();
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
    const selectedAccount = getSelectedAccount(); // Get current account {index, vk, name}
    const refreshIcon = document.getElementById("wallet-refresh-all")?.querySelector("i");

    if (!selectedAccount) {
        console.log("Wallet locked or no account selected, cannot load wallet page.");
        if (!locked) changePage('password-input'); // Redirect to unlock if possible
        return;
    }

    if (refreshIcon) refreshIcon.classList.add("fa-spin");

    // Update Wallet Info Card
    document.getElementById("walletAddress").innerHTML = selectedAccount.vk;
    document.getElementById("selectedAccountName").innerHTML = selectedAccount.name || `Account ${selectedAccount.index + 1}`; // Display name or default
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


    // --- Load Local Activity (Remains unchanged for now) ---
    const localActivityList = document.getElementById("local-activity-list");
    localActivityList.innerHTML = ""; // Clear previous
    if (tx_history.length === 0) {
         localActivityList.innerHTML = `<div class="text-center p-3">No recent activity.</div>`;
    } else {
        tx_history.forEach((tx) => {
            // Determine status color/icon
            let statusIndicator;
            switch (tx.status) {
                case 'success': statusIndicator = '<i class="fas fa-check-circle text-success" title="Success"></i>'; break;
                case 'error': statusIndicator = '<i class="fas fa-times-circle text-danger" title="Error"></i>'; break;
                case 'pending':
                default: statusIndicator = '<i class="fas fa-spinner fa-spin" title="Pending"></i>'; break;
            }

             // Format timestamp
             const timestamp = tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A';
             // Basic display of kwargs - consider pretty printing for complex objects
             const kwargsDisplay = typeof tx.kwargs === 'object' ? JSON.stringify(tx.kwargs) : tx.kwargs;

            localActivityList.innerHTML += `
            <div class="activity-item">
                <div class="activity-details">
                    <div style="flex-basis: 10%; min-width: 40px;" class="text-center">${statusIndicator}</div>
                     <div style="flex-basis: 30%; min-width: 150px;" title="${tx.hash}"><strong class="me-2">Hash:</strong><a href="${EXPLORER}/tx/${tx.hash}" target="_blank" rel="noopener noreferrer" class="text-truncate d-inline-block" style="max-width: 120px;">${tx.hash}</a></div>
                     <div style="flex-basis: 20%; min-width: 100px;"><strong class="me-2">Contract:</strong>${tx.contract}</div>
                     <div style="flex-basis: 20%; min-width: 100px;"><strong class="me-2">Function:</strong>${tx.function}</div>
                     <div style="flex-basis: 20%; min-width: 150px;" class="text-muted small">${timestamp}</div>
                     <!-- Optionally display kwargs in a collapsed section -->
                     <!-- <details><summary>Params</summary><pre style="font-size: 0.8em; max-height: 100px; overflow: auto;">${kwargsDisplay}</pre></details> -->
                 </div>
                <!-- Actions removed for simplicity, View link is inline now -->
            </div>`;
        });
    }

    // Ensure correct tab is shown initially
    changeWalletTab('wallet-tokens'); // Default to tokens tab

    if (refreshIcon) refreshIcon.classList.remove("fa-spin");
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