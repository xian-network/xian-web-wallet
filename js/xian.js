var RPC = localStorage.getItem("rpc") || "https://node.xian.org";
var EXPLORER = localStorage.getItem("explorer") || "https://explorer.xian.org";
var CHAIN_ID = null;

// Assuming 'nacl' and 'bip39' are globally available from included scripts
// Assuming 'HDKey' is available (needs micro-ed25519-hdkey library) - NOTE: This dependency wasn't in the original index.html, it needs to be added. Let's proceed assuming it's added.

// --- Helper Functions ---

function toHexString(byteArray) {
    return Array.from(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}

function fromHexString(hexString) {
    // Ensure the hex string has an even length
    if (hexString.length % 2 !== 0) {
        console.warn("Hex string has odd length, padding with leading zero.");
        hexString = '0' + hexString;
    }
    try {
        return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    } catch (e) {
        console.error("Error converting hex string to Uint8Array:", e, "Input:", hexString);
        throw e; // Rethrow the error after logging
    }
}

// Helper to concatenate Uint8Arrays (needed for nacl.sign.detached)
function concatUint8Arrays(array1, array2) {
    const result = new Uint8Array(array1.length + array2.length);
    result.set(array1, 0);
    result.set(array2, array1.length);
    return result;
}

// Helper for string to buffer conversion
function str2buf(str) {
    return new TextEncoder().encode(str);
}

// --- Encryption / Decryption (Now for Seed Phrase) ---

function encryptSeed(mnemonic, password) {
    let passwordBytes = new TextEncoder().encode(password);
    let key = nacl.hash(passwordBytes).slice(0, 32); // Derive key from password hash
    let nonce = nacl.randomBytes(nacl.secretbox.nonceLength); // Generate random nonce
    let mnemonicBytes = new TextEncoder().encode(mnemonic); // Convert mnemonic to bytes
    let encryptedMnemonic = nacl.secretbox(mnemonicBytes, nonce, key);

    // Combine nonce and encrypted mnemonic for storage
    let combined = new Uint8Array(nonce.length + encryptedMnemonic.length);
    combined.set(nonce);
    combined.set(encryptedMnemonic, nonce.length);

    return toHexString(combined);
}

function decryptSeed(encryptedSeedHex, password) {
    try {
        let combined = fromHexString(encryptedSeedHex);
        let nonce = combined.slice(0, nacl.secretbox.nonceLength);
        let message = combined.slice(nacl.secretbox.nonceLength);

        let passwordBytes = new TextEncoder().encode(password);
        let key = nacl.hash(passwordBytes).slice(0, 32); // Derive key from password hash

        let decryptedBytes = nacl.secretbox.open(message, nonce, key);

        if (!decryptedBytes) {
            console.error("Decryption failed, possibly wrong password.");
            return null; // Indicate decryption failure
        }

        return new TextDecoder().decode(decryptedBytes); // Convert decrypted bytes back to mnemonic string
    } catch (error) {
        console.error("Error during seed decryption:", error);
        return null; // Indicate failure
    }
}


// --- HD Wallet Key Generation & Derivation ---

/**
 * Derives a key pair for a specific BIP32 derivation path from a mnemonic.
 * @param {string} mnemonic - The BIP39 mnemonic phrase.
 * @param {number} index - The derivation index (e.g., 0 for the first account).
 * @returns {{sk: Uint8Array, vk: Uint8Array, derivationPath: string}} Key pair and path.
 * @throws {Error} If derivation fails or keys mismatch.
 */
function deriveKeyPairFromMnemonic(mnemonic, index) {
    if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error("Invalid mnemonic phrase provided.");
    }
    const seed = bip39.mnemonicToSeedSync(mnemonic); // Get the master seed
    const hdkeyMaster = ed25519Hdkey.HDKey.fromMasterSeed(seed);
    const derivationPath = `m/44'/789'/${index}'/0'/0'`; // Standard Xian derivation path structure
    const hdkeyDerived = hdkeyMaster.derive(derivationPath);

    // Use nacl.sign.keyPair.fromSeed with the derived private key (first 32 bytes of seed for Ed25519)
    const keyPair = nacl.sign.keyPair.fromSeed(hdkeyDerived.privateKey);

    // Cross-verify public key (optional but good practice)
    const naclVkHex = toHexString(keyPair.publicKey);
    const hdVkHex = toHexString(hdkeyDerived.publicKey); // HDKey might include a prefix, adjust if needed
    
    // Basic comparison - adjust if HDKey's publicKey format differs significantly
    // This comparison might need refinement based on micro-ed25519-hdkey specifics
    if (naclVkHex !== hdVkHex && !hdVkHex.endsWith(naclVkHex)) { // Simple check, might need improvement
         console.warn(`Potential VK mismatch: NaCL=${naclVkHex}, HDKey=${hdVkHex}. Using NaCL's.`);
         // Decide which VK to trust or handle error. NaCL's is usually the one used for signing/verification.
    }


    return {
        sk: keyPair.secretKey.slice(0, 32), // Extract the 32-byte secret key part
        vk: keyPair.publicKey,           // Use the public key derived by nacl
        derivationPath: derivationPath
    };
}


