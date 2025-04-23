async function sendAdvTx() { // Made async
    // Check lock state
    if (locked || !unencryptedMnemonic) {
        toast('warning', 'Wallet is locked. Please unlock to send transactions.');
        return;
    }
    const selectedAccount = await getSelectedAccount();
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
    await estimateSendStampsAdv();
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
        const signedTx = await signTransaction(payload, unencryptedMnemonic, selectedAccount.vk);

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

document.getElementById('btn-adv-tx-send').addEventListener('click', sendAdvTx);


// --- Load Page & Function/Argument Display ---
function loadAdvancedTransactionPage() {
    document.getElementById("adv_args").style.display = "none";
    document.getElementById("contractName").addEventListener("focusout", function () {
        let contractName = document.getElementById("contractName").value;
        let error = document.getElementById("sendAdvTxError");
        let success = document.getElementById("sendAdvTxSuccess");
        let functionSelect = document.getElementById("functionName");
        let args = document.getElementById("adv_args");
        error.style.display = "none";
        success.style.display = "none";

        getContractFunctions(contractName)
            .then(functions => {
                if (functions === null) {
                    error.innerHTML = "Contract does not exist!";
                    error.style.display = "block";
                    functionSelect.innerHTML = "";
                    args.style.display = "none";
                    return;
                }
                functionSelect.innerHTML = "";
                functionSelect.innerHTML += "<option value=''>Select a function</option>";
                console.log(functions);
                functions.methods.forEach((func) => {
                    functionSelect.innerHTML +=
                      "<option value='" + func.name + "'>" + func.name + "</option>";
                });
            })
            .catch(error_ => {
                console.error('RPC error:', error_);
                error.innerHTML = "RPC error!";
                error.style.display = "block";
            });
    });

    document.getElementById("functionName").addEventListener("change", function () {
        let contractName = document.getElementById("contractName").value;
        let functionName = document.getElementById("functionName").value;
        let error = document.getElementById("sendAdvTxError");
        let success = document.getElementById("sendAdvTxSuccess");
        error.style.display = "none";
        success.style.display = "none";
        let args = document.getElementById("adv_args");
        let list_kwargs = document.getElementById("adv_kwargs");

        getContractFunctions(contractName)
            .then(functions => {
                if (functions !== null) {
                    args.style.display = "block";
                    let functionInfo = functions.methods.find(
                      (func) => func.name === functionName
                    );
                    list_kwargs.innerHTML = "";
                    functionInfo.arguments.forEach((arg) => {
                      list_kwargs.innerHTML +=
                        `<div class="form-group kwarg-group">
                        <label for="` +
                        arg.name +
                        `">` +
                        arg.name +
                        `(` +
                        arg.type +
                        `)</label>
                        <input type="text" class="form-control" id="` +
                        arg.name +
                        `">
                    </div>`;
                    });
                }
            })
            .catch(error_ => {
                console.error('RPC error:', error_);
                error.innerHTML = "RPC error!";
                error.style.display = "block";
            });
    });
}

async function estimateSendStampsAdv(){
    let error = document.getElementById('sendAdvTxError');
    let success = document.getElementById('sendAdvTxSuccess');
    error.style.display = 'none';
    success.style.display = 'none';
    let function_name = document.getElementById('functionName').value;
    let contract = document.getElementById('contractName').value;
    let estimation_loading = document.getElementById('estimation-loading');
    let estimation_finished = document.getElementById('estimation-result');
    estimation_loading.style.display = 'inline-block';
    estimation_finished.style.display = 'none';
    let send_btn = document.getElementById('btn-adv-tx-send');
    send_btn.disabled = true;

    if (locked || !unencryptedMnemonic) {
        toast('warning', 'Wallet locked. Cannot estimate fees.');
        estimation_loading.style.display = 'none'; // Hide loader
        return;
    }

    const selectedAccount = await getSelectedAccount();
    if (!selectedAccount) {
        toast('danger', 'No account selected.');
        estimation_loading.style.display = 'none';
        return;
    }

    let functionInfo;
    let kwargs = {};
    let transaction = {
        payload: {
            chain_id: CHAIN_ID,
            contract: contract,
            function: function_name,
            kwargs: kwargs,
            stamps_supplied: 100000
        },
        metadata: {
            signature: "",
        }
    };
    if (function_name === "" || contract === "") {
        return;
    }
    functionInfo = await getContractFunctions(contract)
        .then(functions => {
            functionInfo = functions.methods.find(func => func.name === function_name);
            functionInfo.arguments.forEach(arg => {
                let value = document.getElementById(arg.name).value;
                let expectedType = arg.type;
                if (value === "") {
                    error.innerHTML = "All fields are required!";
                    error.style.display = "block";
                    return;
                }
                if (expectedType === "int") {
                    if (isNaN(value)) {
                        error.innerHTML = "Invalid value for " + arg.name + "!";
                        error.style.display = "block";
                        return;
                    }
                    value = parseInt(value);
                }
                if (expectedType === "float") {
                    if (isNaN(value)) {
                        error.innerHTML = "Invalid value for " + arg.name + "!";
                        error.style.display = "block";
                        return;
                    }
                    value = parseFloat(value);
                }
                if (expectedType === "bool") {
                    if (value !== "true" && value !== "false") {
                        error.innerHTML = "Invalid value for " + arg.name + "!";
                        error.style.display = "block";
                        return;
                    }
                    value = value === "true";
                }
                if (expectedType === "str") {
                    value = value.toString();
                }
                if (expectedType === "dict" || expectedType === "list") {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        error.innerHTML = "Invalid value for " + arg.name + "!";
                        error.style.display = "block";
                        return;
                    }
                }
                if (expectedType === "Any") {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        value = value.toString();
                    }
                }
                kwargs[arg.name] = value;
            });
            transaction.payload.kwargs = kwargs;
        })
        .catch(error_ => {
            toast('warning', `Error estimating stamps:${error}`);
            document.getElementById('tokenFee').innerHTML = "..";
        });

    


    try {
        let signed_tx = await signTransaction(transaction, unencryptedMnemonic, selectedAccount.vk);
        let stamps = await estimateStamps(signed_tx);
        stamps = stamps["stamps"];
        
        let stamp_rate = await getStampRate();
        estimation_loading.style.display = 'none';
        estimation_finished.style.display = 'inline-block';
        send_btn.disabled = false;
        if (stamps === null) {
            document.getElementById('tokenFee').innerHTML = 0;
            return;
        }
        document.getElementById('tokenFeeXian').innerHTML = stamps / stamp_rate;
        document.getElementById('tokenFee').innerHTML = stamps;
    } catch (error) {
        toast('warning', `Error estimating stamps: ${error}`);
        document.getElementById('tokenFee').innerHTML = "Error";
    }
    document.getElementById('tokenFeeContainer').style.display = 'block';
}

