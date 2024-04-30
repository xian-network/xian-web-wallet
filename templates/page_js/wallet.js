var token_list = JSON.parse(localStorage.getItem("token_list")) || ["currency"];

function loadWalletPage() {
    let spinner = document.getElementById("wallet-refresh-all");
    spinner = spinner.querySelector("i");
    spinner.classList.add("fa-spin");

    Promise.all([readSecureCookie("publicKey")]).then((values) => {
    document.getElementById("walletAddress").innerHTML = values[0];
    let tokenList = document.getElementById("wallet-tokens");

    tokenList.innerHTML = "";
    tokenList.innerHTML += `<div class="title-container">
        <h2 class="token-list-title">Tokens</h2>
        <i class="fas fa-plus-circle cogwheel-icon" title="Add Token"></i>
    </div>`

    token_list.forEach((token) => {
        let tokenInfo = null;
        
        try {
            tokenInfo = getTokenInfo(token);
        }
        catch (e) {
            tokenInfo = null;
        }
    
       
        if (tokenInfo != null) {
            tokenList.innerHTML += `<div class="token-item" data-contract="`+tokenInfo["contract"]+`">
                <div class="token-details">
                    <div class="token-title-container">
                        <div class="token-name"><span>`+tokenInfo["name"]+`</span> (<span class="token-symbol">`+tokenInfo["symbol"]+`</span>)</div>
                        ` + (tokenInfo["contract"] === "currency" ? "" : `<i class="fas fa-minus-circle cogwheel-icon" data-contract="`+tokenInfo["contract"]+`" title="Remove Token"></i>`) + `
                    </div>
                    <div class="token-balance" id="`+tokenInfo["contract"]+`Balance">0</div>
                </div>    
                <div class="token-actions">
                    <button class="btn send-btn"  data-contract="`+tokenInfo["contract"]+`"><i class="fas fa-paper-plane"></i> Send</button>
                    <button class="btn receive-btn"  data-contract="`+tokenInfo["contract"]+`"><i class="fas fa-download"></i> Receive</button>
                </div> 
            </div>
            `;
            try {
                refreshBalance(tokenInfo["contract"]);
            }
            catch (e) {
                
            }
        }
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
            item.querySelector('.fas.fa-minus-circle.cogwheel-icon').addEventListener('click', function() {
                removeTokenScreen(contract);
            });
        }
    });

    document.querySelector('.fas.fa-plus-circle.cogwheel-icon').addEventListener('click', function() {
        changePage('add-to-token-list');
    });

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
    });
    spinner.classList.remove("fa-spin");
}

function changeWalletTab(tab) {
    if (tab === "wallet-tokens") {
        document.getElementById("wallet-tokens").style.display = "block";
        document.getElementById("local-activity").style.display = "none";
        document.getElementById("wallet-tokens-tab").classList.add("active");
        document.getElementById("local-activity-tab").classList.remove("active");
    }
    else {
        document.getElementById("wallet-tokens").style.display = "none";
        document.getElementById("local-activity").style.display = "block";
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
        readSecureCookie('publicKey')]
    ).then((values) => {
        let balance = getVariable(contract, "balances",values[0]);
        if (balance === null) {
            balance = "0";
        }
        balance = parseFloat(balance);
        balance = balance.toFixed(8);
        document.getElementById(contract+'Balance').innerHTML = balance;
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