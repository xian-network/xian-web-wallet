var token_list = JSON.parse(localStorage.getItem("token_list")) || ["currency"];

async function syncTokenList() {
    try {
        const response = await fetch("https://snakexchange.org/scripts/tokenlist.txt");
        const text = await response.text();
        const lines = text.trim().split('\n');

        // Extract contracts
        const contracts = lines.map(line => line.split(";")[2]).filter(Boolean);

        let storedTokens = JSON.parse(localStorage.getItem("token_list")) || ["currency"];
        let removedTokens = JSON.parse(localStorage.getItem("removed_token_list")) || [];
        let updated = false;

        contracts.forEach(contract => {
            if (!storedTokens.includes(contract) && !removedTokens.includes(contract)) {
                storedTokens.push(contract);
                updated = true;
            }
        });

        if (updated) {
            localStorage.setItem("token_list", JSON.stringify(storedTokens));
        }

        // Reflect updated list globally
        token_list = storedTokens;
    } catch (e) {
        console.error("Failed to sync token list:", e);
    }
}



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
            equalTo: "`+publicKey+`"
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
                        <a class="btn btn-ghost" data-contract="${nftAddress}" href="https://pixelsnek.xian.org/frames/${nftAddress}" target="_blank"><i class="fas fa-eye"></i> View</a>
                    </div>
                </div>
            </div>`;
        });

    });

    document.getElementById("wallet-refresh-all").querySelector("i").classList.remove("fa-spin");
}


function loadWalletPage() {
    if (typeof initializeTxHistory === 'function') {
        initializeTxHistory();
    }
    
    // Start by reading the publicKey
    readSecureCookie("publicKey")
        .then((publicKey) => {
            document.getElementById("walletAddress").innerHTML = publicKey;
            let tokenList = document.getElementById("wallet-tokens");
            tokenList.innerHTML = `<div class="token-bar">
                <div class="token-bar-left">
                    <button type="button" class="btn btn-ghost create-token-link" aria-label="Create Token" title="Create Token">
                        <i class="icon" data-lucide="badge-plus"></i> Create Token
                    </button>
                </div>
                <h2 class="token-list-title">Tokens</h2>
                <div class="token-bar-right">
                    <button type="button" class="btn btn-ghost add-token-link" aria-label="Add Token" title="Add Token">
                        <i class="icon" data-lucide="plus"></i> Add Token
                    </button>
                </div>
            </div>
            <div class="token-table-container">
                <div class="token-table-header">
                    <div class="header-token">Token</div>
                    <div class="header-balance">Balance</div>
                    <div class="header-actions">Actions</div>
                </div>
                <div class="token-table-body">
                </div>
            </div>`;
             lucide.createIcons();
            // Spinner for loading tokens
            document.querySelector('.token-table-body').innerHTML = `<div class="loading-spinner"><i class="icon" data-lucide="sync-alt"></i> Loading tokens...</div>`;


            // Fetch information for each token with error handling for each promise
            const tokenInfoPromises = token_list.map(token =>
                getTokenInfo(token).catch(e => {
                    console.error("Error fetching token info for token:", token, e);
                    return null;  // Return null so other fetches can continue
                })
            );

            // Process each token information
            return Promise.all(tokenInfoPromises)
                .then(tokenInfos => {
                    const tokenTableBody = document.querySelector('.token-table-body');
                    tokenInfos.forEach(tokenInfo => {
                        if (tokenInfo.name === "\x9Eée" || tokenInfo.symbol === "\x9Eée") {
                            return;
                        }
                        if (tokenInfo) {
                            tokenTableBody.innerHTML += `
                            <div class="token-item" data-contract="${tokenInfo.contract}">
                                <div class="token-details">
                                        <div class="token-title-container">
                                        <img class="token-icon" src="${tokenInfo.symbol === "Xian" ? "assets/xian-white.svg" : tokenInfo.token_logo_url}" alt="${tokenInfo.symbol}">
                                        <div class="token-name"><a style="font-weight:400" target="_blank" href="`+EXPLORER+`/contracts/${tokenInfo.contract}">${tokenInfo.symbol}</a></div>
                                    </div>
                                </div>
                                <div class="token-balance"><span id="${tokenInfo.contract}Balance">0</span>&nbsp;<span>${tokenInfo.symbol}</span></div>
                                <div class="token-actions">
                                    ${tokenInfo.contract === "currency" ? "" : `<button class=\"btn btn-danger btn-icon-only remove-btn\" data-contract=\"${tokenInfo.contract}\" title=\"Remove Token\"><i class=\"icon\" data-lucide=\"trash-2\" title=\"Remove Token\"></i></button>`}
                                    <button class="btn btn-secondary send-btn" style="max-width:15rem" data-contract="${tokenInfo.contract}"><i class="icon" data-lucide="send"></i> Send</button>
                                    <button class="btn btn-ghost receive-btn" style="max-width:15rem" data-contract="${tokenInfo.contract}"><i class="icon" data-lucide="download"></i> Receive</button>
                                </div>
                            </div>`;
                            refreshBalance(tokenInfo.contract);
                        }
                    });
                    tokenTableBody.innerHTML = tokenTableBody.innerHTML.replace('<div class="loading-spinner"><i class="icon" data-lucide="sync-alt"></i> Loading tokens...</div>', '');
                    setupTokenEventListeners();  // Setup event listeners after tokens are loaded
                    lucide.createIcons();
                });
            
        })
        .catch(error => {
            console.error("Error loading wallet page:", error);
        })
        .finally(() => {
            // Load full transaction history from network (includes both local and on-chain)
            // Add a small delay to ensure all scripts are loaded
            setTimeout(() => {
                loadTransactionHistory();
            }, 100);
        });
        
}

// Removed: displayLocalTransactionHistory() - now using loadTransactionHistory() with GraphQL

function setupTokenEventListeners() {
    document.querySelectorAll('.token-icon').forEach(icon => {
        icon.addEventListener('error', function() {
            this.src = placeholder.getData({text: icon.alt.charAt(0).toUpperCase(),bgcolor: '#333', color: '#fff', ffamily: 'Roboto Mono',size: '64x64'})
        });
    });

    document.querySelectorAll('.token-item').forEach(item => {
        const contract = item.getAttribute('data-contract');
        item.querySelector('.send-btn').addEventListener('click', function() {
            sendTokenScreen(contract);
        });
        item.querySelector('.receive-btn').addEventListener('click', function() {
            receiveTokenScreen(contract);
        });
        if (contract !== "currency") {
            item.querySelector('.remove-btn').addEventListener('click', function() {
                removeToken(contract);
            });
        }
    });
    // Attach event listener to add token link
    document.querySelector('.add-token-link').addEventListener('click', function() {
        changePage('add-to-token-list');
    });

    document.querySelector('.create-token-link').addEventListener('click', function() {
        changePage('create-token');
    });
    
}



function changeWalletTab(tab) {
    if (tab === "wallet-tokens") {
        document.getElementById("wallet-tokens").style.display = "flex";
        document.getElementById("local-activity").style.display = "none";
        document.getElementById("wallet-nfts").style.display = "none";
        document.getElementById("wallet-tokens-tab").classList.add("active");
        document.getElementById("local-activity-tab").classList.remove("active");
        document.getElementById("wallet-nfts-tab").classList.remove("active");
    }
    else if (tab === "local-activity") {
        document.getElementById("wallet-tokens").style.display = "none";
        document.getElementById("wallet-nfts").style.display = "none";
        document.getElementById("local-activity").style.display = "flex";
        document.getElementById("wallet-tokens-tab").classList.remove("active");
        document.getElementById("local-activity-tab").classList.add("active");
        document.getElementById("wallet-nfts-tab").classList.remove("active");
        loadTransactionHistory(); // Load from network, not just local
    }
    else if (tab === "wallet-nfts") {
        document.getElementById("wallet-tokens").style.display = "none";
        document.getElementById("local-activity").style.display = "none";
        document.getElementById("wallet-nfts").style.display = "flex";
        document.getElementById("wallet-tokens-tab").classList.remove("active");
        document.getElementById("local-activity-tab").classList.remove("active");
        document.getElementById("wallet-nfts-tab").classList.add("active");
        loadNFTPage();
    }
}

// Load on-chain transaction history
async function loadTransactionHistory() {
    const local_activity = document.getElementById("local-activity-list");
    
    // Show loading state
    local_activity.innerHTML = `
        <div class="activity-item" style="justify-content: center; align-items: center; padding: 2rem;">
            <i class="icon" data-lucide="loader" style="animation: spin 1s linear infinite;"></i>
            <span style="margin-left: 0.5rem;">Loading transaction history...</span>
        </div>
    `;
    setTimeout(() => {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }, 50);
    
    try {
        const publicKey = await readSecureCookie("publicKey");
        
        // Fetch on-chain transactions from network
        const historyResult = await fetchTransactionHistory(publicKey, 1, 100);
        
        // Use GraphQL results as the source of truth
        const allTransactions = new Map();
        
        // Add all GraphQL transactions (blockchain data)
        historyResult.transactions.forEach(tx => {
            allTransactions.set(tx.hash, tx);
        });
        
        // Add ONLY pending local transactions (not yet confirmed on-chain)
        const rpcSpecificHistory = (typeof loadRPCSpecificTxHistory === 'function') ? 
            loadRPCSpecificTxHistory() : tx_history;
        
        rpcSpecificHistory.forEach(tx => {
            // Only add pending transactions that haven't appeared in GraphQL yet
            if (tx.status === 'pending' && !allTransactions.has(tx.hash)) {
                allTransactions.set(tx.hash, tx);
            }
        });
        
        // Convert to array and sort by timestamp (newest first)
        const sortedTransactions = Array.from(allTransactions.values()).sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
        });
        
        
        // Display transactions
        if (sortedTransactions.length === 0) {
            local_activity.innerHTML = `
                <div class="activity-item">
                    <div class="activity-details" style="text-align: center; opacity: 0.6;">
                        <div class="activity-hash">No transaction history found</div>
                        <small>Your transactions will appear here</small>
                    </div>
                </div>
            `;
        } else {
            local_activity.innerHTML = "";
            
            sortedTransactions.forEach((tx, index) => {
                // Format timestamp as simple readable text
                let timestamp = 'Unknown time';
                if (tx.timestamp) {
                    try {
                        const date = new Date(tx.timestamp);
                        if (!isNaN(date.getTime())) {
                            // Simple plain text format: MM/DD/YYYY HH:MM
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const year = date.getFullYear();
                            const hours = String(date.getHours()).padStart(2, '0');
                            const minutes = String(date.getMinutes()).padStart(2, '0');
                            timestamp = `${month}/${day}/${year} ${hours}:${minutes}`;
                        }
                    } catch (e) {
                        console.error('Error formatting timestamp:', tx.timestamp, e);
                    }
                }
                
                // Determine transaction type/direction and amount
                let txType = '';
                let txTypeClass = '';
                let amount = null;
                let tokenSymbol = '';
                
                // Check if this is a transfer transaction
                if (tx.function === 'transfer' && tx.kwargs) {
                    amount = tx.kwargs.amount;
                    // Determine if it's incoming or outgoing
                    if (tx.sender === publicKey) {
                        txType = 'Sent';
                        txTypeClass = 'tx-sent';
                    } else if (tx.kwargs.to === publicKey) {
                        txType = 'Received';
                        txTypeClass = 'tx-received';
                    }
                } else if (tx.sender === publicKey) {
                    txType = 'Contract Call';
                    txTypeClass = 'tx-sent';
                } else {
                    txType = 'Interacted';
                    txTypeClass = 'tx-interact';
                }
                
                // Get token symbol - if contract is "currency", it's XIAN
                if (tx.contract === 'currency') {
                    tokenSymbol = 'XIAN';
                } else {
                    // For other tokens, we'd need to fetch the symbol
                    tokenSymbol = tx.contract;
                }
                
                // Status styling
                const statusClass = tx.status === 'success' ? 'status-success' : 
                                   tx.status === 'pending' ? 'status-pending' : 'status-failed';
                
                // Format function name (make it more readable)
                const functionName = tx.function || 'unknown';
                const formattedFunction = functionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                // Short hash for display
                const shortHash = tx.hash ? `${tx.hash.substring(0, 8)}...${tx.hash.substring(tx.hash.length - 6)}` : 'Unknown';
                
                // Format contract name - show XIAN for currency
                const displayContract = tx.contract === 'currency' ? 'XIAN' : tx.contract;
                
                // Build amount display
                let amountDisplay = '';
                if (amount !== null && amount !== undefined) {
                    const amountSign = txType === 'Sent' ? '-' : '+';
                    const amountClass = txType === 'Sent' ? 'amount-sent' : 'amount-received';
                    amountDisplay = `<div class="activity-amount ${amountClass}">${amountSign}${amount} ${tokenSymbol}</div>`;
                }
                
                // Show stamps used
                const stampsDisplay = tx.stamps ? `<span class="activity-stamps" title="Stamps Used"><i class="icon" data-lucide="zap"></i> ${tx.stamps}</span>` : '';
                
                // Show recipient for sent transactions
                let recipientDisplay = '';
                if (txType === 'Sent' && tx.kwargs && tx.kwargs.to) {
                    const shortRecipient = `${tx.kwargs.to.substring(0, 8)}...${tx.kwargs.to.substring(tx.kwargs.to.length - 6)}`;
                    recipientDisplay = `<div class="activity-recipient">To: <span title="${tx.kwargs.to}">${shortRecipient}</span></div>`;
                } else if (txType === 'Received' && tx.sender) {
                    const shortSender = `${tx.sender.substring(0, 8)}...${tx.sender.substring(tx.sender.length - 6)}`;
                    recipientDisplay = `<div class="activity-recipient">From: <span title="${tx.sender}">${shortSender}</span></div>`;
                }
                
                local_activity.innerHTML += `
                    <div class="activity-item ${index === 0 ? 'latest-tx' : ''}">
                        <div class="activity-icon ${txTypeClass}">
                            <i class="icon" data-lucide="${txType === 'Sent' ? 'arrow-up-right' : txType === 'Received' ? 'arrow-down-left' : 'activity'}"></i>
                        </div>
                        <div class="activity-details">
                            <div class="activity-main">
                                <div class="activity-header">
                                    <div class="activity-function-name">${formattedFunction}</div>
                                    ${amountDisplay}
                                </div>
                                <div class="activity-contract">${displayContract}</div>
                                ${recipientDisplay}
                            </div>
                            <div class="activity-meta">
                                <span class="activity-hash" title="${tx.hash}">${shortHash}</span>
                                ${tx.height ? `<span class="activity-height">Block #${tx.height}</span>` : ''}
                                <span class="activity-timestamp">${timestamp}</span>
                                ${stampsDisplay}
                                <span class="activity-status ${statusClass}">${tx.status}</span>
                            </div>
                        </div>
                        <div class="activity-actions">
                            <a href="${EXPLORER}/tx/${tx.hash}" target="_blank" class="btn btn-ghost btn-sm" title="View in Explorer">
                                <i class="icon" data-lucide="external-link"></i>
                            </a>
                        </div>
                    </div>
                `;
            });
            
            // Add view on explorer button at the bottom
            if (sortedTransactions.length > 0) {
                local_activity.innerHTML += `
                    <div style="text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
                        <a href="${EXPLORER}/addresses/${publicKey}" target="_blank" class="btn btn-secondary">
                            <i class="icon" data-lucide="external-link"></i> View Full History on Explorer
                        </a>
                    </div>
                `;
            }
        }
        
        // Initialize Lucide icons after DOM is updated
        setTimeout(() => {
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
        }, 100);
        
    } catch (error) {
        console.error("Error loading transaction history:", error);
        const publicKeyForError = await readSecureCookie("publicKey").catch(() => '');
        local_activity.innerHTML = `
            <div class="activity-item">
                <div class="activity-details" style="text-align: center; color: #ff6b6b;">
                    <i class="icon" data-lucide="alert-circle"></i>
                    <div class="activity-hash">Failed to load transaction history</div>
                    <small>${error.message || 'Unknown error'}</small>
                    <div style="margin-top: 1rem;">
                        <a href="${EXPLORER}/addresses/${publicKeyForError}" target="_blank" class="btn btn-secondary">
                            View on Explorer Instead
                        </a>
                    </div>
                </div>
            </div>
        `;
        setTimeout(() => {
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
        }, 50);
    }
}

async function clearLocalActivity() {
    const confirm_clear = await (window.showConfirmModal ? showConfirmModal("Are you sure you want to clear the local activity?", 'Confirm') : Promise.resolve(confirm("Are you sure you want to clear the local activity?")));
    if (!confirm_clear) return;
    
    // Clear RPC-specific transaction history
    if (typeof getTxHistoryKey === 'function') {
        const key = getTxHistoryKey();
        localStorage.removeItem(key);
    } else {
        // Fallback to old storage
        localStorage.removeItem('tx_history');
    }
    
    tx_history = [];
    loadWalletPage();
}

function sendTokenScreen(contract) {
    changePage('send-token', contract);
}

function receiveTokenScreen() {
    changePage('receive-token');
}

async function removeToken(contract) {
    const confirmation = await (window.showConfirmModal ? showConfirmModal("Are you sure you want to remove this token?", 'Remove Token') : Promise.resolve(confirm("Are you sure you want to remove this token?")));
    if (!confirmation) return;

    token_list = token_list.filter((token) => token !== contract);
    localStorage.setItem("token_list", JSON.stringify(token_list));

    let removedTokens = JSON.parse(localStorage.getItem("removed_token_list")) || [];
    if (!removedTokens.includes(contract)) {
        removedTokens.push(contract);
        localStorage.setItem("removed_token_list", JSON.stringify(removedTokens));
    }

    loadWalletPage();
}



  function refreshBalance(contract) {
    Promise.all([
        readSecureCookie('publicKey')
    ]).then((values) => {
        const publicKey = values[0];
        execute_balance_of(contract,publicKey)
            .then(balance => {
                
                document.getElementById(contract + 'Balance').innerHTML = balance;
            })
            .catch(error => {
                console.error("Error fetching balance:", error);
            });
    }).catch(error => {
        console.error("Error reading secure cookie:", error);
    });
}



document.getElementById('wallet-tokens-tab').addEventListener('click', function() {
    changeWalletTab('wallet-tokens');
});

document.getElementById('local-activity-tab').addEventListener('click', function() {
    changeWalletTab('local-activity');
});

document.getElementById('wallet-nfts-tab').addEventListener('click', function() {
    changeWalletTab('wallet-nfts');
});



document.getElementById('wallet-refresh-history').addEventListener('click', function() {
    loadTransactionHistory(); // Use network fetching instead of local only
});

document.getElementById('wallet-refresh-all').addEventListener('click', function() {
    loadWalletPage();
});

document.getElementById('walletAddress').addEventListener('click', function() {
    copyToClipboard('walletAddress');
});


document.getElementById('wallet-copy-address').addEventListener('click', function() {
    copyToClipboard('walletAddress');
});


document.getElementById('wallet-send-adv-tx').addEventListener('click', function() {
    changePage('send-advanced-transaction');
});
syncTokenList().then(loadWalletPage);
