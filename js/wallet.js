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
    tokenList.innerHTML += `<a href="#" class="advanced-tx-link" onclick="changePage('send-advanced-transaction')">Create Advanced Transaction</a>` 
    tokenList.innerHTML += `<a href="#" class="advanced-tx-link" onclick="visitDApp()">Visit a DApp with Wallet Connection</a>`
}

// Get current stamp rate
document.getElementById("stamp-rate").innerHTML = getStampRate();