document.getElementById('receive-token-back').addEventListener('click', function() {
    goToWallet();
});

document.getElementById('yourAddressReceive').addEventListener('click', function() {
    copyToClipboard('yourAddressReceive');
});