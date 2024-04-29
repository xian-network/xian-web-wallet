function getValidatorState() {
    let validator_list = getVariable("masternodes", "S", "members");
    let built_html = "<span>You are currently ";
    if (validator_list.includes(publicKey)) {
        built_html += "<span class='text-success'>a Validator</span>";
    }
    else {
        built_html += "<span class='text-danger'>not a Validator</span>";
    }
    built_html += ".</span>";
    document.getElementById('validator-state').innerHTML = built_html;
}

getValidatorState();