// --- Estimate Stamps (Modified for HD & Async) ---
// async function estimateSendStampsAdv() { // Renamed to avoid global conflicts, made async
//     const errorMsg = document.getElementById('sendAdvTxError');
//     const successMsg = document.getElementById('sendAdvTxSuccess');
//     const estimation_loading = document.getElementById('estimation-loading');
//     const estimation_finished = document.getElementById('estimation-result');
//     const feeContainer = document.getElementById('tokenFeeContainer');
//     const feeElement = document.getElementById('tokenFee');
//     const feeXianElement = document.getElementById('tokenFeeXian');
//     const send_btn = document.getElementById('btn-adv-tx-send');

//     // Reset UI elements related to fee/status
//     feeContainer.style.display = 'none';
//     estimation_loading.style.display = 'inline-block';
//     estimation_finished.style.display = 'none';
//     send_btn.disabled = true; // Disable send button until estimation succeeds
//     // Don't hide general error/success messages here, only fee-related ones if needed

//     // Check lock state and basic inputs
//     if (locked || !unencryptedMnemonic) {
//         toast('warning', 'Wallet locked. Cannot estimate fees.');
//         estimation_loading.style.display = 'none'; // Hide loader
//         return;
//     }
//     const selectedAccount = getSelectedAccount();
//     if (!selectedAccount) {
//         toast('danger', 'No account selected.');
//         estimation_loading.style.display = 'none';
//         return;
//     }

//     const contractName = document.getElementById('contractName').value.trim();
//     const functionName = document.getElementById('functionName').value;

//     if (!contractName || !functionName) {
//         estimation_loading.style.display = 'none';
//         return; // Not enough info to estimate
//     }


