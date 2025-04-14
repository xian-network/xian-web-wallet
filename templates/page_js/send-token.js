// Assumes global vars: selectedAccountIndex, unencryptedMnemonic, locked, accounts, CHAIN_ID, EXPLORER, RPC
// Assumes functions: getSelectedAccount, execute_balance_of, signTransaction, estimateStamps, broadcastTransaction,
//                    prependToTransactionHistory, changePage, toast, readSecureCookie (if still used anywhere, though likely not needed here),
//                    getTokenInfo, getStampRate, execute_get_main_name_to_address

async function sendToken() { // Made async
    // Check if wallet is locked
    if (locked || !unencryptedMnemonic) {
        toast('warning', 'Wallet is locked. Please unlock to send tokens.');
        // Optionally redirect to unlock page or just return
        // changePage('password-input');
        return;
    }

    const selectedAccount = getSelectedAccount(); // Get { index, vk, name }
    if (!selectedAccount) {
        toast('danger', 'Error: No account selected or found.');
        return; // Should not happen if unlocked, but good practice
    }

    const contract = document.getElementById('tokenName').innerHTML; // Contract being sent
    let recipient = document.getElementById('toAddress').value.trim();
    const amountInput = document.getElementById('tokenAmount').value;
    const successMsg = document.getElementById('sendTokenSuccess');
    const errorMsg = document.getElementById('sendTokenError');
    const sendButton = document.getElementById('send-token-send-token');
    const xnsFoundAddressSpan = document.getElementById('xnsFoundAddress');

    successMsg.style.display = 'none';
    errorMsg.style.display = 'none';

    // --- Recipient Resolution (XNS) ---
    let finalRecipient = recipient;
    if (xnsFoundAddressSpan.textContent && xnsFoundAddressSpan.textContent !== '') {
        finalRecipient = xnsFoundAddressSpan.textContent; // Use resolved address if available
        console.log(`Using resolved XNS address: ${finalRecipient} for ${recipient}`);
    }
    recipient = finalRecipient; // Use the resolved or original input

    // --- Validation ---
    if (!recipient || recipient.length !== 64 || !/^[0-9a-fA-F]+$/.test(recipient)) {
        errorMsg.innerHTML = 'Invalid recipient address format (must be 64 hex characters).';
        errorMsg.style.display = 'block';
        return;
    }
    if (recipient === selectedAccount.vk) {
         errorMsg.innerHTML = 'Cannot send tokens to yourself.';
         errorMsg.style.display = 'block';
         return;
    }

    // Validate amount
    if (amountInput.includes(',')) {
        errorMsg.innerHTML = 'Commas are not allowed in amount. Use a dot (.) for decimals.';
        errorMsg.style.display = 'block';
        return;
    }
    let amount;
    try {
        amount = parseFloat(amountInput); // Use parseFloat for decimals
         if (isNaN(amount) || amount <= 0) {
             throw new Error("Invalid amount");
         }
    } catch (e) {
        errorMsg.innerHTML = 'Invalid token amount. Please enter a positive number.';
        errorMsg.style.display = 'block';
        return;
    }
    // --- End Validation ---


    // --- Fee and Balance Check ---
    let stampsRequired;
    try {
         // Rely on estimateSendStamps to have calculated the fee and stored it
         stampsRequired = parseInt(document.getElementById('tokenFee').innerHTML, 10);
         if (isNaN(stampsRequired)) {
             toast('warning', 'Transaction fee not estimated. Please wait or try again.');
             await estimateSendStamps_(); // Try estimating again
             stampsRequired = parseInt(document.getElementById('tokenFee').innerHTML, 10); // Read again
             if (isNaN(stampsRequired)) {
                throw new Error("Fee estimation failed.");
             }
         }
    } catch (e) {
         errorMsg.innerHTML = 'Could not determine transaction fee. ' + e.message;
         errorMsg.style.display = 'block';
         return;
    }

     try {
        const balanceStr = await execute_balance_of(contract, selectedAccount.vk);
        const balance = parseFloat(balanceStr);

        if (isNaN(balance)) {
            throw new Error("Could not retrieve valid balance.");
        }

        if (amount > balance) {
            errorMsg.innerHTML = 'Insufficient balance.';
            errorMsg.style.display = 'block';
            return;
        }

         // Check if sufficient native currency (Xian) is available for fees
         if (contract !== 'currency') { // Only check if sending a token, not Xian itself
            const nativeBalanceStr = await execute_balance_of('currency', selectedAccount.vk);
            const nativeBalance = parseFloat(nativeBalanceStr);
            const stampRate = await getStampRate();
            if (isNaN(nativeBalance) || !stampRate || (stampsRequired / stampRate) > nativeBalance) {
                 errorMsg.innerHTML = `Insufficient XIAN balance to pay the transaction fee (${(stampsRequired / stampRate).toFixed(4)} Xian needed).`;
                 errorMsg.style.display = 'block';
                 return;
            }
         } else { // If sending Xian, check if balance covers amount + fee
              const stampRate = await getStampRate();
              if (!stampRate) throw new Error("Could not get stamp rate for fee calculation.");
              const feeInXian = stampsRequired / stampRate;
              if (amount + feeInXian > balance) {
                   errorMsg.innerHTML = `Insufficient balance to send ${amount} Xian and pay the ${feeInXian.toFixed(4)} Xian fee.`;
                   errorMsg.style.display = 'block';
                   return;
              }
         }


    } catch (e) {
         console.error("Error checking balance or fee:", e);
         errorMsg.innerHTML = 'Error checking balance or fee: ' + e.message;
         errorMsg.style.display = 'block';
         return;
    }
    // --- End Fee and Balance Check ---

    // Disable button
    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    // --- Transaction Creation and Signing ---
    let transaction = {
        payload: {
            chain_id: CHAIN_ID,
            contract: contract,
            function: "transfer",
            kwargs: {
                to: recipient,
                amount: amount // Use the parsed float amount
            },
            stamps_supplied: stampsRequired // Use the estimated stamps
        },
        metadata: {
            signature: "", // Will be added by signTransaction
        }
    };

    try {
        // Sign using the selected account's derived key and mnemonic
        const signedTx = await signTransaction(transaction, unencryptedMnemonic, selectedAccount.index);

        // Optional: Confirmation dialog
        let conf = confirm(`Send ${amount} ${contract === 'currency' ? 'Xian' : contract} to ${recipient.substring(0, 6)}...? Fee: ~${(stampsRequired / await getStampRate()).toFixed(4)} Xian`);
        if (!conf) {
            sendButton.disabled = false;
            sendButton.innerHTML = 'Send Token';
            return;
        }

        // Broadcast the signed transaction
        const response = await broadcastTransaction(signedTx); // Pass the signed object

        // --- Handle Broadcast Response ---
        if (response.error === 'timeout') {
            // Handle timeout specifically (already toasted in broadcastTransaction)
             successMsg.innerHTML = 'Transaction broadcast timed out. It might still succeed. Check Explorer: <a class="explorer-url" href="' + EXPLORER + '/transactions" target="_blank">Recent Transactions</a>'; // Provide general link
             successMsg.style.display = 'block';
             // Consider adding to history as pending or unknown status
              prependToTransactionHistory("TIMEOUT", contract, 'transfer', { to: recipient, amount: amount }, 'pending', new Date().toLocaleString());

        } else if (response && response.result && response.result.hash) {
            const hash = response.result.hash;
            let status = 'pending'; // Assume pending initially
            let logMessage = response.result.log || "";

            if (response.result.code !== 0) { // Check Tendermint result code
                status = 'error';
                errorMsg.innerHTML = `Transaction failed: ${logMessage}`;
                errorMsg.style.display = 'block';
                 toast('danger', `Transaction failed: ${logMessage}`);
            } else {
                // Tendermint code 0 doesn't guarantee success yet, mark as pending
                 successMsg.innerHTML = 'Transaction sent successfully! Hash: <a class="explorer-url" href="' + EXPLORER + '/tx/' + hash + '" target="_blank">' + hash + '</a>';
                 successMsg.style.display = 'block';
                 toast('success', `Transaction sent: ${hash.substring(0,10)}...`);
                 // Clear inputs on success
                 document.getElementById('toAddress').value = '';
                 document.getElementById('tokenAmount').value = '';
                 document.querySelector('.xns-found').style.display = 'none';
                 document.getElementById('xnsFoundAddress').innerHTML = '';
                 document.getElementById('tokenFeeContainer').style.display = 'none'; // Hide fee
            }
            // Add to local history
            prependToTransactionHistory(hash, contract, 'transfer', { to: recipient, amount: amount }, status, new Date().toLocaleString());

        } else {
            // Handle unexpected response structure
            console.error("Unexpected broadcast response:", response);
            throw new Error('Unexpected response from network.');
        }
        // --- End Handle Broadcast Response ---

    } catch (error) {
        console.error("Error sending token:", error);
        errorMsg.innerHTML = `Error sending transaction: ${error.message}`;
        errorMsg.style.display = 'block';
         toast('danger', `Error: ${error.message}`);
    } finally {
        // Re-enable button
        sendButton.disabled = false;
        sendButton.innerHTML = 'Send Token';
    }
}

