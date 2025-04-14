// Assumes global vars: RPC, CHAIN_ID, accounts, selectedAccountIndex, unencryptedMnemonic, locked
// Assumes functions: getSelectedAccount, getSelectedVK, deriveKeyPairFromMnemonic, toHexString, fromHexString,
//                    signTransaction, estimateStamps, broadcastTransaction, getVariable, toast, sanitizeHTML,
//                    saveData, readData (or equivalents for local message storage)

// --- Cryptographic Helpers (Adapted for HD) ---

// stringToUint8Array, uint8ArrayToString, base64ToUint8Array, hexToUint8Array,
// fromHexString, toHexString, uint8ArrayToHex, uint8ArrayToBase64
// (Keep these helpers as they are fundamental conversions)
function stringToUint8Array(str) { return new TextEncoder().encode(str); }
function uint8ArrayToString(uint8Array) { return new TextDecoder().decode(uint8Array); }
function base64ToUint8Array(base64) { /* ... keep existing ... */ }
function hexToUint8Array(hex) { /* ... keep existing ... */ }
function fromHexString(hexString) { /* ... keep existing from xian.js ... */ }
function toHexString(uint8Array) { /* ... keep existing from xian.js ... */ }
function uint8ArrayToHex(uint8Array) { /* ... keep existing ... */ }
function uint8ArrayToBase64(uint8Array) { /* ... keep existing ... */ }


// Libsodium conversion functions (Ensure sodium is loaded)
function convertEd25519ToCurve25519PrivateKey(ed25519PrivateKeyHex) {
    // This function derives the *full* 64-byte Ed25519 private key from the 32-byte seed (hex).
    if (!window.sodium) { throw new Error("Sodium library not loaded"); }
    const ed25519Seed = sodium.from_hex(ed25519PrivateKeyHex);
    // Generate the full key pair from the seed
    const ed25519KeyPair = sodium.crypto_sign_seed_keypair(ed25519Seed);
    // The full private key includes the seed and the public key part
    const ed25519FullPrivateKey = ed25519KeyPair.privateKey;
    return sodium.crypto_sign_ed25519_sk_to_curve25519(ed25519FullPrivateKey);
}

function convertEd25519ToCurve25519PublicKey(ed25519PublicKeyHex) {
    if (!window.sodium) { throw new Error("Sodium library not loaded"); }
    const ed25519PublicKey = sodium.from_hex(ed25519PublicKeyHex);
    return sodium.crypto_sign_ed25519_pk_to_curve25519(ed25519PublicKey);
}

/**
 * Encrypts a message using NaCl box seal (public key encryption).
 * Requires the recipient's Ed25519 public key (hex).
 */
function encrypt_nacl_box_seal(cleartext_msg, recipient_vk_hex) {
    if (!window.sodium) { throw new Error("Sodium library not loaded"); }
    try {
        // Convert the recipient's Ed25519 public key to Curve25519
        const recipientCurve25519PublicKey = convertEd25519ToCurve25519PublicKey(recipient_vk_hex);

        // Encrypt using crypto_box_seal
        const encryptedMessage = sodium.crypto_box_seal(
            stringToUint8Array(cleartext_msg),
            recipientCurve25519PublicKey
        );

        return uint8ArrayToHex(encryptedMessage); // Return hex encoded encrypted message
    } catch (error) {
        console.error("Encryption failed:", error);
        throw new Error("Message encryption failed.");
    }
}

/**
 * Decrypts a message using NaCl box seal open.
 * Requires the user's UNENCRYPTED mnemonic and the ACCOUNT INDEX corresponding
 * to the public key the message was sent TO.
 */
