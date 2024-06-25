if (runningAsExtension()) {
    let isJSON = (str) => {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    };

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
            // We expect the message to be a string that cannot be parsed as JSON
            if (isJSON(message.data.message)) {
                sendResponse({errors: ['Invalid message']});
                return;
            }

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