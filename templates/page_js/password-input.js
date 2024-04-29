function unlockWallet() {
    Promise.all([
        readSecureCookie('encryptedPrivateKey'),
        readSecureCookie('publicKey')
    ]).then((values) => {
        let password = document.getElementById('unlock_password').value;
        let encryptedPrivateKey = values[0];
        let public_key = values[1];
        let _unencryptedPrivateKey = decryptPrivateKey(encryptedPrivateKey, password, public_key);
        if (_unencryptedPrivateKey == null) {
            document.getElementById('passwordError').style.display = 'block';
            document.getElementById('passwordError').innerHTML = 'Incorrect password!';
            return;
        }
        document.getElementById('passwordError').style.display = 'none';

        unencryptedPrivateKey = _unencryptedPrivateKey;
        publicKey = public_key;
        locked = false;
        changePage('wallet');
    });
}

function removeWallet(){
    let confirm_delete = confirm("Are you sure you want to remove the wallet?");
    if (!confirm_delete) {
        return;
    }
    // Removes the wallet
    eraseSecureCookie('publicKey');
    eraseSecureCookie('encryptedPrivateKey');
    unencryptedPrivateKey = null;
    locked = true;
    localStorage.removeItem('tx_history');
    tx_history = [];
    changePage('get-started');
}

document.getElementById('btn-password-input-unlock-wallet').addEventListener('click', function() {
    unlockWallet();
});
document.getElementById('btn-password-input-remove-wallet').addEventListener('click', function() {
    removeWallet();
});

document.getElementById('unlock_password').addEventListener('keyup', function(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        unlockWallet();
    }
});