function decrypt_nacl_box_seal_open(encrypted_msg_hex, mnemonic, accountIndex) {
     if (!window.sodium) { throw new Error("Sodium library not loaded"); }
     if (!mnemonic) { throw new Error("Decryption requires unlocked wallet (mnemonic)."); }

    try {
        // 1. Derive the specific key pair for the account index
        const keyPair = deriveKeyPairFromMnemonic(mnemonic, accountIndex); // from xian.js
        const userEd25519PublicKey = keyPair.vk; // 32-byte Uint8Array
        const userEd25519PrivateKeySeed = keyPair.sk; // 32-byte Uint8Array seed

        // 2. Convert keys to Curve25519 format
        // Public key conversion
        const userCurve25519PublicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(userEd25519PublicKey);

        // Private key conversion (needs full 64-byte sk)
        const fullKeyPair = sodium.crypto_sign_seed_keypair(userEd25519PrivateKeySeed);
        const userEd25519FullPrivateKey = fullKeyPair.privateKey;
        const userCurve25519PrivateKey = sodium.crypto_sign_ed25519_sk_to_curve25519(userEd25519FullPrivateKey);


        // 3. Convert the encrypted message from hex to Uint8Array
        const encryptedMessageBytes = hexToUint8Array(encrypted_msg_hex);

        // 4. Attempt decryption using crypto_box_seal_open
        const decryptedMessageBytes = sodium.crypto_box_seal_open(
            encryptedMessageBytes,
            userCurve25519PublicKey,
            userCurve25519PrivateKey
        );

        if (!decryptedMessageBytes) {
            // console.warn(`Decryption failed for message (index ${accountIndex}). Possibly not intended receiver or corrupted.`);
            return null; // Indicate decryption failure
        }

        return uint8ArrayToString(decryptedMessageBytes); // Return decrypted message string
    } catch (error) {
        console.error(`Decryption failed for account index ${accountIndex}:`, error);
        return null; // Indicate failure
    }
}


// --- Local Message Storage (Adapted for Selected Account) ---
// Store sent messages locally, keyed by RPC and the SENDER's VK (selected account)
const LOCAL_SENT_MESSAGES_KEY = 'sentMessages';

async function saveMessageLocally(senderVk, recipientVk, messageObject) {
    const allMessages = JSON.parse(await readData(LOCAL_SENT_MESSAGES_KEY) || '{}'); // Use readData

    if (!allMessages[RPC]) allMessages[RPC] = {};
    if (!allMessages[RPC][senderVk]) allMessages[RPC][senderVk] = {};
    if (!allMessages[RPC][senderVk][recipientVk]) allMessages[RPC][senderVk][recipientVk] = [];

    allMessages[RPC][senderVk][recipientVk].push(messageObject);

    await saveData(LOCAL_SENT_MESSAGES_KEY, JSON.stringify(allMessages)); // Use saveData
}

async function loadLocalMessages(senderVk) {
    const allMessages = JSON.parse(await readData(LOCAL_SENT_MESSAGES_KEY) || '{}');
    return allMessages[RPC]?.[senderVk] || {};
}


// --- Global Message State (Refreshed on Load) ---
var allThreads = {}; // Holds processed messages, keyed by other party's VK: { otherAddress: string, lastMessage: string|null, thread: object[] }

// --- UI Interaction ---

document.querySelector('.messenger-inbox-new')?.addEventListener('click', function () {
    addTempChat();
});

document.querySelector('#message_input')?.addEventListener('input', function (event) {
    const message_input = document.getElementById('message_input').value;
    const message_receiver = document.getElementById('address_chat')?.innerText;
    if (!message_receiver || message_input === '') {
        document.getElementById('estimation-result').style.display = 'none';
        document.getElementById('estimation-loading').style.display = 'none';
    } else {
        // Debounce this? Estimation might be slow.
        estimateSendStampsMessenger(message_receiver, message_input); // Use specific estimator name
    }
});

document.querySelector('#message_input')?.addEventListener('keyup', function (event) {
    if (event.key === 'Enter') { // Use event.key
        sendMessage();
    }
});

document.querySelector('#send_message')?.addEventListener('click', function () {
    sendMessage(); // Send button calls sendMessage
});

function addTempChat() {
    if (locked) { toast('warning', 'Unlock wallet to start chat.'); return; }
    let address_chat_ = prompt("Enter the Xian address (VK) of the user you want to chat with:");
    if (!address_chat_) return; // User cancelled

    address_chat_ = address_chat_.trim();
    // Validate address format (64 hex chars)
    if (!/^[0-9a-fA-F]{64}$/.test(address_chat_)) {
        toast('danger', "Invalid Xian address format.");
        return;
    }
     const selectedVk = getSelectedVK();
     if (address_chat_ === selectedVk) {
          toast('warning', "Cannot start a chat with yourself.");
          return;
     }


    // Check if chat already exists in inbox (based on VK)
    if (document.querySelector(`.messenger-inbox-item[data-chat="${address_chat_}"]`)) {
         toast('info', 'Chat already exists.');
         switchChat(address_chat_); // Switch to existing chat
         return;
    }

    // Add to UI immediately (even if no messages yet)
    renderInboxItem(address_chat_, 'Start chatting!', Date.now(), false); // Add placeholder item
    switchChat(address_chat_); // Switch to the new chat interface
}

