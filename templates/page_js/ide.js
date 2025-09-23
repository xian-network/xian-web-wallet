// Simplified IDE: file selection + contract deployment (clean version)

if (typeof selectedContractCode === 'undefined') {
    var selectedContractCode = '';
}
if (typeof selectedFileName === 'undefined') {
    var selectedFileName = '';
}



function submitContract() {
    const contract = document.getElementById('submitContractName').value;
    const contractError = document.getElementById('submitContractError');
    const contractSuccess = document.getElementById('submitContractSuccess');
    const stampLimit = document.getElementById('submitContractstampLimit').value;
    const constructorKwargs = document.getElementById('submitContractconstructorKwargs').value;
    contractError.style.display = 'none';
    contractSuccess.style.display = 'none';
    window.scrollTo(0,0);

    if (!selectedContractCode) { contractError.innerHTML = 'No contract file selected!'; contractError.style.display = 'block'; return; }
    if (contract === '') { contractError.innerHTML = 'Contract name is required!'; contractError.style.display = 'block'; return; }
    if (!contract.startsWith('con_')) { contractError.innerHTML = 'Contract name must start with con_'; contractError.style.display = 'block'; return; }
    if (stampLimit === '') { contractError.innerHTML = 'Stamp limit is required!'; contractError.style.display = 'block'; return; }

    const contractCode = selectedContractCode;
    const payload = {
        payload: {
            chain_id: CHAIN_ID,
            contract: 'submission',
            function: 'submit_contract',
            kwargs: { name: contract, code: contractCode },
            stamps_supplied: parseInt(stampLimit)
        },
        metadata: { signature: '' }
    };

    if (constructorKwargs !== '') {
        try { payload.payload.kwargs.constructor_args = JSON.parse(constructorKwargs); }
        catch (e) { contractError.innerHTML = 'Invalid constructor kwargs!'; contractError.style.display = 'block'; return; }
    }

    Promise.all([signTransaction(payload, unencryptedPrivateKey)]).then((signed_tx) => {
        broadcastTransaction(signed_tx).then((response) => {
            const hash = response.result.hash;
            const status = response.result.code == 1 ? 'error' : 'pending';
            prependToTransactionHistory(hash, 'submission', 'submit_contract', { name: contract, code: contractCode }, status, new Date().toLocaleString());
            if (response.result.code == 1) {
                contractError.innerHTML = response.result.log;
                contractError.style.display = 'block';
                return;
            }
            contractSuccess.innerHTML = "Transaction sent successfully! Explorer: <a class='explorer-url' href='" + EXPLORER + "/tx/" + hash + "' target='_blank'>" + hash + "</a>";
            contractSuccess.style.display = 'block';
        }).catch((err) => {
            console.error('Error submitting contract:', err.message);
            contractError.innerHTML = 'Error submitting contract!';
            contractError.style.display = 'block';
        });
    });
}

// Stamp rate
getStampRate().then(rate => { document.getElementById('stampRate').innerHTML = (rate === null ? 'ERR' : rate); })
    .catch(err => { console.error('Error getting stamp rate:', err.message); document.getElementById('stampRate').innerHTML = 'ERR'; });

document.getElementById('btn-ide-submit-contract').addEventListener('click', () => {
    document.getElementById('submitContractError').style.display = 'none';
    if (!selectedContractCode) { document.getElementById('submitContractError').innerHTML = 'Please select a .py contract file first.'; document.getElementById('submitContractError').style.display = 'block'; return; }
    if (document.getElementById('submitContractNameWrapper').style.display === 'none') {
        document.getElementById('submitContractNameWrapper').style.display = 'block';
        document.getElementById('submitContractstampLimitWrapper').style.display = 'block';
        document.getElementById('submitContractconstructorKwargsWrapper').style.display = 'block';
        document.getElementById('btn-ide-submit-contract').innerHTML = 'Deploy Contract';
        return;
    }
    submitContract();
});