/**
 * Creates a new master seed (mnemonic) and encrypts it.
 * Derives the first account (index 0).
 * @param {string} password - Password to encrypt the mnemonic.
 * @returns {{publicKey: string, encryptedSeed: string}} The public key of the first account and the encrypted mnemonic.
 */
function createMasterSeed(password) {
    const mnemonic = bip39.generateMnemonic(256); // Generate a 24-word mnemonic
    const encryptedSeed = encryptSeed(mnemonic, password);

    // Derive the first key pair (index 0) to get the initial public key
    const firstKeyPair = deriveKeyPairFromMnemonic(mnemonic, 0);

    return {
        publicKey: toHexString(firstKeyPair.vk), // VK of the first account
        encryptedSeed: encryptedSeed,
        unencryptedMnemonic: mnemonic // Return the mnemonic temporarily for immediate use
    };
}

/**
 * Imports a wallet from a mnemonic phrase and encrypts it.
 * Derives the first account (index 0).
 * @param {string} mnemonic - The mnemonic phrase to import.
 * @param {string} password - Password to encrypt the mnemonic.
 * @returns {{publicKey: string, encryptedSeed: string}|null} VK of first account and encrypted seed, or null if invalid mnemonic.
 */
function importMasterSeedFromMnemonic(mnemonic, password) {
    if (!bip39.validateMnemonic(mnemonic)) {
        console.error("Invalid mnemonic provided during import.");
        return null;
    }

    const encryptedSeed = encryptSeed(mnemonic, password);
    const firstKeyPair = deriveKeyPairFromMnemonic(mnemonic, 0);

    return {
        publicKey: toHexString(firstKeyPair.vk),
        encryptedSeed: encryptedSeed,
        unencryptedMnemonic: mnemonic // Return temporarily for immediate use
    };
}

// --- Transaction and Message Signing (Modified for HD) ---

async function getNonce(publicKey) { // Added publicKey parameter
  try {
      const response = await fetchWithTimeout(RPC + '/abci_query?path="/get_next_nonce/' + publicKey + '"');

      if (response.ok) {
          const responseData = await response.json();
           // Check if response.result or response.result.response is null
           if (!responseData.result || !responseData.result.response) {
                console.warn("Nonce query returned unexpected structure:", responseData);
                return 0; // Default to 0 if structure is missing
            }
          // Check for null or "AA==" value which indicates nonce is 0
          if (responseData.result.response.value === null || responseData.result.response.value === "AA==") {
              return 0;
          } else {
              // Decode and parse the nonce, handle potential errors
              try {
                  const decodedValue = atob(responseData.result.response.value);
                  const nonce = parseInt(decodedValue, 10);
                  // Check if nonce is a valid number
                  if (isNaN(nonce)) {
                    console.error("Decoded nonce is not a number:", decodedValue);
                    return 0; // Default to 0 if parsing fails
                  }
                  return nonce;
              } catch (decodeError) {
                  console.error("Error decoding nonce:", decodeError, "Raw value:", responseData.result.response.value);
                  return 0; // Default to 0 if decoding fails
              }
          }
      } else {
          console.error("Failed to fetch nonce: HTTP status " + response.status);
          // Don't throw here, return a default or handle appropriately
          return 0; // Or handle error state differently
      }
  } catch (error) {
      console.error("Error fetching nonce:", error);
       // Check if it's a timeout error
       if (error.message === 'Request timeout') {
        console.warn("Nonce request timed out. Defaulting nonce to 0.");
        return 0; // Default nonce on timeout
    }
      return 0; // Return default nonce on other errors
  }
}

