// --- Global Variables (Keep these at the top) ---
var app_page = "get-started";
var app_box = document.getElementById("app-box");
// ... (other global variables: encryptedSeed, accounts, etc.) ...
var encryptedSeed = null;
var unencryptedMnemonic = null;
var accounts = [];
var selectedAccountIndex = 0;
var locked = true;
var tx_history = JSON.parse(localStorage.getItem("tx_history")) || [];
var sendResponse = null;
var externalWindow = null;
var callbacks = {};
var callbackId = 0;

function insertHTMLAndExecuteScripts(container, htmlContent) {
    container.innerHTML = htmlContent;
    const scripts = container.querySelectorAll("script");
  
    // Identify and remove previously loaded scripts to prevent duplicates
    const oldScripts = document.querySelectorAll('script[data-script="dynamic"]');
    oldScripts.forEach(script => script.remove());
  
    scripts.forEach((originalScript) => {
      if (originalScript.src) {
        const script = document.createElement("script");
        script.src = originalScript.src;
        script.setAttribute('data-script', 'dynamic'); // Mark script for identification
        script.onload = () => {
          console.log(`Script loaded: ${script.src}`);
        };
        document.head.appendChild(script);
      } else {
        console.warn("Inline script execution is blocked by CSP");
      }
    });
  }

// --- Other Helper Functions (like popup_params, getSelectedAccount etc.) ---
function popup_params(width, height) {
    // ... (implementation as before) ...
     var a = typeof window.screenX != 'undefined' ? window.screenX : window.screenLeft;
     var i = typeof window.screenY != 'undefined' ? window.screenY : window.screenTop;
     var g = typeof window.outerWidth!='undefined' ? window.outerWidth : document.documentElement.clientWidth;
     var f = typeof window.outerHeight != 'undefined' ? window.outerHeight: (document.documentElement.clientHeight - 22);
     var h = (a < 0) ? window.screen.width + a : a;
     var left = parseInt(h + ((g - width) / 2), 10);
     var top = parseInt(i + ((f-height) / 2.5), 10);
     return 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',scrollbars=1';
}
function getSelectedAccount() {
    // ... (implementation as before) ...
     if (locked || accounts.length === 0) {
         return null;
     }
     const account = accounts.find(acc => acc.index === selectedAccountIndex);
     if (!account) {
          console.warn(`Selected account index ${selectedAccountIndex} not found in accounts list. Defaulting to index 0.`);
          return accounts[0] || null;
     }
     return account;
}
function getSelectedVK() {
    // ... (implementation as before) ...
    const account = getSelectedAccount();
    return account ? account.vk : null;
}


