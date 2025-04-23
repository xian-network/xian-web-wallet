// --- Estimate Vote Stamps (Modified for HD) ---
async function estimateVoteStamps(proposal_id, voteBool) { // Made async
    // Check lock state FIRST
    if (locked || !unencryptedMnemonic) {
        toast('warning', 'Wallet locked. Cannot estimate vote fee.');
        return null; // Return null to indicate failure
    }
    const selectedAccount = await getSelectedAccount();
    if (!selectedAccount) {
         toast('danger', 'No account selected for voting.');
        return null;
    }

    const voteString = voteBool ? "yes" : "no";

    let transaction = {
        payload: {
            // chain_id, nonce, sender added by signTransaction
            contract: "masternodes",
            function: "vote",
            kwargs: {
                proposal_id: proposal_id,
                vote: voteString
            },
            stamps_supplied: 100000 // High default
        },
        metadata: { signature: "" }
    };

    try {
        // Sign for estimation using selected account
        const signedTxForEstimation = await signTransaction(transaction, unencryptedMnemonic, selectedAccount.index);
        // Estimate
        const stampResult = await estimateStamps(signedTxForEstimation);

        if (stampResult.stamps === null || !stampResult.success) {
             console.error(`Vote fee estimation failed: ${stampResult.tx_result || 'Unknown error'}`);
             toast('warning', `Fee estimation failed: ${stampResult.tx_result || 'Unknown'}`);
            return null; // Indicate failure
        }
        return stampResult.stamps; // Return estimated stamps

    } catch (error) {
        console.error("Error estimating vote stamps:", error);
        toast('danger', `Error estimating vote fee: ${error.message}`);
        return null;
    }
}

// --- Vote Proposal (Modified for HD) ---
async function voteProposal(proposal_id, voteBool) { // Made async
     const voteString = voteBool ? "yes" : "no";
     const voteButton = document.querySelector(`.vote-${voteString}[data-id="${proposal_id}"]`); // Find the specific button

     // Check lock state
     if (locked || !unencryptedMnemonic) {
         toast('warning', 'Wallet locked. Please unlock to vote.');
         return;
     }
      const selectedAccount = await getSelectedAccount();
      if (!selectedAccount) {
          toast('danger', 'No account selected for voting.');
          return;
      }
      // Check if the selected account is actually a validator (UI should ideally prevent this button showing otherwise)
       if (!isValidator) { // Assumes 'isValidator' is correctly set based on selectedAccount.vk
            toast('warning', 'Only validators can vote.');
            return;
       }


     // Disable button during process
     if (voteButton) {
        voteButton.disabled = true;
        voteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Voting...';
     }

     // --- Estimate Fee ---
     let stampsRequired = await estimateVoteStamps(proposal_id, voteBool);
     if (stampsRequired === null) {
         // Error already toasted in estimateVoteStamps
         if (voteButton) { // Re-enable button if estimation failed
             voteButton.disabled = false;
             voteButton.innerHTML = `Vote ${voteString.charAt(0).toUpperCase() + voteString.slice(1)}`;
         }
         return; // Stop if estimation failed
     }
     stampsRequired += 50; // Add buffer

     // --- Check Fee Balance ---
     try {
         const nativeBalanceStr = await execute_balance_of('currency', selectedAccount.vk);
         const nativeBalance = parseFloat(nativeBalanceStr);
         const stampRate = await getStampRate();
         if (isNaN(nativeBalance) || !stampRate || (stampsRequired / stampRate) > nativeBalance) {
              toast('danger', `Insufficient XIAN balance for voting fee (${(stampsRequired / stampRate).toFixed(4)} Xian needed).`);
              if (voteButton) { voteButton.disabled = false; voteButton.innerHTML = `Vote ${voteString.charAt(0).toUpperCase() + voteString.slice(1)}`; }
              return;
         }
     } catch (e) {
          toast('danger', `Error checking balance for voting fee: ${e.message}`);
           if (voteButton) { voteButton.disabled = false; voteButton.innerHTML = `Vote ${voteString.charAt(0).toUpperCase() + voteString.slice(1)}`; }
          return;
     }
     // --- End Fee Check ---


     // --- Confirmation ---
     let conf = confirm(`Vote ${voteString.toUpperCase()} on proposal #${proposal_id}? Fee: ~${(stampsRequired / await getStampRate()).toFixed(4)} Xian`);
     if (!conf) {
          if (voteButton) {
               voteButton.disabled = false;
               voteButton.innerHTML = `Vote ${voteString.charAt(0).toUpperCase() + voteString.slice(1)}`;
          }
          return;
     }
     // --- End Confirmation ---


     // Create transaction payload
    let transaction = {
        payload: {
            chain_id: CHAIN_ID,
            contract: "masternodes",
            function: "vote",
            kwargs: {
                proposal_id: parseInt(proposal_id), // Ensure proposal_id is int
                vote: voteString
            },
            stamps_supplied: stampsRequired
            // nonce, sender added by signTransaction
        },
        metadata: { signature: "" }
    };

    // Sign and Broadcast
    try {
        const signedTx = await signTransaction(transaction, unencryptedMnemonic, selectedAccount.index);
        const response = await broadcastTransaction(signedTx);

        // Handle response
         if (response.error === 'timeout') {
              toast('warning', 'Vote broadcast timed out. Check Explorer.');
               prependToTransactionHistory("TIMEOUT", 'masternodes', 'vote', transaction.payload.kwargs, 'pending', new Date().toLocaleString());
         } else if (response && response.result && response.result.hash) {
            const hash = response.result.hash;
            let status = 'pending';
            let logMessage = response.result.log || "";

            if (response.result.code !== 0) {
                status = 'error';
                toast('danger', `Vote failed: ${logMessage.substring(0,100)}...`);
            } else {
                toast('success', `Vote sent successfully: ${hash.substring(0,10)}...`);
                // Refresh the proposal list after a short delay to allow block processing
                 setTimeout(() => {
                    // Check if still on the governance page before refreshing
                    if (app_page === 'insights' || app_page === 'governance') { // Adjust page name if needed
                         buildProposalTable(); // Refresh proposals UI
                    }
                 }, 4000); // Delay might need adjustment
            }
             prependToTransactionHistory(hash, 'masternodes', 'vote', transaction.payload.kwargs, status, new Date().toLocaleString());
        } else {
            throw new Error('Unexpected response from network during voting.');
        }

    } catch (error) {
        console.error("Error voting on proposal:", error);
        toast('danger', `Error voting: ${error.message}`);
    } finally {
        // Re-enable button (might be slightly delayed if refresh happens)
         if (voteButton) {
             voteButton.disabled = false;
             voteButton.innerHTML = `Vote ${voteString.charAt(0).toUpperCase() + voteString.slice(1)}`;
         }
    }
}

