// ===================================================================
// FIREBASE CONFIGURATION
//
// Until you fill this in, the site runs exactly as before, saving to
// this browser's localStorage only. Nothing here is secret: a Firebase
// web config is meant to be public, and it is the Firestore security
// rules (firestore.rules) that actually protect your data. Never put a
// service-account key, a GitHub token or an admin password in this or
// any other file in this repository.
//
// Setup instructions: FIREBASE-SETUP.md
// ===================================================================

const FIREBASE_CONFIG = {
    apiKey: "PASTE_YOUR_API_KEY",
    authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
    projectId: "PASTE_YOUR_PROJECT_ID",
    storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
    messagingSenderId: "PASTE_YOUR_SENDER_ID",
    appId: "PASTE_YOUR_APP_ID"
};


// The e-mail address of the owner account you create in
// Firebase Console -> Authentication -> Users.
const FIREBASE_ADMIN_EMAIL = "online@coreindia.co.in";


// Cloud mode switches itself on once the placeholders above are
// replaced with real values.
function firebaseConfigured() {

    return Object.values(FIREBASE_CONFIG).every(
        v => typeof v === "string" && v && !v.startsWith("PASTE_")
    );

}
