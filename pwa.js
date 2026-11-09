// ===================================================================
// INSTALL & OFFLINE
//
// Registers the service worker and surfaces an "Install App" button.
// Chrome and Edge only offer installation from a menu most people
// never open, so the page asks directly — and hides the button once
// the app is installed or already running in its own window.
// ===================================================================

(function () {

    // Service workers need a secure context. GitHub Pages is HTTPS and
    // localhost counts as secure, so this covers both.
    if ('serviceWorker' in navigator) {

        window.addEventListener('load', () => {

            navigator.serviceWorker.register('sw.js')
                .then(reg => {

                    // A new version is waiting: take it on the next load
                    // rather than interrupting a quotation in progress.
                    reg.addEventListener('updatefound', () => {
                        const sw = reg.installing;
                        if (!sw) return;
                        sw.addEventListener('statechange', () => {
                            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                                console.info('SSPL: an update is ready and will load next time.');
                            }
                        });
                    });

                })
                .catch(e => console.warn('SSPL: offline mode unavailable —', e.message));
        });
    }


    // ---------- install button ----------

    let deferred = null;

    function button() {
        return document.getElementById('installApp');
    }

    function show(on) {
        const b = button();
        if (b) b.style.display = on ? '' : 'none';
    }

    // Running as an installed app already?
    const installed = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;

    // The button is shown whenever the app is not already installed,
    // rather than only when the browser fires beforeinstallprompt.
    // Safari never fires it, Chrome withholds it once the app has been
    // installed and removed, and a button nobody ever sees is the same
    // as no button at all — so it falls back to instructions instead.
    document.addEventListener('DOMContentLoaded', () => show(!installed));

    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();          // keep Chrome's own mini-bar out of the way
        deferred = e;
        if (!installed) show(true);
    });

    window.addEventListener('appinstalled', () => {
        deferred = null;
        show(false);
    });

    window.installApp = async function () {

        if (!deferred) {
            alert(
                'To install:\n\n' +
                'Chrome or Edge on a computer — click the install icon in the address bar, ' +
                'or the ⋮ menu, then "Install".\n\n' +
                'Android — ⋮ menu, then "Add to Home screen".\n\n' +
                'iPhone or iPad — the Share button, then "Add to Home Screen".'
            );
            return;
        }

        deferred.prompt();
        await deferred.userChoice;
        deferred = null;
        show(false);
    };

})();
