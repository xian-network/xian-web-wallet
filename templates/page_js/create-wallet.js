function inputValidation() {
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const createWalletError = document.getElementById('createWalletError');

    password.addEventListener("input", checkPasswordLength);
    confirmPassword.addEventListener("input", matchPasswords);

    function checkPasswordLength(event){
        const passwordValue = event.target.value;
        if (passwordValue.length > 0 && passwordValue.length < 6) {
            createWalletError.innerHTML = 'Password must be at least 6 characters long!';
            createWalletError.style.display = 'block';
        } else {
            createWalletError.style.display = 'none';
        }
    }

    function matchPasswords(event){
        const confirmPasswordValue = event.target.value;
        if (password.value !== confirmPasswordValue || confirmPasswordValue === '') {
            createWalletError.innerHTML = 'Passwords do not match!';
            createWalletError.style.display = 'block';
        }else {
            createWalletError.style.display = 'none';
        }
    }
}
function createWallet() {
    let password = document.getElementById('password').value;

    let keyPair = createKeyPair(password);
    let public_key = keyPair.publicKey;
    let encryptedPrivateKey = keyPair.encryptedPrivateKey;
    let _unencryptedPrivateKey = keyPair.unencryptedPrivateKey;
    
    // Save the public key and the encrypted private key
    createSecureCookie('publicKey', public_key, 9999);
    createSecureCookie('encryptedPrivateKey', encryptedPrivateKey, 9999);

    // Save the unencrypted private key to the global variable
    unencryptedPrivateKey = _unencryptedPrivateKey;
    publicKey = public_key;
    locked = false;
    changePage('wallet');

}
inputValidation();

document.getElementById('confirmPassword').addEventListener('keyup', function(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        createWallet();
    }
});
document.getElementById('btn-create-wallet-create').addEventListener('click', function() {
    createWallet();
});
document.getElementById('btn-create-wallet-back').addEventListener('click', function() {
    changePage('get-started');
});