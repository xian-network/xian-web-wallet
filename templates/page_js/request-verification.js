async function acceptRequest() {
    let message = document.getElementById('requestVerificationMessage').innerHTML;
    let signature = document.getElementById('requestVerificationSignature').innerHTML;
    
    try {
        let isValid = await verifySignature(message, signature);
        window.opener.postMessage({type: 'REQUEST_VERIFICATION', data: {verified: isValid}, callbackKey: callbackKey}, '*');
        toast('success', 'Successfully verified signature');
        window.close();
        
    }
    catch (error) {
        console.log(error);
        toast('danger', 'Error verifying message: ' + error);
        window.close();
    }
    
}

function rejectRequest() {
    window.opener.postMessage({type: 'REQUEST_VERIFICATION', data: {verified: null}, callbackKey: callbackKey}, '*');
    toast('warning', 'Request rejected');
    window.close();
}

document.getElementById('request-verification-accept').addEventListener('click', function() {
    acceptRequest();
});

document.getElementById('request-verification-reject').addEventListener('click', function() {
    rejectRequest();
});
