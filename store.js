// ===================================================================
// STORAGE LAYER
//
// One interface over two backends:
//
//   local  - browser localStorage (the original behaviour). Changes
//            stay on the device that made them.
//   cloud  - Firebase Firestore. Admin changes appear on every
//            customer's device within a second, and admin sign-in uses
//            Firebase Authentication.
//
// The mode is decided by firebase-config.js. If it still holds
// placeholders, everything falls back to local and the Firebase SDK is
// never even downloaded.
//
// localStorage is kept as a cache in cloud mode too, so the site still
// renders instantly (and offline) before Firestore answers.
// ===================================================================

const FB_VERSION = "10.12.2";
const FB_BASE = "https://www.gstatic.com/firebasejs/" + FB_VERSION + "/";

const LS_KEY = "ssplData";


const Store = {

    mode: "local",      // "local" | "cloud"
    online: false,      // cloud reachable and subscribed
    user: null,         // signed-in Firebase user, cloud mode only
    error: null,

    _db: null,
    _auth: null,
    _listeners: [],
    _authListeners: [],
    _unsub: [],


    // ---------------------------------------------------------------
    // CACHE
    // ---------------------------------------------------------------

    readCache() {

        try {
            return JSON.parse(localStorage.getItem(LS_KEY) || "null");
        } catch (e) {
            return null;
        }

    },


    writeCache(d) {

        try {
            localStorage.setItem(LS_KEY, JSON.stringify(d));
            return true;
        } catch (e) {
            // quota exceeded, usually from too many base64 photos
            console.warn("Local cache write failed:", e.message);
            return false;
        }

    },


    // ---------------------------------------------------------------
    // SETUP
    // ---------------------------------------------------------------

    async init() {

        if (typeof firebaseConfigured !== "function" || !firebaseConfigured()) {
            this.mode = "local";
            return this;
        }

        try {

            await this._loadSdk();

            firebase.initializeApp(FIREBASE_CONFIG);

            this._db = firebase.firestore();
            this._auth = firebase.auth();

            // survive refreshes and short network drops
            this._db.enablePersistence({ synchronizeTabs: true })
                .catch(() => { /* multiple tabs or unsupported browser */ });

            this.mode = "cloud";

            this._auth.onAuthStateChanged(u => {
                this.user = u;
                this._authListeners.forEach(fn => fn(u));
            });

            this._subscribe();

        } catch (e) {

            console.error("Firebase start-up failed, staying local:", e);

            this.error = e.message;
            this.mode = "local";

        }

        return this;

    },


    _loadSdk() {

        const files = [
            "firebase-app-compat.js",
            "firebase-firestore-compat.js",
            "firebase-auth-compat.js"
        ];

        // load in order: the app module must exist before the others
        return files.reduce(
            (chain, f) => chain.then(() => new Promise((res, rej) => {

                const s = document.createElement("script");

                s.src = FB_BASE + f;
                s.onload = res;
                s.onerror = () => rej(new Error("Could not load " + f));

                document.head.appendChild(s);

            })),
            Promise.resolve()
        );

    },


    // ---------------------------------------------------------------
    // LIVE SYNC
    //
    // settings live in one document, products in a collection (one doc
    // each) so that a base64 photo cannot push the whole catalogue past
    // Firestore's 1 MB per-document limit.
    // ---------------------------------------------------------------

    _subscribe() {

        let settings = null;
        let products = null;

        const push = () => {

            if (settings === null && products === null) return;

            const cached = this.readCache() || DEFAULT_DATA;

            const merged = {
                settings: settings || cached.settings,
                products: (products && products.length)
                    ? products
                    : cached.products
            };

            this.online = true;

            this.writeCache(merged);

            this._listeners.forEach(fn => fn(merged));

        };

        this._unsub.push(
            this._db.collection("site").doc("settings").onSnapshot(
                snap => { if (snap.exists) { settings = snap.data(); push(); } },
                err => console.warn("settings sync:", err.message)
            )
        );

        this._unsub.push(
            this._db.collection("products").orderBy("order").onSnapshot(
                snap => {
                    products = snap.docs.map(d => {
                        const p = d.data();
                        delete p.order;
                        return p;
                    });
                    push();
                },
                err => console.warn("products sync:", err.message)
            )
        );

    },


    onChange(fn) {

        this._listeners.push(fn);

        return this;

    },


    onAuth(fn) {

        this._authListeners.push(fn);

        if (this.mode === "cloud" && this._auth) fn(this._auth.currentUser);

        return this;

    },


    // ---------------------------------------------------------------
    // READ
    // ---------------------------------------------------------------

    load() {

        return applyDefaults(this.readCache() || DEFAULT_DATA);

    },


    // ---------------------------------------------------------------
    // WRITE  (admin only — Firestore rules reject everyone else)
    // ---------------------------------------------------------------

    async saveSettings(settings) {

        this.writeCache({ settings: settings, products: this.load().products });

        if (this.mode !== "cloud") return { ok: true, where: "this device" };

        try {

            await this._db.collection("site").doc("settings").set(settings);

            return { ok: true, where: "all devices" };

        } catch (e) {

            return { ok: false, error: this._explain(e) };

        }

    },


    async saveProducts(products) {

        this.writeCache({ settings: this.load().settings, products: products });

        if (this.mode !== "cloud") return { ok: true, where: "this device" };

        try {

            // Firestore batches cap at 500 writes; the catalogue is ~21.
            const batch = this._db.batch();

            products.forEach((p, i) => {
                batch.set(
                    this._db.collection("products").doc(p.id),
                    Object.assign({}, p, { order: i })
                );
            });

            await batch.commit();

            return { ok: true, where: "all devices" };

        } catch (e) {

            return { ok: false, error: this._explain(e) };

        }

    },


    // Remove catalogue documents that are no longer in the local list,
    // so deleting a product in admin also removes it from the cloud.
    async pruneProducts(products) {

        if (this.mode !== "cloud") return;

        const keep = new Set(products.map(p => p.id));

        try {

            const snap = await this._db.collection("products").get();

            const batch = this._db.batch();

            let n = 0;

            snap.docs.forEach(d => {
                if (!keep.has(d.id)) { batch.delete(d.ref); n++; }
            });

            if (n) await batch.commit();

        } catch (e) {

            console.warn("prune failed:", e.message);

        }

    },


    // ---------------------------------------------------------------
    // QUOTATIONS
    //
    // Customers are not signed in, so the rules allow create only —
    // never read, update or delete. The owner reads them in the admin
    // panel while signed in.
    // ---------------------------------------------------------------

    async saveQuotation(q) {

        // always keep a local copy so history works without Firebase
        try {

            const hist = JSON.parse(localStorage.getItem("ssplQuotes") || "[]");

            hist.unshift(q);

            localStorage.setItem("ssplQuotes", JSON.stringify(hist.slice(0, 100)));

        } catch (e) { /* quota — not fatal */ }

        if (this.mode !== "cloud") return { ok: true, where: "this device" };

        try {

            await this._db.collection("quotations").add(
                Object.assign({}, q, {
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                })
            );

            return { ok: true, where: "cloud" };

        } catch (e) {

            console.warn("quotation not saved to cloud:", e.message);

            return { ok: false, error: this._explain(e) };

        }

    },


    async listQuotations(limit) {

        if (this.mode !== "cloud" || !this.user) {

            try {
                return JSON.parse(localStorage.getItem("ssplQuotes") || "[]")
                    .slice(0, limit || 50);
            } catch (e) {
                return [];
            }

        }

        try {

            const snap = await this._db.collection("quotations")
                .orderBy("createdAt", "desc")
                .limit(limit || 50)
                .get();

            return snap.docs.map(d => d.data());

        } catch (e) {

            console.warn("quotation history:", e.message);

            return [];

        }

    },


    // ---------------------------------------------------------------
    // AUTH
    // ---------------------------------------------------------------

    async signIn(email, password) {

        if (this.mode !== "cloud") {
            return { ok: false, error: "Cloud mode is not configured." };
        }

        try {

            await this._auth.signInWithEmailAndPassword(email, password);

            return { ok: true };

        } catch (e) {

            return { ok: false, error: this._explain(e) };

        }

    },


    async signOut() {

        if (this.mode === "cloud" && this._auth) await this._auth.signOut();

    },


    // ---------------------------------------------------------------
    // FIRST-TIME UPLOAD
    //
    // Copies whatever is on this device into an empty cloud project.
    // ---------------------------------------------------------------

    async seedCloud(d) {

        if (this.mode !== "cloud") {
            return { ok: false, error: "Cloud mode is not configured." };
        }

        if (!this.user) {
            return { ok: false, error: "Sign in as the owner first." };
        }

        const s = await this.saveSettings(d.settings);

        if (!s.ok) return s;

        const p = await this.saveProducts(d.products);

        if (!p.ok) return p;

        await this.pruneProducts(d.products);

        return { ok: true };

    },


    _explain(e) {

        const code = (e && e.code) || "";

        const map = {
            "permission-denied":
                "The cloud rejected that write. Sign in as the owner, and check your Firestore rules are published.",
            "auth/invalid-credential": "Wrong e-mail or password.",
            "auth/invalid-email": "That e-mail address is not valid.",
            "auth/user-not-found": "No owner account with that e-mail.",
            "auth/wrong-password": "Wrong password.",
            "auth/too-many-requests":
                "Too many attempts. Wait a few minutes and try again.",
            "auth/network-request-failed":
                "No internet connection. Changes are saved on this device only.",
            "unavailable":
                "Cannot reach the cloud. Changes are saved on this device only."
        };

        return map[code] || (e && e.message) || "Unknown error.";

    }

};