function switchChat(otherPartyVk) {
    // Highlight active item in inbox
    document.querySelectorAll('.messenger-inbox-item').forEach(item => {
        item.classList.toggle('messenger-inbox-item-active', item.dataset.chat === otherPartyVk);
    });

    // Update chat header
    const addressChatElement = document.getElementById('address_chat');
    if (addressChatElement) addressChatElement.innerText = otherPartyVk;
    document.querySelector('.messenger-chat').style.display = 'flex';

    // Clear message input
    const messageInput = document.querySelector('#message_input');
    if (messageInput) messageInput.value = '';
     // Clear fee estimation display
    document.getElementById('estimation-result').style.display = 'none';
    document.getElementById('estimation-loading').style.display = 'none';


    // Render messages for the selected chat
    const messageContainer = document.querySelector('.messenger-chat-body');
    messageContainer.innerHTML = ''; // Clear previous messages

    const chatThreadData = allThreads[otherPartyVk];
    const selectedVk = getSelectedVK();

    if (chatThreadData && chatThreadData.thread) {
        chatThreadData.thread.forEach(message => {
            const messageItem = document.createElement('div');
            const messageContent = document.createElement('div');
            messageContent.className = 'messenger-chat-item-content';

            const messageText = document.createElement('p');
            // Sanitize and display message
            sanitizeHTML(message.message || '[Empty Message]').then(sanitized => messageText.innerHTML = sanitized);
            messageContent.appendChild(messageText);


            const messageTimestamp = document.createElement('small');
             const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleString() : 'Unknown time';
             messageTimestamp.innerText = timestamp;
             messageTimestamp.className = 'text-muted d-block mt-1'; // Styling timestamp
             messageContent.appendChild(messageTimestamp);


            // Style based on sender/receiver relative to the SELECTED account
            if (message.sender === selectedVk) {
                messageItem.className = 'messenger-chat-item-me'; // Sent by selected account
            } else if (message.recipient === selectedVk) {
                 messageItem.className = 'messenger-chat-item-you'; // Received by selected account
            } else {
                 // This case might happen if viewing history after switching accounts
                 // Mark it differently or hide? For now, style as 'you'.
                 messageItem.className = 'messenger-chat-item-you'; // Received by *another* of user's accounts
                 messageTimestamp.innerText += ` (To: ${message.recipient.substring(0, 4)}...)`; // Indicate recipient
            }


            messageItem.appendChild(messageContent);
            messageContainer.appendChild(messageItem);
        });
    } else {
         // No messages yet
         messageContainer.innerHTML = `<div class="text-center text-muted p-3">No messages yet. Send one!</div>`;
    }

    // Scroll to bottom
     setTimeout(() => {
         messageContainer.scrollTop = messageContainer.scrollHeight;
     }, 50); // Small delay ensures DOM is updated
}

// --- Send Message Logic ---

