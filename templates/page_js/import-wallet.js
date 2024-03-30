document.getElementById('btn-import-wallet-back').addEventListener('click', function() {
    changePage('get-started');
});
document.getElementById('btn-import-wallet-import-wallet').addEventListener('click', function() {
    importWallet();
});

function inputValidation() {
    const privateKey = document.getElementById('import_privateKey');
    const password = document.getElementById('import_password');
    const confirmPassword = document.getElementById('import_confirmPassword');
    const importWalletError = document.getElementById('importWalletError');

    password.addEventListener("input", checkPasswordLength);
    confirmPassword.addEventListener("input", matchPasswords);

    function checkPasswordLength(event){
        const passwordValue = event.target.value;
        if (passwordValue.length > 0 && passwordValue.length < 6) {
            importWalletError.innerHTML = 'Password must be at least 6 characters long!';
            importWalletError.style.display = 'block';
        } else {
            importWalletError.style.display = 'none';
        }
    }

    function matchPasswords(event){
        const confirmPasswordValue = event.target.value;
        if (password.value !== confirmPasswordValue || confirmPasswordValue === '') {
            importWalletError.innerHTML = 'Passwords do not match!';
            importWalletError.style.display = 'block';
        }else {
            importWalletError.style.display = 'none';
        }
    }

    function checkPrivateKeyLength(event){
        const privateKeyValue = event.target.value;
        if (privateKeyValue.length > 0 && privateKeyValue.length < 64) {
            importWalletError.innerHTML = 'Private key must be 64 characters long!';
            importWalletError.style.display = 'block';
        } else {
            importWalletError.style.display = 'none';
        }
    }

    privateKey.addEventListener("input", checkPrivateKeyLength);

}
inputValidation();

document.getElementById('import_confirmPassword').addEventListener('keyup', function(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        importWallet();
    }
});