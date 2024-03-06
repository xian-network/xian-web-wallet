var token_list = JSON.parse(localStorage.getItem("token_list")) || ["currency"];

function loadWalletPage() {
    document.getElementById("walletAddress").innerHTML = readSecureCookie("publicKey");
    let tokenList = document.getElementById("wallet-tokens");

    tokenList.innerHTML = "";
    tokenList.innerHTML += `<div class="title-container">
        <h2 class="token-list-title">Tokens</h2>
        <i class="fas fa-plus-circle cogwheel-icon" onclick="changePage('add-to-token-list')"></i>
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
                        <i class="fas fa-minus-circle cogwheel-icon" onclick="removeToken('`+tokenInfo["contract"]+`')"></i>
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
    //tokenList.innerHTML += `<a href="#" class="advanced-tx-link" onclick="changePage('send-advanced-transaction')">Create Advanced Transaction</a>` 
}

function loadReceiveTokenPage(){
    document.getElementById('yourAddressReceive').innerHTML = readSecureCookie("publicKey");
}

function addToken() {
    let successMsg = document.getElementById("addTokenSuccess");
    let errorMsg = document.getElementById("addTokenError");
    document.getElementById("addTokenSuccess").style.display = "none";
    document.getElementById("addTokenError").style.display = "none";
    let contractNameAddToken = document.getElementById(
      "contractNameAddToken"
    ).value;
    contractNameAddToken = contractNameAddToken.trim();
    let token_info = null;
    try {
        token_info = getTokenInfo(contractNameAddToken);
    }
    catch (e) {
        errorMsg.style.display = "block";
        errorMsg.innerHTML = "RPC error!";
        return;
    }
    if (token_info.name === null || token_info.symbol === null) {
        errorMsg.style.display = "block";
        errorMsg.innerHTML = "Token does not exist!";
        return;
    }
    if (!token_list.includes(contractNameAddToken)) {
        token_list.push(contractNameAddToken);
        localStorage.setItem("token_list", JSON.stringify(token_list));
        successMsg.style.display = "block";
        successMsg.innerHTML = "Token added successfully!";
    }
    else {
        errorMsg.style.display = "block";
        errorMsg.innerHTML = "Token already exists!";
    }
    
}

function removeToken(contract) {
    let confirmation = confirm("Are you sure you want to remove this token?");
    if (!confirmation) return;
    token_list = token_list.filter((token) => token !== contract);
    localStorage.setItem("token_list", JSON.stringify(token_list));
    loadWalletPage();
}

function getTokenInfo(contract) {

    let tokenInfo = {contract: contract};

    if (contract === "currency") {
        tokenInfo["name"] = "Xian";
        tokenInfo["symbol"] = "Xian";
        return tokenInfo;
    }

    let request = new XMLHttpRequest();
    request.open("GET", RPC + '/abci_query?path="/get/'+contract+'.metadata:token_name"', false);
    request.send();
    if (request.status === 200) {
        let response = JSON.parse(request.responseText);
        if (response.result.response.value === "AA==") {
            tokenInfo["name"] = null;
        }
        else{
            let tokenName = atob(response.result.response.value);
            tokenInfo["name"] = tokenName;
        }
    }

    request = new XMLHttpRequest();
    request.open("GET", RPC + '/abci_query?path="/get/'+contract+'.metadata:token_symbol"', false);
    request.send();
    if (request.status === 200) {
        let response = JSON.parse(request.responseText);
        if (response.result.response.value === "AA==") {
            tokenInfo["symbol"] = null;
        }
        else{
            let tokenSymbol = atob(response.result.response.value);
            tokenInfo["symbol"] = tokenSymbol;
        }
    }
    return tokenInfo;
}