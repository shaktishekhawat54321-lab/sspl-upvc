SANI STEELS PVT LTD (SSPL) - uPVC WINDOWS & DOORS QUOTATION SYSTEM
==================================================================

The Arch, 9th Mile, Khanapara-Jorabat Road,
Near NES Bharat Petrol Pump, Above Kawasaki Showroom,
Jorabat, Meghalaya 793101
WhatsApp / Enquiry: 7005132355   Email: online@coreindia.co.in


FILES
-----
index.html        Customer website.
admin.html        Owner control panel.
data.js           Default catalogue + business settings. Loaded by BOTH pages.
app.js            Customer site logic.
quote.js          Quotation builder and PDF generation (jsPDF).
store.js          Storage layer: Firebase Firestore, or localStorage.
firebase-config.js  Your Firebase keys. Placeholders until you fill them in.
firestore.rules   Security rules to paste into the Firebase console.
FIREBASE-SETUP.md Step-by-step cloud setup guide.
admin.js          Admin panel logic.
style.css         All styling.
images/           Logo and product type drawings.
  sspl-logo.svg   SSPL logo mark.
  types/*.svg     One line drawing per window / door type (21 files).
tools-gen-svg.js  Regenerates images/types/*.svg   ->  node tools-gen-svg.js images/types
tools-gen-data.js Regenerates data.js              ->  node tools-gen-data.js data.js


CUSTOMER FLOW
-------------
1. Customer browses the catalogue and filters by Windows / Doors / Accessories.
2. Clicks "Select Product" -> picks mm, feet or inches, enters width, height
   and quantity. The type drawing and the live area are shown. NO PRICES.
3. "Add to Quotation" adds the line. Repeat for as many items as needed.
4. Customer fills in name, phone and site address, then either:
      Download PDF Quotation   - saves the branded PDF
      Preview PDF              - opens it in a new tab
      Send on WhatsApp         - shares the PDF directly where the browser
                                 supports it (most phones), otherwise saves
                                 the PDF and opens WhatsApp with the covering
                                 message to attach it

AREA CALCULATION
----------------
    Feet    : width x height                  (already sq.ft)
    Inches  : width x height / 144
    mm      : width x height / 90,000         (trade standard; switch to
                                               92,903.04 in Admin for exact)

Anything smaller than the Minimum Billable Area (default 10 sq.ft) is billed
at that minimum, and the PDF marks those rows with an asterisk.

WHERE PRICES APPEAR
-------------------
Rates are NEVER shown on the website. The customer sees only type, size,
area and quantity. Rate, amount, GST and the grand total appear in the
generated PDF, which is the formal quotation.


ADMIN PANEL
-----------
Open admin.html and log in.
The default password ships inside admin.js. CHANGE IT after your first login,
using "Change Admin Password" at the bottom of the panel.

You can edit:
- Shop name, call number, WhatsApp number, email, opening hours, address, logo
- Hero headline and description
- Every product: name, category, description, rate (Rs/sq.ft.) and photo
- Quotation settings: GST %, validity, quotation number prefix, minimum
  billable area, mm conversion basis and the Terms & Conditions list
- Backup: download a .json of everything, and restore it later


HOW DATA IS STORED
------------------
The site runs in one of two modes, decided by firebase-config.js.

LOCAL MODE (default, out of the box)
  Everything is saved in this browser's localStorage under "ssplData".
  - Changes apply ONLY on the browser and device where you made them.
  - Customers on the live site see the DEFAULT rates from data.js.
  - Clearing browser data erases your settings. Use Backup first.
  - Uploaded photos are base64 in localStorage and fill it after roughly
    10-15 images (the browser limit is about 5 MB).

CLOUD MODE (after you follow FIREBASE-SETUP.md)
  - Admin changes reach every customer's device within a second.
  - Admin sign-in is by e-mail and password (Firebase Authentication).
  - Quotations customers generate are stored in the cloud and listed in
    the admin panel.
  - Saves made offline are queued and sent when the connection returns.
  - localStorage is still used as a cache, so the site renders instantly
    and keeps working if the cloud is unreachable.

Never put a service-account key, a GitHub token or your admin password in
browser code. The Firebase web config in firebase-config.js is NOT secret
and is meant to be public; firestore.rules is what protects your data.


RUNNING IT LOCALLY
------------------
Open a terminal in this folder and run any static server, for example:

    py -m http.server 8123

Then open http://localhost:8123 in your browser.
Do not open index.html directly from the file system - some browsers block
local file access and the page may not load correctly.


GITHUB PAGES DEPLOYMENT
-----------------------
See DEPLOY.md for the full steps, including creating your own repository.

Short version: push every file to the repository root, then
Settings -> Pages -> Deploy from branch -> main -> / (root).
The site goes live at https://<user>.github.io/<repo>/

Note: the "origin" remote in this clone still points at the original
shalni-upvc-enterprises repository. Add your own remote before pushing;
do not push SSPL's site to someone else's repository.
