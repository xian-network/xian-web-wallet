let appTabId = null;

chrome.action.onClicked.addListener(function(tab) {
    const url = chrome.runtime.getURL('index.html');

    // Check if the tab is still open
    if (appTabId) {
        chrome.tabs.get(appTabId, function(existingTab) {
            if (chrome.runtime.lastError || !existingTab) {
                // If the tab is no longer open or an error occurred, create a new tab
                createTab();
            } else {
                // Focus on the existing tab
                chrome.tabs.update(appTabId, {active: true});
            }
        });
    } else {
        // If no tab ID is stored, create a new tab
        createTab();
    }

    function createTab() {
        chrome.tabs.create({url: url}, function(newTab) {
            // Update the global variable with the new tab ID
            appTabId = newTab.id;
        });
    }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'dAppSendTransaction' || message.type === 'getWalletInfo') {
        if (!appTabId && message.type === 'getWalletInfo') { // If the extension is not open, return an empty response
            sendResponse({address: '', locked: true, chainId: ''});
            return;
        }
        // Forward the message to the extension window
        chrome.runtime.sendMessage(message, sendResponse);
    }
    // Make sure to return true to indicate that you will send a response asynchronously
    return true;
});