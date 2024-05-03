// Override the XMLHttpRequest object's prototype
XMLHttpRequest.prototype.originalOpen = XMLHttpRequest.prototype.open;

// Define a new open function with custom timeout
XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
  // Default timeout in milliseconds
  var timeout = 4000; // 4 seconds timeout
  
  // Call the original open function with the provided arguments
  this.originalOpen(method, url, async, user, password);

  // Set the timeout for the current XMLHttpRequest instance
  this.timeout = timeout;
};


document.getElementById('side-change-page-settings').addEventListener('click', function() {
    changePage('settings');
});

document.getElementById('side-change-page-ide').addEventListener('click', function() {
    changePage('ide');
});

document.getElementById('side-change-page-wallet').addEventListener('click', function() {
    changePage('wallet');
});

document.getElementById('side-lock-wallet').addEventListener('click', function() {
    lockWallet();
});

document.getElementById('side-change-page-govenance').addEventListener('click', function() {
    changePage('governance');
});

function lockWallet() {
    let confirm_lock = confirm("Are you sure you want to lock the wallet?");
    if (!confirm_lock) {
        return;
    }
    // Locks the wallet
    unencryptedPrivateKey = null;
    locked = true;
    changePage('password-input');
}