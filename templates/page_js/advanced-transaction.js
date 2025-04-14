// Assumes global vars: selectedAccountIndex, unencryptedMnemonic, locked, accounts, CHAIN_ID, EXPLORER, RPC
// Assumes functions: getSelectedAccount, signTransaction, estimateStamps, broadcastTransaction,
//                    prependToTransactionHistory, changePage, toast, getContractFunctions, getStampRate

// --- Main Send Function ---
async function sendAdvTx() { // Made async
    // Check lock state
    if (locked || !unencryptedMnemonic) {
        toast('warning', 'Wallet is locked. Please unlock to send transactions.');
        return;
    }
    const selectedAccount = getSelectedAccount();
    if (!selectedAccount) {
        toast('danger', 'Error: No account selected.');
        return;
    }

    const contractName = document.getElementById("contractName").value.trim();
    const functionName = document.getElementById("functionName").value;
    const errorMsg = document.getElementById("sendAdvTxError"); // Renamed for clarity
    const successMsg = document.getElementById("sendAdvTxSuccess"); // Renamed for clarity
    const sendButton = document.getElementById('btn-adv-tx-send');
    const argsContainer = document.getElementById("adv_kwargs"); // Container for arg inputs

    errorMsg.style.display = "none";
    successMsg.style.display = "none";

    // Basic validation
    if (!contractName || !functionName) {
        errorMsg.innerHTML = "Contract name and function are required.";
        errorMsg.style.display = "block";
        return;
    }

    // --- Build Kwargs ---
    let kwargs = {};
    let functionInfo;
    let validationError = false;
    try {
         functionInfo = await getContractFunctions(contractName);
         if (!functionInfo || !functionInfo.methods) {
              throw new Error(`Could not retrieve methods for contract '${contractName}'.`);
         }
         const selectedFunctionInfo = functionInfo.methods.find(func => func.name === functionName);
         if (!selectedFunctionInfo) {
             throw new Error(`Function '${functionName}' not found in contract '${contractName}'.`);
         }

        // Iterate through arguments defined for the selected function
        for (const arg of selectedFunctionInfo.arguments) {
            const inputElement = document.getElementById(arg.name); // Assuming IDs match arg names
            if (!inputElement) {
                console.error(`Input element not found for argument: ${arg.name}`);
                validationError = true;
                errorMsg.innerHTML = `Missing input field for argument '${arg.name}'.`;
                break; // Stop processing if an input is missing
            }
            const valueStr = inputElement.value; // Don't trim here, might be intentional space in string

            // Validate and parse based on expected type
            let parsedValue;
            try {
                 parsedValue = parseArgumentValue(valueStr, arg.type, arg.name); // Use helper function
                 kwargs[arg.name] = parsedValue;
            } catch (e) {
                 validationError = true;
                 errorMsg.innerHTML = e.message; // Show specific validation error
                 break;
            }
        }
    } catch (error) {
         console.error("Error preparing arguments:", error);
         errorMsg.innerHTML = `Error preparing arguments: ${error.message}`;
         errorMsg.style.display = "block";
         return; // Stop if we can't get function info or parse args
    }

    if (validationError) {
        errorMsg.style.display = "block";
        return; // Stop if any argument validation failed
    }
    // --- End Build Kwargs ---


    // --- Fee Check ---
    let stampsRequired;
    try {
        stampsRequired = parseInt(document.getElementById("tokenFee").textContent, 10);
        if (isNaN(stampsRequired)) {
            toast('warning', 'Transaction fee not estimated. Please wait or provide arguments.');
             await estimateSendStampsAdv(); // Try re-estimating
             stampsRequired = parseInt(document.getElementById("tokenFee").textContent, 10);
             if (isNaN(stampsRequired)) {
                throw new Error("Fee estimation failed.");
             }
        }
    } catch (e) {
        errorMsg.innerHTML = 'Could not determine transaction fee. ' + e.message;
        errorMsg.style.display = 'block';
        return;
    }
    // Check for sufficient native balance to pay fee (add this check)
    try {
         const nativeBalanceStr = await execute_balance_of('currency', selectedAccount.vk); // Assume execute_balance_of exists
         const nativeBalance = parseFloat(nativeBalanceStr);
         const stampRate = await getStampRate();
         if (isNaN(nativeBalance) || !stampRate || (stampsRequired / stampRate) > nativeBalance) {
              errorMsg.innerHTML = `Insufficient XIAN balance to pay the transaction fee (${(stampsRequired / stampRate).toFixed(4)} Xian needed).`;
              errorMsg.style.display = 'block';
              return;
         }
    } catch (e) {
         console.error("Error checking fee balance:", e);
         errorMsg.innerHTML = 'Error checking balance for fee: ' + e.message;
         errorMsg.style.display = 'block';
         return;
    }
    // --- End Fee Check ---


    // Disable button
    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    // --- Transaction Creation & Signing ---
    let payload = {
        payload: {
            chain_id: CHAIN_ID,
            contract: contractName,
            function: functionName,
            kwargs: kwargs,
            stamps_supplied: stampsRequired
            // nonce and sender will be added by signTransaction
        },
        metadata: {
            signature: "",
        }
    };

    try {
        // Sign using selected account
        const signedTx = await signTransaction(payload, unencryptedMnemonic, selectedAccount.index);

        let conf = confirm(`Execute ${contractName}.${functionName} with provided arguments? Fee: ~${(stampsRequired / await getStampRate()).toFixed(4)} Xian`);
        if (!conf) {
             sendButton.disabled = false;
             sendButton.innerHTML = 'Send Transaction';
             return;
        }

        // Broadcast
        const response = await broadcastTransaction(signedTx); // Pass signed object

        // --- Handle Response ---
         if (response.error === 'timeout') {
            successMsg.innerHTML = 'Transaction broadcast timed out. It might still succeed. Check Explorer.';
            successMsg.style.display = 'block';
            prependToTransactionHistory("TIMEOUT", contractName, functionName, kwargs, 'pending', new Date().toLocaleString());
         } else if (response && response.result && response.result.hash) {
            const hash = response.result.hash;
            let status = 'pending';
            let logMessage = response.result.log || "";

            if (response.result.code !== 0) {
                status = 'error';
                errorMsg.innerHTML = `Transaction failed: ${logMessage}`;
                errorMsg.style.display = 'block';
                 toast('danger', `Transaction failed: ${logMessage.substring(0,100)}...`);
            } else {
                 successMsg.innerHTML = `Transaction sent! Hash: <a class='explorer-url text-light' href='${EXPLORER}/tx/${hash}' target='_blank' rel='noopener noreferrer'>${hash}</a>`;
                 successMsg.style.display = 'block';
                 toast('success', `Transaction sent: ${hash.substring(0,10)}...`);
                 // Optionally clear args on success
                 // argsContainer.querySelectorAll('input').forEach(input => input.value = '');
            }
            prependToTransactionHistory(hash, contractName, functionName, kwargs, status, new Date().toLocaleString());
         } else {
            console.error("Unexpected broadcast response:", response);
            throw new Error('Unexpected response from network.');
         }
        // --- End Handle Response ---

    } catch (error) {
        console.error('Error sending advanced transaction:', error);
        errorMsg.innerHTML = `Error sending transaction: ${error.message}`;
        errorMsg.style.display = 'block';
         toast('danger', `Error: ${error.message}`);
    } finally {
        // Re-enable button
        sendButton.disabled = false;
        sendButton.innerHTML = 'Send Transaction';
    }
}

