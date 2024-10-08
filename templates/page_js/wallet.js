var token_list = JSON.parse(localStorage.getItem("token_list")) || ["currency"];

function loadWalletPage() {
    document.getElementById("wallet-refresh-all").querySelector("i").classList.add("fa-spin");

    // Start by reading the publicKey
    readSecureCookie("publicKey")
        .then((publicKey) => {
            document.getElementById("walletAddress").innerHTML = publicKey;
            let tokenList = document.getElementById("wallet-tokens");
            tokenList.innerHTML = `<div class="title-container">
                <h2 class="token-list-title">Tokens</h2>
                <div class="cogwheel-icon add-token-link" style="font-size:1rem">
                    <i class="fas fa-plus-circle" title="Add Token"></i> Add Token
                </div>
            </div>`;


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
                    tokenInfos.forEach(tokenInfo => {
                        if (tokenInfo) {
                            tokenList.innerHTML += `<div class="token-item" data-contract="${tokenInfo.contract}">
                                <div class="token-details">
                                    <div class="token-title-container">
                                        ${tokenInfo.contract === "currency" ? "" : `<i class="fas fa-minus-circle cogwheel-icon" data-contract="${tokenInfo.contract}" title="Remove Token"></i>`}
                                        <div class="token-name"><span>${tokenInfo.name}</span> (<span class="token-symbol">${tokenInfo.symbol}</span>)</div>
                                        </div>
                                    <div class="token-balance" id="${tokenInfo.contract}Balance">0</div>
                                </div>
                                <div class="token-actions">
                                    <button class="btn send-btn" style="max-width:15rem" data-contract="${tokenInfo.contract}"><i class="fas fa-paper-plane"></i> Send</button>
                                    <button class="btn receive-btn" style="max-width:15rem" data-contract="${tokenInfo.contract}"><i class="fas fa-download"></i> Receive</button>
                                </div>
                            </div>`;
                            refreshBalance(tokenInfo.contract);
                        }
                    });
                   
                    setupTokenEventListeners();  // Setup event listeners after tokens are loaded
                });
            
        })
        .catch(error => {
            console.error("Error loading wallet page:", error);
        })
        .finally(() => {
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
                        <a href="https://explorer.xian.org/tx/`+tx["hash"]+`" target="_blank"><i class="fas fa-eye"></i> View</a>
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
        });
        
}

function setupTokenEventListeners() {
    document.querySelectorAll('.token-item').forEach(item => {
        const contract = item.getAttribute('data-contract');
        item.querySelector('.send-btn').addEventListener('click', function() {
            sendTokenScreen(contract);
        });
        item.querySelector('.receive-btn').addEventListener('click', function() {
            receiveTokenScreen(contract);
        });
        if (contract !== "currency") {
            item.querySelector('.fas.fa-minus-circle').addEventListener('click', function() {
                removeToken(contract);
            });
        }
    });
    // Attach event listener to add token link
    document.querySelector('.add-token-link').addEventListener('click', function() {
        changePage('add-to-token-list');
    });
}



function changeWalletTab(tab) {
    if (tab === "wallet-tokens") {
        document.getElementById("wallet-tokens").style.display = "flex";
        document.getElementById("local-activity").style.display = "none";
        document.getElementById("wallet-tokens-tab").classList.add("active");
        document.getElementById("local-activity-tab").classList.remove("active");
    }
    else {
        document.getElementById("wallet-tokens").style.display = "none";
        document.getElementById("local-activity").style.display = "flex";
        document.getElementById("wallet-tokens-tab").classList.remove("active");
        document.getElementById("local-activity-tab").classList.add("active");
    }
}

function clearLocalActivity() {
    let confirm_clear = confirm("Are you sure you want to clear the local activity?");
    if (!confirm_clear) {
        return;
    }
    localStorage.removeItem('tx_history');
    tx_history = [];
    loadWalletPage();
}

function sendTokenScreen(contract) {
    changePage('send-token', contract);
}

function receiveTokenScreen() {
    changePage('receive-token');
}

function removeToken(contract) {
    let confirmation = confirm("Are you sure you want to remove this token?");
    if (!confirmation) return;
    token_list = token_list.filter((token) => token !== contract);
    localStorage.setItem("token_list", JSON.stringify(token_list));
    loadWalletPage();
  }


  function refreshBalance(contract) {
    Promise.all([
        readSecureCookie('publicKey')
    ]).then((values) => {
        const publicKey = values[0];
        getVariable(contract, "balances", publicKey)
            .then(balance => {
                let formattedBalance = "0";
                if (balance !== null) {
                    formattedBalance = BigNumber(balance).toFixed(8);
                }
                document.getElementById(contract + 'Balance').innerHTML = formattedBalance;
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

document.getElementById('wallet-clear-local-activity').addEventListener('click', function() {
    clearLocalActivity();
});

document.getElementById('wallet-refresh-all').addEventListener('click', function() {
    loadWalletPage();
});

document.getElementById('walletAddress').addEventListener('click', function() {
    copyToClipboard('walletAddress');
});

document.getElementById('wallet-send-adv-tx').addEventListener('click', function() {
    changePage('send-advanced-transaction');
});

loadWalletPage();
