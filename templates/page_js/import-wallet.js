function importWallet() {
    let password = document.getElementById('import_password').value;
    let confirmPassword = document.getElementById('import_confirmPassword').value;
    let privateKey = document.getElementById('import_privateKey').value;
    let importWalletError = document.getElementById('importWalletError');

    if (privateKey.length !== 64) {
        importWalletError.innerHTML = 'Invalid private key!';
        importWalletError.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        importWalletError.innerHTML = 'Password must be at least 6 characters long!';
        importWalletError.style.display = 'block';
        return;
    }

    if (password !== confirmPassword) {
        importWalletError.innerHTML = 'Passwords do not match!';
        importWalletError.style.display = 'block';
        return;
    }

    importWalletError.style.display = 'none';

    let keyPair = createKeyPairFromSK(privateKey, password);
    console.log(keyPair);
    let public_key = keyPair.publicKey;
    let encryptedPrivateKey = keyPair.encryptedPrivateKey;
    let _unencryptedPrivateKey = keyPair.unencryptedPrivateKey;
    
    // Save the public key and the encrypted private key
    createSecureCookie('publicKey', public_key, 9999);
    createSecureCookie('encryptedPrivateKey', encryptedPrivateKey, 9999);
    // Register in the wallet manager and persist per-wallet encrypted key
    if (typeof WalletManager !== 'undefined') {
        try { WalletManager.addOrUpdateWallet(public_key, encryptedPrivateKey); } catch(e) {}
    }
    
    // Save the unencrypted private key to the global variable
    unencryptedPrivateKey = _unencryptedPrivateKey;
    publicKey = public_key;
    locked = false;
    updateNavActionsVisibility();
    changePage('wallet');
}

document.getElementById('btn-import-wallet-back').addEventListener('click', function() {
    if (typeof pageContext !== 'undefined' && pageContext === 'add-wallet') {
        changePage('settings');
    } else {
        changePage('get-started');
    }
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

// Handle context-aware UI updates
function updateUIForContext() {
    if (typeof pageContext !== 'undefined' && pageContext === 'add-wallet') {
        // Update title and description for adding additional wallet
        const title = document.getElementById('import-wallet-title');
        const step = document.getElementById('import-wallet-step');
        const description = document.getElementById('import-wallet-description');
        
        if (title) title.textContent = 'Import additional wallet';
        if (step) step.style.display = 'none'; // Hide step indicator
        if (description) {
            description.innerHTML = 'Import an additional wallet. Paste your <strong>private key</strong> and set a password to encrypt it. <span class="note-danger">If you forget the password, it can\'t be recovered.</span>';
        }
    }
}

inputValidation();
updateUIForContext();

document.getElementById('import_confirmPassword').addEventListener('keyup', function(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        importWallet();
    }
});