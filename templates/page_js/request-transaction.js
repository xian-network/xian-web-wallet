// State variables for the popup context
let callbackKey = null;
let transactionDetails = {};
let isActionTaken = false; // Flag to prevent double actions (e.g., reject on close after accept)
let selectedVk = null; // To display which account is making the request
let chainId = null;

// --- Initialization and Message Handling ---

// Listen for messages from the main window (router.js)
window.addEventListener("message", (event) => {
    // Basic security check (optional but recommended)
    // if (event.origin !== "chrome-extension://your-extension-id") {
    //     console.warn("Ignoring message from unknown origin:", event.origin);
    //     return;
    // }

    console.log("Popup received message:", event.data);

    if (event.data.type === "INITIAL_STATE") {
        // Store necessary state passed from main window
        selectedVk = event.data.state.selectedVk;
        chainId = event.data.state.CHAIN_ID;
        // Display chain ID if needed (already in HTML, just update if dynamic)
        const chainIdElement = document.getElementById("requestTransactionChainId");
        if (chainIdElement) chainIdElement.textContent = chainId || 'Unknown';
    }

    if (event.data.type === "REQUEST_TRANSACTION") {
        // This is the main data for this popup
        callbackKey = event.data.callbackKey;
        transactionDetails = event.data.data; // Contains { contract, method, kwargs, stampLimit, chainId }

        // Populate the UI
        document.getElementById('requestTransactionContract').textContent = transactionDetails.contract || 'N/A';
        document.getElementById('requestTransactionFunction').textContent = transactionDetails.method || 'N/A';
        // Pretty print kwargs JSON for readability
        try {
            document.getElementById('requestTransactionParams').textContent = JSON.stringify(transactionDetails.kwargs || {}, null, 2);
        } catch (e) {
            document.getElementById('requestTransactionParams').textContent = 'Invalid Kwargs Format';
        }
        document.getElementById('requestTransactionChainId').textContent = transactionDetails.chainId || chainId || 'Unknown'; // Use provided or initial

        // Display stamp limit and estimate Xian cost (needs access to getStampRate)
        displayStampLimit(transactionDetails.stampLimit);

        // Trigger estimation (if needed, or rely on main window estimation)
        // If the main window couldn't estimate, the popup *could* try, but it lacks the private key.
        // For now, we'll assume the main window provided a valid estimate or the user accepts the risk.
        // Let's focus on displaying what was provided.
        if (transactionDetails.stampLimit && transactionDetails.stampLimit !== 'Estimating...') {
            // If a numeric limit was passed, try to show Xian cost
             getStampRatePopup().then(rate => { // Need a way to get rate in popup
                if (rate) {
                     const feeInXian = (parseInt(transactionDetails.stampLimit, 10) / rate).toFixed(8);
                     document.getElementById('stamp_line_finished').style.display = 'block';
                     document.getElementById('stamp_line').style.display = 'none';
                     document.getElementById('requestTransactionStampLimit').textContent = transactionDetails.stampLimit;
                     document.getElementById('requestTransactionStampLimitXian').textContent = feeInXian;
                } else {
                    // Handle rate fetch error - show default text
                    showStampEstimationError('Could not fetch stamp rate.');
                }
            });
        } else {
             // Show "Calculating..." or error if estimation wasn't possible
             showStampEstimationError('Fee not provided or estimation failed.');
        }
        // Enable buttons now that data is loaded
         document.getElementById('request-transaction-accept').disabled = false;
         document.getElementById('request-transaction-reject').disabled = false;
    }
});

// Helper to display stamp limit and estimated cost
function displayStampLimit(limit) {
     const limitSpan = document.getElementById('requestTransactionStampLimit');
     const xianSpan = document.getElementById('requestTransactionStampLimitXian');
     const finishedLine = document.getElementById('stamp_line_finished');
     const calculatingLine = document.getElementById('stamp_line');

     if (limit && !isNaN(parseInt(limit, 10))) {
         limitSpan.textContent = limit;
         calculatingLine.style.display = 'none';
         finishedLine.style.display = 'block'; // Show the line with numbers

         // Attempt to calculate Xian cost
         getStampRatePopup().then(rate => {
             if (rate) {
                  xianSpan.textContent = (parseInt(limit, 10) / rate).toFixed(8);
             } else {
                 xianSpan.textContent = 'N/A'; // Indicate rate unavailable
             }
         });
     } else {
         showStampEstimationError(limit === 'Estimating...' ? 'Calculating...' : 'Fee not available');
     }
}