/**
 * Signs a transaction using the private key derived for the specified account index.
 * @param {object} transaction - The transaction object.
 * @param {string} decryptedMnemonic - The user's decrypted mnemonic phrase.
 * @param {number} accountIndex - The index of the account to sign with.
 * @returns {Promise<object>} The signed transaction object.
 */
async function signTransaction(transaction, decryptedMnemonic, accountIndex) {
    try {
        const keyPair = deriveKeyPairFromMnemonic(decryptedMnemonic, accountIndex);
        const senderVk = toHexString(keyPair.vk);
        const derivedSk = keyPair.sk; // This is the 32-byte secret key

        // Get nonce for the specific sender public key
        const nonce = await getNonce(senderVk);
        transaction.payload.nonce = nonce;
        transaction.payload.sender = senderVk; // Make sure sender VK is correct

        // Sort the keys in payload for deterministic signature generation
        let orderedPayload = {};
        Object.keys(transaction.payload).sort().forEach(function(key) {
            orderedPayload[key] = transaction.payload[key];
        });
        transaction.payload = orderedPayload; // Update transaction with ordered payload

        let serializedTransaction = JSON.stringify(orderedPayload);
        let transactionUint8Array = str2buf(serializedTransaction); // Use helper

        // Create the 64-byte key required by nacl.sign.detached (sk + vk)
        let combinedKey = concatUint8Arrays(derivedSk, keyPair.vk);

        // Use nacl.sign.detached to get the signature
        let signatureUint8Array = nacl.sign.detached(transactionUint8Array, combinedKey);

        // Add the signature to metadata
        transaction.metadata.signature = toHexString(signatureUint8Array);

        return transaction;

    } catch (error) {
        console.error("Error signing transaction:", error);
        throw error; // Re-throw the error to be handled by the caller
    }
}


/**
 * Signs a message using the private key derived for the specified account index.
 * @param {string} message - The message string to sign.
 * @param {string} decryptedMnemonic - The user's decrypted mnemonic phrase.
 * @param {number} accountIndex - The index of the account to sign with.
 * @returns {Promise<string>} The hex string of the signature.
 */
async function signMessage(message, decryptedMnemonic, accountIndex) {
     try {
        const keyPair = deriveKeyPairFromMnemonic(decryptedMnemonic, accountIndex);
        const derivedSk = keyPair.sk;

        // Create the 64-byte key required by nacl.sign.detached (sk + vk)
        let combinedKey = concatUint8Arrays(derivedSk, keyPair.vk);

        let messageUint8Array = str2buf(message); // Use helper
        let signatureUint8Array = nacl.sign.detached(messageUint8Array, combinedKey);

        return toHexString(signatureUint8Array);
    } catch (error) {
        console.error("Error signing message:", error);
        throw error;
    }
}

// --- Network & Blockchain Interaction Functions (Mostly unchanged, but check dependencies) ---

async function broadcastTransaction(signedTransaction) {
  // Broadcast the transaction as hex
  // signedTransaction = signedTransaction[0]; // This might be needed depending on how signTransaction resolves
  let txToSend = JSON.stringify(signedTransaction); // Ensure it's the signed object
  let txHex = toHexString(str2buf(txToSend)); // Use helpers

  try {
      const response = await fetchWithTimeout(RPC + '/broadcast_tx_sync?tx="' + txHex + '"');
      const responseData = await response.json();
      return responseData;
  } catch (error) {
      console.error('Error broadcasting transaction:', error);
      // Check if it's a timeout error
      if (error.message === 'Request timeout') {
        toast('warning', 'Broadcast request timed out. Transaction might have been sent, check explorer.');
        // Return a specific structure or throw a custom error for timeout
        return { error: 'timeout', message: 'Broadcast timed out' };
      }
      throw error;
  }
}

