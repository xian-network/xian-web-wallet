// Assumes bip39 library is loaded globally

async function importHdWallet() { // Renamed and made async
    const mnemonicInput = document.getElementById('import_mnemonic').value.trim(); // Get mnemonic and trim whitespace
    const password = document.getElementById('import_password').value;
    const confirmPassword = document.getElementById('import_confirmPassword').value;
    const importWalletError = document.getElementById('importWalletError');
    const importButton = document.getElementById('btn-import-wallet-import-wallet');

    importWalletError.style.display = 'none'; // Reset error

    // --- Validation ---
    // Normalize multiple spaces between words to single spaces
    const normalizedMnemonic = mnemonicInput.replace(/\s+/g, ' ');
    const words = normalizedMnemonic.split(' ');
    const wordCount = words.length;

    if (wordCount !== 12 && wordCount !== 24) {
         importWalletError.innerHTML = 'Recovery phrase must be 12 or 24 words long.';
         importWalletError.style.display = 'block';
         return;
    }

    // Validate mnemonic using bip39 library
    if (!bip39.validateMnemonic(normalizedMnemonic)) {
        importWalletError.innerHTML = 'Invalid recovery phrase. Please check your words and their order.';
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
    // --- End Validation ---

    // Disable button during import
    importButton.disabled = true;
    importButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';

    try {
        // 1. Import Master Seed (validates mnemonic, derives first key, encrypts mnemonic)
        // Use the normalized mnemonic
        const importedWalletData = importMasterSeedFromMnemonic(normalizedMnemonic, password); // From xian.js

        if (!importedWalletData) {
             // Should not happen if validation passed, but double-check
             throw new Error("Mnemonic validation passed but import failed.");
        }

        // 2. Prepare initial account data
        const initialAccount = {
            index: 0,
            vk: importedWalletData.publicKey, // VK of the first account (index 0)
            name: "Account 1", // Default name for the first account
            type: 'derived'
        };

        // 3. Update Global State (in router.js scope)
        encryptedSeed = importedWalletData.encryptedSeed;
        unencryptedMnemonic = importedWalletData.unencryptedMnemonic; // Store temporarily
        accounts = [initialAccount]; // Start with just the first account
        selectedAccountVk = initialAccount.vk;
        locked = false; // Wallet is imported and immediately unlocked

        // 4. Save State to Storage
        saveEncryptedSeed(encryptedSeed);
        saveAccounts(accounts);
        await saveSelectedAccountVk(selectedAccountVk);

        // Clear sensitive fields
        document.getElementById('import_mnemonic').value = '';
        document.getElementById('import_password').value = '';
        document.getElementById('import_confirmPassword').value = '';

        // 5. Navigate to Wallet Page
        toast('success', 'Wallet imported successfully!');
        changePage('wallet');

    } catch (error) {
        console.error("Error importing HD wallet:", error);
        importWalletError.innerHTML = 'Failed to import wallet. ' + error.message;
        importWalletError.style.display = 'block';
         // Re-enable button on error
         importButton.disabled = false;
         importButton.innerHTML = 'Import Wallet';
    }
     // importButton.disabled = false; // Might re-enable too early if changePage is fast
     // importButton.innerHTML = 'Import Wallet';
}

// Back button listener
document.getElementById('btn-import-wallet-back').addEventListener('click', function() {
    changePage('get-started');
});

// Import button listener
document.getElementById('btn-import-wallet-import-wallet').addEventListener('click', function() {
    importHdWallet(); // Call async function
});

// Input validation setup (similar to create-wallet, adapted for mnemonic)
function inputValidationImport() {
    const mnemonicInput = document.getElementById('import_mnemonic');
    const password = document.getElementById('import_password');
    const confirmPassword = document.getElementById('import_confirmPassword');
    const importWalletError = document.getElementById('importWalletError');

    // Clear error on input
    mnemonicInput.addEventListener('input', () => importWalletError.style.display = 'none');
    password.addEventListener('input', () => importWalletError.style.display = 'none');
    confirmPassword.addEventListener('input', () => importWalletError.style.display = 'none');

    // Basic validation on blur (full validation on submit)
    password.addEventListener("blur", checkPasswordLengthImport);
    confirmPassword.addEventListener("blur", matchPasswordsImport);

    function checkPasswordLengthImport(){
        const passwordValue = password.value;
        if (passwordValue.length > 0 && passwordValue.length < 6) {
            importWalletError.innerHTML = 'Password must be at least 6 characters long!';
            importWalletError.style.display = 'block';
        } else {
            // Don't hide error here, let submit handle final state
        }
    }

    function matchPasswordsImport(){
        const confirmPasswordValue = confirmPassword.value;
        if (password.value !== confirmPasswordValue && confirmPasswordValue !== '') { // Only show error if confirm has content and doesn't match
            importWalletError.innerHTML = 'Passwords do not match!';
            importWalletError.style.display = 'block';
        } else {
           // Don't hide error here
        }
    }
}

// Initialize validation listeners
inputValidationImport();

// Add Enter key listener to confirm password field
document.getElementById('import_confirmPassword').addEventListener('keyup', function(event) {
    if (event.keyCode === 13) { // Enter key
        event.preventDefault();
        importHdWallet();
    }
});