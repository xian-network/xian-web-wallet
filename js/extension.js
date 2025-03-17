if (runningAsExtension()) {
    let isUnsafe = (str) => {
        if (str.length < 2 ){
            return true;
        }
        if (str.length > 10000){
            return true;
        }
        try {
            obj = JSON.parse(str);
            if (obj.hasOwnProperty('payload')){
                return true;
            }
            if (obj.hasOwnProperty('metadata')){
                return true;
            }
            if (obj.hasOwnProperty('chain_id')){
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
        return false;
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
            message.data.chainId = CHAIN_ID;
            createExternalWindow('request-transaction', message, sendResponse);
            
        }
        if (message.type === 'dAppSignMessage') {
            // We expect the message to be a string that cannot be parsed as JSON
            if (isUnsafe(message.data.message)) {
                sendResponse({errors: ['Invalid message']});
                return;
            }

            if (locked) {
                sendResponse({errors: ['Wallet is locked']});
                return;
            }
            createExternalWindow('request-signature', message, sendResponse);
            
        }
        if (message.type === 'dAppAddToken') {
            if (locked) {
                sendResponse({errors: ['Wallet is locked']});
                return;
            }
            createExternalWindow('request-token', message, sendResponse);
            
        }

        return true;
    });
}