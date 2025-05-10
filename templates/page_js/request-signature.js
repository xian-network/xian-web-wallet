// State variables for the popup context
let callbackKey = null;
let messageToSign = null;
let isActionTaken = false; // Flag to prevent double actions
let selectedVk = null; // To display which account is making the request

// --- Initialization and Message Handling ---

// Listen for messages from the main window (router.js)
window.addEventListener("message", (event) => {
    // Optional origin check
    // if (event.origin !== "chrome-extension://your-extension-id") return;

    console.log("Signature Popup received message:", event.data);

    if (event.data.type === "INITIAL_STATE") {
        selectedVk = event.data.state.selectedVk;
        // You could display the selectedVk here if needed
        // e.g., document.getElementById('signingAccount').textContent = `Signing as: ${selectedVk.substring(0,6)}...`;
    }

    if (event.data.type === "REQUEST_SIGNATURE") {
        callbackKey = event.data.callbackKey;
        messageToSign = event.data.data.message; // Extract the message string

        // Populate the UI
        const messageElement = document.getElementById('requestSignatureMessage');
        if (messageElement) {
            // Display the message safely (escape HTML)
             messageElement.textContent = messageToSign || '[Empty Message]';
        } else {
             console.error("Message display element not found.");
        }

        // Enable buttons now that data is loaded
        document.getElementById('request-signature-accept').disabled = false;
        document.getElementById('request-signature-reject').disabled = false;
    }
});

// --- Action Handlers ---

function acceptRequest() {
    if (!callbackKey || isActionTaken || messageToSign === null) return;
    isActionTaken = true; // Set flag

    console.log("Popup: Signature Request Accepted");

    // Send acceptance and the message *back* to the main window for actual signing
    window.opener.postMessage({
        type: 'REQUEST_SIGNATURE_RESPONSE', // Specific response type
        data: {
            confirmed: true,
            message: messageToSign // Send the message that needs signing
        },
        callbackKey: callbackKey
    }, '*'); // Use specific origin in production

    window.close(); // Close the popup
}

function rejectRequest() {
    if (!callbackKey || isActionTaken) return;
    isActionTaken = true; // Set flag

    console.log("Popup: Signature Request Rejected");

    // Send rejection back to the main window
    window.opener.postMessage({
        type: 'REQUEST_SIGNATURE_RESPONSE', // Specific response type
        data: {
            confirmed: false,
            signature: null, // Indicate rejection by null signature
            errors: ['rejected']
        },
        callbackKey: callbackKey
    }, '*'); // Use specific origin in production

    window.close(); // Close the popup
}

// Handle the user closing the window directly
window.addEventListener('beforeunload', () => {
    if (!isActionTaken) {
        console.log("Popup: Window closed by user, rejecting signature request.");
        rejectRequest(); // Attempt to send rejection
    }
});

// --- Attach Event Listeners ---
document.getElementById('request-signature-accept')?.addEventListener('click', acceptRequest);
document.getElementById('request-signature-reject')?.addEventListener('click', rejectRequest);

// Initial button state (disabled until data arrives)
document.getElementById('request-signature-accept').disabled = true;
document.getElementById('request-signature-reject').disabled = true;

// Signal readiness to opener window
if (window.opener) {
    window.opener.postMessage({ type: "POPUP_READY" }, "*");
} else {
    console.error("Popup: Cannot communicate with opener window.");
    document.body.innerHTML = '<div class="alert alert-danger m-3">Error: Could not connect to the main wallet window. Please close this window and try again.</div>';
}