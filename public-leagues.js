/**
 * Publieke leagues op home, racing en leagues. Pas hier code (Firebase room) en label (knoptekst) aan.
 * `code` moet exact matchen met host-league.html?view=...
 */
window.PMTV_PUBLIC_LEAGUES = [
    { code: 'SNSS4', label: 'SNSS4' }
];

(function () {
    var leagues = window.PMTV_PUBLIC_LEAGUES || [];

    function render() {
        document.querySelectorAll('[data-public-leagues-list]').forEach(function (ul) {
            ul.innerHTML = '';
            leagues.forEach(function (L) {
                var code = String(L.code || '').trim().toUpperCase();
                if (!code) return;
                var label = L.label != null && String(L.label).trim() !== '' ? String(L.label) : code;
                var li = document.createElement('li');
                var a = document.createElement('a');
                a.href = 'host-league.html?view=' + encodeURIComponent(code);
                a.className = 'public-league-link';
                a.textContent = label;
                li.appendChild(a);
                ul.appendChild(li);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
})();
