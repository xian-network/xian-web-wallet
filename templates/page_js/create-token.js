var tokenContract = `
balances = Hash(default_value=0)
metadata = Hash()
TransferEvent = LogEvent(event="Transfer", params={"from":{'type':str, 'idx':True}, "to": {'type':str, 'idx':True}, "amount": {'type':(int, float, decimal)}})
ApproveEvent = LogEvent(event="Approve", params={"from":{'type':str, 'idx':True}, "to": {'type':str, 'idx':True}, "amount": {'type':(int, float, decimal)}})


@construct
def seed():
    # Supply is dynamically set below
    balances[ctx.caller] = 0 # Start with 0, supply added below
    metadata['token_name'] = "TOKEN_NAME"       # Replaced by input
    metadata['token_symbol'] = "TOKEN_SYMBOL"   # Replaced by input
    metadata['token_logo_url'] = 'TOKEN_LOGO_URL' # Replaced by input
    metadata['token_website'] = 'TOKEN_WEBSITE'   # Replaced by input
    metadata['total_supply'] = 0               # Replaced by input
    metadata['operator'] = ctx.caller

    # Assign total supply to the creator
    balances[ctx.caller] = metadata['total_supply']


@export
def change_metadata(key: str, value: Any):
    assert ctx.caller == metadata['operator'], 'Only operator can set metadata!'
    metadata[key] = value


@export
def balance_of(address: str):
    # Added check for None return from Hash
    bal = balances[address]
    return bal if bal is not None else 0


@export
def transfer(amount: float, to: str):
    assert amount > 0, 'Cannot send negative balances!'
    sender = ctx.caller
    assert balances[sender] >= amount, 'Not enough coins to send!'

    balances[sender] -= amount
    # Ensure recipient balance exists before adding
    balances[to] = balances[to] + amount if balances[to] is not None else amount
    TransferEvent({"from": sender, "to": to, "amount": amount})


@export
def approve(amount: float, to: str):
    assert amount > 0, 'Cannot approve negative balances!'
    sender = ctx.caller
    balances[sender, to] = amount
    ApproveEvent({"from": sender, "to": to, "amount": amount})


@export
def transfer_from(amount: float, to: str, main_account: str):
    assert amount > 0, 'Cannot send negative balances!'
    sender = ctx.caller # The one calling this function (spender)
    approved_amount = balances[main_account, sender]

    assert approved_amount >= amount, f'Not enough coins approved to send! You have {approved_amount} and are trying to spend {amount}'
    assert balances[main_account] >= amount, 'Not enough coins in main account to send!'

    balances[main_account, sender] -= amount
    balances[main_account] -= amount
    balances[to] = balances[to] + amount if balances[to] is not None else amount
    TransferEvent({"from": main_account, "to": to, "amount": amount})
`;


// Debounce helper
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// --- Estimate Stamps (Modified for HD) ---
async function estimateCreateTokenStamps() { // Renamed to be specific
    const estimation_loading = document.getElementById('estimation-loading');
    const estimation_finished = document.getElementById('estimation-result');
    const createTokenBtn = document.getElementById('btn-create-token-create');
    const feeContainer = document.getElementById('tokenFeeContainer');
    const feeElement = document.getElementById('tokenFee');
    const feeXianElement = document.getElementById('tokenFeeXian');
    const errorMsg = document.getElementById("createTokenError"); // Use error field for estimation errors too

    // Reset UI
    estimation_loading.style.display = 'inline-block';
    estimation_finished.style.display = 'none';
    feeContainer.style.display = 'block'; // Show container while loading
    createTokenBtn.disabled = true; // Disable create button during estimation
    errorMsg.style.display = 'none';


    // Check lock state
    if (locked || !unencryptedMnemonic) {
        estimation_loading.style.display = 'none'; // Hide loader
        feeElement.textContent = 'Locked';
        estimation_finished.style.display = 'inline-block';
        toast('warning', 'Wallet locked. Cannot estimate fees.');
        return;
    }
    const selectedAccount = await getSelectedAccount();
    if (!selectedAccount) {
         estimation_loading.style.display = 'none';
         feeElement.textContent = 'Error';
         estimation_finished.style.display = 'inline-block';
         toast('danger', 'No account selected.');
         return;
    }

    // Get contract details (name is most relevant for estimation context)
    const contractName = document.getElementById("ContractNameCreateToken").value.trim();
    const name = document.getElementById("NameCreateToken").value.trim();
    const symbol = document.getElementById("SymbolCreateToken").value.trim();
    const supply = document.getElementById("SupplyCreateToken").value.trim();

    // Basic validation before estimation
    if (!contractName || !name || !symbol || !supply || isNaN(parseFloat(supply)) || parseFloat(supply) <= 0) {
        estimation_loading.style.display = 'none'; // Hide loader
        // Don't show error here, let main create function handle validation
        return;
    }

    // Prepare a dummy transaction for estimation (code isn't needed for stamp calc)
    let transaction = {
        payload: {
            // chain_id, nonce, sender added by signTransaction
            contract: "submission",
            function: "submit_contract",
            kwargs: {
                name: contractName,
                // Code is large, omit from estimation payload if possible,
                // otherwise include a placeholder or the actual code.
                // Stamp cost *might* depend on code size. Let's include it for accuracy.
                code: buildTokenContractCode(), // Build code with current inputs
            },
            stamps_supplied: 200000 // High default for estimation
        },
        metadata: { signature: "" }
    };

    try {
        // Sign for estimation
        const signedTxForEstimation = await signTransaction(transaction, unencryptedMnemonic, selectedAccount.vk);
        // Estimate
        const stampResult = await estimateStamps(signedTxForEstimation);

        estimation_loading.style.display = 'none';
        estimation_finished.style.display = 'inline-block'; // Show result area

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
                createTokenBtn.disabled = false; // Enable button ONLY on successful estimation
            } else {
                feeElement.textContent = 'Error';
                feeXianElement.textContent = 'N/A';
                 errorMsg.innerHTML = 'Could not retrieve stamp rate.';
                 errorMsg.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Error estimating token creation stamps:", error);
        estimation_loading.style.display = 'none';
        estimation_finished.style.display = 'inline-block';
        feeElement.textContent = 'Error';
        feeXianElement.textContent = 'N/A';
         errorMsg.innerHTML = `Fee estimation error: ${error.message}`;
         errorMsg.style.display = 'block';
    }
}