// --- Argument Parsing Helper ---
function parseArgumentValue(valueStr, expectedType, argName) {
    // Trim only if not expecting a string where spaces might matter
    // const trimmedValue = (expectedType === 'str') ? valueStr : valueStr.trim();
    const trimmedValue = valueStr.trim(); // Trim generally for robustness unless specific need not to

    if (trimmedValue === "") {
        throw new Error(`Value for argument '${argName}' cannot be empty.`);
    }

    try {
        switch (expectedType) {
            case "int":
                const intVal = parseInt(trimmedValue, 10);
                if (isNaN(intVal) || String(intVal) !== trimmedValue) { // Strict check
                    throw new Error(); // Use generic error, message set below
                }
                return intVal;
            case "float":
            case "decimal.Decimal": // Treat decimal.Decimal like float for input
                 // Allow scientific notation for floats
                 const floatVal = parseFloat(trimmedValue);
                 if (isNaN(floatVal)) {
                      throw new Error();
                 }
                 // Check if the input was just a number, potentially with decimals or E notation
                  if (!/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmedValue)) {
                    //   throw new Error(`Invalid characters for type ${expectedType}`);
                  }

                 return floatVal; // Return as standard JS number
            case "bool":
                if (trimmedValue.toLowerCase() === "true") return true;
                if (trimmedValue.toLowerCase() === "false") return false;
                throw new Error();
            case "str":
                return valueStr; // Return original string, including spaces
            case "dict":
            case "list":
            case "Any": // Treat Any initially as JSON
                try {
                    return JSON.parse(trimmedValue); // Try parsing as JSON first
                } catch (e) {
                    if (expectedType === "Any") {
                        // If JSON parsing fails for Any, treat as string
                        return valueStr; // Return original string if not valid JSON for Any type
                    } else {
                         throw new Error(`Invalid JSON format for type ${expectedType}`);
                    }
                }
            default:
                 console.warn(`Unsupported argument type '${expectedType}' for '${argName}'. Treating as string.`);
                return valueStr; // Default to string if type is unknown/unhandled
        }
    } catch (e) {
        // Throw a more specific error message
        throw new Error(`Invalid value for argument '${argName}'. Expected type '${expectedType}'. ${e.message || ''}`);
    }
}