//     // --- Build Kwargs for Estimation ---
//     let kwargs = {};
//     let functionInfo;
//     let validationError = false;
//     try {
//         functionInfo = await getContractFunctions(contractName);
//          if (!functionInfo || !functionInfo.methods) {
//              throw new Error("Could not get contract methods.");
//          }
//         const selectedFunctionInfo = functionInfo.methods.find(func => func.name === functionName);
//          if (!selectedFunctionInfo) {
//               throw new Error("Selected function not found.");
//          }

//         // Try to parse all arguments for estimation, but don't block if some are empty/invalid yet
//          for (const arg of selectedFunctionInfo.arguments) {
//              const inputElement = document.getElementById(arg.name);
//              if (!inputElement) continue; // Skip if element missing
//              const valueStr = inputElement.value;
//              try {
//                  // Use the parser, but don't throw fatal error here, just skip bad args for estimation
//                  kwargs[arg.name] = parseArgumentValue(valueStr, arg.type, arg.name);
//              } catch (e) {
//                  // console.warn(`Skipping arg ${arg.name} for estimation due to parse error: ${e.message}`);
//                   validationError = true; // Mark that there was an issue
//                   // Optionally provide feedback near the input field instead of global error
//              }
//          }
//          // If validation failed for *any* argument, don't proceed with estimation yet
//           if (validationError) {
//                // toast('info', 'Please fill all arguments correctly to estimate fee.');
//                estimation_loading.style.display = 'none'; // Hide loader
//                return;
//           }

//     } catch (error) {
//          console.error("Error preparing args for estimation:", error);
//          estimation_loading.style.display = 'none';
//          // Maybe show a subtle error near the contract/function selectors
//          return;
//     }
//     // --- End Build Kwargs for Estimation ---


//     // --- Create Transaction Payload for Estimation ---
//     let transaction = {
//         payload: {
//             // chain_id, nonce, sender will be added by signTransaction
//             contract: contractName,
//             function: functionName,
//             kwargs: kwargs,
//             stamps_supplied: 200000 // High default for estimation
//         },
//         metadata: {
//             signature: "", // Placeholder
//         }
//     };

//     // --- Sign and Estimate ---
//     try {
//         // Sign first
//         const signedTxForEstimation = await signTransaction(transaction, unencryptedMnemonic, selectedAccount.vk);

//         // Then estimate
//         const stampResult = await estimateStamps(signedTxForEstimation); // Use global estimateStamps

//         estimation_loading.style.display = 'none';
//         feeContainer.style.display = 'block'; // Show fee container
//         estimation_finished.style.display = 'inline-block'; // Show result part

//         console.log("stampResult: ", stampResult);

//         if (stampResult.stamps === null || stampResult.success === false) {
//             feeElement.innerHTML = 'Error';
//             feeXianElement.innerHTML = 'N/A';
//              // Display the error from the estimation result if available
//              errorMsg.innerHTML = `Transaction will likely fail: ${stampResult.tx_result || 'Estimation error'}`;
//              errorMsg.style.display = 'block';
//              send_btn.disabled = true; // Keep send disabled
//         } else {
//             const stamps = stampResult.stamps;
//             const stamp_rate = await getStampRate();
//             if (stamp_rate) {
//                 feeElement.innerHTML = stamps;
//                 feeXianElement.innerHTML = (stamps / stamp_rate).toFixed(8);
//                 send_btn.disabled = false; // Enable send button on successful estimation
//                  errorMsg.style.display = 'none'; // Hide error message if estimation succeeds
//             } else {
//                 feeElement.innerHTML = 'Error';
//                 feeXianElement.innerHTML = 'N/A';
//                 errorMsg.innerHTML = 'Could not retrieve stamp rate.';
//                  errorMsg.style.display = 'block';
//                 send_btn.disabled = true;
//             }
//         }
//     } catch (error) {
//         console.error("Error during stamp estimation process:", error);
//         estimation_loading.style.display = 'none';
//         feeContainer.style.display = 'block'; // Show container even on error
//         estimation_finished.style.display = 'inline-block';
//         feeElement.innerHTML = 'Error';
//         feeXianElement.innerHTML = 'N/A';
//          errorMsg.innerHTML = `Fee estimation error: ${error.message}`;
//          errorMsg.style.display = 'block';
//         send_btn.disabled = true;
//     }
// }


// --- Initialize Page ---
loadAdvancedTransactionPage(); // Run setup function