document.getElementById('btn-ide-go-to-wallet').addEventListener('click', () => goToWallet());
document.getElementById('ide-send-adv-tx').addEventListener('click', () => changePage('send-advanced-transaction'));

// File selection handling
if(typeof fileInput === 'undefined') {
    var fileInput = null;
}
fileInput = document.getElementById('contractFile');
if(typeof fileMeta === 'undefined') {
    var fileMeta = null;
}
fileMeta = document.getElementById('fileMeta');
if(typeof fileNameSpan === 'undefined') {
    var fileNameSpan = null;
}
fileNameSpan = document.getElementById('fileName');
if(typeof fileSizeSpan === 'undefined') {
    var fileSizeSpan = null;
}
fileSizeSpan = document.getElementById('fileSize');
if(typeof fileSelectWrapper === 'undefined') {
    var fileSelectWrapper = null;
}
fileSelectWrapper = document.getElementById('fileSelectWrapper');
if(typeof fileSelectTrigger === 'undefined') {
    var fileSelectTrigger = null;
}
fileSelectTrigger = document.getElementById('chooseFileBtn');
if(typeof fileSelectLabel === 'undefined') {
    var fileSelectLabel = null;
}
fileSelectLabel = document.getElementById('chosenFileLabel');

function setFileLabel(name){
    if(!fileSelectWrapper) return;
    if(!name){
        fileSelectLabel.textContent = 'No file selected';
        fileSelectWrapper.classList.add('empty');
        fileSelectWrapper.classList.remove('has-file');
        return;
    }
    const trimmed = name.length > 48 ? name.slice(0,35)+'…'+name.slice(-10) : name;
    fileSelectLabel.textContent = trimmed;
    fileSelectWrapper.classList.remove('empty');
    fileSelectWrapper.classList.add('has-file');
}

if(fileSelectWrapper){
    fileSelectWrapper.classList.add('empty');
    // Click anywhere in wrapper triggers file dialog (but ignore when already pressing a control)
    fileSelectWrapper.addEventListener('click', (e)=>{
        if(e.target === fileSelectTrigger) return; // button handles its own click
        if(e.target.closest('button')) return;
        fileInput && fileInput.click();
    });
    fileSelectWrapper.addEventListener('dragenter', (e)=>{ e.preventDefault(); fileSelectWrapper.classList.add('drag-over'); });
    fileSelectWrapper.addEventListener('dragover', (e)=>{ e.preventDefault(); });
    fileSelectWrapper.addEventListener('dragleave', (e)=>{ if(e.relatedTarget && fileSelectWrapper.contains(e.relatedTarget)) return; fileSelectWrapper.classList.remove('drag-over'); });
    fileSelectWrapper.addEventListener('drop', (e)=>{
        e.preventDefault();
        fileSelectWrapper.classList.remove('drag-over');
        if(!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
        fileInput.files = e.dataTransfer.files; // assign files
        fileInput.dispatchEvent(new Event('change'));
    });
}

if(fileSelectTrigger){
    fileSelectTrigger.addEventListener('click', ()=> fileInput && fileInput.click());
    fileSelectTrigger.setAttribute('type','button');
}

if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
        let error = document.getElementById('submitContractError');
        let success = document.getElementById('submitContractSuccess');
        error.style.display = 'none';
        success.style.display = 'none';
        let file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.py')) {
            selectedContractCode = '';
            fileMeta.style.display = 'none';
            error.innerHTML = 'File must have .py extension';
            error.style.display = 'block';
            setFileLabel('');
            return;
        }
        const reader = new FileReader();
        reader.onload = async (evt) => {
            selectedContractCode = evt.target.result;
            selectedFileName = file.name;
            fileNameSpan.textContent = file.name;
            fileSizeSpan.textContent = (file.size/1024).toFixed(1) + ' KB';
            fileMeta.style.display = 'block';
            setFileLabel(file.name);
            // Linting removed
        };
        reader.readAsText(file);
    });
}

try { lucide.createIcons(); } catch(_){ }