// --- Keep existing event listener for vote buttons ---
document.addEventListener("click", async (event) => {
    const target = event.target.closest('.vote-yes, .vote-no'); // Check closest button ancestor
    if (!target) return;

    const proposal_id = target.dataset.id;
    if (!proposal_id) return;


    if (target.classList.contains("vote-yes")) {
        await voteProposal(proposal_id, true); // Call async function
    } else if (target.classList.contains("vote-no")) { // Ensure class is vote-no
         await voteProposal(proposal_id, false); // Call async function
    }
});

// Modify getValidatorState to check the SELECTED account
async function getValidatorState() {
     const selectedAccount = await getSelectedAccount();
     const displayElement = document.getElementById('validator-state');
     const proposalButton = document.getElementById('new-proposal'); // Assuming this ID exists

     if (!displayElement) return;
     displayElement.innerHTML = "<span><i class='fas fa-spinner fa-spin'></i> Checking validator status...</span>"; // Loading state
      proposalButton.style.display = "none"; // Hide button initially
      isValidator = false; // Reset flag


     if (!selectedAccount) {
         displayElement.innerHTML = "<span>Wallet locked or no account selected.</span>";
         return;
     }

    getVariable("masternodes", "nodes")
        .then(validator_list_str => {
            let built_html = "<span>You (<span class='text-muted' title='"+selectedAccount.vk+"'>"+selectedAccount.vk.substring(0,6)+"...</span>) are currently ";
             let isSelectedValidator = false;
             try {
                 const validator_list = validator_list_str ? JSON.parse(validator_list_str) : [];
                  if (Array.isArray(validator_list) && validator_list.includes(selectedAccount.vk)) {
                       isSelectedValidator = true;
                       isValidator = true; // Update global flag
                  }
                  // Update validator count display if element exists
                  const countElement = document.getElementById('number-of-validators-governance');
                  if (countElement) countElement.textContent = validator_list.length;

             } catch (e) {
                  console.error("Failed to parse validator list:", e);
                   built_html += "<span class='text-warning'>unable to determine status (parse error)</span>";
                   const countElement = document.getElementById('number-of-validators-governance');
                   if (countElement) countElement.textContent = "ERR";
             }


            if (isSelectedValidator) {
                if (proposalButton) proposalButton.style.display = "block"; // Show proposal button
                built_html += "<span class='text-success'>a Validator</span>";
            } else {
                built_html += "<span class='text-danger'>not a Validator</span>";
            }
            built_html += ".</span>";
            displayElement.innerHTML = built_html;

             // Rebuild proposal table AFTER checking validator status for the selected account
             buildProposalTable();

        })
        .catch(error => {
            console.error("Error getting validator state:", error);
            displayElement.innerHTML = "<span>Error checking validator status.</span>";
            const countElement = document.getElementById('number-of-validators-governance');
            if (countElement) countElement.textContent = "ERR";
        });
}

// Ensure getValidatorState is called when the page loads or account changes
// This might need to be triggered from the main router/page load logic for governance page.
// For now, assume it's called correctly on page load.

// --- Initial Load (Governance Page) ---
// (Keep existing load calls, but ensure getValidatorState runs)
// getDAOBalance();
// getRewardPercentages();
// loadStampRate(); // Assuming loadStampRate exists or is defined elsewhere
// getValidatorState(); // This will now also trigger buildProposalTable after check