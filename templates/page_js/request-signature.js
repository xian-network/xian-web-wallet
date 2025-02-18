async function acceptRequest() {
    let message = document.getElementById('requestSignatureMessage').innerHTML;
    
    try {
        let signedMsg = await signMessage(message, unencryptedPrivateKey);
        window.opener.postMessage({type: 'REQUEST_SIGNATURE', data: {signature: signedMsg}, callbackKey: callbackKey}, '*');
        toast('success', 'Successfully signed message');
        window.close();
        
    }
    catch (error) {
        console.log(error);
        toast('danger', 'Error signing message: ' + error);
        window.close();
    }
    
}

function rejectRequest() {
    window.opener.postMessage({type: 'REQUEST_SIGNATURE', data: {signature: null}, callbackKey: callbackKey}, '*');
    toast('warning', 'Request rejected');
    window.close();
}

// We need to also catch the case where the user closes the window
window.onbeforeunload = function() {
    rejectRequest();
};


document.getElementById('request-signature-accept').addEventListener('click', function() {
    acceptRequest();
});

document.getElementById('request-signature-reject').addEventListener('click', function() {
    rejectRequest();
});
