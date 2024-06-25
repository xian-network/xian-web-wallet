function acceptRequest() {
    let message = document.getElementById('requestSignatureMessage').innerHTML;
    try {
        let signed_msg = signMessage(message, unencryptedPrivateKey);
        sendResponse({signature: signed_msg});
        changePage('wallet');
    }
    catch (error) {
        changePage('wallet');
    }
    
}

function rejectRequest() {
    sendResponse({errors: ['rejected']});
    changePage('wallet');
}

document.getElementById('request-signature-accept').addEventListener('click', function() {
    acceptRequest();
});

document.getElementById('request-signature-reject').addEventListener('click', function() {
    rejectRequest();
});
