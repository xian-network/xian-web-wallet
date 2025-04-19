// Helper function to check if running as an extension
function runningAsExtension() {
    // Check for chrome.runtime or browser.runtime to cover Chrome and Firefox/Edge
    return (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) ||
           (typeof browser !== "undefined" && browser.runtime && browser.runtime.id);
}

// Unified function to save data
async function saveData(name, value) {
    if (runningAsExtension()) {
        // Use extension storage API (asynchronous)
        const storageItem = {};
        storageItem[name] = value;
        try {
            if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
                await new Promise((resolve, reject) => {
                    chrome.storage.local.set(storageItem, () => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve();
                        }
                    });
                });
            } else if (typeof browser !== "undefined" && browser.storage && browser.storage.local) {
                await browser.storage.local.set(storageItem);
            } else {
                 console.warn("Extension storage API not available.");
                 // Fallback or error handling if needed
                 localStorage.setItem(name, value); // Basic fallback
            }
        } catch (error) {
            console.error("Error saving to extension storage:", error);
             // Optional: Fallback to localStorage on error
             localStorage.setItem(name, value);
        }
    } else {
        // Use localStorage for web (synchronous)
        try {
            localStorage.setItem(name, value);
        } catch (error) {
            console.error("Error saving to localStorage:", error);
            // Handle potential storage errors (e.g., quota exceeded)
        }
    }
}

// Unified function to read data
async function readData(name) {
    if (runningAsExtension()) {
        // Use extension storage API (asynchronous)
        try {
            if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
                 return await new Promise((resolve, reject) => {
                     chrome.storage.local.get([name], function(result) {
                         if (chrome.runtime.lastError) {
                             reject(chrome.runtime.lastError);
                         } else {
                             resolve(result[name]); // Returns undefined if key doesn't exist
                         }
                     });
                 });
            } else if (typeof browser !== "undefined" && browser.storage && browser.storage.local) {
                const result = await browser.storage.local.get(name);
                return result[name]; // Returns undefined if key doesn't exist
            } else {
                 console.warn("Extension storage API not available.");
                 return localStorage.getItem(name); // Basic fallback
            }
        } catch (error) {
            console.error("Error reading from extension storage:", error);
            return localStorage.getItem(name); // Fallback on error
        }
    } else {
        // Use localStorage for web (synchronous)
        return localStorage.getItem(name); // Returns null if key doesn't exist
    }
}

// Unified function to remove data
async function removeData(name) {
    if (runningAsExtension()) {
        // Use extension storage API (asynchronous)
         try {
            if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
                 await new Promise((resolve, reject) => {
                    chrome.storage.local.remove(name, () => {
                         if (chrome.runtime.lastError) {
                             reject(chrome.runtime.lastError);
                         } else {
                             resolve();
                         }
                    });
                 });
            } else if (typeof browser !== "undefined" && browser.storage && browser.storage.local) {
                await browser.storage.local.remove(name);
            } else {
                 console.warn("Extension storage API not available.");
                 localStorage.removeItem(name); // Basic fallback
            }
        } catch (error) {
            console.error("Error removing from extension storage:", error);
             localStorage.removeItem(name); // Fallback on error
        }
    } else {
        // Use localStorage for web (synchronous)
        localStorage.removeItem(name);
    }
}


// --- Convenience Wrappers (Keep old names for compatibility if needed, but point to new functions) ---

// Wrapper for saving the encrypted seed
async function saveEncryptedSeed(encryptedSeed) {
    await saveData('encryptedSeed', encryptedSeed);
}

// Wrapper for reading the encrypted seed
async function readEncryptedSeed() {
    return await readData('encryptedSeed');
}

// Wrapper for removing the encrypted seed
async function removeEncryptedSeed() {
    await removeData('encryptedSeed');
}

// Wrapper for saving the accounts list (as JSON string)
async function saveAccounts(accountsArray) {
    await saveData('accounts', JSON.stringify(accountsArray));
}

// Wrapper for reading the accounts list (parses JSON string)
async function readAccounts() {
    const accountsJson = await readData('accounts');
    try {
        return accountsJson ? JSON.parse(accountsJson) : []; // Return empty array if null/undefined
    } catch (e) {
        console.error("Error parsing accounts JSON from storage:", e);
        return []; // Return empty array on parsing error
    }
}

// Wrapper for removing the accounts list
async function removeAccounts() {
    await removeData('accounts');
}

async function saveSelectedAccountVk(vk) {
    if (vk) {
        await saveData('selectedAccountVk', vk);
    } else {
        // If vk is null/undefined, remove the key
        await removeData('selectedAccountVk');
    }
}

async function readSelectedAccountVk() {
    return await readData('selectedAccountVk'); // Returns null if not set
}

async function removeSelectedAccountVk() {
    await removeData('selectedAccountVk');
}

// --- Keep old cookie functions for reference or potential specific use, but mark as deprecated ---

/*
 * @deprecated Use saveData instead.
 */
function createSecureCookie(name, value, days) {
    console.warn("createSecureCookie is deprecated. Use saveData instead.");
    // Original cookie implementation (kept for reference)
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    // Note: Secure flag requires HTTPS. samesite=strict is good practice.
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict; Secure";
}

/*
 * @deprecated Use readData instead.
 */
async function readSecureCookie(name) {
     console.warn("readSecureCookie is deprecated. Use readData instead.");
     // Try new method first
     const data = await readData(name);
     if (data !== undefined && data !== null) {
         return data;
     }
     // Fallback to old cookie method if needed (optional)
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }
    return null;
}

/*
 * @deprecated Use removeData instead.
 */
function eraseSecureCookie(name) {
     console.warn("eraseSecureCookie is deprecated. Use removeData instead.");
     removeData(name); // Call the new unified function
    // Original cookie implementation (kept for reference)
    document.cookie = name + '=; Max-Age=-99999999; path=/; SameSite=Strict; Secure';
}