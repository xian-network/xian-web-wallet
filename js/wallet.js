function loadWalletPage(){
    document.getElementById("walletAddress").innerHTML = readSecureCookie("publicKey");
    refreshBalance();
}

function loadReceiveTokenPage(){
    document.getElementById('yourAddressReceive').innerHTML = readSecureCookie("publicKey");
}