// --- External Window Communication ---
function createExternalWindow(page, some_data = null, send_response = null) {
    // ... (implementation as before, it calls loadHtmlAndScripts) ...
      const loadHtmlAndScripts = (htmlPath) => { // Define INSIDE or ensure it's defined before createExternalWindow
        fetch(htmlPath)
          .then((response) => response.text())
          .then((htmlContent) => {
            if (!externalWindow || externalWindow.closed) {
              externalWindow = window.open("index-external.html", "", "width=400,height=600," + popup_params(400, 600)); // Applied popup_params
              externalWindow.onload = () => {
                externalWindow.postMessage({
                  type: "HTML",
                  html: htmlContent
                }, "*");
                sendInitialState(); // Send state after window is loaded
                sendPageSpecificMessage(page, some_data);
              };
            } else {
              // If window exists, just send messages
              externalWindow.postMessage({
                type: "HTML",
                html: htmlContent
              }, "*");
               sendInitialState();
               sendPageSpecificMessage(page, some_data);
               externalWindow.focus(); // Bring existing window to front
            }
          });
      };

       // Send relevant state to the popup/external window
       const sendInitialState = () => { // Define INSIDE or ensure defined before createExternalWindow
         // IMPORTANT: Only send necessary, non-sensitive info.
         // DO NOT send unencryptedMnemonic to the popup.
         // The popup will need the selected account's VK for display/context.
         const selectedAccount = accounts.find(acc => acc.index === selectedAccountIndex);
         externalWindow.postMessage({
           type: "INITIAL_STATE",
           state: {
               // Send selected account VK instead of a single global publicKey
               selectedVk: selectedAccount ? selectedAccount.vk : null,
               selectedAccountIndex: selectedAccountIndex, // Send index
               locked: locked,
               // Send necessary parts of tx_history if needed by the popup,
               // or let the popup request it if required.
               // tx_history: tx_history, // Be cautious about sending large/sensitive history
               CHAIN_ID: CHAIN_ID // Send Chain ID
               }
         }, "*");
          // Also send unencrypted mnemonic ONLY IF the popup needs to perform signing itself
          // AND you trust the popup context. Generally, signing should happen in the main extension context.
          // For this implementation, let's assume signing happens here (router.js context)
          // So, the external window only needs to display info and send requests back.
       };

        const sendPageSpecificMessage = (page, some_data) => { // Define INSIDE or ensure defined before createExternalWindow
             const callbackKey = 'callback_' + (callbackId++);
             callbacks[callbackKey] = send_response; // Store the original sendResponse from background.js

             let type = "";
             let dataToSend = {};

             if (page === "request-transaction") {
                 type = "REQUEST_TRANSACTION";
                 // Prepare data for the transaction request template
                  dataToSend = {
                      contract: some_data.data.contract,
                      method: some_data.data.function, // Changed from 'method' to 'function' based on xian.js
                      kwargs: some_data.data.kwargs,
                      // Stamp limit might be estimated later, pass initial if available
                      stampLimit: some_data.data.stamps_supplied || 'Estimating...',
                      chainId: CHAIN_ID // Pass current Chain ID
                  };
             } else if (page === "request-signature") {
                 type = "REQUEST_SIGNATURE";
                 dataToSend = {
                     message: some_data.data.message
                 };
             } else if (page === "request-token") {
                 type = "REQUEST_TOKEN";
                 dataToSend = {
                     contract: some_data.data.contract // Pass the contract name
                 };
             }

             console.log("Posting to external window:", { type: type, data: dataToSend, callbackKey: callbackKey });
             externalWindow.postMessage({
                 type: type,
                 data: dataToSend, // Send structured data
                 callbackKey: callbackKey
             }, "*");
         };

         // Determine which HTML template to load based on the request type
         let templatePath = "";
         switch (page) {
             case "request-transaction":
                 templatePath = "templates/request-transaction.html";
                 break;
             case "request-signature":
                 templatePath = "templates/request-signature.html";
                 break;
             case "request-token":
                  templatePath = "templates/request-token.html";
                 break;
             default:
                 console.error("Unknown page type for external window:", page);
                 return; // Don't open a window for unknown types
         }
         loadHtmlAndScripts(templatePath); // Call the inner function
}
window.addEventListener("message", (event) => {
    // ... (listener implementation as before) ...
      // Check origin for security if necessary, e.g.,
     // if (event.origin !== "chrome-extension://your-extension-id") return;

     const callbackKey = event.data.callbackKey;
     const sendResponseFunc = callbacks[callbackKey];

     if (!sendResponseFunc) {
        // console.log("No callback found for key:", callbackKey, "Event Data:", event.data);
         return; // Ignore if no callback matches (might be other messages)
     }

     // Handle responses based on the type originally requested
     if (event.data.type === "REQUEST_TRANSACTION_RESPONSE") { // Expecting a specific response type
         console.log("Transaction response from popup:", event.data.data);

          // --- SIGNING LOGIC MOVED HERE ---
          if (event.data.data.confirmed && event.data.data.details) {
               const details = event.data.data.details;
               const selectedAcct = getSelectedAccount(); // Get current account

               if (locked || !unencryptedMnemonic || !selectedAcct) {
                    sendResponseFunc({ errors: ['Wallet locked or unavailable for signing.'] });
                    delete callbacks[callbackKey];
                    return;
               }

               // Reconstruct transaction payload
               let transaction = {
                   payload: {
                       chain_id: CHAIN_ID,
                       contract: details.contract,
                       function: details.method, // Name used in popup
                       kwargs: details.kwargs,
                       stamps_supplied: details.stamps_supplied
                       // nonce/sender added by signTransaction
                   },
                   metadata: { signature: "" }
               };

               // Sign and Broadcast
               signTransaction(transaction, unencryptedMnemonic, selectedAcct.index)
                   .then(signedTx => broadcastTransaction(signedTx))
                   .then(response => {
                        if (response.error === 'timeout') {
                             sendResponseFunc({ status: 'sent_timeout', txid: 'TIMEOUT' }); // Indicate timeout
                             prependToTransactionHistory("TIMEOUT", details.contract, details.method, details.kwargs, 'pending', new Date().toLocaleString());
                        } else if (response && response.result && response.result.hash) {
                             const hash = response.result.hash;
                             const status = response.result.code === 0 ? 'pending' : 'error';
                             prependToTransactionHistory(hash, details.contract, details.method, details.kwargs, status, new Date().toLocaleString());
                             if (status === 'error') {
                                 sendResponseFunc({ errors: [response.result.log || 'Transaction failed on broadcast check.'] });
                             } else {
                                 sendResponseFunc({ status: 'success', txid: hash }); // Success
                             }
                        } else {
                             sendResponseFunc({ errors: [response.result?.log || 'Broadcast failed or unexpected response.'] });
                        }
                        // Refresh UI if needed
                        if (app_page === "wallet") { changePage("wallet"); }
                   })
                   .catch(err => {
                        console.error("Error signing/broadcasting from popup confirmation:", err);
                        sendResponseFunc({ errors: [err.message || 'Signing or broadcast failed.'] });
                   });

          } else {
              // User rejected or error in popup data
               sendResponseFunc(event.data.data); // Pass rejection/errors back
          }
          // --- END SIGNING LOGIC ---

     } else if (event.data.type === "REQUEST_SIGNATURE_RESPONSE") {
         console.log("Signature response from popup:", event.data.data);

          // --- SIGNING LOGIC MOVED HERE ---
          if (event.data.data.confirmed && event.data.data.message) {
              const messageToSign = event.data.data.message;
              const selectedAcct = getSelectedAccount();

              if (locked || !unencryptedMnemonic || !selectedAcct) {
                   sendResponseFunc({ signature: null, errors: ['Wallet locked or unavailable for signing.'] });
                   delete callbacks[callbackKey];
                   return;
              }

              signMessage(messageToSign, unencryptedMnemonic, selectedAcct.index)
                  .then(signature => {
                       sendResponseFunc({ signature: signature, errors: null }); // Send signature back
                       toast('success', 'Message signed successfully.');
                  })
                  .catch(err => {
                       console.error("Error signing message from popup confirmation:", err);
                       sendResponseFunc({ signature: null, errors: [err.message || 'Signing failed.'] });
                  });

          } else {
              // User rejected
               sendResponseFunc(event.data.data); // Pass rejection back { confirmed: false, signature: null, errors: ['rejected'] }
          }
          // --- END SIGNING LOGIC ---

     } else if (event.data.type === "REQUEST_TOKEN_RESPONSE") {
          console.log("Token response from popup:", event.data.data);

          // --- PROCESSING LOGIC MOVED HERE ---
           if (event.data.data.confirmed && event.data.data.contract) {
               const contractToAdd = event.data.data.contract;

               // Validate contract name again? Optional.
               if (!/^[a-zA-Z0-9_.]+$/.test(contractToAdd)) { // Allow dots for subcontracts
                    sendResponseFunc({ success: false, errors: ['Invalid contract name format received.'] });
               } else {
                   // Add to token list (ensure global token_list is available)
                   if (!window.token_list) window.token_list = []; // Initialize if needed
                   if (!window.token_list.includes(contractToAdd)) {
                       window.token_list.push(contractToAdd);
                       localStorage.setItem("token_list", JSON.stringify(window.token_list)); // Persist
                       toast('success', `Token ${contractToAdd} added to list.`);
                        sendResponseFunc({ success: true });
                         // Refresh wallet UI if currently viewing it
                         if (app_page == "wallet"){
                              changePage("wallet");
                         }
                   } else {
                        toast('info', `Token ${contractToAdd} is already in your list.`);
                         sendResponseFunc({ success: true }); // Still success, just didn't change anything
                   }
               }
           } else {
               // User rejected
                sendResponseFunc(event.data.data); // Pass rejection back
           }
           // --- END PROCESSING LOGIC ---

      } else if (event.data.type === "POPUP_READY") {
           // Popup signaled it's ready, maybe resend initial state if needed
           console.log("Popup is ready.");
           // Optionally resend state if there was a timing issue
           // sendInitialState();
     } else {
          console.log("Received unhandled message type from popup:", event.data.type);
     }

     // Clean up the callback after processing
     delete callbacks[callbackKey];
});

