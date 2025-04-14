async function unlockWallet() { // Made async
    const password = document.getElementById('unlock_password').value;
    const passwordError = document.getElementById('passwordError');
    const unlockButton = document.getElementById('btn-password-input-unlock-wallet');

    passwordError.style.display = 'none'; // Reset error

    if (password === "") {
        passwordError.innerHTML = 'Please enter your password.';
        passwordError.style.display = 'block';
        return;
    }

    // Disable button during decryption attempt
    unlockButton.disabled = true;
    unlockButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unlocking...';


    try {
        // 1. Read necessary data from storage
        const storedEncryptedSeed = await readEncryptedSeed();
        const storedAccounts = await readAccounts(); // Read accounts to ensure state consistency
        const storedSelectedIndex = await readSelectedAccountIndex(); // Read index

        if (!storedEncryptedSeed) {
            // This case should ideally not happen if password-input page is shown,
            // but handle it defensively.
            console.error("Encrypted seed not found in storage during unlock attempt.");
            passwordError.innerHTML = 'Wallet data not found. Please try importing again.';
            passwordError.style.display = 'block';
            // Redirect to get-started as the wallet state is broken
            changePage('get-started');
            return; // Exit the function
        }

        // 2. Attempt to decrypt the seed
        const decryptedMnemonic = decryptSeed(storedEncryptedSeed, password); // From xian.js

        if (decryptedMnemonic === null) {
            // Decryption failed (likely wrong password)
            passwordError.innerHTML = 'Incorrect password!';
            passwordError.style.display = 'block';
            // Re-enable button
            unlockButton.disabled = false;
            unlockButton.innerHTML = 'Unlock Wallet';
            document.getElementById('unlock_password').value = ''; // Clear password field on failure
            document.getElementById('unlock_password').focus();   // Set focus back to password field
            return; // Stop execution
        }

        // 3. Decryption Successful: Update Global State
        window.unencryptedMnemonic = decryptedMnemonic; // Store the decrypted mnemonic globally
        window.encryptedSeed = storedEncryptedSeed; // Ensure global encryptedSeed is up-to-date
        window.accounts = storedAccounts;           // Ensure global accounts are up-to-date
        window.selectedAccountIndex = storedSelectedIndex; // Ensure global index is up-to-date
        window.locked = false;                      // Set wallet to unlocked state

        // Clear password field immediately after successful unlock
        document.getElementById('unlock_password').value = '';

        // 4. Navigate to the main wallet page
        changePage('wallet');

    } catch (error) {
        console.error("Error during wallet unlock:", error);
        passwordError.innerHTML = 'An error occurred during unlock. Please try again.';
        passwordError.style.display = 'block';
        // Re-enable button on unexpected errors
        unlockButton.disabled = false;
        unlockButton.innerHTML = 'Unlock Wallet';
    }
}

// --- Remove Wallet Function (Needs Adaptation) ---
async function removeWallet() { // Made async
    let confirm_delete = confirm("Are you sure you want to remove the wallet from this browser? This cannot be undone without your recovery phrase.");
    if (!confirm_delete) {
        return;
    }

    try {
        // Remove all HD wallet related data
        await removeEncryptedSeed();
        await removeAccounts();
        await removeSelectedAccountIndex();
        // Also clear transaction history associated with this wallet instance
        localStorage.removeItem('tx_history'); // Assuming tx_history is global to the install

        // Reset global state variables
        window.unencryptedMnemonic = null;
        window.encryptedSeed = null;
        window.accounts = [];
        window.selectedAccountIndex = 0;
        window.locked = true;
        window.tx_history = []; // Reset local copy too

        toast('success', 'Wallet removed successfully.');
        changePage('get-started');

    } catch (error) {
        console.error("Error removing wallet:", error);
        toast('danger', 'Failed to remove wallet data completely.');
        // Still try to navigate away
        changePage('get-started');
    }
}

// --- Event Listeners ---

// Unlock button click
document.getElementById('btn-password-input-unlock-wallet').addEventListener('click', function() {
    unlockWallet();
});

// Remove wallet button click
document.getElementById('btn-password-input-remove-wallet').addEventListener('click', function() {
    removeWallet();
});

// Enter key press in password field
document.getElementById('unlock_password').addEventListener('keyup', function(event) {
    if (event.keyCode === 13) { // Enter key
        event.preventDefault();
        unlockWallet();
    }
});

// Auto-focus password field when page loads
document.getElementById('unlock_password').focus();