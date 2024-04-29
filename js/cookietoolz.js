// Helper function to check if running as an extension
function runningAsExtension() {
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id) {
        return true;
    }
}


function createSecureCookie(name, value, days) {
    if (runningAsExtension()) {
        // Use extension storage API
        const storageItem = {};
        storageItem[name] = value;
        if (typeof chrome !== "undefined" && chrome.storage) {
            chrome.storage.local.set(storageItem);
        } else if (typeof browser !== "undefined" && browser.storage) {
            browser.storage.local.set(storageItem);
        }
    } else {
        // Original cookie-based implementation
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + value + expires + "; secure; samesite=strict; path=/";
    }
}

async function readFromStorage(name) {
    return new Promise((resolve, reject) => {
        if (typeof chrome !== "undefined" && chrome.storage) {
            chrome.storage.local.get([name], function(result) {
                resolve(result[name]);
            });
        } else if (typeof browser !== "undefined" && browser.storage) {
            browser.storage.local.get(name).then(result => {
                resolve(result[name]);
            }, reject);
        } else {
            reject(new Error("Storage API not found"));
        }
    });
}

async function readSecureCookie(name) {
    if (runningAsExtension()) {
         // Asynchronously retrieve the value from storage.
         return await readFromStorage(name);
    } else {
        // Original cookie-based implementation
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
}

function eraseSecureCookie(name) {
    if (runningAsExtension()) {
        // Use extension storage API
        if (typeof chrome !== "undefined" && chrome.storage) {
            chrome.storage.local.remove(name);
        } else if (typeof browser !== "undefined" && browser.storage) {
            browser.storage.local.remove(name);
        }
    } else {
        // Original cookie-based implementation
        document.cookie = name + '=; Max-Age=-99999999; secure; samesite=strict; path=/';
    }
}

function editSecureCookie(name, value, days) {
    if (runningAsExtension()) {
        // Directly create/update the value in the extension storage
        createSecureCookie(name, value, days);
    } else {
        // Use the original cookie-based methods for web
        eraseSecureCookie(name);
        createSecureCookie(name, value, days);
    }
}