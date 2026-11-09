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

    return d;

}


let data = applyDefaults(
    JSON.parse(localStorage.getItem("ssplData") || "null") || DEFAULT_DATA
);


// ===============================
// SAVE DATA
// ===============================

function save() {
    localStorage.setItem("ssplData", JSON.stringify(data));
}


// ===============================
// WHATSAPP NUMBER
// ===============================

function getWhatsAppNumber() {

    return (
        data.settings.inquiry ||
        data.settings.whatsapp ||
        "7005132355"
    ).replace(/\D/g, "");
}


function wa() {

    return "https://wa.me/91" + getWhatsAppNumber();

}


// ===============================
// WEBSITE RENDER
// ===============================

function render() {

    document.getElementById("brand").textContent =
        data.settings.businessName;

    const logoEl = document.getElementById("logo");

    logoEl.src =
        data.settings.logo || "images/sspl-logo.svg";

    // The header hides the duplicate text, so the logo carries the name.
    logoEl.alt =
        data.settings.businessName;

    document.getElementById("heroEyebrow").textContent =
        data.settings.heroEyebrow;

    document.getElementById("heroTitle").textContent =
        data.settings.heroTitle;

    document.getElementById("heroText").textContent =
        data.settings.heroText;

    document.getElementById("heroImage").src =
        data.settings.heroImage || "images/types/sliding-3track.svg";

    document.getElementById("contactName").textContent =
        data.settings.businessName;

    document.getElementById("contactAddress").textContent =
        data.settings.address;


    // OPENING HOURS

    const hoursEl =
        document.getElementById("contactHours");

    if (hoursEl) {

        hoursEl.textContent =
            data.settings.hours
                ? "Open " + data.settings.hours
                : "";

    }


    // CALL NUMBER

    const phoneLink =
        document.getElementById("phoneLink");

    if (phoneLink) {

        phoneLink.textContent =
            data.settings.phone;

        phoneLink.href =
            "tel:+91" +
            data.settings.phone.replace(/\D/g, "");

    }


    // ENQUIRY NUMBER

    const inquiryLink =
        document.getElementById("inquiryLink");

    if (inquiryLink) {

        inquiryLink.textContent =
            data.settings.inquiry;

        inquiryLink.href =
            "tel:+91" +
            data.settings.inquiry.replace(/\D/g, "");

    }


    // EMAIL

    const emailLink =
        document.getElementById("emailLink");

    if (emailLink) {

        emailLink.textContent =
            data.settings.email || "";

        emailLink.href =
            "mailto:" +
            (data.settings.email || "");

    }


    // HERO WHATSAPP

    document.getElementById("heroWhatsApp").href =
        wa() +
        "?text=" +
        encodeURIComponent(
            "Hello " +
            data.settings.businessName +
            ", I want a door/window quotation."
        );


    // CONTACT WHATSAPP

    document.getElementById("contactWhatsApp").href =
        wa() +
        "?text=" +
        encodeURIComponent(
            "Hello " +
            data.settings.businessName
        );


    // CATEGORY FILTER

    const cats = [
        "All",
        ...new Set(
            data.products.map(
                product => product.cat
            )
        )
    ];


    document.getElementById("filters").innerHTML =
        cats.map(
            (category, index) => `

            <button
                class="filter-btn ${index === 0 ? "active" : ""}"
                onclick="filterProducts('${category}',this)"
            >
                ${category}
            </button>

        `
        ).join("");


    renderProducts("All");


    document.getElementById("year").textContent =
        new Date().getFullYear();

}


// ===============================
// PRODUCT DISPLAY
// ===============================

function renderProducts(category) {

    const products =
        data.products.filter(
            product =>
                category === "All" ||
                product.cat === category
        );


    document.getElementById("productGrid").innerHTML =
        products.map(product => `

        <article class="product-card">

            <div>

                ${
                    // The owner's photo when one is uploaded, otherwise a
                    // to-scale elevation generated from the configuration.
                    `<img
                        src="${DRAW.dataUri(product)}"
                        alt="${product.name}"
                        loading="lazy"
                    >`
                }

            </div>


            <div class="product-body">

                <span class="tag">
                    ${product.cat}
                </span>


                <h3>
                    ${product.name}
                </h3>


                <p>
                    ${product.text}
                </p>


                <button
                    class="small-btn"
                    onclick="openQuoteBuilder('${product.id}')"
                >
                    Select Product
                </button>

            </div>

        </article>

    `).join("");

}


// ===============================
// CATEGORY FILTER
// ===============================

function filterProducts(category, button) {

    document
        .querySelectorAll(".filter-btn")
        .forEach(
            btn =>
                btn.classList.remove("active")
        );


    button.classList.add("active");


    renderProducts(category);

}


// The quotation builder lives in quote.js.

// ===============================
// MOBILE MENU
// ===============================

function toggleMenu() {

    document
        .getElementById("navMenu")
        .classList.toggle("open");

}


// ===============================
// START WEBSITE
// ===============================

render();


// ===============================
// LIVE CLOUD SYNC
//
// In cloud mode the catalogue and settings re-render by themselves
// whenever the owner saves a change on any device.
// ===============================

if (window.Store) {

    Store.init().then(() => {

        if (Store.mode !== "cloud") return;

        Store.onChange(fresh => {

            data = applyDefaults(fresh);

            render();

        });

    });

}
