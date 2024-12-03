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

    let rpc = document.getElementById('rpc_select').value.split(',')[0];
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

    let explorer = document.getElementById('rpc_select').value.split(',')[1];
    localStorage.setItem("explorer", explorer);
    localStorage.setItem("rpc", rpc);
    RPC = rpc;
    EXPLORER = explorer;
    let online_status_element = document.getElementById("onlineStatus");

    ping().then(online_status => {
        
        if (!online_status) {
            online_status_element.innerHTML = "<div class='mt-1px'><div class='offline-circle' title='Node is Offline'></div></div> <div>" + RPC.replace("https://", "").replace("http://", "") + "</div>";
        }
        else {
            online_status_element.innerHTML = "<div class='mt-1px'><div class='online-circle' title='Node is Online'></div></div> <div>" + RPC.replace("https://", "").replace("http://", "") + "</div>";
        }
    }).catch(error => {
        online_status_element.innerHTML = "<div class='mt-1px'><div class='offline-circle' title='Node is Offline'></div></div> <div>" + RPC.replace("https://", "").replace("http://", "") + "</div>";
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
    let explorer_input = document.getElementById('add_explorer_input');
    let rpc = customrpc_input.value;
    let explorer = explorer_input.value;
    if (rpc === "") {
        settingsError.style.display = 'block';
        settingsError.innerHTML = 'RPC field is required!';
        return;
    }
    if (explorer === "") {
        settingsError.style.display = 'block';
        settingsError.innerHTML = 'Explorer field is required!';
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

    if (!explorer.startsWith('http')) {
        settingsError.style.display = 'block';
        settingsError.innerHTML = 'Explorer must start with http or https';
        return;
    }

    if (explorer.endsWith('/')) {
        settingsError.style.display = 'block';
        settingsError.innerHTML = 'Explorer must not end with a slash';
        return;
    }

    customRPCs.push([rpc, explorer]);
    localStorage.setItem('customRPCs', JSON.stringify(customRPCs));
    customrpc_input.value = '';
    explorer_input.value = '';
    document.getElementById('rpc_select').value = rpc;
    RPC = rpc;
    EXPLORER = explorer;
    loadSettingsPage();
    saveSettings();
    
}

function removeCustomRPC() {
    settingsSuccess.style.display = 'none';
    settingsError.style.display = 'none';
    let rpc_select = document.getElementById('rpc_select');
    let rpc = rpc_select.value.split(',')[0];
    let found = false;
    customRPCs.forEach((customRPC, index) => {
        console.log(customRPC[0]);
        if (customRPC[0] === rpc) {
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
    RPC = document.getElementById('rpc_select').children[0].value.split(',')[0];
    EXPLORER = document.getElementById('rpc_select').children[0].value.split(',')[1];
    document.getElementById('rpc_select').value = RPC + ',' + EXPLORER;
    loadSettingsPage();
    saveSettings();
    
}

function readTextFile(file) {

    var rawFile = new XMLHttpRequest();
    var allText = null;

    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = function () {
        if(rawFile.readyState === 4) {
            if(rawFile.status === 200 || rawFile.status == 0) {
                allText = rawFile.responseText;
            }
        }
    }
    rawFile.send(null);
    return allText;
}

function loadSettingsPage() {
    // Load the custom RPCs from local storage and add them to the select element
    if (customRPCs.length > 0) {
        let rpc_select = document.getElementById('rpc_select');
        customRPCs.forEach(rpc => {
            let option = document.createElement('option');
            option.text = rpc[0];
            option.value = rpc[0] + ',' + rpc[1];
            rpc_select.add(option);
        });
    }

    // Get the rpc from local storage and find the select element with the value and set it to selected
    document.querySelector('#rpc_select').value = RPC + ',' + EXPLORER;

    // Get the wallet version from the manifest file (two directories up) and set it in the settings page
    let manifest = JSON.parse(readTextFile('../../manifest.json'));
    document.getElementById('version').innerHTML = manifest.version;
    
}

loadSettingsPage();