// --- Page Navigation ---
function sideNavActive() {
    // ... (implementation as before) ...
      try {
         const activeClass = "active-side-nav";
         const navItems = [
             "side-change-page-wallet", "side-change-page-ide",
             "side-change-page-insights", "side-change-page-ecosystem-news",
             "side-change-page-settings", "side-change-page-messenger"
         ];
          // Determine the target ID based on the current app_page
          let targetId = `side-change-page-${app_page}`;

           // Handle cases where the app_page doesn't directly map to a nav item ID
          if (['send-token', 'receive-token', 'add-to-token-list', 'create-token', 'send-advanced-transaction', 'new-proposal'].includes(app_page)) {
              targetId = 'side-change-page-wallet'; // Highlight 'Wallet' for these related pages
          } else if (app_page === 'governance') { // Example if governance maps to insights
               targetId = 'side-change-page-insights';
          }

         navItems.forEach(id => {
             const element = document.getElementById(id);
             if (element) {
                 if (id === targetId) {
                     element.classList.add(activeClass);
                 } else {
                     element.classList.remove(activeClass);
                 }
             }
         });

       } catch (error) {
         console.error("Error updating side nav active state:", error);
       }
}

function changePage(page, some_data = null) {
    // --- Check if app_box exists ---
    app_box = document.getElementById("app-box"); // Re-check element
    if (!app_box) {
        console.error("Fatal Error: app-box element not found. Cannot change page.");
        // Maybe display an error message directly on the body
        document.body.innerHTML = "<h1>Error: UI container not found.</h1>";
        return;
    }
    // --- End Check ---

    sendEventGA("page_view", {engagement_time_msec: 100, page_title: page, page_location: page});
    app_page = page;
    sideNavActive(); // Update nav highlighting

    // Wallet State Checks (as before)
    const requiresUnlock = ![
        "get-started", "create-wallet", "import-wallet", "password-input", "ecosystem-news"
    ].includes(page);
    if (requiresUnlock && locked) {
        console.log("Wallet locked, redirecting to password input.");
        page = "password-input";
        app_page = page;
        sideNavActive();
    }
    const creationPages = ["get-started", "create-wallet", "import-wallet"];
    if (creationPages.includes(page) && !locked && encryptedSeed) {
         console.log("Wallet exists and unlocked, redirecting to wallet.");
         page = "wallet";
         app_page = page;
         sideNavActive();
    }

    // --- loadHtmlAndScripts definition needed HERE before usage ---
     const loadHtmlAndScripts = (htmlPath) => {
         fetch(htmlPath)
             .then((response) => response.text())
              // Use the globally defined insertHTMLAndExecuteScripts
             .then((htmlContent) => insertHTMLAndExecuteScripts(app_box, htmlContent))
             .then(() => {
                  // Page-specific initializations (as before)
                  if (page === "send-token") {
                       const selectedAccount = accounts.find(acc => acc.index === selectedAccountIndex);
                       if (selectedAccount) {
                            document.getElementById("tokenName").innerHTML = some_data;
                       } else {
                            changePage('wallet');
                       }
                   }
                   // ... (other page specific logic like side nav visibility) ...
                   const hideNavPages = ["password-input", "create-wallet", "import-wallet", "get-started"];
                    const sideNav = document.getElementById("side-nav"); // Use ID now
                    const appBoxElement = document.querySelector(".app-box"); // Target the container more specifically

                    if (sideNav && appBoxElement) {
                       if (hideNavPages.includes(page)) {
                           sideNav.style.display = "none";
                           // Reset styles possibly set for when nav is visible
                            appBoxElement.style.borderTopLeftRadius = "8px";
                            appBoxElement.style.borderBottomLeftRadius = "8px";
                            appBoxElement.style.borderTopRightRadius = "8px"; // Ensure right is also rounded
                            appBoxElement.style.borderLeftWidth = "1px";

                       } else {
                           sideNav.style.display = "flex"; // Use flex as per previous CSS
                           if (window.innerWidth > 768) {
                               // Desktop layout: Nav left, App right
                               appBoxElement.style.borderLeftWidth = "0px";
                               appBoxElement.style.borderTopLeftRadius = "0px";
                               appBoxElement.style.borderBottomLeftRadius = "0px";
                               appBoxElement.style.borderTopRightRadius = "8px"; // Keep top right rounded
                                sideNav.style.borderTopLeftRadius = "8px"; // Round top-left of nav
                                sideNav.style.borderBottomLeftRadius = "8px"; // Round bottom-left of nav
                                sideNav.style.borderTopRightRadius = "0px"; // Nav right border straight
                                sideNav.style.borderBottomRightRadius = "0px";
                                sideNav.style.borderBottomWidth = "1px";
                           } else {
                               // Mobile layout: Nav top, App bottom
                                appBoxElement.style.borderTopLeftRadius = "0px";
                                appBoxElement.style.borderTopRightRadius = "0px";
                                appBoxElement.style.borderBottomLeftRadius = "8px"; // Round bottom-left of app
                                appBoxElement.style.borderBottomRightRadius = "8px"; // Round bottom-right of app
                                appBoxElement.style.borderLeftWidth = "1px";
                                appBoxElement.style.borderTopWidth = "0px"; // No top border if nav is above

                                sideNav.style.borderTopLeftRadius = "8px";
                                sideNav.style.borderTopRightRadius = "8px";
                                sideNav.style.borderBottomLeftRadius = "0px"; // Nav bottom straight
                                sideNav.style.borderBottomRightRadius = "0px";
                                sideNav.style.borderBottomWidth = "0px"; // No bottom border separating from app-box
                           }
                       }
                    } else {
                         console.warn("Could not find side-nav or app-box element for styling.");
                    }

             })
             .catch(error => {
                 console.error(`Error loading page ${page}:`, error);
                 if (app_page !== 'wallet') changePage('wallet');
             });
     };
    // --- End loadHtmlAndScripts definition ---


    const pageTemplates = {
        // ... (mapping as before) ...
         "get-started": "templates/get-started.html",
         "create-wallet": "templates/create-wallet.html",
         "import-wallet": "templates/import-wallet.html",
         "wallet": "templates/wallet.html",
         "password-input": "templates/password-input.html",
         "send-token": "templates/send-token.html",
         "receive-token": "templates/receive-token.html",
         "settings": "templates/settings.html",
         "send-advanced-transaction": "templates/advanced-transaction.html",
         "add-to-token-list": "templates/add-to-token-list.html",
         "ide": "templates/ide.html",
         "insights": "templates/insights.html",
         "new-proposal": "templates/new-proposal.html",
         "ecosystem-news": "templates/ecosystem-news.html",
         "create-token": "templates/create-token.html",
         "messenger": "templates/messenger.html"
    };
    const templatePath = pageTemplates[page];

    if (templatePath) {
        loadHtmlAndScripts(templatePath); // Call the inner function
    } else {
        console.error(`Unknown page: ${page}. Redirecting to wallet.`);
        changePage('wallet');
    }
}

