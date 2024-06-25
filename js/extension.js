if (runningAsExtension()) {
    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log(message);
        if (message.type === 'getWalletInfo') {
            sendResponse({address: publicKey, locked: locked, chainId: CHAIN_ID});
        }
        if (message.type === 'dAppSendTransaction') {
            if (locked) {
                sendResponse({errors: ['Wallet is locked']});
                return;
            }
            changePage('request-transaction', message, sendResponse);
            // Focus on the extension window
            window.focus();
        }
        if (message.type === 'dAppSignMessage') {
            if (locked) {
                sendResponse({errors: ['Wallet is locked']});
                return;
            }
            changePage('request-signature', message, sendResponse);
            // Focus on the extension window
            window.focus();
        }

        return true;
    });
}