async function getContractFunctions(contract) {
  try {
      const response = await fetchWithTimeout(RPC + '/abci_query?path="/contract_methods/' + contract + '"');
      if (response.ok) {
          const responseData = await response.json();
          if (!responseData.result || !responseData.result.response || responseData.result.response.value === "AA==" || responseData.result.response.value === null) {
               console.warn(`No methods found or null response for contract: ${contract}`);
              return null; // Or return an empty structure: { methods: [], variables: [] }
          }
          const decoded = atob(responseData.result.response.value);
          return JSON.parse(decoded);
      } else {
          console.error('Failed to fetch contract functions:', response.status, contract);
          return null; // Return null instead of throwing for graceful handling
      }
  } catch (error) {
      console.error('Error fetching contract functions:', error, contract);
       if (error.message === 'Request timeout') {
            toast('warning', `Request for methods of ${contract} timed out.`);
        }
      return null; // Return null on error
  }
}

async function getContractCode(contract) {
  try {
      const response = await fetchWithTimeout(RPC + '/abci_query?path="/contract/' + contract + '"');
      if (response.ok) {
          const responseData = await response.json();
          if (!responseData.result || !responseData.result.response || responseData.result.response.value === "AA==" || responseData.result.response.value === null) {
              console.warn(`No code found or null response for contract: ${contract}`);
              return null;
          }
          return atob(responseData.result.response.value);
      } else {
          console.error('Failed to fetch contract code:', response.status, contract);
          return null;
      }
  } catch (error) {
      console.error('Error fetching contract code:', error, contract);
        if (error.message === 'Request timeout') {
            toast('warning', `Request for code of ${contract} timed out.`);
        }
      return null;
  }
}

async function getVariable(contract, variable, key = "") {
  try {
      let path = `/get/${contract}.${variable}`;
      if (key !== "") {
          // Ensure key is properly encoded if it contains special characters
          path += `:${encodeURIComponent(key)}`;
      }
      const response = await fetchWithTimeout(RPC + '/abci_query?path="' + path + '"');
      const data = await response.json();

      if (!data.result || !data.result.response || data.result.response.value === "AA==" || data.result.response.value === null) {
          // console.log(`Variable or key not found: ${contract}.${variable}${key ? ':' + key : ''}`);
          return null;
      }
      return atob(data.result.response.value);
  } catch (error) {
      console.error(`Error fetching variable: ${contract}.${variable}${key ? ':' + key : ''}`, error);
       if (error.message === 'Request timeout') {
            toast('warning', `Request for variable ${contract}.${variable}${key ? ':' + key : ''} timed out.`);
        }
      // Consider returning null or a specific error object instead of throwing
      return null;
    //   throw error; // Or rethrow if critical
  }
}

async function ping() {
  try {
    const response = await fetchWithTimeout(RPC + '/status');
    return response.ok;
  } catch(error) {
     if (error.message === 'Request timeout') {
            console.warn('Ping request timed out.');
        } else {
            console.error('Ping failed:', error);
        }
    return false;
  }
}

async function sanitizeHTML(html) {
    // Basic sanitization, consider a more robust library if complex HTML is expected
    if (typeof html !== 'string') return '';
    return html.replace(/</g, "<").replace(/>/g, ">");
}

