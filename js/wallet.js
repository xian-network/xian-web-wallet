function loadWalletPage(){
    document.getElementById("walletAddress").innerHTML = readSecureCookie("publicKey");
}