async function estimateSendStampsMessenger(recipientVk, messageInput) {
    const estimation_loading = document.getElementById('estimation-loading');
    const estimation_finished = document.getElementById('estimation-result');
    const send_btn = document.getElementById('send_message');
    const feeElement = document.getElementById('tokenFee'); // Assumes these IDs exist
    const feeXianElement = document.getElementById('tokenFeeXian');

    // Reset state
    estimation_loading.style.display = 'inline-block';
    estimation_finished.style.display = 'none';
    send_btn.disabled = true;

    if (locked || !unencryptedMnemonic || !recipientVk || !messageInput) {
        estimation_loading.style.display = 'none';
        return; // Can't estimate if locked or missing data
    }
    const selectedAccount = getSelectedAccount();
    if (!selectedAccount) {
         estimation_loading.style.display = 'none';
         return;
    }

    try {
        // Encrypt message *before* creating transaction for estimation
        const encryptedMsgHex = encrypt_nacl_box_seal(messageInput, recipientVk);

        let transaction = {
            payload: {
                // chain_id, nonce, sender will be added by signTransaction
                contract: "con_msg_main", // TODO: Confirm contract name
                function: "save_msg",
                kwargs: {
                    msg: encryptedMsgHex,
                    recipient: recipientVk
                },
                stamps_supplied: 200000 // High default for estimation
            },
            metadata: { signature: "" }
        };

        // Sign for estimation
        const signedTxForEst = await signTransaction(transaction, unencryptedMnemonic, selectedAccount.index);
        // Estimate stamps
        const stampResult = await estimateStamps(signedTxForEst); // Use global estimateStamps

        estimation_loading.style.display = 'none';
        estimation_finished.style.display = 'inline-block';

        if (stampResult.stamps === null || !stampResult.success) {
            feeElement.innerHTML = 'Error';
            feeXianElement.innerHTML = 'N/A';
            toast('danger', `Fee estimation failed: ${stampResult.tx_result || 'Unknown'}`);
        } else {
            const stamps = stampResult.stamps;
            const stamp_rate = await getStampRate(); // Assumes getStampRate is available
            if (stamp_rate) {
                feeElement.innerHTML = stamps;
                feeXianElement.innerHTML = (stamps / stamp_rate).toFixed(8);
                send_btn.disabled = false; // Enable send ONLY if estimation successful
            } else {
                feeElement.innerHTML = 'Error';
                feeXianElement.innerHTML = 'N/A';
                toast('warning', 'Could not get stamp rate for fee display.');
            }
        }
    } catch (error) {
        console.error("Error estimating message send stamps:", error);
        estimation_loading.style.display = 'none';
        estimation_finished.style.display = 'inline-block';
        feeElement.innerHTML = 'Error';
        feeXianElement.innerHTML = 'N/A';
        toast('danger', `Fee estimation error: ${error.message}`);
    }
}

async function sendMessage() {
    const messageInput = document.getElementById('message_input');
    const messageText = messageInput.value.trim();
    const recipientVk = document.getElementById('address_chat')?.innerText;
    const sendButton = document.getElementById('send_message');
    const feeElement = document.getElementById('tokenFee');

    if (locked || !unencryptedMnemonic) {
        toast('warning', 'Unlock wallet to send messages.');
        return;
    }
    if (!recipientVk) {
        toast('warning', 'No recipient selected.');
        return;
    }
    if (messageText === '') {
        toast('warning', 'Message cannot be empty.');
        return;
    }

    const selectedAccount = getSelectedAccount();
    if (!selectedAccount) {
         toast('danger', 'Error: No account selected.');
         return;
    }

    let stampsRequired;
    try {
        stampsRequired = parseInt(feeElement.textContent, 10);
        if (isNaN(stampsRequired)) {
             toast('warning', 'Fee not estimated. Please wait.');
             await estimateSendStampsMessenger(recipientVk, messageText); // Re-estimate
             stampsRequired = parseInt(feeElement.textContent, 10);
             if (isNaN(stampsRequired)) throw new Error("Fee estimation failed.");
        }
    } catch (e) {
        toast('danger', `Cannot send: ${e.message}`);
        return;
    }

    // Check balance for fee
    try {
        const nativeBalanceStr = await execute_balance_of('currency', selectedAccount.vk);
        const nativeBalance = parseFloat(nativeBalanceStr);
        const stampRate = await getStampRate();
        if (isNaN(nativeBalance) || !stampRate || (stampsRequired / stampRate) > nativeBalance) {
             toast('danger', `Insufficient XIAN for fee (${(stampsRequired / stampRate).toFixed(4)} Xian needed).`);
             return;
        }
    } catch (e) {
         toast('danger', `Error checking fee balance: ${e.message}`);
         return;
    }


    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        // 1. Encrypt the message
        const encryptedMsgHex = encrypt_nacl_box_seal(messageText, recipientVk);

        // 2. Prepare Transaction
        let transaction = {
            payload: {
                // chain_id, nonce, sender added by signTransaction
                contract: "con_msg_main", // TODO: Verify contract name
                function: "save_msg",
                kwargs: {
                    msg: encryptedMsgHex,
                    recipient: recipientVk
                },
                stamps_supplied: stampsRequired
            },
            metadata: { signature: "" }
        };

        // 3. Sign Transaction
        const signedTx = await signTransaction(transaction, unencryptedMnemonic, selectedAccount.index);

        // 4. Broadcast Transaction
        const response = await broadcastTransaction(signedTx);

        // 5. Handle Response
        if (response.error === 'timeout') {
             toast('warning', 'Broadcast timed out. Message might have been sent.');
             // Assume sent locally for now, history will show timeout
              const timestamp = new Date().toISOString();
              const localMessage = { sender: selectedAccount.vk, recipient: recipientVk, message: messageText, timestamp: timestamp };
              await saveMessageLocally(selectedAccount.vk, recipientVk, localMessage);
              prependToTransactionHistory("TIMEOUT", "con_msg_main", "save_msg", { recipient: recipientVk }, 'pending', timestamp); // Add to history
              // Reload UI optimistically
              await loadMessengerData(); // Reload all data
              switchChat(recipientVk); // Switch back to the chat
              messageInput.value = ''; // Clear input

        } else if (response && response.result && response.result.hash) {
            const hash = response.result.hash;
            const timestamp = new Date().toISOString(); // Use current time as approx. timestamp

            if (response.result.code !== 0) {
                // Tx failed on chain
                toast('danger', `Error sending message: ${response.result.log || 'Unknown reason'}`);
                 prependToTransactionHistory(hash, "con_msg_main", "save_msg", { recipient: recipientVk }, 'error', timestamp);
            } else {
                // Tx likely succeeded on chain (will be confirmed by history updater)
                toast('success', 'Message sent successfully!');
                // Save locally immediately for UI update
                 const localMessage = { sender: selectedAccount.vk, recipient: recipientVk, message: messageText, timestamp: timestamp };
                 await saveMessageLocally(selectedAccount.vk, recipientVk, localMessage);
                 prependToTransactionHistory(hash, "con_msg_main", "save_msg", { recipient: recipientVk }, 'pending', timestamp); // Add to history

                 // Reload UI
                 await loadMessengerData(); // Reload all data
                 switchChat(recipientVk); // Switch back to the chat
                 messageInput.value = ''; // Clear input
            }
        } else {
             throw new Error('Unexpected response from network.');
        }

    } catch (error) {
        console.error("Error sending message:", error);
        toast('danger', `Failed to send message: ${error.message}`);
    } finally {
        sendButton.disabled = false;
        sendButton.innerHTML = 'Send'; // Restore button text
    }
}