// Fill in anything an older saved copy (or a partial cloud record)
// is missing, so render() never meets an undefined field.
function applyDefaults(d) {

    if (!d || typeof d !== "object") d = {};

    if (!d.settings) d.settings = {};
    if (!Array.isArray(d.products) || !d.products.length) {
        d.products = DEFAULT_DATA.products;
    }

    const S = d.settings;
    const D = DEFAULT_DATA.settings;

    if (!S.businessName) S.businessName = D.businessName;
    if (!S.phone) S.phone = S.whatsapp || D.phone;
    if (!S.inquiry) S.inquiry = S.whatsapp || D.inquiry;
    if (!S.whatsapp) S.whatsapp = S.inquiry;
    if (!S.logo) S.logo = D.logo;
    if (!S.email) S.email = D.email;
    if (!S.hours) S.hours = D.hours;
    if (!S.address) S.address = D.address;
    if (!S.heroEyebrow) S.heroEyebrow = D.heroEyebrow;
    if (!S.heroTitle) S.heroTitle = D.heroTitle;
    if (!S.heroText) S.heroText = D.heroText;
    if (!S.heroImage) S.heroImage = D.heroImage;
    if (S.gstRate === undefined) S.gstRate = D.gstRate;
    if (S.minAreaSqft === undefined) S.minAreaSqft = D.minAreaSqft;
    if (!S.mmDivisor) S.mmDivisor = D.mmDivisor;
    if (!S.validityDays) S.validityDays = D.validityDays;
    if (!S.quotePrefix) S.quotePrefix = D.quotePrefix;
    if (!S.defaultUnit) S.defaultUnit = D.defaultUnit;
    if (!S.website) S.website = D.website;
    if (S.gstin === undefined) S.gstin = D.gstin;

    // Quotation layout. A saved copy from an earlier version has none of
    // these, so fall back rather than render an empty quotation.
    ["columns", "specFields", "totalRows", "terms", "coverLetter",
        "prerequisites", "bankDetails"].forEach(k => {
            if (!Array.isArray(S[k]) || !S[k].length) S[k] = D[k];
        });

    if (!S.options || typeof S.options !== "object") S.options = D.options;
    if (!S.specDefaults || typeof S.specDefaults !== "object") S.specDefaults = D.specDefaults;

    // Any option list added to the defaults later should appear too.
    Object.keys(D.options).forEach(k => {
        if (!Array.isArray(S.options[k])) S.options[k] = D.options[k];
    });

    ["showCoverLetter", "showAcceptance", "showPrerequisites", "showBankDetails"]
        .forEach(k => { if (S[k] === undefined) S[k] = D[k]; });

    if (!S.acceptanceText) S.acceptanceText = D.acceptanceText;

    // Products saved before the drawing engine have no config.
    d.products.forEach(p => {
        if (!p.config || !p.config.kind) {
            const def = DEFAULT_DATA.products.find(x => x.id === p.id);
            p.config = (def && def.config) || { kind: "fixed", panels: 1, kgPerSqft: 2 };
        }
    });

    // Catalogue items added since this copy was saved. Without this a
    // returning visitor keeps the old list for ever and never sees a
    // new product; the owner's rates and photos are untouched.
    const have = new Set(d.products.map(p => p.id));

    DEFAULT_DATA.products.forEach(dp => {
        if (!have.has(dp.id)) d.products.push(JSON.parse(JSON.stringify(dp)));
    });

    // `image` used to hold the retired static drawings and is now the
    // owner's own photo slot. An old value there would hide the
    // generated elevation, so clear it.
    d.products.forEach(p => {
        if (typeof p.image === "string" && /^images\/types\//.test(p.image)) p.image = "";
    });

    return d;

}


// `const` at the top level of a classic script creates a lexical global,
// not a property of window — so `window.Store` would be undefined and
// every feature guarded by it would silently switch itself off.
window.Store = Store;
