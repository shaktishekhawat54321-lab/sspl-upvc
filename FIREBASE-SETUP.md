# Firebase setup — SSPL uPVC quotation system

Right now the site saves to **one browser only**. Follow this once and
your rates, products, logo and settings sync to every device, with
owner sign-in by e-mail and password, and quotations stored in the cloud.

Everything used here is on the Firebase **free (Spark) plan**. For a
showroom's volume you will not come close to the limits.

Allow about 20 minutes.

---

## 1. Create the project

1. Go to <https://console.firebase.google.com> and sign in with a Google account.
   Use a company account you will not lose access to.
2. **Add project** → name it `sspl-upvc` → Continue.
3. Google Analytics is not needed. Turn it off → **Create project**.

## 2. Register the website

1. On the project home page, click the **web** icon `</>`.
2. App nickname: `SSPL Website` → **Register app**.
   Do *not* tick Firebase Hosting; the site stays on GitHub Pages.
3. Firebase shows a `firebaseConfig = { ... }` block. Keep that tab open.

## 3. Paste the config into the site

Open `firebase-config.js` in this repository and replace every
`PASTE_...` placeholder with the matching value from that block:

```js
const FIREBASE_CONFIG = {
    apiKey: "AIza...",
    authDomain: "sspl-upvc.firebaseapp.com",
    projectId: "sspl-upvc",
    storageBucket: "sspl-upvc.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:1234:web:abcd"
};
```

**These values are not secret.** Every Firebase web app ships them in
public JavaScript; they identify your project, they do not grant access.
Access is controlled by the rules in step 6. What must *never* go in
this repository is a service-account JSON key, a GitHub token, or your
admin password.

Cloud mode switches itself on as soon as the placeholders are gone.

## 4. Turn on sign-in

1. **Build → Authentication → Get started**.
2. **Sign-in method → Email/Password → Enable → Save.**
   (Leave "Email link" off.)
3. **Users → Add user.** Use `online@coreindia.co.in` and a strong
   password. This is your admin login from now on.
4. Open the inbox for that address and click Firebase's verification
   link. The rules require a verified address, so sign-in will be
   refused until you do this.

If you ever change the owner e-mail, change it in **two** places:
`FIREBASE_ADMIN_EMAIL` in `firebase-config.js`, and the address inside
`firestore.rules` — then publish the rules again.

## 5. Create the database

1. **Build → Firestore Database → Create database**.
2. Choose **Production mode** — *not* test mode. Test mode lets anyone
   on the internet rewrite your rates for 30 days.
3. Location: `asia-south1` (Mumbai) is closest to Jorabat.

## 6. Publish the security rules

1. **Firestore Database → Rules** tab.
2. Delete what is there and paste the whole contents of
   `firestore.rules` from this repository.
3. **Publish.**

These rules mean:

| Who | Settings & catalogue | Quotations |
|---|---|---|
| Any visitor | read only | may create one, cannot read any |
| You, signed in | read and write | read and write |
| Anyone else | nothing | nothing |

## 7. Authorise your domain

**Authentication → Settings → Authorized domains → Add domain**, and add
the GitHub Pages host you publish on, e.g. `sanisteels.github.io`.
Sign-in is refused from any domain not on that list. `localhost` is
already allowed, which is why local testing works before this step.

## 8. Upload your existing data

1. Open `admin.html` on the device that already has your rates.
2. Sign in with the owner e-mail and password.
3. **Cloud Sync → Upload This Device's Data to Cloud.**

That copies settings and the whole catalogue up. Do it **once**, from
the device whose data is correct — it overwrites what is in the cloud.

## 9. Check it works

- Open the customer site on your phone and on a computer at the same time.
- On the computer, sign into admin and change a rate.
- The phone updates within a second, without a refresh.

---

## What to expect day to day

- **Saving offline** still works. Firestore queues the write and sends
  it when you are back online. The admin panel tells you whether a save
  reached "all devices" or only "this device".
- **Customers never sign in.** They read the catalogue and may file a
  quotation; they cannot read anyone else's.
- **Quotation history** appears in the admin panel once you are signed in.

## Honest limitations

**Rates are visible to anyone who looks.** The browser has to know the
rate to calculate a price, so a curious visitor can read it from the
developer console or from the network traffic — regardless of Firebase.
The rules stop people *changing* your rates, not *seeing* them. If rates
must truly stay private, the calculation has to move to a server (a
Cloud Function), which needs the paid Blaze plan. For a showroom quoting
publicly anyway, this is usually not worth doing.

**Photos uploaded in admin** are stored as base64 inside the product
document, and Firestore caps a document at 1 MB. A large photo will be
rejected. Resize photos to roughly 800px wide before uploading, or move
images to Firebase Storage later. The SVG type drawings are tiny and
unaffected.

**Free plan limits:** 50,000 document reads and 20,000 writes per day,
1 GiB stored. The whole catalogue is about 21 reads per visitor, so the
free tier covers well over a thousand visits a day.

## If something goes wrong

| Symptom | Cause |
|---|---|
| Admin still shows the old password box | `firebase-config.js` still has `PASTE_` placeholders |
| "Missing or insufficient permissions" | Rules not published, or you are signed out |
| Sign-in refused on the live site | Domain not added in step 7 |
| Sign-in refused everywhere | E-mail address not verified (step 4.4) |
| Phone does not update | Check the browser console; `products sync:` warnings mean the rules are blocking reads |

The site never breaks if Firebase is unreachable: it falls back to the
last data cached on the device and keeps working.