function showStampEstimationError(message) {
    const limitSpan = document.getElementById('requestTransactionStampLimit');
    const xianSpan = document.getElementById('requestTransactionStampLimitXian');
    const finishedLine = document.getElementById('stamp_line_finished');
    const calculatingLine = document.getElementById('stamp_line');

    limitSpan.textContent = 'N/A';
    xianSpan.textContent = 'N/A';
    calculatingLine.textContent = message; // Display the error/status message
    calculatingLine.style.display = 'block';
    finishedLine.style.display = 'none';
}


// Helper function to get stamp rate within the popup (if needed)
// This assumes the RPC URL is somehow available or hardcoded,
// ideally it should be passed in INITIAL_STATE too.
async function getStampRatePopup() {
     // TODO: Make RPC URL available here, e.g., from INITIAL_STATE or a default
     const POPUP_RPC = "https://node.xian.org"; // Placeholder - GET FROM INITIAL_STATE ideally
     try {
         const response = await fetch(POPUP_RPC + '/abci_query?path="/get/stamp_cost.S:value"'); // Basic fetch
         const data = await response.json();
         if (data.result?.response?.value && data.result.response.value !== "AA==") {
             return parseInt(atob(data.result.response.value), 10);
         }
         return null;
     } catch (error) {
         console.error("Popup: Error fetching stamp rate:", error);
         return null;
     }
}

// --- Action Handlers ---

function acceptRequest() {
    if (!callbackKey || isActionTaken) return;
    isActionTaken = true; // Set flag

    console.log("Popup: Request Accepted");

    // Send confirmation and original details back to the main window for signing
    window.opener.postMessage({
        type: 'REQUEST_TRANSACTION_RESPONSE', // Specific response type
        data: {
            confirmed: true,
            // Pass back the details needed for the main window to reconstruct and sign
            details: {
                contract: transactionDetails.contract,
                method: transactionDetails.method,
                kwargs: transactionDetails.kwargs,
                stamps_supplied: parseInt(document.getElementById('requestTransactionStampLimit').textContent, 10) || transactionDetails.stampLimit // Use displayed or original
            }
        },
        callbackKey: callbackKey
    }, '*'); // Use specific origin in production if possible

    window.close(); // Close the popup
}

function rejectRequest() {
    if (!callbackKey || isActionTaken) return;
    isActionTaken = true; // Set flag

    console.log("Popup: Request Rejected");

    // Send rejection back to the main window
    window.opener.postMessage({
        type: 'REQUEST_TRANSACTION_RESPONSE', // Specific response type
        data: {
            confirmed: false,
            errors: ['rejected'] // Indicate rejection
        },
        callbackKey: callbackKey
    }, '*'); // Use specific origin in production if possible

    window.close(); // Close the popup
}

// Handle the user closing the window directly
window.addEventListener('beforeunload', () => {
    // Only send rejection if no action (accept/reject) was already taken
    if (!isActionTaken) {
        console.log("Popup: Window closed by user, rejecting request.");
        rejectRequest(); // Attempt to send rejection
    }
});


// --- Attach Event Listeners ---
document.getElementById('request-transaction-accept')?.addEventListener('click', acceptRequest);
document.getElementById('request-transaction-reject')?.addEventListener('click', rejectRequest);

// Initial button state (disabled until data arrives)
document.getElementById('request-transaction-accept').disabled = true;
document.getElementById('request-transaction-reject').disabled = true;

// Request initial state from opener upon loading
if (window.opener) {
    window.opener.postMessage({ type: "POPUP_READY" }, "*"); // Signal main window that popup is ready (optional)
} else {
    console.error("Popup: Cannot communicate with opener window.");
    // Handle error state - maybe display a message in the popup
    document.body.innerHTML = '<div class="alert alert-danger m-3">Error: Could not connect to the main wallet window. Please close this window and try again.</div>';
}