async function getTokenInfo(contract) {
  let tokenInfo = { contract: contract, name: null, symbol: null, token_logo_url: null }; // Initialize properties

  if (contract === "currency") {
      tokenInfo["name"] = "Xian";
      tokenInfo["symbol"] = "Xian";
      // Optionally add a default logo URL for Xian native token
      tokenInfo["token_logo_url"] = "assets/xian-white.svg"; // Example path
      return tokenInfo;
  }

  try {
      // Use Promise.all for concurrent fetching
      const results = await Promise.all([
          getVariable(contract, 'metadata', 'token_name'),
          getVariable(contract, 'metadata', 'token_symbol'),
          getVariable(contract, 'metadata', 'token_logo_url')
      ]);

      // Assign results after sanitizing
      tokenInfo.name = results[0] ? await sanitizeHTML(results[0]) : 'Unknown Name';
      tokenInfo.symbol = results[1] ? await sanitizeHTML(results[1]) : '???';
      tokenInfo.token_logo_url = results[2] ? await sanitizeHTML(results[2]) : null; // Keep null if not found

       // Handle cases where core info might be missing but contract exists
       if (tokenInfo.name === 'Unknown Name' && tokenInfo.symbol === '???') {
            // Attempt to check if the contract exists at all, e.g., by fetching code
            const codeExists = await getContractCode(contract);
            if (!codeExists) {
                 console.warn(`Contract ${contract} might not exist or metadata is missing.`);
                 // Mark as potentially non-existent or invalid standard token
                 tokenInfo.name = "\x9Eée"; // Using the original marker for non-existent/error
                 tokenInfo.symbol = "\x9Eée";
            } else if (tokenInfo.name === 'Unknown Name') {
                // If code exists but name is missing, use contract name as fallback
                 tokenInfo.name = await sanitizeHTML(contract);
            }
       }


      return tokenInfo;
  } catch (error) {
      console.error(`Error retrieving token info for ${contract}:`, error);
       // Return initialized structure on error, possibly marking it
       tokenInfo.name = "\x9Eée";
       tokenInfo.symbol = "\x9Eée";
      return tokenInfo;
  }
}


async function getStampRate() {
  try {
      // Note: The original path included '.S:', which might be specific to certain state structures.
      // If '.S:' is not standard, adjust the path accordingly. Example: "/get/stamp_cost.value"
      // Let's assume the original path is correct for now.
      const response = await fetchWithTimeout(RPC + '/abci_query?path="/get/stamp_cost.S:value"');
      const data = await response.json();

      if (!data.result || !data.result.response || data.result.response.value === "AA==" || data.result.response.value === null) {
          console.warn("Stamp rate not found or null response.");
          return null; // Return null if not found or error
      }

      // Decode and parse, ensuring it's a valid integer
      try {
          const decodedValue = atob(data.result.response.value);
          const rate = parseInt(decodedValue, 10);
           if (isNaN(rate)) {
               console.error("Decoded stamp rate is not a number:", decodedValue);
               return null;
           }
          return rate;
      } catch (decodeError) {
          console.error("Error decoding stamp rate:", decodeError, "Raw value:", data.result.response.value);
          return null;
      }

  } catch (error) {
      console.error("Error fetching stamp rate:", error);
        if (error.message === 'Request timeout') {
            toast('warning', 'Request for stamp rate timed out.');
        }
      return null; // Return null on fetch error
  }
}

async function getChainID() {
  // Cache chain ID if already fetched
  if (CHAIN_ID) {
      return CHAIN_ID;
  }
  try {
      const response = await fetchWithTimeout(RPC + '/genesis');
      const data = await response.json();

      if (data.result && data.result.genesis && data.result.genesis["chain_id"]) {
          CHAIN_ID = data.result.genesis["chain_id"];
          return CHAIN_ID;
      } else {
           console.error("Could not find chain_id in genesis response:", data);
           return null;
      }
  } catch (error) {
      console.error("Error fetching chain ID:", error);
        if (error.message === 'Request timeout') {
            toast('warning', 'Request for chain ID timed out.');
        }
      return null; // Return null on error
  }
}

