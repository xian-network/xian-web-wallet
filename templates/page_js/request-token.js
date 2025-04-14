// State variables for the popup context
let callbackKey = null;
let tokenContractToAdd = null;
let isActionTaken = false; // Flag to prevent double actions
let selectedVk = null; // To display which account context (though less relevant here)

// --- Initialization and Message Handling ---

// Listen for messages from the main window (router.js)
window.addEventListener("message", (event) => {
    // Optional origin check
    // if (event.origin !== "chrome-extension://your-extension-id") return;

    console.log("Token Popup received message:", event.data);

    if (event.data.type === "INITIAL_STATE") {
        selectedVk = event.data.state.selectedVk;
        // Could potentially pass RPC url via initial state if needed for token info fetching
    }

    if (event.data.type === "REQUEST_TOKEN") {
        callbackKey = event.data.callbackKey;
        tokenContractToAdd = event.data.data.contract; // Extract the contract name

        // Populate the UI - Just display the contract name for now.
        // Fetching full token info here adds complexity and network dependency to the popup.
        // Assume the main window or user knows what they are adding.
        const contractElement = document.getElementById('requestTokenMessage');
        const nameElement = document.getElementById('requestTokenName');
        const symbolElement = document.getElementById('requestTokenSymbol');

        if (contractElement) {
            contractElement.textContent = tokenContractToAdd || 'N/A';
        }
        // Display placeholder/loading for name/symbol, or fetch if necessary
        // For now, let's just show the contract name prominently.
         if (nameElement) nameElement.textContent = `Attempting to add: ${tokenContractToAdd}`;
         if (symbolElement) symbolElement.textContent = ''; // Clear symbol or add placeholder

        // Optional: Fetch basic info in popup for user confirmation (adds complexity)
        // fetchTokenInfoPopup(tokenContractToAdd).then(info => {
        //    if (nameElement) nameElement.textContent = info?.name || 'Unknown Name';
        //    if (symbolElement) symbolElement.textContent = info?.symbol || '???';
        // }).catch(err => {
        //     console.error("Popup: Failed to fetch token info", err);
        //     if (nameElement) nameElement.textContent = 'Could not verify token';
        // });


        // Enable buttons now that data is loaded
        document.getElementById('request-token-accept').disabled = false;
        document.getElementById('request-token-reject').disabled = false;
    }
});

// Optional: Helper to fetch minimal token info in popup (needs RPC access)
async function fetchTokenInfoPopup(contractName) {
    const POPUP_RPC = "https://node.xian.org"; // Placeholder - GET FROM INITIAL_STATE ideally
    if (contractName === 'currency') return { name: 'Xian', symbol: 'Xian' };
    try {
        const pathName = `/get/${contractName}.metadata:token_name`;
        const pathSymbol = `/get/${contractName}.metadata:token_symbol`;
        const [resName, resSymbol] = await Promise.all([
            fetch(POPUP_RPC + '/abci_query?path="' + pathName + '"'),
            fetch(POPUP_RPC + '/abci_query?path="' + pathSymbol + '"')
        ]);
        const dataName = await resName.json();
        const dataSymbol = await resSymbol.json();

        const name = (dataName.result?.response?.value && dataName.result.response.value !== "AA==") ? atob(dataName.result.response.value) : null;
        const symbol = (dataSymbol.result?.response?.value && dataSymbol.result.response.value !== "AA==") ? atob(dataSymbol.result.response.value) : null;

         if (!name && !symbol) return null; // Indicate contract likely doesn't exist or isn't a token

        return { name: name || 'Unknown Name', symbol: symbol || '???' };
    } catch (error) {
        console.error("Popup: Error fetching token info:", error);
        return null;
    }
}


// --- Action Handlers ---

function acceptRequest() {
    if (!callbackKey || isActionTaken || !tokenContractToAdd) return;
    isActionTaken = true; // Set flag

    console.log("Popup: Add Token Request Accepted");

    // Send acceptance and the contract name back to the main window
    window.opener.postMessage({
        type: 'REQUEST_TOKEN_RESPONSE', // Specific response type
        data: {
            confirmed: true,
            contract: tokenContractToAdd // Send the contract to be added
        },
        callbackKey: callbackKey
    }, '*'); // Use specific origin in production

    window.close(); // Close the popup
}

function rejectRequest() {
    if (!callbackKey || isActionTaken) return;
    isActionTaken = true; // Set flag

    console.log("Popup: Add Token Request Rejected");

    // Send rejection back to the main window
    window.opener.postMessage({
        type: 'REQUEST_TOKEN_RESPONSE', // Specific response type
        data: {
            confirmed: false,
            errors: ['rejected'] // Indicate rejection
        },
        callbackKey: callbackKey
    }, '*'); // Use specific origin in production

    window.close(); // Close the popup
}

// Handle the user closing the window directly
window.addEventListener('beforeunload', () => {
    if (!isActionTaken) {
        console.log("Popup: Window closed by user, rejecting token request.");
        rejectRequest(); // Attempt to send rejection
    }
});

// --- Attach Event Listeners ---
document.getElementById('request-token-accept')?.addEventListener('click', acceptRequest);
document.getElementById('request-token-reject')?.addEventListener('click', rejectRequest);

// Initial button state (disabled until data arrives)
document.getElementById('request-token-accept').disabled = true;
document.getElementById('request-token-reject').disabled = true;

// Signal readiness to opener window
if (window.opener) {
    window.opener.postMessage({ type: "POPUP_READY" }, "*");
} else {
    console.error("Popup: Cannot communicate with opener window.");
    document.body.innerHTML = '<div class="alert alert-danger m-3">Error: Could not connect to the main wallet window. Please close this window and try again.</div>';
}