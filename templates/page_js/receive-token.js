document.getElementById('receive-token-back').addEventListener('click', function() {
    goToWallet();
});

document.getElementById('yourAddressReceive').addEventListener('click', function() {
    copyToClipboard('yourAddressReceive');
});

function loadReceiveTokenPage() {
    Promise.all([
        readSecureCookie('publicKey')]
    ).then((values) => {
        document.getElementById("yourAddressReceive").innerHTML = values[0];
    });
}

loadReceiveTokenPage();