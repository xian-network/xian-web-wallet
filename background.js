let appTabId = null;

// Retrieve the stored `appTabId` when the service worker starts
chrome.storage.local.get("appTabId", (result) => {
    if (result.appTabId) {
        appTabId = result.appTabId;
        verifyTab(appTabId); // Ensure the tab is still valid on startup
    }
});

// Listener for the extension icon click
chrome.action.onClicked.addListener(() => {
    openOrFocusAppTab();
});

// Function to open a new tab or focus on an existing one
function openOrFocusAppTab() {
    const url = chrome.runtime.getURL('index.html');
    if (appTabId !== null) {
        chrome.tabs.get(appTabId, (existingTab) => {
            if (chrome.runtime.lastError || !existingTab) {
                createTab(); // Create a new tab if the existing one is missing or closed
            } else {
                chrome.tabs.update(appTabId, { active: true }); // Focus on the existing tab
            }
        });
    } else {
        findTab(); // Try finding the tab first before creating a new one
    }
}

// Function to find the existing app tab by URL
function findTab() {
    const url = chrome.runtime.getURL('index.html');
    chrome.tabs.query({ url }, (tabs) => {
        if (tabs.length > 0) {
            appTabId = tabs[0].id;
            chrome.storage.local.set({ appTabId });
            chrome.tabs.update(appTabId, { active: true });
        } else {
            createTab(); // If no existing tab, create a new one
        }
    });
}

// Function to create a new app tab
function createTab() {
    const url = chrome.runtime.getURL('index.html');
    chrome.tabs.create({ url }, (newTab) => {
        appTabId = newTab.id;
        chrome.storage.local.set({ appTabId });
    });
}

// Verify if a stored tab ID is still valid and open
function verifyTab(tabId) {
    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
            appTabId = null;
            chrome.storage.local.remove("appTabId");
        }
    });
}

// Listener for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (["dAppSendTransaction", "getWalletInfo", "dAppSignMessage", "dAppAddToken"].includes(message.type)) {
        if (appTabId === null) findTab();

        if (appTabId === null && message.type === "getWalletInfo") {
            sendResponse({ address: "", locked: true, chainId: "" });
            return;
        }

        chrome.tabs.sendMessage(appTabId, message, sendResponse);
    }
    return true; // Indicate that we will send a response asynchronously
});

// Listener for when a tab is removed
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === appTabId) {
        appTabId = null;
        chrome.storage.local.remove("appTabId");
    }
});

// Listener for when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId === appTabId && changeInfo.status === "complete") {
        appTabId = tabId;
        chrome.storage.local.set({ appTabId });
    }
});
