var customRPCs = localStorage.getItem('customRPCs') ? JSON.parse(localStorage.getItem('customRPCs')) : [];

function removeWallet(){
    let confirm_delete = confirm("Are you sure you want to remove the wallet?");
    if (!confirm_delete) {
        return;
    }
    // Removes the wallet
    eraseSecureCookie('publicKey');
    eraseSecureCookie('encryptedPrivateKey');
    unencryptedPrivateKey = null;
    locked = true;
    localStorage.removeItem('tx_history');
    tx_history = [];
    changePage('get-started');
}

function saveSettings() {
    let settingsSuccess = document.getElementById('settingsSuccess');
    let settingsError = document.getElementById('settingsError');
    settingsSuccess.style.display = 'none';
    settingsError.style.display = 'none';

    let rpc = document.getElementById('rpc_select').value;
    if (rpc === "") {
        settingsError.style.display = 'block';
        settingsError.innerHTML = 'All fields are required!';
        return;
    }

    // rpc has to start with https and not end with a slash
    if (!rpc.startsWith('http')) {
        settingsError.style.display = 'block';
        settingsError.innerHTML = 'RPC must start with http or https';
        return;
    }

    if (rpc.endsWith('/')) {
        settingsError.style.display = 'block';
        settingsError.innerHTML = 'RPC must not end with a slash';
        return;
    }


    localStorage.setItem("rpc", rpc);
    RPC = rpc;
    let online_status_element = document.getElementById("onlineStatus");

    ping().then(online_status => {
        
        if (!online_status) {
            online_status_element.innerHTML = "Node Status <div class='offline-circle' title='Node is Offline'></div>"
        }
        else {
            online_status_element.innerHTML = "Node Status <div class='online-circle' title='Node is Online'></div>"
        }
    }).catch(error => {
        online_status_element.innerHTML = "Node Status <div class='offline-circle' title='Node is Offline'></div>"
    });

    getChainID().then(chain_id => {
        if (chain_id === null) {
            settingsError.style.display = 'block';
            settingsError.innerHTML = 'Error getting chain id. Please check your RPC settings.';
            return;
        }
        CHAIN_ID = chain_id;
        settingsSuccess.style.display = 'block';
        settingsSuccess.innerHTML = 'RPC changed successfully!';
    });
}

function exportPrivateKey() {
    try {
        let exportable = toHexString(unencryptedPrivateKey);
        // if the key is longer than 64 characters it includes the public key as well. then we need to remove it. we only need the first 64 characters
        if (exportable.length > 64) {
            exportable = exportable.substring(0, 64);
        }
        let element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(exportable));
        element.setAttribute('download', 'privateKey.txt');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    } catch (e) {
        let exportable = toHexString(unencryptedPrivateKey);
        // if the key is longer than 64 characters it includes the public key as well. then we need to remove it. we only need the first 64 characters
        if (exportable.length > 64) {
            exportable = exportable.substring(0, 64);
        }
        copyTextToClipboard(exportable);
    }
}

document.getElementById('settings-back').addEventListener('click', function() {
    goToWallet();
});

document.getElementById('private_key_export').addEventListener('click', function() {
    exportPrivateKey();
});

document.getElementById('remove_wallet_export').addEventListener('click', function() {
    removeWallet();
});

document.getElementById('rpc_select').addEventListener('change', function() {
    saveSettings();
});

document.getElementById('add_rpc_button').addEventListener('click', function() {
    addCustomRPC();
});

document.getElementById('remove_rpc_button').addEventListener('click', function() {
    removeCustomRPC();
});

function addCustomRPC() {
    settingsSuccess.style.display = 'none';
    settingsError.style.display = 'none';
    let customrpc_input = document.getElementById('add_rpc_input');
    let rpc = customrpc_input.value;
    if (rpc === "") {
        return;
    }

    // rpc has to start with https and not end with a slash
    if (!rpc.startsWith('http')) {
        settingsError.style.display = 'block';
        settingsError.innerHTML = 'RPC must start with http or https';
        return;
    }

    if (rpc.endsWith('/')) {
        settingsError.style.display = 'block';
        settingsError.innerHTML = 'RPC must not end with a slash';
        return;
    }

    customRPCs.push(rpc);
    localStorage.setItem('customRPCs', JSON.stringify(customRPCs));
    customrpc_input.value = '';
    document.getElementById('rpc_select').value = rpc;
    RPC = rpc;
    loadSettingsPage();
    saveSettings();
    
}

function removeCustomRPC() {
    settingsSuccess.style.display = 'none';
    settingsError.style.display = 'none';
    let rpc_select = document.getElementById('rpc_select');
    let rpc = rpc_select.value;
    let found = false;
    customRPCs.forEach((customRPC, index) => {
        if (customRPC === rpc) {
            customRPCs.splice(index, 1);
            rpc_select.remove(rpc_select.selectedIndex);
            found = true;
        }
    });
    if (!found) {
        settingsError.style.display = 'block';
        settingsError.innerHTML = 'Standard RPCs cannot be removed!';
        return;
    }

    localStorage.setItem('customRPCs', JSON.stringify(customRPCs));
    RPC = document.getElementById('rpc_select').children[0].value;
    document.getElementById('rpc_select').value = RPC;
    loadSettingsPage();
    saveSettings();
    
}

function loadSettingsPage() {
    // Load the custom RPCs from local storage and add them to the select element
    if (customRPCs.length > 0) {
        let rpc_select = document.getElementById('rpc_select');
        customRPCs.forEach(rpc => {
            let option = document.createElement('option');
            option.text = rpc;
            option.value = rpc;
            rpc_select.add(option);
        });
    }

    // Get the rpc from local storage and find the select element with the value and set it to selected
    document.querySelector('#rpc_select').value = RPC;
    
}

loadSettingsPage();