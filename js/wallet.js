function loadWalletPage(){
    document.getElementById("walletAddress").innerHTML = localStorage.getItem('publicKey');
}