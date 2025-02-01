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


function loadWalletPage() {
    document.getElementById("wallet-refresh-all").querySelector("i").classList.add("fa-spin");

    // Start by reading the publicKey
    readSecureCookie("publicKey")
        .then((publicKey) => {
            document.getElementById("walletAddress").innerHTML = publicKey;
            let tokenList = document.getElementById("wallet-tokens");
            tokenList.innerHTML = `<div class="title-container">

                <div class="create-token-link" style="font-size:1rem">
                    <i class="fas fa-coins" title="Create Token"></i> Create Token
                </div>
                <h2 class="token-list-title">Tokens</h2>
                <div class="cogwheel-icon add-token-link" style="font-size:1rem">
                    <i class="fas fa-plus-circle" title="Add Token"></i> Add Token
                </div>
            </div>`;

            // Spinner for loading tokens
            tokenList.innerHTML += `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading tokens...</div>`;


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
                        if (tokenInfo.name === "\x9Eée" || tokenInfo.symbol === "\x9Eée") {
                            return;
                        }
                        if (tokenInfo) {
                            tokenList.innerHTML += `
                            <div class="token-item" data-contract="${tokenInfo.contract}">
                                <div class="token-details">
                                        <div class="token-title-container">
                                        <img class="token-icon" src="${tokenInfo.symbol === "Xian" ? "assets/xian-white.svg" : tokenInfo.token_logo_url}" alt="${tokenInfo.symbol}">
                                        <div class="token-name"><span class="token-symbol">${tokenInfo.symbol}</span><br><a style="font-weight:400" target="_blank" href="`+EXPLORER+`/contracts/${tokenInfo.contract}">${tokenInfo.name}</a></div>
                                    </div>
                                </div>
                                <div class="token-balance"><span id="${tokenInfo.contract}Balance">0</span>&nbsp;<span>${tokenInfo.symbol}</span></div>
                                <div class="token-actions">
                                                                    ${tokenInfo.contract === "currency" ? "" : `<button class="btn remove-btn" data-contract="${tokenInfo.contract}" title="Remove Token"><i class="fas fa-minus-circle" title="Remove Token"></i></button>`}
                                    <button class="btn send-btn" style="max-width:15rem" data-contract="${tokenInfo.contract}"><i class="fas fa-paper-plane"></i> Send</button>
                                    <button class="btn receive-btn" style="max-width:15rem" data-contract="${tokenInfo.contract}"><i class="fas fa-download"></i> Receive</button>
                                </div>
                            </div>`;
                            refreshBalance(tokenInfo.contract);
                        }
                    });
                    tokenList.innerHTML = tokenList.innerHTML.replace('<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading tokens...</div>', '');
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
        });
        
}

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

document.getElementById('wallet-clear-local-activity').addEventListener('click', function() {
    clearLocalActivity();
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

loadWalletPage();
