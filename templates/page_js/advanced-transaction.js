 // Get current stamp rate
 document.getElementById("stampRate").innerHTML = getStampRate();

 document.getElementById('btn-adv-tx-send').addEventListener('click', function() {
     sendAdvTx();
 });

 document.getElementById('btn-adv-tx-ide').addEventListener('click', function() {
     changePage('ide');
 });