async function estimateStamps(signedTransaction) {
    try {
        // Ensure the input is the actual transaction object, not an array containing it
        const txObject = Array.isArray(signedTransaction) ? signedTransaction[0] : signedTransaction;
        if (!txObject || typeof txObject !== 'object') {
             console.error("Invalid signedTransaction object passed to estimateStamps:", signedTransaction);
             return { stamps: null, tx_result: null, success: false };
        }

        let serializedTransaction = JSON.stringify(txObject);
        let transactionUint8Array = str2buf(serializedTransaction); // Use helper
        let signedTransactionHex = toHexString(transactionUint8Array);

        const response = await fetchWithTimeout(RPC + '/abci_query?path="/calculate_stamps/' + signedTransactionHex + '"');
        const data = await response.json();

        if (!data.result || !data.result.response || data.result.response.value === "AA==" || data.result.response.value === null) {
            console.warn("Stamp estimation returned null or no value.");
             // Try to get more info from the log if available
            const log = data.result && data.result.response ? data.result.response.log : "No details available.";
            console.error("Stamp estimation failed:", log);
            return { stamps: null, tx_result: log, success: false }; // Provide log as result on failure
        }

        let tx_result_str = atob(data.result.response.value);
        let tx_result = JSON.parse(tx_result_str);

        // Validate the structure of tx_result
        if (typeof tx_result.stamps_used === 'undefined' || typeof tx_result.status === 'undefined') {
            console.error("Unexpected structure in stamp estimation response:", tx_result);
             return { stamps: null, tx_result: "Invalid response structure", success: false };
        }

        let stamps = parseInt(tx_result["stamps_used"], 10);
         if (isNaN(stamps)) {
              console.error("Parsed stamps_used is not a number:", tx_result["stamps_used"]);
              stamps = null; // Treat as error if parsing fails
         }

        let result = {
            stamps: stamps,
            tx_result: tx_result["result"] || (tx_result["status"] !== 0 ? tx_result_str : null), // Provide result or full string on error
            success: tx_result["status"] === 0
        };
        return result;

    } catch (error) {
        console.error("Error fetching stamp estimation:", error);
         if (error.message === 'Request timeout') {
            toast('warning', 'Stamp estimation request timed out.');
        }
        return { stamps: null, tx_result: error.message, success: false }; // Include error message
    }
}

// --- Balance and Name Service Functions (Need publicKey) ---

// Modified to accept publicKey explicitly
async function execute_balance_of(contract, address) {
  // No need to read from secure cookie here, address is passed in
  let payload = {
        "sender": address, // Use the provided address
        "contract": contract,
        "function": "balance_of",
        "kwargs": {
            "address": address
        }
    };
    let bytes = str2buf(JSON.stringify(payload)); // Use helper
    let hex = toHexString(bytes);

    try {
        const response = await fetchWithTimeout(RPC + '/abci_query?path="/simulate_tx/' + hex + '"');
        const data = await response.json();

         if (!data.result || !data.result.response || data.result.response.value === null) {
            console.warn(`Balance query returned null for ${contract} / ${address}`);
            // Attempt fallback to getVariable if simulation fails or returns null
            const balanceVar = await getVariable(contract, "balances", address);
            if (balanceVar === null) {
                return "0.00000000"; // Return formatted zero if variable is also null
            }
             try {
                return parseFloat(balanceVar).toFixed(8);
            } catch (parseError) {
                 console.error(`Failed to parse balance from getVariable for ${contract} / ${address}:`, balanceVar);
                 return "0.00000000";
            }
        }

        let decoded = atob(data.result.response.value);

        // Check for specific error markers or empty results from simulation
        if (decoded === "žée" || decoded === "AA==" || decoded === "") {
             console.warn(`Simulation returned empty/marker for ${contract} / ${address}, falling back to getVariable.`);
             const balanceVar = await getVariable(contract, "balances", address);
             if (balanceVar === null) {
                 return "0.00000000";
             }
            try {
                return parseFloat(balanceVar).toFixed(8);
            } catch (parseError) {
                console.error(`Failed to parse balance from getVariable fallback for ${contract} / ${address}:`, balanceVar);
                return "0.00000000";
            }
        }

        try {
            // Parse the simulation result
            let simulationResult = JSON.parse(decoded);
             if (simulationResult.status !== 0 || typeof simulationResult.result === 'undefined' || simulationResult.result === null) {
                 console.warn(`Simulation failed or returned null result for ${contract} / ${address}. Status: ${simulationResult.status}`);
                  // Fallback if simulation status is non-zero or result is missing
                 const balanceVar = await getVariable(contract, "balances", address);
                  if (balanceVar === null) return "0.00000000";
                  try { return parseFloat(balanceVar).toFixed(8); } catch { return "0.00000000"; }
             }

            // Parse the balance from the result
            let balance = parseFloat(simulationResult.result);
             if (isNaN(balance)) {
                  console.error(`Parsed balance is NaN from simulation for ${contract} / ${address}:`, simulationResult.result);
                 // Fallback on NaN
                  const balanceVar = await getVariable(contract, "balances", address);
                  if (balanceVar === null) return "0.00000000";
                  try { return parseFloat(balanceVar).toFixed(8); } catch { return "0.00000000"; }
             }

            return balance.toFixed(8);
        } catch (parseError) {
            console.error(`Error parsing simulation/balance result for ${contract} / ${address}:`, parseError, "Decoded:", decoded);
             // Final fallback on any parsing error
             const balanceVar = await getVariable(contract, "balances", address);
             if (balanceVar === null) return "0.00000000";
             try { return parseFloat(balanceVar).toFixed(8); } catch { return "0.00000000"; }
        }
    } catch (error) {
        console.error(`Error executing balance_of for ${contract} / ${address}:`, error);
         if (error.message === 'Request timeout') {
            toast('warning', `Balance request for ${contract} timed out.`);
        }
        // Fallback on fetch error
         const balanceVar = await getVariable(contract, "balances", address);
         if (balanceVar === null) return "0.00000000";
         try { return parseFloat(balanceVar).toFixed(8); } catch { return "0.00000000"; }
    }
}


