var code_storage = JSON.parse(localStorage.getItem('code_storage')) || {"contract": "@construct\ndef seed():\n    pass\n\n@export\ndef test():\n    return 'Hello, World!'"};
var current_tab = Object.keys(code_storage)[0];

function saveCode() {
    code_storage[current_tab] = editor.getValue();
    localStorage.setItem('code_storage', JSON.stringify(code_storage));
}

function addTab(tab_name, code='') {
    code_storage[tab_name] = code;
    localStorage.setItem('code_storage', JSON.stringify(code_storage));
}

function removeTab(tab_name) {
    let old_code_storage = code_storage;
    code_storage = {};
    Object.keys(old_code_storage).forEach((tab) => {
        if (tab !== tab_name) {
            console.log(tab, tab_name);
            code_storage[tab] = old_code_storage[tab];
            console.log('Adding tab:', tab);
        }
    }
    );

    localStorage.setItem('code_storage', JSON.stringify(code_storage));
}

function changeTab(tab_name) {
    current_tab = tab_name;
    editor.setValue(code_storage[current_tab]);
    if (current_tab.endsWith('(Read-Only)')) {
        editor.setOption('readOnly', true);
        document.getElementById('submission-form').style.display = 'none';
    }
    else {
        editor.setOption('readOnly', false);
        document.getElementById('submission-form').style.display = 'block';
    }
    refreshTabList();
}

function addNewTab() {
    let dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
        dropdown.remove();
    }

    let tab_name = prompt('Enter new file name:');
    if (tab_name === null) {
        return;
    }

    if (Object.keys(code_storage).includes(tab_name)) {
        alert('File already exists!');
        return;
    }

    addTab(tab_name);
    changeTab(tab_name);
    refreshTabList();
}


function loadContractFromExplorer() {
    let dropdown = document.querySelector('.dropdown-content');
    if (dropdown) {
        dropdown.remove();
    }
    let contract = prompt('Enter contract name:');

    if (contract === null) {
        return;
    }

    getContractCode(contract).then((contractCode) => {
    if (contractCode === null) {
        alert('Contract not found!');
        return;
    }

    let tab_name = contract + '(Read-Only)';
    if (Object.keys(code_storage).includes(tab_name)) {
        alert('File already exists!');
        return;
    }
    addTab(tab_name, contractCode);
    changeTab(tab_name);
    refreshTabList();

    }).catch((error) => {
        console.error('Error loading contract:', error.message);
        alert('Error loading contract!');
    });
}


function showDropdown() {
    if (document.querySelector('.dropdown-content')) {
        document.querySelector('.dropdown-content').remove();
        return;
    }

    let dropdown = document.createElement('div');
    dropdown.className = 'dropdown-content';
    dropdown.style.display = 'flex';
    dropdown.style.flexDirection = 'column';
    dropdown.style.gap = '10px';
    dropdown.style.position = 'absolute';
    dropdown.style.width = '10rem';
    dropdown.style.zIndex = '100000';
    dropdown.classList.add('dropdown-content');
    dropdown.style.borderRadius = '8px';
    dropdown.style.padding = '0.5rem';

    // Append dropdown directly to body
    document.body.appendChild(dropdown);

    let buttonRect = document.querySelector('.add-tab-button').getBoundingClientRect();
    dropdown.style.left = buttonRect.left + 'px';
    dropdown.style.top = buttonRect.bottom + 'px';

    // Check if the dropdown extends beyond the right edge of the viewport
    const dropdownWidth = dropdown.offsetWidth;
    const viewportWidth = window.innerWidth;
    const dropdownRight = buttonRect.left + dropdownWidth;

    if (dropdownRight > viewportWidth) {
        // If it extends beyond the viewport's right edge, adjust its position
        dropdown.style.left = 'auto';
        dropdown.style.right = '0';
    }

    let newTab = document.createElement('div');
    newTab.innerHTML = 'New File';
    newTab.addEventListener('click', addNewTab);
    newTab.style.cursor = 'pointer';

    let loadContract = document.createElement('div');
    loadContract.innerHTML = 'Load Contract';
    loadContract.addEventListener('click', loadContractFromExplorer);
    loadContract.style.cursor = 'pointer';

    dropdown.appendChild(newTab);
    dropdown.appendChild(loadContract);
}




var editor = CodeMirror(document.querySelector('#editor'), {
    value: code_storage[current_tab],
    mode:  "python",
    lineNumbers: true,
    indentUnit: 4,
});

editor.setSize('100%', null);
if (current_tab.endsWith('(Read-Only)')) {
    editor.setOption('readOnly', true);
    document.getElementById('submission-form').style.display = 'none';
}

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
    broadcastTransaction(signed_tx).then((response) => {
        hash = response['result']['hash'];
        let status = 'success'
        if (response['result']['code'] == 1) {
            status = 'error';
        }
        prependToTransactionHistory(hash, 'submission', 'submit_contract', {name: contract, code: contractCode}, status, new Date().toLocaleString());
        // scroll to top
        window.scrollTo(0, 0);
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
    }).catch((error) => {
        console.error("Error submitting contract:", error.message);
        contractError.innerHTML = "Error submitting contract!";
        contractError.style.display = "block";
    });
    });
}

// Get current stamp rate
 // Get current stamp rate
 getStampRate().then((rate) => {
    if(rate === null) {
        document.getElementById("stampRate").innerHTML = "ERR";
        return;
    } 
    document.getElementById("stampRate").innerHTML = rate;
}).catch((error) => {
    console.error("Error getting stamp rate:", error.message);
    document.getElementById("stampRate").innerHTML = "ERR";
});

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
    Object.keys(code_storage).forEach((tab) => {
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
        
        closeTab.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevent click event from propagating to the tab itself

            // Prompt user if they want to remove the tab
            if (!confirm('Are you sure you want to remove this file?')) {
                return;
            }

            // If it's the last tab, don't allow removal
            if (Object.keys(code_storage).length === 1) {
                alert('Cannot remove last file!');
                return;
            }

            // Retrieve the tab name from the parent element (tabElement)
            let tabNameToRemove = tabElement.textContent.trim();

            removeTab(tabNameToRemove);
            tabElement.remove();

            // Change current tab if the removed tab was active
            if (tabNameToRemove === current_tab) {
                changeTab(Object.keys(code_storage)[0]);
            }
        });

        tabElement.appendChild(closeTab);
    });
    let addTabButton = document.createElement('div');
    addTabButton.className = 'add-tab-button';
    addTabButton.innerHTML = '<i class="fas fa-plus"></i>';
    addTabButton.addEventListener('click', showDropdown);

    document.getElementById('tabs-editor').appendChild(addTabButton);
}


// Save code on change
editor.on('change', saveCode);

refreshTabList();


