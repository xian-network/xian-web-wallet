var token_list = JSON.parse(localStorage.getItem("token_list")) || ["currency"];

function loadWalletPage() {
    document.getElementById("walletAddress").innerHTML = readSecureCookie("publicKey");
    let tokenList = document.getElementById("wallet-tokens");

    tokenList.innerHTML = "";
    tokenList.innerHTML += `<div class="title-container">
        <h2 class="token-list-title">Tokens</h2>
        <i class="fas fa-plus-circle cogwheel-icon" onclick="changePage('add-to-token-list')" title="Add Token"></i>
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
            tokenList.innerHTML += `<div class="token-item">
                <div class="token-details">
                    <div class="token-title-container">
                        <div class="token-name"><span>`+tokenInfo["name"]+`</span> (<span class="token-symbol">`+tokenInfo["symbol"]+`</span>)</div>
                        ` + (tokenInfo["contract"] === "currency" ? "" : `<i class="fas fa-minus-circle cogwheel-icon" onclick="removeToken('`+tokenInfo["contract"]+`')" title="Remove Token"></i>`) + `
                    </div>
                    <div class="token-balance" id="`+tokenInfo["contract"]+`Balance">0</div>
                </div>    
                <div class="token-actions">
                    <button class="btn send-btn" onclick="sendTokenScreen('`+tokenInfo["contract"]+`')"><i class="fas fa-paper-plane"></i> Send</button>
                    <button class="btn receive-btn" onclick="receiveTokenScreen('`+tokenInfo["contract"]+`')"><i class="fas fa-download"></i> Receive</button>
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