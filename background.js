let appTabId = null;

// Listener for the extension icon click
chrome.action.onClicked.addListener(function(tab) {
    const url = chrome.runtime.getURL('index.html');

    // Check if the tab is still open
    if (appTabId !== null) {
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
});

// Function to create a new tab
function createTab() {
    const url = chrome.runtime.getURL('index.html');
    chrome.tabs.create({url: url}, function(newTab) {
        // Update the global variable with the new tab ID
        appTabId = newTab.id;
    });
}

// Listener for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'dAppSendTransaction' || message.type === 'getWalletInfo') {
        if(appTabId === null) {
            // Try finding the tab, if the reference is lost
            chrome.tabs.query({url: chrome.runtime.getURL('index.html')}, function(tabs) {
                if (tabs.length > 0) {
                    appTabId = tabs[0].id;
                }
            });
        }

        if (appTabId === null && message.type === 'getWalletInfo') { // If the extension is not open, return an empty response
            sendResponse({address: '', locked: true, chainId: ''});
            return;
        }
        if (appTabId === null && message.type === 'dAppSendTransaction') { // If the extension is not open, return an error response
            sendResponse({errors: ['Extension not open']});
            return;
        }

        // Forward the message to the extension window
        chrome.tabs.sendMessage(appTabId, message, sendResponse);
    }
    // Make sure to return true to indicate that you will send a response asynchronously
    return true;
});

// Listener for when a tab is removed
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    if (tabId === appTabId) {
        appTabId = null;
    }
});

// Listener for when a tab is updated
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (tabId === appTabId && changeInfo.status === 'complete') {
        // Update appTabId if needed, such as reloading the tab
        appTabId = tabId;
    }
});
