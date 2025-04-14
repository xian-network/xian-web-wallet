// Assumes global vars: CHAIN_ID, RPC, EXPLORER, locked, unencryptedMnemonic, selectedAccountIndex, accounts
// Assumes functions: getSelectedAccount, signTransaction, estimateStamps, broadcastTransaction,
//                    prependToTransactionHistory, changePage, toast, getStampRate, execute_balance_of

// --- Estimate Stamps (Modified for HD) ---
async function estimateProposalStamps() { // Made async
    const typeInput = document.getElementById('proposalType');
    const valueInput = document.getElementById('proposalValue');
    const feeContainer = document.getElementById('proposalFeeContainer');
    const feeElement = document.getElementById('proposalFee');
    const feeXianElement = document.getElementById('proposalFeeXian');
    const createBtn = document.getElementById('create-proposal-create');
    const errorMsg = document.getElementById('proposalError'); // Use error field

    // Reset UI
    feeContainer.style.display = 'none';
    createBtn.disabled = true;
     errorMsg.style.display = 'none';


    // Check lock state
    if (locked || !unencryptedMnemonic) {
        toast('warning', 'Wallet locked. Cannot estimate fees.');
        return;
    }
    const selectedAccount = getSelectedAccount();
    if (!selectedAccount) {
        toast('danger', 'No account selected.');
        return;
    }

    const type = typeInput.value.trim();
    const valueStr = valueInput.value.trim(); // Trim value string

    if (type === '' || valueStr === '') return; // Not enough info

    // Attempt to parse value (similar to advanced tx)
    let value;
    try {
         // Try JSON first
         value = JSON.parse(valueStr);
    } catch (e) {
         // If JSON fails, check if it's purely numeric
         if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
             value = parseFloat(valueStr); // Treat as number (float or int)
         } else {
             value = valueStr; // Treat as string if not JSON or number
         }
    }


    // Prepare transaction for estimation
    let transaction = {
        payload: {
            // chain_id, nonce, sender added by signTransaction
            contract: "masternodes", // TODO: Verify contract name
            function: "propose_vote",
            kwargs: {
                type_of_vote: type,
                arg: value // Use parsed value
            },
            stamps_supplied: 100000 // High default
        },
        metadata: { signature: "" }
    };

    try {
        // Sign for estimation
        const signedTxForEstimation = await signTransaction(transaction, unencryptedMnemonic, selectedAccount.index);
        // Estimate
        const stampResult = await estimateStamps(signedTxForEstimation);

        feeContainer.style.display = 'block'; // Show fee container

        if (stampResult.stamps === null || !stampResult.success) {
            feeElement.textContent = 'Error';
            feeXianElement.textContent = 'N/A';
             errorMsg.innerHTML = `Fee estimation failed: ${stampResult.tx_result || 'Unknown error'}`;
             errorMsg.style.display = 'block';
        } else {
            const stamps = stampResult.stamps;
            const stamp_rate = await getStampRate();
            if (stamp_rate) {
                feeElement.textContent = stamps;
                feeXianElement.textContent = (stamps / stamp_rate).toFixed(8);
                createBtn.disabled = false; // Enable create button
            } else {
                feeElement.textContent = 'Error';
                feeXianElement.textContent = 'N/A';
                 errorMsg.innerHTML = 'Could not retrieve stamp rate.';
                 errorMsg.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Error estimating proposal stamps:", error);
        feeContainer.style.display = 'block';
        feeElement.textContent = 'Error';
        feeXianElement.textContent = 'N/A';
         errorMsg.innerHTML = `Fee estimation error: ${error.message}`;
         errorMsg.style.display = 'block';
    }
}

// --- Send Proposal (Modified for HD) ---
async function sendProposal() { // Made async
    const successMsg = document.getElementById('proposalSuccess');
    const errorMsg = document.getElementById('proposalError');
    const createButton = document.getElementById('create-proposal-create');

    // Reset messages
    successMsg.style.display = 'none';
    errorMsg.style.display = 'none';

    // Check lock state
    if (locked || !unencryptedMnemonic) {
        errorMsg.innerHTML = 'Wallet is locked. Please unlock to create a proposal.';
        errorMsg.style.display = 'block';
        return;
    }
    const selectedAccount = getSelectedAccount();
    if (!selectedAccount) {
        errorMsg.innerHTML = 'Error: No account selected.';
        errorMsg.style.display = 'block';
        return;
    }

    // Get inputs
    const type = document.getElementById('proposalType').value.trim();
    const valueStr = document.getElementById('proposalValue').value.trim();

    if (type === '' || valueStr === '') {
        errorMsg.innerHTML = 'Type and Value fields are required.';
        errorMsg.style.display = 'block';
        return;
    }

     // Parse value (same logic as estimation)
     let value;
     try {
          value = JSON.parse(valueStr);
     } catch (e) {
          if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
              value = parseFloat(valueStr);
          } else {
              value = valueStr;
          }
     }


    // --- Fee Check ---
    let stampsRequired;
    try {
        stampsRequired = parseInt(document.getElementById('proposalFee').textContent, 10);
        if (isNaN(stampsRequired)) {
             toast('warning', 'Transaction fee not estimated. Please wait or provide valid inputs.');
             await estimateProposalStamps(); // Try re-estimating
             stampsRequired = parseInt(document.getElementById('proposalFee').textContent, 10);
             if (isNaN(stampsRequired)) {
                throw new Error("Fee estimation failed.");
             }
        }
         // Check balance for fee
          const nativeBalanceStr = await execute_balance_of('currency', selectedAccount.vk);
          const nativeBalance = parseFloat(nativeBalanceStr);
          const stampRate = await getStampRate();
          if (isNaN(nativeBalance) || !stampRate || (stampsRequired / stampRate) > nativeBalance) {
               errorMsg.innerHTML = `Insufficient XIAN balance for proposal fee (${(stampsRequired / stampRate).toFixed(4)} Xian needed).`;
               errorMsg.style.display = 'block';
               return;
          }
    } catch (e) {
        errorMsg.innerHTML = `Could not determine transaction fee: ${e.message}`;
        errorMsg.style.display = 'block';
        return;
    }
    // --- End Fee Check ---

    // Disable button
    createButton.disabled = true;
    createButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    // Create transaction
    let transaction = {
        payload: {
            chain_id: CHAIN_ID,
            contract: "masternodes", // TODO: Verify contract
            function: "propose_vote",
            kwargs: {
                type_of_vote: type,
                arg: value
            },
            stamps_supplied: stampsRequired // Use estimated fee
        },
        metadata: { signature: "" }
    };

    // Sign and Broadcast
    try {
        const signedTx = await signTransaction(transaction, unencryptedMnemonic, selectedAccount.index);

        let conf = confirm(`Create proposal? Type: ${type}, Value: ${JSON.stringify(value)}. Fee: ~${(stampsRequired / await getStampRate()).toFixed(4)} Xian`);
        if (!conf) {
             createButton.disabled = false;
             createButton.innerHTML = 'Create Proposal';
             return;
        }

        const response = await broadcastTransaction(signedTx);

        // Handle response
        if (response.error === 'timeout') {
             successMsg.innerHTML = 'Proposal broadcast timed out. Check Explorer.';
             successMsg.style.display = 'block';
              prependToTransactionHistory("TIMEOUT", 'masternodes', 'propose_vote', transaction.payload.kwargs, 'pending', new Date().toLocaleString());
        } else if (response && response.result && response.result.hash) {
            const hash = response.result.hash;
            let status = 'pending';
            let logMessage = response.result.log || "";

            if (response.result.code !== 0) {
                status = 'error';
                errorMsg.innerHTML = `Proposal creation failed: ${logMessage}`;
                errorMsg.style.display = 'block';
                toast('danger', `Proposal failed: ${logMessage.substring(0,100)}...`);
            } else {
                successMsg.innerHTML = `Proposal transaction sent! Hash: <a class='explorer-url text-light' href='${EXPLORER}/tx/${hash}' target='_blank' rel='noopener noreferrer'>${hash}</a>`;
                successMsg.style.display = 'block';
                toast('success', `Proposal sent: ${hash.substring(0,10)}...`);
                // Optionally clear form on success
                // document.getElementById('proposalType').value = '';
                // document.getElementById('proposalValue').value = '';
                // document.getElementById('proposalFeeContainer').style.display = 'none';
            }
            prependToTransactionHistory(hash, 'masternodes', 'propose_vote', transaction.payload.kwargs, status, new Date().toLocaleString());
        } else {
            throw new Error('Unexpected response from network during proposal creation.');
        }
    } catch (error) {
        console.error("Error sending proposal:", error);
        errorMsg.innerHTML = `Error sending proposal: ${error.message}`;
        errorMsg.style.display = 'block';
         toast('danger', `Error: ${error.message}`);
    } finally {
        // Re-enable button
        createButton.disabled = false;
        createButton.innerHTML = 'Create Proposal';
    }
}


// --- Event Listeners ---
document.getElementById("create-proposal-cancel")?.addEventListener("click", () => {
    changePage("insights"); // Go back to insights/governance page
});

document.getElementById('create-proposal-create')?.addEventListener('click', sendProposal);

// Use debounced estimation on input change
const debouncedEstimateProposalStamps = debounce(estimateProposalStamps, 500);
document.getElementById('proposalType')?.addEventListener('input', debouncedEstimateProposalStamps);
document.getElementById('proposalValue')?.addEventListener('input', debouncedEstimateProposalStamps);

// Initial estimation attempt if needed
// estimateProposalStamps();