// --- Initialization Logic (DOMContentLoaded) ---
document.addEventListener("DOMContentLoaded", async (event) => {
    // ... (online status and chain ID fetch as before) ...
     if (document.getElementById("onlineStatus") == null) {
       // Likely running in the external window, skip main init
       return;
     }
     let online_status_element = document.getElementById("onlineStatus");

     // Initial Ping and Chain ID fetch
     ping().then(online_status => {
           const statusIndicator = online_status
               ? "<div class='mt-1px'><div class='online-circle' title='Node is Online'></div></div>"
               : "<div class='mt-1px'><div class='offline-circle' title='Node is Offline'></div></div>";
           online_status_element.innerHTML = `${statusIndicator} <div>${RPC.replace("https://", "").replace("http://", "")}</div>`;
     }).catch(error => {
         online_status_element.innerHTML = "<div class='mt-1px'><div class='offline-circle' title='Node is Offline'></div></div> <div>" + RPC.replace("https://", "").replace("http://", "") + "</div>";
     });

     await getChainID(); // Ensure CHAIN_ID is fetched early

     // Read HD Wallet related data
     encryptedSeed = await readEncryptedSeed();
     accounts = await readAccounts();
     selectedAccountIndex = await readSelectedAccountIndex();

     // Determine initial page
     if (encryptedSeed && accounts.length > 0) {
         locked = true;
         changePage("password-input"); // Start at password input if wallet exists
     } else {
         locked = true;
         encryptedSeed = null; accounts = []; selectedAccountIndex = 0; // Ensure clean state
         changePage("get-started");
     }
});