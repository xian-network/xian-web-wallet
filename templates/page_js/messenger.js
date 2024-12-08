if (typeof messages === 'undefined') {
    var messages = {};
}

document.querySelector('.messenger-inbox-new').addEventListener('click', function () {
    addTempChat();
});

document.querySelector('#message_input').addEventListener('input', function (event) {
    let message_input = document.getElementById('message_input').value;
    let message_receiver = document.getElementById('address_chat').innerText;
    if (message_input === '') {
        document.getElementById('estimation-result').style.display = 'none';
        document.getElementById('estimation-loading').style.display = 'none';


    }
    else {
        estimateSendStamps(message_receiver, message_input);
    }
});

document.querySelector('#message_input').addEventListener('keyup', function (event) {
    if (event.keyCode === 13) {
        sendMessage();
    }
});

document.querySelector('#send_message').addEventListener('click', function () {
    if (document.getElementById('send_message').disabled) return;
    sendMessage();
});

function stringToUint8Array(str) {
    return new TextEncoder().encode(str);
}

function uint8ArrayToString(uint8Array) {
    return new TextDecoder().decode(uint8Array);
}

function base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function hexToUint8Array(hex) {
    if (typeof hex !== 'string') {
        throw new Error("Input must be a string");
    }
    if (hex.length % 2 !== 0) {
        throw new Error("Invalid hex length");
    }
    const len = hex.length / 2;
    const uint8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        uint8[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return uint8;
}

function fromHexString(hexString) {
    return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

function toHexString(uint8Array) {
    return Array.from(uint8Array)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}


function uint8ArrayToHex(uint8Array) {
    return Array.from(uint8Array)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

function uint8ArrayToBase64(uint8Array) {
    let binaryString = "";
    for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binaryString);
}

function convertEd25519ToCurve25519PrivateKey(ed25519PrivateKeyHex) {
    const ed25519Seed = sodium.from_hex(ed25519PrivateKeyHex);
    const ed25519FullPrivateKey = sodium.crypto_sign_seed_keypair(ed25519Seed).privateKey;
    return sodium.crypto_sign_ed25519_sk_to_curve25519(ed25519FullPrivateKey);
}

function convertEd25519ToCurve25519PublicKey(ed25519PublicKey) {
    // Use libsodium.js to perform the conversion
    return sodium.crypto_sign_ed25519_pk_to_curve25519(ed25519PublicKey);
}
function saveMessageLocally(publicKey, recipient, message) {
    const allMessages = JSON.parse(localStorage.getItem('sentMessages')) || {};

    // Ensure storage for the current RPC and publicKey
    if (!allMessages[RPC]) {
        allMessages[RPC] = {};
    }
    if (!allMessages[RPC][publicKey]) {
        allMessages[RPC][publicKey] = {};
    }

    // Ensure storage for the recipient
    if (!allMessages[RPC][publicKey][recipient]) {
        allMessages[RPC][publicKey][recipient] = [];
    }

    // Save the message
    allMessages[RPC][publicKey][recipient].push(message);

    // Update local storage
    localStorage.setItem('sentMessages', JSON.stringify(allMessages));
}
function encrypt_nacl_box(cleartext_msg, receiver_public_key_hex) {
    // Convert the receiver's Ed25519 public key to Curve25519
    const receiverEd25519PublicKey = fromHexString(receiver_public_key_hex);
    const receiverCurve25519PublicKey = convertEd25519ToCurve25519PublicKey(receiverEd25519PublicKey);

    // Use a sealed box for encryption
    const encryptedMessage = sodium.crypto_box_seal(
        new TextEncoder().encode(cleartext_msg),
        receiverCurve25519PublicKey
    );

    return toHexString(encryptedMessage);
}


function decrypt_nacl_box(receiver_private_key_hex, encrypted_msg_hex) {
    // Convert Ed25519 private key (seed) to Curve25519 private key
    const ed25519Seed = sodium.from_hex(receiver_private_key_hex);

    // Derive the full Ed25519 private key from the seed
    const ed25519FullPrivateKey = sodium.crypto_sign_seed_keypair(ed25519Seed).privateKey;

    // Convert to Curve25519 private key
    const curve25519PrivateKey = sodium.crypto_sign_ed25519_sk_to_curve25519(ed25519FullPrivateKey);

    // Derive the Curve25519 public key from the Ed25519 public key
    const curve25519PublicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(
        ed25519FullPrivateKey.slice(32) // Ed25519 public key is the last 32 bytes of the full private key
    );

    // Convert the encrypted message from hex to Uint8Array
    const encryptedMessage = sodium.from_hex(encrypted_msg_hex);

    // Attempt decryption
    const decryptedMessage = sodium.crypto_box_seal_open(
        encryptedMessage,
        curve25519PublicKey,
        curve25519PrivateKey
    );

    if (!decryptedMessage) {
        throw new Error("Decryption failed!");
    }

    return sodium.to_string(decryptedMessage);
}




function addTempChat() {
    let address_chat_ = prompt("Enter the address of the user you want to chat with");
    if (!address_chat_) {
        address_chat_;
    }
    // check if address is valid hex 64 characters
    if (address_chat_.length !== 64) {
        alert("Invalid address");
        return;
    }

    let inbox_items_container = document.querySelector('.messenger-inbox-body');
    let inbox_item = document.createElement('div');
    inbox_item.classList.add('messenger-inbox-item');
    inbox_item.dataset.chat = address_chat_;
    let inbox_item_content = document.createElement('div');
    inbox_item_content.classList.add('messenger-inbox-item-content');
    let inbox_item_address = document.createElement('h3');
    inbox_item_address.innerText = address_chat_;
    inbox_item_content.appendChild(inbox_item_address);
    let inbox_item_last_message = document.createElement('p');
    inbox_item_last_message.innerText = 'No messages';
    inbox_item_content.appendChild(inbox_item_last_message);
    inbox_item.appendChild(inbox_item_content);
    inbox_items_container.prepend(inbox_item);

    inbox_item.addEventListener('click', function () {
        switchChat(address_chat_);
    });
    switchChat(address_chat_);
}

function switchChat(address_chat) {
    // Highlight the selected chat in the inbox
    const inbox_items = document.querySelectorAll('.messenger-inbox-item');

    document.querySelector('.messenger-chat').style.display = 'flex';
    inbox_items.forEach(inbox_item => {
        if (inbox_item.dataset.chat === address_chat) {
            inbox_item.classList.add('messenger-inbox-item-active');
        } else {
            inbox_item.classList.remove('messenger-inbox-item-active');
        }
    });

    // Update the chat header with the selected address
    const address_chat_element = document.getElementById('address_chat');
    address_chat_element.innerText = address_chat;

    // Clear the message input field
    document.querySelector('#message_input').value = '';

    // Clear and render the chat body with messages from the selected thread
    const message_container = document.querySelector('.messenger-chat-body');
    message_container.innerHTML = ''; // Clear existing messages

    // Find messages for the selected contact
    const chatThread = messages[address_chat]?.thread || [];
    chatThread.forEach(message => {
        const message_item = document.createElement('div');
        const message_content = document.createElement('div');
        const message_text = document.createElement('p');
        const message_timestamp = document.createElement('small');

        // Determine if the message was sent or received
        if (message.sender === publicKey) {
            message_item.classList.add('messenger-chat-item-me');
        } else {
            message_item.classList.add('messenger-chat-item-you');
        }

        message_content.classList.add('messenger-chat-item-content');
        sanitizeHTML(message.message).then((sanitized) => {
            message_text.innerHTML = sanitized;
        });
        message_timestamp.innerText = new Date(message.timestamp).toLocaleString();
        if (message.sender === publicKey) {
            message_timestamp.innerText += ' (You - Locally Stored Message)';
        }
        if (message.sender !== publicKey) {
            message_timestamp.innerText += ' (Partner - Encrypted Message)';
        }

        // Append message content to the item
        message_content.appendChild(message_text);
        message_content.appendChild(message_timestamp);
        message_item.appendChild(message_content);

        // Append the message item to the chat body
        message_container.appendChild(message_item);
    });
    setTimeout(() => {
        let message_scroll = document.querySelector('.messenger-chat-body');
        message_scroll.scrollTop = message_scroll.scrollHeight;
    
    }, 100);

}



async function estimateSendStamps(message_receiver, message_input) {
    let estimation_loading = document.getElementById('estimation-loading');
    let estimation_finished = document.getElementById('estimation-result');
    let send_btn = document.getElementById('send_message');
    estimation_loading.style.display = 'inline-block';
    estimation_finished.style.display = 'none';
    send_btn.disabled = true;
    if (message_receiver === '' || message_input === '') return;

    let transaction = {
        payload: {
            chain_id: CHAIN_ID,
            contract: "con_msg_main",
            function: "save_msg",
            kwargs: {
                msg: encrypt_nacl_box(message_input, message_receiver),
                recipient: message_receiver
            },
            stamps_supplied: 100000
        },
        metadata: {
            signature: "",
        }
    };

    try {
        let signed_tx = await signTransaction(transaction, unencryptedPrivateKey);
        let stamps = await estimateStamps(signed_tx);
        stamps = stamps["stamps"];
        let stamp_rate = await getStampRate();
        send_btn.disabled = false;
        estimation_loading.style.display = 'none';
        estimation_finished.style.display = 'inline-block';
        if (stamps === null) {
            document.getElementById('tokenFee').innerHTML = 0;
            return;
        }
        stamps = stamps;
        document.getElementById('tokenFeeXian').innerHTML = stamps / stamp_rate;
        document.getElementById('tokenFee').innerHTML = stamps;
    } catch (error) {
        console.error("Error estimating stamps:", error);
        document.getElementById('tokenFee').innerHTML = "Error";
    }
}
function sendMessage() {
    const message_input = document.getElementById('message_input').value;
    const message_receiver = document.getElementById('address_chat').innerText;

    if (message_input === '') {
        toast("danger", "Message cannot be empty");
        return;
    }

    const timestamp = new Date().toISOString();
    const plaintextMessage = {
        sender: publicKey,
        recipient: message_receiver,
        message: message_input,
        timestamp: timestamp
    };

    let transaction = {
        payload: {
            chain_id: CHAIN_ID,
            contract: "con_msg_main",
            function: "save_msg",
            kwargs: {
                msg: "",
                recipient: message_receiver
            },
            stamps_supplied: parseInt(document.getElementById('tokenFee').innerText)
        },
        metadata: {
            signature: "",
        }
    };

    // Encrypt and send the message
    Promise.resolve()
        .then(() => encrypt_nacl_box(message_input, message_receiver))
        .then((encryptedMessage) => {
            transaction.payload.kwargs.msg = encryptedMessage;
            return signTransaction(transaction, unencryptedPrivateKey);
        })
        .then((signed_tx) => broadcastTransaction([signed_tx]))
        .then((response) => {
            if (response.result.code === 0) {
                toast("success", "Message sent successfully");
                document.getElementById('message_input').value = ''; // Clear the input field
                // Save the plaintext message locally
                saveMessageLocally(publicKey, message_receiver, plaintextMessage);
                // Reload the chat to reflect the new message
                getAllMessagesUsingGraphQL().then(() => {
                    switchChat(message_receiver); // Focus on the current chat
                });
            } else {
                toast("danger", "Error sending message");
            }
        })
        .catch((error) => {
            console.error("Error sending message:", error);
            toast("danger", "An unexpected error occurred");
        });
}

function loadLocalMessages(publicKey) {
    const allMessages = JSON.parse(localStorage.getItem('sentMessages')) || {};
    return allMessages[RPC]?.[publicKey] || {};
}

async function getAllMessagesUsingGraphQL() {
    messages = {};
    document.querySelector('.messenger-chat-body').innerHTML = ''; // Clear existing messages
    try {
        const localMessages = loadLocalMessages(publicKey);

        // Populate local messages first
        for (const recipient in localMessages) {
            if (!messages[recipient]) {
                messages[recipient] = {
                    otherAddress: recipient,
                    lastMessage: null,
                    thread: []
                };
            }

            messages[recipient].thread.push(...localMessages[recipient]);
            messages[recipient].lastMessage =
                localMessages[recipient][localMessages[recipient].length - 1]?.message || null;
        }

        // Fetch messages from the blockchain
        const counter = await getVariable('con_msg_main', 'counter');
        const messagePromises = [];
        for (let i = 1; i <= counter; i++) {
            messagePromises.push(
                getVariable('con_msg_main', 'messages:' + i).then((message) => {
                    message = JSON.parse(message);
                    if (message.sender !== publicKey && message.receiver !== publicKey) {
                        return; // Ignore messages not involving the user
                    }

                    const otherAddress = message.sender === publicKey ? message.receiver : message.sender;
                    if (!messages[otherAddress]) {
                        messages[otherAddress] = {
                            otherAddress: otherAddress,
                            lastMessage: null,
                            thread: []
                        };
                    }

                    try {
                        const [year, month, day, hour, minute, second] = message.timestamp["__time__"];
                        const timestamp = new Date(Date.UTC(year, month - 1, day, hour, minute, second)).toISOString();

                        if (message.sender === publicKey) {
                            // Check if the local copy exists
                            const localMessage = localMessages[otherAddress]?.find(
                                m => m.timestamp === timestamp
                            );

                            if (localMessage) {
                                // Add the local message
                                messages[otherAddress].thread.push({
                                    sender: message.sender,
                                    recipient: message.receiver,
                                    message: localMessage.message,
                                    timestamp: timestamp
                                });
                                messages[otherAddress].lastMessage = localMessage.message;
                            } else {
                                console.warn("Sent message not found in local storage:", message);
                            }
                        } else {
                            // Received messages, decrypt them
                            const decryptedMessage = decrypt_nacl_box(
                                toHexString(unencryptedPrivateKey),
                                message.message
                            );
                            messages[otherAddress].thread.push({
                                sender: message.sender,
                                recipient: message.receiver,
                                message: decryptedMessage,
                                timestamp: timestamp
                            });
                        }
                    } catch (error) {
                        console.error("Decryption failed for message:", message, error);
                        messages[otherAddress].thread.push({
                            sender: message.sender,
                            recipient: message.receiver,
                            message: "[Message Decryption Failed]",
                            timestamp: new Date().toISOString() // Fallback timestamp
                        });
                    }
                })
            );
        }

        await Promise.all(messagePromises);

        // Sort threads by timestamp
        const groupedMessages = Object.values(messages);
        groupedMessages.forEach(group => {
            group.thread.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });

        // Set last message for each thread
        groupedMessages.forEach(group => {
            group.lastMessage = group.thread[group.thread.length - 1]?.message || null;
        });

        renderInbox(groupedMessages);
    } catch (error) {
        console.error("Error fetching messages:", error);
    }
}


function renderInbox(groupedMessages) {
    const inbox_body = document.querySelector('.messenger-inbox-body');
    inbox_body.innerHTML = ''; // Clear existing inbox items

    // Reverse the order of messages to show the most recent first
    groupedMessages.reverse();

    groupedMessages.forEach(group => {
        // Create the inbox item container
        const inbox_item = document.createElement('div');
        inbox_item.classList.add('messenger-inbox-item');
        inbox_item.dataset.chat = group.otherAddress; // Store the chat address for switching

        // Create the content container
        const inbox_item_content = document.createElement('div');
        inbox_item_content.classList.add('messenger-inbox-item-content');

        // Add the chat address (otherAddress)
        const inbox_item_address = document.createElement('h3');
        inbox_item_address.innerText = group.otherAddress;
        inbox_item_content.appendChild(inbox_item_address);

        // Add the last message preview
        const inbox_item_last_message = document.createElement('p');
        if (group.lastMessage) {
            sanitizeHTML(group.lastMessage).then((sanitized) => {
                inbox_item_last_message.innerHTML = sanitized;
            });
        }
        else {
            inbox_item_last_message.innerText = 'No messages';
        }
        inbox_item_content.appendChild(inbox_item_last_message);

        // Append content to the inbox item
        inbox_item.appendChild(inbox_item_content);

        // Append the inbox item to the inbox body
        inbox_body.appendChild(inbox_item);

        // Add click event listener to switch to the selected chat
        inbox_item.addEventListener('click', function () {
            switchChat(group.otherAddress);
        });
    });
}





getAllMessagesUsingGraphQL()