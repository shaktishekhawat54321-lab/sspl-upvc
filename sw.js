// ===================================================================
// SERVICE WORKER
//
// Makes the quotation system work without a connection, which matters
// in a showroom with patchy signal: once it has been opened online,
// everything needed to browse the catalogue, build a quotation and
// generate the PDF is held locally.
//
// Strategy:
//   navigations  network first, cache fallback — so an update is
//                picked up as soon as there is a connection, and the
//                app still opens when there is none
//   same-origin  stale-while-revalidate — instant from cache, with a
//   assets       fresh copy fetched in the background for next time
//   CDN (jsPDF)  cache first — pinned versions that never change, and
//                without them no PDF can be produced offline
//
// CACHE_VERSION is rewritten by tools-bump.js on every deploy, which
// drops the previous cache so nobody is left on stale files.
// ===================================================================

const CACHE_VERSION = 'v1794221764';
const CACHE = 'sspl-' + CACHE_VERSION;

// The shell is precached so a brand-new install works offline even if
// the first visit never touched every page.
const SHELL = [
    './',
    './index.html',
    './admin.html',
    './manifest.webmanifest',
    './images/favicon.svg',
    './images/sspl-logo.svg',
    './images/icon-192.png',
    './images/icon-512.png',
];

const CDN = [
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
];


self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        // Individually, so one 404 cannot abort the whole install.
        await Promise.all(SHELL.concat(CDN).map(url =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
        ));
        await self.skipWaiting();
    })());
});


self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names.filter(n => n.startsWith('sspl-') && n !== CACHE)
                .map(n => caches.delete(n))
        );
        await self.clients.claim();
    })());
});


async function staleWhileRevalidate(request) {

    const cache = await caches.open(CACHE);
    const hit = await cache.match(request);

    const fetching = fetch(request).then(res => {
        if (res && res.ok) cache.put(request, res.clone());
        return res;
    }).catch(() => null);

    return hit || (await fetching) || new Response('', { status: 504 });
}


async function networkFirst(request) {

    const cache = await caches.open(CACHE);

    try {
        const res = await fetch(request);
        if (res && res.ok) cache.put(request, res.clone());
        return res;
    } catch (e) {
        // offline: the exact page, then the app shell
        return (await cache.match(request))
            || (await cache.match('./index.html'))
            || new Response('Offline and this page has not been saved yet.',
                { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }
}


async function cacheFirst(request) {

    const cache = await caches.open(CACHE);
    const hit = await cache.match(request);
    if (hit) return hit;

    try {
        const res = await fetch(request);
        // opaque responses are cached too: cross-origin scripts come back
        // opaque, and an opaque hit is still usable for <script>
        if (res) cache.put(request, res.clone());
        return res;
    } catch (e) {
        return new Response('', { status: 504 });
    }
}


self.addEventListener('fetch', event => {

    const req = event.request;

    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // never touch Firestore or auth traffic — it has its own offline queue
    if (/firebase|firestore|googleapis|gstatic/.test(url.hostname)) return;

    if (req.mode === 'navigate') {
        event.respondWith(networkFirst(req));
        return;
    }

    if (url.origin === self.location.origin) {
        event.respondWith(staleWhileRevalidate(req));
        return;
    }

    if (CDN.some(c => req.url.startsWith(c.split('?')[0]))) {
        event.respondWith(cacheFirst(req));
    }
});


// Lets the page ask the waiting worker to take over immediately.
self.addEventListener('message', event => {
    if (event.data === 'skip-waiting') self.skipWaiting();
});