// --- Load Page & Function/Argument Display ---
async function loadAdvancedTransactionPage() { // Made async
    const contractInput = document.getElementById("contractName");
    const functionSelect = document.getElementById("functionName");
    const argsSection = document.getElementById("adv_args");
    const argsContainer = document.getElementById("adv_kwargs");
    const errorMsg = document.getElementById("sendAdvTxError");
    const successMsg = document.getElementById("sendAdvTxSuccess");
    const feeContainer = document.getElementById('tokenFeeContainer');

    // Reset UI elements
    argsSection.style.display = "none";
    argsContainer.innerHTML = "";
    errorMsg.style.display = "none";
    successMsg.style.display = "none";
    feeContainer.style.display = "none";
    functionSelect.innerHTML = "<option value=''>--- Select Contract First ---</option>"; // Clear options
    functionSelect.disabled = true;
    document.getElementById('btn-adv-tx-send').disabled = true; // Disable send initially

    // Event listener for contract name input (on blur)
    contractInput.addEventListener("blur", async function () {
        const contractName = contractInput.value.trim();
        errorMsg.style.display = "none";
        successMsg.style.display = "none";
        functionSelect.innerHTML = "<option value=''>Loading Functions...</option>";
        functionSelect.disabled = true;
        argsSection.style.display = "none";
        argsContainer.innerHTML = "";
        feeContainer.style.display = 'none'; // Hide fee on contract change
        document.getElementById('btn-adv-tx-send').disabled = true;

        if (!contractName) {
            functionSelect.innerHTML = "<option value=''>--- Enter Contract Name ---</option>";
            return;
        }

        try {
            const functionsInfo = await getContractFunctions(contractName);
            if (functionsInfo === null || !functionsInfo.methods || functionsInfo.methods.length === 0) {
                errorMsg.innerHTML = `Contract '${contractName}' not found or has no public methods.`;
                errorMsg.style.display = "block";
                functionSelect.innerHTML = "<option value=''>--- Contract Not Found ---</option>";
                return;
            }

            functionSelect.innerHTML = "<option value=''>--- Select Function ---</option>"; // Default option
            // Filter out internal/private methods if necessary (e.g., starting with '_')
            functionsInfo.methods
                .filter(func => !func.name.startsWith('_')) // Example filter
                .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
                .forEach((func) => {
                    functionSelect.innerHTML += `<option value="${func.name}">${func.name}</option>`;
                });
            functionSelect.disabled = false; // Enable function selection

        } catch (error) {
            console.error('Error fetching contract functions:', error);
            errorMsg.innerHTML = `RPC Error: Could not fetch functions for ${contractName}.`;
            errorMsg.style.display = "block";
            functionSelect.innerHTML = "<option value=''>--- Error Loading ---</option>";
        }
    });

    // Event listener for function selection change
    functionSelect.addEventListener("change", async function () {
        const contractName = contractInput.value.trim();
        const functionName = functionSelect.value;
        errorMsg.style.display = "none";
        successMsg.style.display = "none";
        argsContainer.innerHTML = ""; // Clear previous args
        argsSection.style.display = "none";
        feeContainer.style.display = 'none'; // Hide fee
        document.getElementById('btn-adv-tx-send').disabled = true; // Disable send


        if (!contractName || !functionName) {
            return; // Do nothing if contract or function isn't selected
        }

        argsSection.style.display = "block"; // Show the args section container

        try {
            const functionsInfo = await getContractFunctions(contractName); // Fetch again or cache
            if (functionsInfo !== null) {
                const selectedFunctionInfo = functionsInfo.methods.find(func => func.name === functionName);
                if (selectedFunctionInfo && selectedFunctionInfo.arguments) {
                    if (selectedFunctionInfo.arguments.length === 0) {
                         argsContainer.innerHTML = "<p class='text-muted small'>This function takes no arguments.</p>";
                    } else {
                        selectedFunctionInfo.arguments.forEach((arg) => {
                            // Create label and input for each argument
                            const formGroup = document.createElement('div');
                            formGroup.className = 'form-group mb-2'; // Spacing between args

                            const label = document.createElement('label');
                            label.htmlFor = arg.name;
                            label.textContent = `${arg.name} (${arg.type})`;
                            label.className = 'form-label small'; // Smaller label

                            const input = document.createElement('input');
                            input.type = 'text'; // Use text for all, parsing happens on send
                            input.className = 'form-control form-control-sm'; // Smaller input
                            input.id = arg.name;
                            input.placeholder = `Enter value for ${arg.name}`;
                            // Add listener to estimate stamps when args change
                            input.addEventListener('input', debouncedEstimateSendStampsAdv);

                            formGroup.appendChild(label);
                            formGroup.appendChild(input);
                            argsContainer.appendChild(formGroup);
                        });
                    }
                    // After arguments are displayed (or if none), estimate stamps
                    await estimateSendStampsAdv();
                } else {
                     argsContainer.innerHTML = "<p class='text-danger small'>Could not find argument details for this function.</p>";
                }
            } else {
                 argsContainer.innerHTML = "<p class='text-danger small'>Could not load contract details.</p>";
            }
        } catch (error) {
            console.error('Error processing function selection:', error);
            errorMsg.innerHTML = `Error loading arguments: ${error.message}`;
            errorMsg.style.display = "block";
        }
    });
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

// Debounced version of the estimation function
const debouncedEstimateSendStampsAdv = debounce(estimateSendStampsAdv, 500); // Increased debounce slightly

// --- Estimate Stamps (Modified for HD & Async) ---
async function estimateSendStampsAdv() { // Renamed to avoid global conflicts, made async
    const errorMsg = document.getElementById('sendAdvTxError');
    const successMsg = document.getElementById('sendAdvTxSuccess');
    const estimation_loading = document.getElementById('estimation-loading');
    const estimation_finished = document.getElementById('estimation-result');
    const feeContainer = document.getElementById('tokenFeeContainer');
    const feeElement = document.getElementById('tokenFee');
    const feeXianElement = document.getElementById('tokenFeeXian');
    const send_btn = document.getElementById('btn-adv-tx-send');

    // Reset UI elements related to fee/status
    feeContainer.style.display = 'none';
    estimation_loading.style.display = 'inline-block';
    estimation_finished.style.display = 'none';
    send_btn.disabled = true; // Disable send button until estimation succeeds
    // Don't hide general error/success messages here, only fee-related ones if needed

    // Check lock state and basic inputs
    if (locked || !unencryptedMnemonic) {
        toast('warning', 'Wallet locked. Cannot estimate fees.');
        estimation_loading.style.display = 'none'; // Hide loader
        return;
    }
    const selectedAccount = getSelectedAccount();
    if (!selectedAccount) {
        toast('danger', 'No account selected.');
        estimation_loading.style.display = 'none';
        return;
    }

    const contractName = document.getElementById('contractName').value.trim();
    const functionName = document.getElementById('functionName').value;

    if (!contractName || !functionName) {
        estimation_loading.style.display = 'none';
        return; // Not enough info to estimate
    }


    // --- Build Kwargs for Estimation ---
    let kwargs = {};
    let functionInfo;
    let validationError = false;
    try {
        functionInfo = await getContractFunctions(contractName);
         if (!functionInfo || !functionInfo.methods) {
             throw new Error("Could not get contract methods.");
         }
        const selectedFunctionInfo = functionInfo.methods.find(func => func.name === functionName);
         if (!selectedFunctionInfo) {
              throw new Error("Selected function not found.");
         }

        // Try to parse all arguments for estimation, but don't block if some are empty/invalid yet
         for (const arg of selectedFunctionInfo.arguments) {
             const inputElement = document.getElementById(arg.name);
             if (!inputElement) continue; // Skip if element missing
             const valueStr = inputElement.value;
             try {
                 // Use the parser, but don't throw fatal error here, just skip bad args for estimation
                 kwargs[arg.name] = parseArgumentValue(valueStr, arg.type, arg.name);
             } catch (e) {
                 // console.warn(`Skipping arg ${arg.name} for estimation due to parse error: ${e.message}`);
                  validationError = true; // Mark that there was an issue
                  // Optionally provide feedback near the input field instead of global error
             }
         }
         // If validation failed for *any* argument, don't proceed with estimation yet
          if (validationError) {
               // toast('info', 'Please fill all arguments correctly to estimate fee.');
               estimation_loading.style.display = 'none'; // Hide loader
               return;
          }

    } catch (error) {
         console.error("Error preparing args for estimation:", error);
         estimation_loading.style.display = 'none';
         // Maybe show a subtle error near the contract/function selectors
         return;
    }
    // --- End Build Kwargs for Estimation ---


    // --- Create Transaction Payload for Estimation ---
    let transaction = {
        payload: {
            // chain_id, nonce, sender will be added by signTransaction
            contract: contractName,
            function: functionName,
            kwargs: kwargs,
            stamps_supplied: 200000 // High default for estimation
        },
        metadata: {
            signature: "", // Placeholder
        }
    };

    // --- Sign and Estimate ---
    try {
        // Sign first
        const signedTxForEstimation = await signTransaction(transaction, unencryptedMnemonic, selectedAccount.index);

        // Then estimate
        const stampResult = await estimateStamps(signedTxForEstimation); // Use global estimateStamps

        estimation_loading.style.display = 'none';
        feeContainer.style.display = 'block'; // Show fee container
        estimation_finished.style.display = 'inline-block'; // Show result part

        if (stampResult.stamps === null || stampResult.success === false) {
            feeElement.innerHTML = 'Error';
            feeXianElement.innerHTML = 'N/A';
             // Display the error from the estimation result if available
             errorMsg.innerHTML = `Transaction will likely fail: ${stampResult.tx_result || 'Estimation error'}`;
             errorMsg.style.display = 'block';
             send_btn.disabled = true; // Keep send disabled
        } else {
            const stamps = stampResult.stamps;
            const stamp_rate = await getStampRate();
            if (stamp_rate) {
                feeElement.innerHTML = stamps;
                feeXianElement.innerHTML = (stamps / stamp_rate).toFixed(8);
                send_btn.disabled = false; // Enable send button on successful estimation
                 errorMsg.style.display = 'none'; // Hide error message if estimation succeeds
            } else {
                feeElement.innerHTML = 'Error';
                feeXianElement.innerHTML = 'N/A';
                errorMsg.innerHTML = 'Could not retrieve stamp rate.';
                 errorMsg.style.display = 'block';
                send_btn.disabled = true;
            }
        }
    } catch (error) {
        console.error("Error during stamp estimation process:", error);
        estimation_loading.style.display = 'none';
        feeContainer.style.display = 'block'; // Show container even on error
        estimation_finished.style.display = 'inline-block';
        feeElement.innerHTML = 'Error';
        feeXianElement.innerHTML = 'N/A';
         errorMsg.innerHTML = `Fee estimation error: ${error.message}`;
         errorMsg.style.display = 'block';
        send_btn.disabled = true;
    }
}


// --- Initialize Page ---
document.getElementById('btn-adv-tx-send')?.addEventListener('click', sendAdvTx);
loadAdvancedTransactionPage(); // Run setup function