// --- Data Loading and Rendering ---

async function loadMessengerData() {
     if (locked || !unencryptedMnemonic) {
          console.log("Wallet locked, cannot load messenger data.");
          document.querySelector('.messenger-inbox-body').innerHTML = '<div class="text-center text-muted p-3">Unlock wallet to view messages.</div>';
          document.querySelector('.messenger-chat-wrapper').style.display = 'none'; // Hide chat area
          return;
     }
      document.querySelector('.messenger-chat-wrapper').style.display = 'flex'; // Show chat area if unlocked


     const inboxBody = document.querySelector('.messenger-inbox-body');
     inboxBody.innerHTML = '<div class="text-center p-3"><i class="fas fa-spinner fa-spin"></i> Loading messages...</div>';

     allThreads = {}; // Reset global thread state
     const myVKs = new Set(accounts.map(a => a.vk)); // Set of user's public keys
     const vkToIndexMap = new Map(accounts.map(a => [a.vk, a.index])); // Map VK to index for decryption
     const selectedVk = getSelectedVK();

     try {
        // 1. Load locally sent messages for the selected account
        const localSentData = await loadLocalMessages(selectedVk);
        for (const recipientVk in localSentData) {
            if (!allThreads[recipientVk]) {
                 allThreads[recipientVk] = { otherAddress: recipientVk, lastMessage: null, thread: [] };
            }
            localSentData[recipientVk].forEach(msg => {
                 // Add flag indicating it's a locally stored sent message
                 msg.isLocalSent = true;
                 allThreads[recipientVk].thread.push(msg);
            });
        }

        // 2. Fetch messages from the blockchain (using getVariable as GraphQL might be complex)
        // This part is inefficient and needs optimization or backend changes for production
         console.warn("Fetching all messages from chain. This can be slow.");
         const counter = await getVariable('con_msg_main', 'counter'); // Assuming 'counter' exists
         if (counter === null) throw new Error("Could not read message counter from contract.");

         const messageCount = parseInt(counter);
          if (isNaN(messageCount)) throw new Error("Invalid message counter value.");

         const messagePromises = [];
          // Fetch messages individually - VERY INEFFICIENT!
          for (let i = 1; i <= messageCount; i++) { // Fetch latest first? Or process oldest first? Let's do oldest first.
              messagePromises.push(
                  getVariable('con_msg_main', 'messages:' + i).then(messageJson => {
                       if (!messageJson) return null; // Skip if message fetch failed

                       try {
                            const message = JSON.parse(messageJson);
                            // Basic validation of message structure
                             if (!message || typeof message !== 'object' || !message.sender || !message.receiver || !message.message || !message.timestamp) {
                                 console.warn(`Skipping invalid message structure at index ${i}:`, messageJson);
                                 return null;
                             }
                             return { index: i, data: message }; // Return message with its index
                       } catch (parseError) {
                            console.warn(`Failed to parse message at index ${i}:`, parseError, messageJson);
                            return null; // Skip unparseable messages
                       }
                  })
              );
          }

          const fetchedMessages = (await Promise.all(messagePromises)).filter(Boolean); // Wait for all fetches and remove nulls


         // 3. Process Fetched Blockchain Messages
         fetchedMessages.forEach(({ index, data: message }) => {
             const sender = message.sender;
             const recipient = message.receiver;
             let otherPartyVk = null;
             let isReceived = false;
             let receivingAccountIndex = -1;

             // Determine if this message involves any of the user's accounts
             if (myVKs.has(recipient)) {
                 isReceived = true;
                 otherPartyVk = sender;
                 receivingAccountIndex = vkToIndexMap.get(recipient);
             } else if (myVKs.has(sender)) {
                  // This is a message sent by one of the user's accounts (potentially not the selected one)
                  // We only care about it if the *other* party is the one we're building the thread for.
                  otherPartyVk = recipient;
                  // We don't decrypt sent messages here, rely on local storage copy.
             } else {
                  return; // Message doesn't involve the user
             }

             // Initialize thread if needed
             if (!allThreads[otherPartyVk]) {
                  allThreads[otherPartyVk] = { otherAddress: otherPartyVk, lastMessage: null, thread: [] };
             }

             // Process timestamp (handle potential __time__ format)
              let timestamp;
              try {
                 if (message.timestamp && message.timestamp.__time__) {
                      const [y, M, d, h, m, s] = message.timestamp.__time__;
                      timestamp = new Date(Date.UTC(y, M - 1, d, h, m, s)).toISOString();
                 } else if (typeof message.timestamp === 'string') {
                      timestamp = new Date(message.timestamp).toISOString(); // Assume ISO string
                 } else {
                      timestamp = new Date(0).toISOString(); // Fallback
                 }
              } catch { timestamp = new Date(0).toISOString(); }


             let decryptedMessageText = "[Encrypted Message]"; // Default
             if (isReceived) {
                  // Attempt decryption using the correct account index
                  const decrypted = decrypt_nacl_box_seal_open(message.message, unencryptedMnemonic, receivingAccountIndex);
                  if (decrypted !== null) {
                       decryptedMessageText = decrypted;
                  } else {
                       decryptedMessageText = "[Decryption Failed]";
                  }
                  // Add received message to the thread
                  allThreads[otherPartyVk].thread.push({
                       sender: sender,
                       recipient: recipient,
                       message: decryptedMessageText,
                       timestamp: timestamp,
                       isReceived: true // Flag indicating it was received on-chain
                  });

             } else {
                  // This is a message sent by one of the user's accounts.
                   // Check if we already have a local copy for the *selected* account sending to this other party.
                   const selectedVk = getSelectedVK();
                   if (sender === selectedVk) {
                        const thread = allThreads[otherPartyVk].thread;
                         // Avoid adding duplicates if local copy already exists with same timestamp (or close enough)
                         const exists = thread.some(m => m.isLocalSent && Math.abs(new Date(m.timestamp) - new Date(timestamp)) < 5000); // 5 sec tolerance
                         if (!exists) {
                             // If no local copy found (e.g., sent from another device/session), add a placeholder.
                             // We can't decrypt sent messages without the recipient's private key.
                             thread.push({
                                 sender: sender,
                                 recipient: recipient,
                                 message: "[Sent Message - Content Unavailable]",
                                 timestamp: timestamp,
                                 isSentByOtherAccount: false // Sent by selected, but no local copy
                             });
                         }
                   } else {
                       // Sent by *another* of the user's accounts. Add placeholder.
                        allThreads[otherPartyVk].thread.push({
                            sender: sender,
                            recipient: recipient,
                            message: `[Sent by Account ${sender.substring(0,4)}...]`,
                            timestamp: timestamp,
                            isSentByOtherAccount: true // Flag it
                        });
                   }
             }
         });

        // 4. Sort Threads and Determine Last Message
        for (const vk in allThreads) {
             allThreads[vk].thread.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
             const lastMsgObj = allThreads[vk].thread[allThreads[vk].thread.length - 1];
             allThreads[vk].lastMessage = lastMsgObj ? lastMsgObj.message : null;
             allThreads[vk].lastTimestamp = lastMsgObj ? new Date(lastMsgObj.timestamp) : new Date(0);
        }

        // 5. Render Inbox
        renderInbox();

     } catch (error) {
          console.error("Error loading messenger data:", error);
          inboxBody.innerHTML = `<div class="alert alert-danger">Failed to load messages: ${error.message}</div>`;
          toast('danger', `Failed to load messages: ${error.message}`);
     }
}

