// Save the original fetch function
const originalFetch = window.fetch;

// Define a function to wrap fetch with timeout
function fetchWithTimeout(url, options, timeout = 5000) {
    return Promise.race([
        originalFetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

// Override the global fetch function
window.fetch = function(url, options) {
    return fetchWithTimeout(url, options);
};

if (document.getElementById('side-change-page-settings')) {
    document.getElementById('side-change-page-settings').addEventListener('click', function() {
        changePage('settings');
    });
}

if (document.getElementById('side-change-page-ide')) {
    document.getElementById('side-change-page-ide').addEventListener('click', function() {
        changePage('ide');
    });
}

if (document.getElementById('side-change-page-wallet')) {
document.getElementById('side-change-page-wallet').addEventListener('click', function() {
    changePage('wallet');
});
}

if(document.getElementById('side-lock-wallet')) {
document.getElementById('side-lock-wallet').addEventListener('click', function() {
    lockWallet();
});
}

if(document.getElementById('side-change-page-insights')) {
document.getElementById('side-change-page-insights').addEventListener('click', function() {
    changePage('insights');
});

}
if(document.getElementById('side-change-page-ecosystem-news')) {
document.getElementById('side-change-page-ecosystem-news').addEventListener('click', function() {
    changePage('ecosystem-news');
});
}
if(document.getElementById('side-change-page-messenger')) {
    document.getElementById('side-change-page-messenger').addEventListener('click', function() {
        changePage('messenger');
    });
    }
    

function lockWallet() {
    let confirm_lock = confirm("Are you sure you want to lock the wallet?");
    if (!confirm_lock) {
        return;
    }
    // Locks the wallet
    unencryptedPrivateKey = null;
    locked = true;
    updateNavActionsVisibility();
    changePage('password-input');
}

const SESSION_EXPIRATION_IN_MIN = 30;
async function getOrCreateSessionId() {
    let { sessionData } = await chrome.storage.session.get('sessionData');
    const currentTimeInMs = Date.now();
  
    if (sessionData && sessionData.timestamp) {
      const durationInMin = (currentTimeInMs - sessionData.timestamp) / 60000;
      if (durationInMin > SESSION_EXPIRATION_IN_MIN) {
        sessionData = null;
      } else {
        sessionData.timestamp = currentTimeInMs;
        await chrome.storage.session.set({ sessionData });
      }
    }
  
    if (!sessionData) {
      sessionData = {
        session_id: currentTimeInMs.toString(),
        timestamp: currentTimeInMs,
      };
      await chrome.storage.session.set({ sessionData });
    }
  
    return sessionData.session_id;
}

async function getOrCreateClientId() {
    const result = await chrome.storage.local.get('clientId');
    let clientId = result.clientId;
    if (!clientId) {
      clientId = self.crypto.randomUUID();
      await chrome.storage.local.set({ clientId });
    }
    return clientId;
  }

async function sendEventGA(name, params = {}) {
    if (!runningAsExtension()) {
        return;
    }
    const sessionId = await getOrCreateSessionId();
    await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=G-9ZK7ZQJJC5&api_secret=3_ZUpum4Qe6bHM-Z8HAXxQ`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: await getOrCreateClientId(),
            events: [
                {
                    name: name,
                    params: {
                        ...params,
                        session_id: sessionId,
                    },
                },
            ],
        }),
    });
}

(async () => {
    // Wait for sodium to initialize
    await sodium.ready;

    // Now you can safely use sodium functions
    console.log("Sodium is ready!");
})();

 