// Helper function to build the contract code with current inputs
function buildTokenContractCode() {
    let currentCode = tokenContract; // Start with the template
    const name = document.getElementById("NameCreateToken").value || "My Token";
    const symbol = document.getElementById("SymbolCreateToken").value || "TKN";
    const supply = parseFloat(document.getElementById("SupplyCreateToken").value) || 0;
    const logo = document.getElementById("LogoCreateToken").value || "";
    const website = document.getElementById("WebsiteCreateToken").value || "";

    // Replace placeholders carefully
    currentCode = currentCode.replace('"TOKEN_NAME"', JSON.stringify(name)); // Use JSON.stringify for proper escaping
    currentCode = currentCode.replace('"TOKEN_SYMBOL"', JSON.stringify(symbol));
    // Use a unique placeholder or regex for supply to avoid accidental replacement
    currentCode = currentCode.replace('metadata[\'total_supply\'] = 0', `metadata['total_supply'] = ${supply}`);
    currentCode = currentCode.replace('balances[ctx.caller] = 0', `balances[ctx.caller] = ${supply}`); // Assign supply to creator
    currentCode = currentCode.replace("'TOKEN_LOGO_URL'", JSON.stringify(logo));
    currentCode = currentCode.replace("'TOKEN_WEBSITE'", JSON.stringify(website));

    return currentCode;
}

