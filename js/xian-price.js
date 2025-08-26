// XIAN price tracker using CoinPaprika
// Fetches price periodically and updates #xianPrice

(function () {
    const PRICE_URL = 'https://api.coinpaprika.com/v1/tickers/xian-xian';
    const REFRESH_MS = 60000; // 60s
    const priceEl = document.getElementById('xianPrice');

    function formatUsd(value) {
        try {
            // Format with 4 decimals for sub-cent prices, else 2
            if (value < 0.01) {
                return '$' + value.toFixed(6);
            }
            return '$' + value.toFixed(4);
        } catch (e) {
            return '$—';
        }
    }

    async function fetchPriceOnce(controller) {
        try {
            const response = await fetch(PRICE_URL, { signal: controller?.signal });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const data = await response.json();
            const price = data?.quotes?.USD?.price;
            const pct24h = data?.quotes?.USD?.percent_change_24h;
            if (typeof price !== 'number') throw new Error('Malformed response');

            const priceText = formatUsd(price);
            const change = (typeof pct24h === 'number') ? (pct24h >= 0 ? '+' : '') + pct24h.toFixed(2) + '%' : '';

            if (priceEl) {
                priceEl.innerHTML = `XIAN ${priceText}${change ? ' <span class="change">' + change + '</span> <span class="label">24H</span>' : ''}`;
                priceEl.setAttribute('data-change', (pct24h ?? 0) >= 0 ? 'up' : 'down');
                priceEl.title = 'XIAN price • 24H change from CoinPaprika';
            }
        } catch (err) {
            if (priceEl && !priceEl.textContent) {
                priceEl.textContent = 'XIAN $—';
            }
        }
    }

    function start() {
        if (!priceEl) return;
        // Initial load soon after DOM is ready
        const controller = new AbortController();
        fetchPriceOnce(controller);
        // Periodic refresh
        const intervalId = setInterval(fetchPriceOnce, REFRESH_MS);

        // Cleanup on page unload/navigation
        window.addEventListener('beforeunload', function () {
            controller.abort();
            clearInterval(intervalId);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();