// --- Debounce Helper (Keep as is) ---
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// --- Estimate Stamps (Modified for HD) ---
async function estimateSendStamps_() { // Renamed to avoid conflict with global estimateStamps if it exists elsewhere
    const recipientInput = document.getElementById('toAddress').value.trim();
    const amountInput = document.getElementById('tokenAmount').value;
    const contract = document.getElementById('tokenName').innerHTML;
    const send_btn = document.getElementById('send-token-send-token');
    const estimation_loading = document.getElementById('estimation-loading');
    const estimation_finished = document.getElementById('estimation-result');
    const feeContainer = document.getElementById('tokenFeeContainer');
    const feeElement = document.getElementById('tokenFee');
    const feeXianElement = document.getElementById('tokenFeeXian');
    const errorMsg = document.getElementById('sendTokenError');

    // Hide previous errors related to estimation
    errorMsg.style.display = 'none';


    // Early exit if inputs are invalid or wallet locked
    if (locked || !unencryptedMnemonic || recipientInput === '' || amountInput === '' || isNaN(parseFloat(amountInput))) {
        feeContainer.style.display = 'none';
        send_btn.disabled = true; // Keep disabled if inputs invalid
        return;
    }

    const selectedAccount = getSelectedAccount();
    if (!selectedAccount) {
        feeContainer.style.display = 'none';
        send_btn.disabled = true;
        return;
    }

    // Show loading, disable button
    estimation_loading.style.display = 'inline-block';
    estimation_finished.style.display = 'none';
    feeContainer.style.display = 'block'; // Show container while loading
    send_btn.disabled = true;

     // Resolve XNS name if needed
     let recipient = recipientInput;
     const xnsFoundAddressSpan = document.getElementById('xnsFoundAddress');
     if (xnsFoundAddressSpan.textContent && xnsFoundAddressSpan.textContent !== '') {
         recipient = xnsFoundAddressSpan.textContent;
     }


    let amount;
     try {
         amount = parseFloat(amountInput);
         if (isNaN(amount) || amount <= 0) throw new Error();
     } catch {
         // Handled by early exit, but keep for safety
         estimation_loading.style.display = 'none';
         feeContainer.style.display = 'none';
         return;
     }

     // Check recipient format *before* signing for estimation
     if (!recipient || recipient.length !== 64 || !/^[0-9a-fA-F]+$/.test(recipient)) {
         estimation_loading.style.display = 'none';
         feeElement.innerHTML = "Invalid Address";
         estimation_finished.style.display = 'inline-block';
         feeContainer.style.display = 'block';
         // Don't enable send button
         return;
     }


    let transaction = {
        payload: {
            // Fields needed for signing, will be filled by signTransaction
            // chain_id, nonce, sender filled by signTransaction
            contract: contract,
            function: "transfer",
            kwargs: {
                to: recipient,
                amount: amount // Use parsed amount
            },
            stamps_supplied: 200000 // High value for estimation
        },
        metadata: {
            signature: "",
        }
    };

    try {
        // Sign the transaction *before* estimating stamps
        const signedTxForEstimation = await signTransaction(transaction, unencryptedMnemonic, selectedAccount.index);

        // Estimate stamps using the signed transaction
        const stampResult = await estimateStamps(signedTxForEstimation);

        estimation_loading.style.display = 'none';
        estimation_finished.style.display = 'inline-block'; // Show result area

        if (stampResult.stamps === null) {
             feeElement.innerHTML = 'Error';
             feeXianElement.innerHTML = 'N/A';
             errorMsg.innerHTML = `Fee estimation failed: ${stampResult.tx_result || 'Unknown error'}`;
             errorMsg.style.display = 'block';
        } else {
            const stamps = stampResult.stamps;
            const stamp_rate = await getStampRate();
            if (stamp_rate) {
                feeElement.innerHTML = stamps;
                feeXianElement.innerHTML = (stamps / stamp_rate).toFixed(8); // Show more precision
                send_btn.disabled = false; // Enable send only if estimation is successful
            } else {
                 feeElement.innerHTML = 'Error';
                 feeXianElement.innerHTML = 'N/A';
                 errorMsg.innerHTML = 'Could not retrieve stamp rate.';
                 errorMsg.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Error estimating stamps:", error);
        estimation_loading.style.display = 'none';
        estimation_finished.style.display = 'inline-block';
        feeElement.innerHTML = 'Error';
        feeXianElement.innerHTML = 'N/A';
         errorMsg.innerHTML = `Fee estimation error: ${error.message}`;
         errorMsg.style.display = 'block';
    }
}

// --- XNS Address Resolution (Unchanged, but ensure it's called correctly) ---
async function getXNSAddress(){
    let name = document.getElementById('toAddress').value.trim();
    let xns_found_div = document.querySelector('.xns-found');
    let xns_address_span = document.getElementById('xnsFoundAddress');

    xns_address_span.innerHTML = ''; // Clear previous result
    xns_found_div.style.display = 'none'; // Hide indicator

    // Basic validation for potential XNS names
    if (name === '' || name.length < 3 || name.length > 64 || !/^[a-zA-Z0-9_.-]+$/.test(name) || /^[0-9a-fA-F]{64}$/.test(name)) {
         // If it's empty, too short/long, contains invalid chars, or looks like a VK, don't query
        return;
    }

    try {
        // Show loading state? Optional.
        let address = await execute_get_main_name_to_address(name); // Assuming this function exists and works

        if (address !== "None" && address !== null) {
            xns_found_div.style.display = 'block'; // Show indicator
            xns_address_span.innerHTML = address; // Display resolved address (hidden)
             // Trigger stamp estimation again now that address is resolved
             debouncedEstimateSendStamps_();
        } else {
            // Name not found or error occurred in execute_get_main_name_to_address
        }
    } catch (error) {
        console.error(`Error resolving XNS name ${name}:`, error);
        // Don't show error to user unless necessary, just means name wasn't found
    }
}

// --- Page Load Logic ---
async function loadPage() {
    const tokenContractName = document.getElementById('tokenName').innerHTML;
    const selectedAccount = getSelectedAccount();

    if (!selectedAccount) {
        changePage('password-input'); // Redirect if locked or no account
        return;
    }

    // Fetch token info (name)
    try {
        const tokenInfo = await getTokenInfo(tokenContractName); // Assuming getTokenInfo is async
        document.getElementById('realTokenName').innerHTML = tokenInfo.name || tokenContractName; // Show contract if name fails
        document.getElementById('realTokenName').style.display = 'inline-block';
    } catch (error) {
        console.error("Failed to load token name:", error);
        document.getElementById('realTokenName').innerHTML = tokenContractName; // Fallback
        document.getElementById('realTokenName').style.display = 'inline-block';
    }

    // Fetch and display balance for the selected account
    try {
        const tokenBalance = await execute_balance_of(tokenContractName, selectedAccount.vk);
        let formattedBalance = "0.00000000"; // Default
        if (tokenBalance !== null && !isNaN(parseFloat(tokenBalance))) {
            formattedBalance = parseFloat(tokenBalance).toFixed(8); // Ensure 8 decimals
        }
        const maxAmountSpan = document.getElementById('maxTokenAmount');
        maxAmountSpan.innerHTML = formattedBalance;
        maxAmountSpan.style.display = 'inline-block';

        // Update click listener for max amount
        maxAmountSpan.removeEventListener('click', handleMaxAmountClick); // Remove old listener first
        maxAmountSpan.addEventListener('click', handleMaxAmountClick); // Add new one

    } catch (error) {
        console.error("Failed to load balance:", error);
        document.getElementById('maxTokenAmount').innerHTML = 'Error';
        document.getElementById('maxTokenAmount').style.display = 'inline-block';
    }
}

// Handler for clicking max amount (needs access to formattedBalance)
async function handleMaxAmountClick() {
    const maxAmountSpan = document.getElementById('maxTokenAmount');
    const amountInput = document.getElementById('tokenAmount');
    const formattedBalance = maxAmountSpan.textContent; // Get balance from span

    // Basic check if balance is valid before setting
    if (formattedBalance && formattedBalance !== 'Error' && !isNaN(parseFloat(formattedBalance))) {
        let maxSendable = parseFloat(formattedBalance);

        // If sending native currency, subtract estimated fee
        if (document.getElementById('tokenName').innerHTML === 'currency') {
            try {
                 // Ensure fee is estimated first
                 await estimateSendStamps_();
                 const feeXianElement = document.getElementById('tokenFeeXian');
                 if (feeXianElement && feeXianElement.textContent) {
                      const feeInXian = parseFloat(feeXianElement.textContent);
                      if (!isNaN(feeInXian) && maxSendable >= feeInXian) {
                           maxSendable -= feeInXian;
                           // Ensure it doesn't go below zero
                           maxSendable = Math.max(0, maxSendable);
                      }
                 }
            } catch (e) { console.error("Could not adjust max amount for fee:", e); }
        }
        // Set input value, possibly formatting to fewer decimals for display clarity
        amountInput.value = maxSendable.toFixed(8); // Use toFixed(8) to prevent scientific notation for small numbers
        // Trigger estimation again after setting amount
        await estimateSendStamps_();
    } else {
        amountInput.value = '0'; // Set to 0 if balance is invalid/error
    }
}

// --- Attach Event Listeners ---
document.getElementById('send-token-send-token')?.addEventListener('click', sendToken);
document.getElementById('send-token-cancel')?.addEventListener('click', () => changePage('wallet'));

// Debounced estimation listener
const debouncedEstimateSendStamps_ = debounce(estimateSendStamps_, 500);
document.getElementById('toAddress')?.addEventListener('input', () => {
    getXNSAddress(); // Resolve XNS on input change
    debouncedEstimateSendStamps_(); // Estimate fee after potential XNS resolution delay
});
document.getElementById('tokenAmount')?.addEventListener('input', debouncedEstimateSendStamps_);

// Initial page load execution
(async () => {
    await loadPage();
    // Optionally run initial stamp estimation if fields might be pre-filled
    // await estimateSendStamps_();
})();