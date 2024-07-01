async function acceptRequest() {
    let message = document.getElementById('requestSignatureMessage').innerHTML;
    
    try {
        let signedMsg = await signMessage(message, unencryptedPrivateKey);
        sendResponse({signature: signedMsg});
        toast('success', 'Successfully signed message');
        changePage('wallet');
        
    }
    catch (error) {
        console.log(error);
        sendResponse({errors: ['error']});
        toast('danger', 'Error signing message: ' + error);
        changePage('wallet');
    }
    
}

function rejectRequest() {
    sendResponse({errors: ['rejected']});
    toast('warning', 'Request rejected');
    changePage('wallet');
}

document.getElementById('request-signature-accept').addEventListener('click', function() {
    acceptRequest();
});

document.getElementById('request-signature-reject').addEventListener('click', function() {
    rejectRequest();
});