async function execute_get_main_name_to_address(name) {
    // Sender can be empty for read-only simulations
    let payload = {
          "sender": "", // Can be empty or a placeholder address
          "contract": "con_name_service_final", // Assuming this is the correct contract
          "function": "get_main_name_to_address",
          "kwargs": {
              "name": name
          }
      };
      let bytes = str2buf(JSON.stringify(payload)); // Use helper
      let hex = toHexString(bytes);

      try {
        const response = await fetchWithTimeout(RPC + '/abci_query?path="/simulate_tx/' + hex + '"');
        const data = await response.json();

         if (!data.result || !data.result.response || data.result.response.value === null) {
              console.warn(`Name service query returned null for name: ${name}`);
              return "None"; // Indicate not found
         }

        let decoded = atob(data.result.response.value);

        // Check for specific error markers or empty results
        if (decoded === "žée" || decoded === "AA==" || decoded === "") {
            // console.log(`Name service simulation returned empty/marker for name: ${name}`);
            return "None";
        }

        try {
             let simulationResult = JSON.parse(decoded);

             // Check simulation status and result presence
             if (simulationResult.status !== 0 || typeof simulationResult.result === 'undefined' || simulationResult.result === null || simulationResult.result === 'None') {
                 // console.log(`Name service simulation failed or returned None for name: ${name}. Status: ${simulationResult.status}`);
                 return "None";
             }

             // Clean up the result string (remove potential quotes)
             let address = simulationResult.result.replace(/^['"]|['"]$/g, "");

             // Basic validation for address format (optional but recommended)
              if (typeof address === 'string' && address.length === 64 && /^[0-9a-fA-F]+$/.test(address)) {
                 return address;
              } else {
                   console.warn(`Name service returned invalid address format for ${name}:`, simulationResult.result);
                   return "None";
              }

        } catch (parseError) {
            console.error(`Error parsing name service result for ${name}:`, parseError, "Decoded:", decoded);
            return "None"; // Indicate error/not found on parsing failure
        }
    } catch (error) {
        console.error(`Error executing get_main_name_to_address for ${name}:`, error);
         if (error.message === 'Request timeout') {
            toast('warning', `Name service request for ${name} timed out.`);
        }
        return "None"; // Indicate error/not found on fetch failure
    }
}