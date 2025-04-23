function inputValidation() {
    const passwordInput = document.getElementById('password'); // Renamed variable for clarity
    const confirmPassword = document.getElementById('confirmPassword');
    const createWalletError = document.getElementById('createWalletError');

    // Clear error on input start
    passwordInput.addEventListener('input', () => createWalletError.style.display = 'none');
    confirmPassword.addEventListener('input', () => createWalletError.style.display = 'none');

    // Validate password length (on blur or submit is often better UX than on every input)
    passwordInput.addEventListener("blur", checkPasswordLength); // Check on losing focus
    // Validate password match (on blur of confirm field or submit)
    confirmPassword.addEventListener("blur", matchPasswords); // Check on losing focus

    function checkPasswordLength() {
        const passwordValue = passwordInput.value;
        if (passwordValue.length > 0 && passwordValue.length < 6) {
            createWalletError.innerHTML = 'Password must be at least 6 characters long!';
            createWalletError.style.display = 'block';
            return false; // Indicate failure
        }
        // createWalletError.style.display = 'none'; // Only hide if valid? Or let matchPasswords handle it.
        return true; // Indicate success
    }

    function matchPasswords() {
        const confirmPasswordValue = confirmPassword.value;
        if (passwordInput.value !== confirmPasswordValue) {
            createWalletError.innerHTML = 'Passwords do not match!';
            createWalletError.style.display = 'block';
            return false; // Indicate failure
        }
        // If match, check length again in case confirm was blurred first
        if (!checkPasswordLength()) return false;

        createWalletError.style.display = 'none'; // Hide error only if both checks pass
        return true; // Indicate success
    }

    // Return validation functions if needed elsewhere, or just rely on blur/submit checks
    return { checkPasswordLength, matchPasswords };
}

async function createHdWallet() { // Renamed function and made async
    const password = document.getElementById('password').value;
    const confirmPasswordVal = document.getElementById('confirmPassword').value; // Renamed variable
    const createWalletError = document.getElementById('createWalletError');
    const createButton = document.getElementById('btn-create-wallet-create');

    createWalletError.style.display = 'none'; // Reset error display

    // --- Validation ---
    if (password.length < 6) {
        createWalletError.innerHTML = 'Password must be at least 6 characters long!';
        createWalletError.style.display = 'block';
        return;
    }
    if (password !== confirmPasswordVal) {
        createWalletError.innerHTML = 'Passwords do not match!';
        createWalletError.style.display = 'block';
        return;
    }
    // --- End Validation ---

    // Disable button during creation
    createButton.disabled = true;
    createButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';


    try {
        // 1. Create Master Seed (generates mnemonic, derives first key, encrypts mnemonic)
        const newWalletData = createMasterSeed(password); // From xian.js

        // 2. Prepare initial account data
        const initialAccount = {
            index: 0,
            vk: newWalletData.publicKey, // VK of the first account (index 0)
            name: "Account 1", // Default name for the first account
            type: 'derived'
        };

        // 3. Update Global State (in router.js scope)
        // Note: Direct modification of globals isn't ideal, but follows existing pattern.
        // Consider passing these back or using a state management approach later.
        unencryptedMnemonic = newWalletData.unencryptedMnemonic; // Store temporarily for immediate use
        accounts = [initialAccount];
        selectedAccountVk = initialAccount.vk;
        locked = false; // Wallet is created and immediately unlocked

        // 4. Save State to Storage (using async functions from cookietoolz.js)
        saveEncryptedSeed(newWalletData.encryptedSeed);
        saveAccounts(accounts);
        await saveSelectedAccountVk(selectedAccountVk);

        // Clear password fields after successful creation for security
        document.getElementById('password').value = '';
        document.getElementById('confirmPassword').value = '';


        // 5. Navigate to Wallet Page
        toast('success', 'Wallet created successfully! Remember to back up your seed phrase in Settings.');
        changePage('wallet');

    } catch (error) {
        console.error("Error creating HD wallet:", error);
        createWalletError.innerHTML = 'Failed to create wallet. Please try again. ' + error.message;
        createWalletError.style.display = 'block';
        // Re-enable button on error
        createButton.disabled = false;
        createButton.innerHTML = 'Create Wallet';

    }
    // Re-enable button if successful navigation didn't happen (though it should)
    // createButton.disabled = false;
    // createButton.innerHTML = 'Create Wallet';
}

// Initialize validation listeners
inputValidation();

// Add Enter key listener to confirm password field for convenience
document.getElementById('confirmPassword').addEventListener('keyup', function(event) {
    if (event.keyCode === 13) { // 13 is the Enter key
        event.preventDefault(); // Prevent default form submission if applicable
        createHdWallet(); // Call the async creation function
    }
});

// Add click listener to the create button
document.getElementById('btn-create-wallet-create').addEventListener('click', function() {
    createHdWallet(); // Call the async creation function
});

// Add click listener to the back button
document.getElementById('btn-create-wallet-back').addEventListener('click', function() {
    changePage('get-started');
});