async function acceptRequest() {
    let contract = document.getElementById('requestTokenMessage').innerHTML;
    
    // only allow alphanumeric characters and underscores
    if (!/^[a-zA-Z0-9_]*$/.test(contract)) {
        toast('danger', 'Invalid contract name!');
        window.opener.postMessage({type: 'REQUEST_TOKEN', data: {success: false}, callbackKey: callbackKey}, '*');
        return;
    }

    let token_info = await getTokenInfo(contract)

    if (token_info.name === "\x9Eée" || token_info.symbol === "\x9Eée") {
        toast('danger', 'Token does not exist!');
        window.opener.postMessage({type: 'REQUEST_TOKEN', data: {success: false}, callbackKey: callbackKey}, '*');
        return;
    }
    if(token_info.name === undefined || token_info.symbol === undefined){
        toast('danger', 'Error retrieving token info!');
        window.opener.postMessage({type: 'REQUEST_TOKEN', data: {success: false}, callbackKey: callbackKey}, '*');
        return;
    }

    try {
        let token_list = JSON.parse(localStorage.getItem("token_list")) || ["currency"];
        if (!token_list.includes(contract)) {
            token_list.push(contract);
            localStorage.setItem("token_list", JSON.stringify(token_list));
        }
        window.opener.postMessage({type: 'REQUEST_TOKEN', data: {success: true}, callbackKey: callbackKey}, '*');
        toast('success', 'Successfully added token');
        window.close();
        
    }
    catch (error) {
        console.log(error);
        toast('danger', 'Error adding token: ' + error);
        window.close();
    }
    
}

function rejectRequest() {
    window.opener.postMessage({type: 'REQUEST_TOKEN', data: {success: false}, callbackKey: callbackKey}, '*');
    toast('warning', 'Request rejected');
    window.close();
}

// We need to also catch the case where the user closes the window
window.onbeforeunload = function() {
    rejectRequest();
};


document.getElementById('request-token-accept').addEventListener('click', function() {
    acceptRequest();
});

document.getElementById('request-token-reject').addEventListener('click', function() {
    rejectRequest();
});