var callbackKey = null;
window.addEventListener("message", (event) => {
    console.log(event.data);
    if (event.data.type === "HTML") {
      insertHTMLAndExecuteScripts(document.getElementById("app-box"), event.data.html);
    }
    if (event.data.type === "INITIAL_STATE") {
      publicKey = event.data.state.publicKey;
      unencryptedPrivateKey = event.data.state.unencryptedPrivateKey;
      locked = event.data.state.locked;
      tx_history = event.data.state.tx_history;
    }
    if (event.data.type === "REQUEST_TRANSACTION") {
      const some_data = event.data.data;
      callbackKey = event.data.callbackKey;
      
      // Wait for DOM to be ready before accessing elements
      const updateTransactionElements = () => {
        const contractEl = document.getElementById("requestTransactionContract");
        const functionEl = document.getElementById("requestTransactionFunction");
        const paramsEl = document.getElementById("requestTransactionParams");
        const paramsListEl = document.getElementById("requestTransactionParamsList");
        const paramsRawEl = document.getElementById("requestTransactionParamsRaw");
        const stampLimitEl = document.getElementById("requestTransactionStampLimit");
        const chainIdEl = document.getElementById("requestTransactionChainId");
        
        if (contractEl && functionEl && paramsEl && stampLimitEl && chainIdEl) {
          contractEl.innerHTML = some_data["data"]["contract"];
          functionEl.innerHTML = some_data["data"]["method"];
          const kwargs = some_data["data"]["kwargs"] || {};
          // keep hidden plain JSON for existing flows
          paramsEl.innerHTML = JSON.stringify(kwargs);
          // render pretty JSON
          if (paramsRawEl) {
            try { paramsRawEl.textContent = JSON.stringify(kwargs, null, 2); } catch(e) { paramsRawEl.textContent = String(kwargs); }
          }
          // render list view
          if (paramsListEl) {
            paramsListEl.innerHTML = '';
            const ul = document.createElement('ul');
            ul.style.margin = '0';
            ul.style.paddingLeft = '1rem';
            Object.keys(kwargs).forEach(key => {
              const li = document.createElement('li');
              let value = kwargs[key];
              let display;
              if (typeof value === 'object') {
                try { display = JSON.stringify(value, null, 2); } catch(e) { display = String(value); }
              } else {
                display = String(value);
              }
              const label = document.createElement('div');
              label.className = 'kv-key';
              label.textContent = key;
              const val = document.createElement('pre');
              val.className = 'kv-value';
              val.textContent = display;
              ul.appendChild(li);
              li.appendChild(label);
              li.appendChild(val);
            });
            if (ul.children.length === 0) {
              const empty = document.createElement('div');
              empty.style.opacity = '.8';
              empty.textContent = 'No parameters';
              paramsListEl.appendChild(empty);
            } else {
              paramsListEl.appendChild(ul);
            }
          }
          stampLimitEl.innerHTML = some_data["data"]["stampLimit"];
          chainIdEl.innerHTML = some_data["data"]["chainId"];
        } else {
          // Retry after a short delay if elements not found
          setTimeout(updateTransactionElements, 100);
        }
      };
      
      updateTransactionElements();
    }
    if (event.data.type === "REQUEST_SIGNATURE") {
      const some_data = event.data.data;
      callbackKey = event.data.callbackKey;
      document.getElementById("requestSignatureMessage").innerHTML = some_data["data"]["message"];
    }
    if (event.data.type === "REQUEST_TOKEN") {
      const some_data = event.data.data;
      callbackKey = event.data.callbackKey;
      document.getElementById("requestTokenMessage").innerHTML = some_data["data"]["contract"];
      getTokenInfo(some_data["data"]["contract"]).then(token_info => {
        document.getElementById("requestTokenName").innerHTML = token_info.name;
        document.getElementById("requestTokenSymbol").innerHTML = token_info.symbol;
      });
    }
  });