function renderInbox() {
    const inboxBody = document.querySelector('.messenger-inbox-body');
    if (!inboxBody) return;
    inboxBody.innerHTML = ''; // Clear loading/previous

    // Convert threads object to array and sort by last message timestamp (most recent first)
    const sortedThreads = Object.values(allThreads).sort((a, b) => b.lastTimestamp - a.lastTimestamp);

    if (sortedThreads.length === 0) {
        inboxBody.innerHTML = '<div class="text-center text-muted p-3">No chats found. Start a new one!</div>';
        return;
    }

    sortedThreads.forEach(threadData => {
         renderInboxItem(threadData.otherAddress, threadData.lastMessage, threadData.lastTimestamp);
    });

     // Automatically select the most recent chat if none is selected or current selection is invalid
     const currentChatVk = document.getElementById('address_chat')?.innerText;
      if (!currentChatVk || !allThreads[currentChatVk]) {
         if (sortedThreads.length > 0) {
              switchChat(sortedThreads[0].otherAddress);
         } else {
             // Hide chat window if absolutely no threads exist
              document.querySelector('.messenger-chat').style.display = 'none';
         }
      } else {
          // Re-render the currently selected chat to ensure it's up-to-date
           switchChat(currentChatVk);
      }
}

function renderInboxItem(otherPartyVk, lastMessage, lastTimestamp, addClickListener = true) {
    const inboxBody = document.querySelector('.messenger-inbox-body');
    const selectedVk = getSelectedVK(); // Get currently selected account VK

    const inboxItem = document.createElement('div');
    inboxItem.className = 'messenger-inbox-item';
    inboxItem.dataset.chat = otherPartyVk; // Store VK for switching

    const contentDiv = document.createElement('div');
    contentDiv.className = 'messenger-inbox-item-content';

    const addressH3 = document.createElement('h3');
    // Display truncated VK, add tooltip for full VK
    addressH3.textContent = `${otherPartyVk.substring(0, 6)}...${otherPartyVk.substring(otherPartyVk.length - 4)}`;
    addressH3.title = otherPartyVk; // Show full address on hover
    contentDiv.appendChild(addressH3);

    const lastMsgP = document.createElement('p');
    sanitizeHTML(lastMessage || 'No messages yet').then(sanitized => lastMsgP.innerHTML = sanitized);
    contentDiv.appendChild(lastMsgP);

     // Add relative timestamp
     const timeAgo = formatTimeAgo(lastTimestamp);
     const timeSpan = document.createElement('small');
     timeSpan.className = 'text-muted d-block mt-1';
     timeSpan.textContent = timeAgo;
     contentDiv.appendChild(timeSpan);


    inboxItem.appendChild(contentDiv);

    // Highlight if it's the currently selected chat partner
    const currentChatPartner = document.getElementById('address_chat')?.innerText;
    if (otherPartyVk === currentChatPartner) {
        inboxItem.classList.add('messenger-inbox-item-active');
    }

    if (addClickListener) {
        inboxItem.addEventListener('click', () => switchChat(otherPartyVk));
    }

    inboxBody.appendChild(inboxItem); // Append to the container
}

// Helper to format time difference
function formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return `Yesterday`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return past.toLocaleDateString(); // Older than a week, show date
}


// --- Initial Load ---
loadMessengerData(); // Load data when the messenger page is displayed