// --- Create Token Function (Modified for HD) ---
async function createToken() { // Renamed and made async
    const createTokenError = document.getElementById("createTokenError");
    const createTokenSuccess = document.getElementById("createTokenSuccess");
    const createTokenBtn = document.getElementById("btn-create-token-create");

    // Reset messages
    createTokenError.style.display = "none";
    createTokenSuccess.style.display = "none";

    // Check lock state
    if (locked || !unencryptedMnemonic) {
        createTokenError.innerHTML = 'Wallet is locked. Please unlock to create a token.';
        createTokenError.style.display = 'block';
        return;
    }
    const selectedAccount = await getSelectedAccount();
    if (!selectedAccount) {
         createTokenError.innerHTML = 'Error: No account selected.';
         createTokenError.style.display = 'block';
        return;
    }

    // --- Get and Validate Inputs ---
    const name = document.getElementById("NameCreateToken").value.trim();
    const symbol = document.getElementById("SymbolCreateToken").value.trim();
    const supplyStr = document.getElementById("SupplyCreateToken").value.trim();
    const contractName = document.getElementById("ContractNameCreateToken").value.trim();
    const logo = document.getElementById("LogoCreateToken").value.trim();
    const website = document.getElementById("WebsiteCreateToken").value.trim();

    if (!name || !symbol || !supplyStr || !contractName) {
        createTokenError.innerHTML = "Please fill out all required (*) fields.";
        createTokenError.style.display = "block";
        return;
    }
    if (!contractName.startsWith('con_')) {
         createTokenError.innerHTML = 'Contract name must start with "con_".';
         createTokenError.style.display = 'block';
         return;
    }
     // Validate supply format
     let supply;
     try {
         supply = parseFloat(supplyStr);
         if (isNaN(supply) || supply <= 0) throw new Error();
     } catch {
         createTokenError.innerHTML = "Invalid supply. Please enter a positive number.";
         createTokenError.style.display = "block";
         return;
     }
     // --- End Validation ---


    // --- Fee Check ---
    let stampLimit;
    try {
        stampLimit = parseInt(document.getElementById("tokenFee").textContent, 10);
        if (isNaN(stampLimit)) {
             // Attempt re-estimation if stamp value isn't valid
             toast('warning', 'Fee not estimated. Attempting estimation...');
             await estimateCreateTokenStamps();
             stampLimit = parseInt(document.getElementById("tokenFee").textContent, 10);
             if (isNaN(stampLimit)) { // Check again after re-estimation attempt
                throw new Error("Fee could not be estimated.");
             }
        }
         // Check balance for fee
          const nativeBalanceStr = await execute_balance_of('currency', selectedAccount.vk);
          const nativeBalance = parseFloat(nativeBalanceStr);
          const stampRate = await getStampRate();
          if (isNaN(nativeBalance) || !stampRate || (stampLimit / stampRate) > nativeBalance) {
               createTokenError.innerHTML = `Insufficient XIAN balance for creation fee (${(stampLimit / stampRate).toFixed(4)} Xian needed).`;
               createTokenError.style.display = 'block';
               return;
          }

    } catch (e) {
        createTokenError.innerHTML = `Could not determine transaction fee: ${e.message}`;
        createTokenError.style.display = "block";
        return;
    }
    // --- End Fee Check ---


    // Disable button during process
    createTokenBtn.disabled = true;
    createTokenBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

    // Build final contract code
    const finalTokenContractCode = buildTokenContractCode();

    // Create transaction payload
    let payload = {
        payload: {
            chain_id: CHAIN_ID,
            contract: 'submission',
            function: 'submit_contract',
            kwargs: {
                name: contractName,
                code: finalTokenContractCode,
                // No constructor_args needed for this template
            },
            stamps_supplied: stampLimit
            // nonce, sender added by signTransaction
        },
        metadata: { signature: "" }
    };

    // Sign and Broadcast
    try {
        const signedTx = await signTransaction(payload, unencryptedMnemonic, selectedAccount.vk);
        const response = await broadcastTransaction(signedTx);

        // Handle response (similar to advanced tx)
        if (response.error === 'timeout') {
              successMsg.innerHTML = 'Creation broadcast timed out. Check Explorer.';
              successMsg.style.display = 'block';
               prependToTransactionHistory("TIMEOUT", 'submission', 'submit_contract', { name: contractName }, 'pending', new Date().toLocaleString());
        } else if (response && response.result && response.result.hash) {
            const hash = response.result.hash;
            let status = 'pending';
            let logMessage = response.result.log || "";

            if (response.result.code !== 0) {
                status = 'error';
                createTokenError.innerHTML = `Token creation failed: ${logMessage}`;
                createTokenError.style.display = "block";
                toast('danger', `Creation failed: ${logMessage.substring(0,100)}...`);
            } else {
                 createTokenSuccess.innerHTML = `Token creation transaction sent! Hash: <a class='explorer-url text-light' href='${EXPLORER}/tx/${hash}' target='_blank' rel='noopener noreferrer'>${hash}</a>`;
                 createTokenSuccess.style.display = "block";
                 toast('success', 'Token creation sent successfully.');
                 // Add the new token to the user's list automatically
                 if (!token_list.includes(contractName)) {
                     token_list.push(contractName);
                     localStorage.setItem("token_list", JSON.stringify(token_list));
                     // Optionally, clear form or redirect
                     // document.getElementById("create-token-form").reset(); // If it's a form element
                 }
            }
             prependToTransactionHistory(hash, 'submission', 'submit_contract', { name: contractName }, status, new Date().toLocaleString());
        } else {
             throw new Error('Unexpected response from network during token creation.');
        }

    } catch (error) {
        console.error("Error creating token:", error);
        createTokenError.innerHTML = `Error creating token: ${error.message}`;
        createTokenError.style.display = "block";
         toast('danger', `Error: ${error.message}`);
    } finally {
        createTokenBtn.disabled = false; // Re-enable button
        createTokenBtn.innerHTML = "Create Token";
    }
}

// --- Event Listeners ---
document.getElementById("btn-create-token-cancel")?.addEventListener("click", function() {
    changePage("wallet"); // Navigate back to wallet
});

document.getElementById("btn-create-token-create")?.addEventListener("click", createToken);

// Auto-fill contract name based on token name
document.getElementById("NameCreateToken")?.addEventListener("input", function() {
    const name = document.getElementById("NameCreateToken").value;
    // Generate a contract name suggestion (simple example)
     const suggestedContractName = "con_" + name.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
    document.getElementById("ContractNameCreateToken").value = suggestedContractName;
    // Trigger estimation when name changes (as contract name changes)
    debouncedEstimateCreateTokenStamps();
});

// Add listeners to other inputs to trigger debounced estimation
function debouncedEstimateCreateTokenStamps(){debounce(estimateCreateTokenStamps, 500);};
document.getElementById("SymbolCreateToken")?.addEventListener("input", debouncedEstimateCreateTokenStamps);
document.getElementById("SupplyCreateToken")?.addEventListener("input", debouncedEstimateCreateTokenStamps);
document.getElementById("ContractNameCreateToken")?.addEventListener("input", debouncedEstimateCreateTokenStamps);
document.getElementById("LogoCreateToken")?.addEventListener("input", debouncedEstimateCreateTokenStamps); // Code changes slightly based on these
document.getElementById("WebsiteCreateToken")?.addEventListener("input", debouncedEstimateCreateTokenStamps);

// Initial estimation attempt if fields might be pre-filled (less likely here)
// estimateCreateTokenStamps();