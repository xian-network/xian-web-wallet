function loadWalletPage(){
    document.getElementById("walletAddress").innerHTML = readSecureCookie("publicKey");
}

function loadReceiveTokenPage(){
    document.getElementById('yourAddressReceive').innerHTML = readSecureCookie("publicKey");
}