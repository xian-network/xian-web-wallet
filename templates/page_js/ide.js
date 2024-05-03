var code_storage = JSON.parse(localStorage.getItem('code_storage')) || {"contract": "@construct\ndef seed():\n    pass\n\n@export\ndef test():\n    return 'Hello, World!'"};
var code_tab_list = JSON.parse(localStorage.getItem('code_tab_list')) || ['contract'];
var current_tab = code_tab_list[0];

function saveCode() {
    code_storage[current_tab] = editor.getValue();
    localStorage.setItem('code_storage', JSON.stringify(code_storage));
}

function addTab(tab_name) {
    code_tab_list.push(tab_name);
    localStorage.setItem('code_tab_list', JSON.stringify(code_tab_list));
}

function removeTab(tab_name) {
    code_tab_list = code_tab_list.filter((tab) => tab !== tab_name);
    localStorage.setItem('code_tab_list', JSON.stringify(code_tab_list));
}

function changeTab(tab_name) {
    saveCode();
    current_tab = tab_name;
    editor.setValue(code_storage[current_tab]);
    refreshTabList();
}

function addNewTab() {
    let tab_name = prompt('Enter new file name:');
    if (tab_name === null) {
        return;
    }

    if (code_tab_list.includes(tab_name)) {
        alert('File already exists!');
        return;

    }
    addTab(tab_name);
    code_storage[tab_name] = '';
    changeTab(tab_name);
    refreshTabList();
}

function removeCurrentTab() {
    if (code_tab_list.length === 1) {
        alert('Cannot remove last file!');
        return;
    }

    let confirm_remove = confirm('Are you sure you want to remove this file?');
    if (!confirm_remove) {
        return;
    }

    removeTab(current_tab);
    delete code_storage[current_tab];
    changeTab(code_tab_list[0]);
    refreshTabList();
}



var editor = CodeMirror(document.querySelector('#editor'), {
    value: code_storage[current_tab],
    mode:  "python",
    lineNumbers: true,
});

editor.setSize('100%', null);

function submitContract() {
    let contract = document.getElementById("submitContractName").value;
    let contractError = document.getElementById("submitContractError");
    let contractSuccess = document.getElementById("submitContractSuccess");
    let stampLimit = document.getElementById("submitContractstampLimit").value;
    contractError.style.display = 'none';
    contractSuccess.style.display = 'none';

    if (contract === "") {
        contractError.innerHTML = 'Contract name is required!';
        contractError.style.display = 'block';
        return;
    }

    if (!contract.startsWith('con_')) {
        contractError.innerHTML = 'Contract name must start with con_';
        contractError.style.display = 'block';
        return;
    }

    if (stampLimit === "") {
        contractError.innerHTML = 'Stamp limit is required!';
        contractError.style.display = 'block';
        return;
    }

    let contractCode = editor.getValue();

    let payload = {
        payload: {
            chain_id: CHAIN_ID,
            contract: 'submission',
            function: 'submit_contract',
            kwargs: {
                name: contract,
                code: contractCode
            },
            stamps_supplied: parseInt(stampLimit)
        },
        metadata: {
            signature: "",
        }
    };
    Promise.all([signTransaction(payload, unencryptedPrivateKey)]).then((signed_tx) => {
    let response = broadcastTransaction(signed_tx);
    hash = response['result']['hash'];
    let status = 'success'
    if (response['result']['code'] == 1) {
        status = 'error';
    }
    prependToTransactionHistory(hash, 'submission', 'submit_contract', {name: contract, code: contractCode}, status, new Date().toLocaleString());

   if (response["result"]["code"] == 1) {
     contractError.innerHTML = response["result"]["log"];
       contractError.style.display = "block";
     return;
   } else {
     contractSuccess.innerHTML =
       "Transaction sent successfully! Explorer: " +
       "<a class='explorer-url' href='https://explorer.xian.org/tx/" +
       hash +
       "' target='_blank'>" +
       hash +
       "</a>";
       contractSuccess.style.display = "block";
   }
    });
}

// Get current stamp rate
document.getElementById("stampRate").innerHTML = getStampRate();

document.getElementById('btn-ide-submit-contract').addEventListener('click', function() {
    submitContract();
});
document.getElementById('btn-ide-go-to-wallet').addEventListener('click', function() {
    goToWallet();
});

document.getElementById('ide-send-adv-tx').addEventListener('click', function() {
    changePage('send-advanced-transaction');
});

function refreshTabList() {
    document.getElementById('tabs-editor').innerHTML = '';
    code_tab_list.forEach((tab) => {
        
        let tabElement = document.createElement('div');
        tabElement.className = 'tab-editor';
        tabElement.innerHTML = tab;
        tabElement.addEventListener('click', function() {
            changeTab(tab);
        });
        document.getElementById('tabs-editor').appendChild(tabElement);

        if (tab === current_tab) {
            tabElement.classList.add('active');
        }

        let closeTab = document.createElement('i');
        closeTab.className = 'fas fa-times';
        closeTab.addEventListener('click', function() {
            // If it's the last tab, don't allow removal
            if (code_tab_list.length === 1) {
                alert('Cannot remove last file!');
                return;
            }
            removeTab(tab);
            delete code_storage[tab];
            tabElement.remove();
            if (tab === current_tab) {
                changeTab(code_tab_list[0]);
            }
        });

        tabElement.appendChild(closeTab);
    });
    let addTabButton = document.createElement('div');
    addTabButton.className = 'add-tab-button';
    addTabButton.innerHTML = '+';
    addTabButton.addEventListener('click', addNewTab);

    document.getElementById('tabs-editor').appendChild(addTabButton);
}

// Save code on change
editor.on('change', saveCode);

refreshTabList();


