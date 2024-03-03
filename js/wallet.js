function loadWalletPage(){
    document.getElementById("walletAddress").innerHTML = readSecureCookie("publicKey");
    refreshBalance("currency");
}

function loadReceiveTokenPage(){
    document.getElementById('yourAddressReceive').innerHTML = readSecureCookie("publicKey");
}