// ===================================================================
// SSPL QUOTATION ENGINE
//
// Builds a multi-line quotation and renders it as a branded PDF.
//
// Pricing rule: rates are NEVER shown on screen. The customer sees the
// type, size, area and quantity only. Rates, amounts, GST and the grand
// total appear in the generated PDF, which is the formal quotation.
// ===================================================================


// -------------------------------------------------------------------
// UNITS
//
// The brief asked for "mm or feet", with area = W x H / 144 for feet
// and W x H / 90000 for mm. Dividing by 144 converts square INCHES to
// sq.ft, not square feet, so all three units are offered here and each
// uses its own correct conversion.
// -------------------------------------------------------------------

const UNITS = {

    ft: {
        label: "Feet",
        step: 0.01,
        // feet x feet is already sq.ft
        toSqft: (w, h) => w * h,
        fmt: v => v + " ft"
    },

    in: {
        label: "Inches",
        step: 0.5,
        toSqft: (w, h) => (w * h) / 144,
        fmt: v => v + '"'
    },

    mm: {
        label: "Millimetres",
        step: 5,
        // divisor is an admin setting: 90000 (trade) or 92903.04 (exact)
        toSqft: (w, h) =>
            (w * h) / (Number(data.settings.mmDivisor) || 90000),
        fmt: v => v + " mm"
    }

};


// -------------------------------------------------------------------
// QUOTATION STATE
// -------------------------------------------------------------------

const quote = {
    customer: { name: "", phone: "", address: "" },
    items: []
};


// Width/height in the entered unit, converted to millimetres, which is
// what the drawing engine works in.
function toMm(v, unit) {

    const n = Number(v) || 0;

    if (unit === "ft") return n * 304.8;
    if (unit === "in") return n * 25.4;

    return n;

}


// The elevation for a saved line, drawn at that line's own size.
function itemDrawing(it) {

    const product = data.products.find(p => p.id === it.id) || { config: {} };

    return DRAW.dataUri(
        product.image ? product : Object.assign({}, product, { image: it.photo || "" }),
        toMm(it.width, it.unit),
        toMm(it.height, it.unit)
    );

}


let quoteUnit = "mm";


// -------------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------------

function money(n) {

    return Number(n).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

}


function gstRate() {

    const r = Number(data.settings.gstRate);

    return isNaN(r) ? 18 : r;

}


// Indian numbering: 12,34,567 -> "Twelve Lakh Thirty Four Thousand ..."
function amountInWords(num) {

    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
        "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
        "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];

    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty",
        "Seventy", "Eighty", "Ninety"];

    function two(n) {
        if (n < 20) return a[n];
        return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    }

    function three(n) {
        const h = Math.floor(n / 100), r = n % 100;
        return (h ? a[h] + " Hundred" + (r ? " " : "") : "") + (r ? two(r) : "");
    }

    let n = Math.floor(Math.abs(num));

    if (n === 0) return "Zero Rupees Only";

    const paise = Math.round((Math.abs(num) - n) * 100);

    const crore = Math.floor(n / 10000000); n %= 10000000;
    const lakh = Math.floor(n / 100000); n %= 100000;
    const thousand = Math.floor(n / 1000); n %= 1000;

    let out = "";

    if (crore) out += three(crore) + " Crore ";
    if (lakh) out += three(lakh) + " Lakh ";
    if (thousand) out += three(thousand) + " Thousand ";
    if (n) out += three(n);

    out = out.trim() + " Rupees";

    if (paise) out += " and " + two(paise) + " Paise";

    return out + " Only";

}


function quoteNumber() {

    const d = new Date();

    const stamp =
        String(d.getFullYear()).slice(2) +
        String(d.getMonth() + 1).padStart(2, "0") +
        String(d.getDate()).padStart(2, "0") +
        "-" +
        String(d.getHours()).padStart(2, "0") +
        String(d.getMinutes()).padStart(2, "0");

    return (data.settings.quotePrefix || "SSPL/UPVC/") + stamp;

}


function fmtDate(d) {

    return d.toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });

}


// -------------------------------------------------------------------
// LINE ITEM MATHS
// -------------------------------------------------------------------

function minArea() {

    const m = Number(data.settings.minAreaSqft);

    return isNaN(m) ? 0 : m;

}


function itemArea(item) {

    const unit = UNITS[item.unit] || UNITS.mm;

    const single = unit.toSqft(item.width, item.height);

    // Trade minimum: a small unit is still billed at the minimum area.
    // "single" stays the true measured area so the customer sees it.
    const billedSingle = Math.max(single, minArea());

    return {
        single: single,
        total: single * item.qty,
        billedSingle: billedSingle,
        billedTotal: billedSingle * item.qty,
        minApplied: billedSingle > single + 0.0001
    };

}


function itemAmount(item) {

    return itemArea(item).billedTotal * (Number(item.rate) || 0);

}


function quoteTotals() {

    const sub = quote.items.reduce((s, i) => s + itemAmount(i), 0);

    const rows = Array.isArray(data.settings.totalRows) ? data.settings.totalRows : [];

    const on = k => rows.filter(r => r.kind === k && r.show !== false);

    const charges = on("charge").reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const deducts = on("deduct").reduce((s, r) => s + (Number(r.amount) || 0), 0);

    // GST applies to the project cost, charges included — the basis the
    // reference quotation uses.
    const project = sub + charges - deducts;

    const gst = project * gstRate() / 100;

    const area = quote.items.reduce((s, i) => s + itemArea(i).billedTotal, 0);
    const weight = quote.items.reduce((s, i) => s + (Number(i.kgPerSqft) || 0) * itemArea(i).billedTotal, 0);
    const pieces = quote.items.reduce((s, i) => s + (Number(i.qty) || 0), 0);

    return {
        sub: sub,
        charges: charges,
        deducts: deducts,
        project: project,
        gst: gst,
        grand: project + gst,
        area: area,
        weight: weight,
        pieces: pieces,
        avgExGst: area ? project / area : 0,
        avgIncGst: area ? (project + gst) / area : 0
    };

}


// -------------------------------------------------------------------
// BUILDER UI
// -------------------------------------------------------------------

function openQuoteBuilder(productId) {

    const sel = document.getElementById("qbProduct");

    sel.innerHTML =
        data.products.map(p =>
            `<option value="${p.id}">${p.name}</option>`
        ).join("");

    if (productId) sel.value = productId;

    const codeEl = document.getElementById("qbCode");

    if (codeEl) codeEl.value = "W" + (quote.items.length + 1);

    document.getElementById("qbUnit").value = quoteUnit;

    syncUnitInputs();
    onProductChange();

    document.getElementById("quoteBuilder").classList.add("show");

}


function closeQuoteBuilder() {

    document.getElementById("quoteBuilder").classList.remove("show");

}


function syncUnitInputs() {

    quoteUnit = document.getElementById("qbUnit").value;

    const u = UNITS[quoteUnit];

    const w = document.getElementById("qbWidth");
    const h = document.getElementById("qbHeight");

    w.step = h.step = u.step;

    document.getElementById("qbWidthLabel").textContent = "Width (" + u.label.toLowerCase() + ")";
    document.getElementById("qbHeightLabel").textContent = "Height (" + u.label.toLowerCase() + ")";

    // sensible defaults per unit
    const defaults = { mm: [1200, 1500], ft: [4, 5], in: [48, 60] };

    if (!w.dataset.touched) w.value = defaults[quoteUnit][0];
    if (!h.dataset.touched) h.value = defaults[quoteUnit][1];

    qbPreview();

}


function onProductChange() {

    const p = data.products.find(
        x => x.id === document.getElementById("qbProduct").value
    );

    renderSpecInputs(p);

    qbPreview();

}


function qbPreview() {

    const p = data.products.find(
        x => x.id === document.getElementById("qbProduct").value
    );

    if (!p) return;

    // Draw the elevation at the size actually typed, so the customer sees
    // their own window rather than a generic picture.
    const prev = readBuilder();

    document.getElementById("qbImage").src =
        DRAW.dataUri(p, toMm(prev.width, prev.unit), toMm(prev.height, prev.unit));

    document.getElementById("qbImage").alt = p.name;
    document.getElementById("qbDesc").textContent = p.text;

    const item = readBuilder();

    const area = itemArea(item);

    document.getElementById("qbArea").textContent =
        area.single.toFixed(2) + " sq.ft";

    document.getElementById("qbTotalArea").textContent =
        area.total.toFixed(2) + " sq.ft";

}


// ---------------------------------------------------------------
// SPECIFICATION INPUTS
//
// Built from settings.specFields, so switching a field off in the
// admin panel removes it here and from the quotation, and a field
// added there appears here with no code change. Fields with a
// `source` become dropdowns from that option list; the rest are free
// text.
// ---------------------------------------------------------------

function visibleSpecFields() {

    const f = data.settings.specFields;

    return (Array.isArray(f) ? f : []).filter(x => x && x.show !== false);

}


function renderSpecInputs(product) {

    const box = document.getElementById("qbSpec");

    if (!box) return;

    const fields = visibleSpecFields();

    if (!fields.length) {
        document.getElementById("qbSpecWrap").style.display = "none";
        return;
    }

    document.getElementById("qbSpecWrap").style.display = "block";

    const kind = (product && product.config && product.config.kind) || "fixed";
    const presets = (data.settings.specDefaults || {})[kind] || {};

    box.innerHTML = fields.map(f => {

        const opts = f.source && data.settings.options
            ? (data.settings.options[f.source] || [])
            : null;

        const preset = presets[f.key] || "";

        if (opts && opts.length) {
            return `<label>${esc(f.label)}<select data-spec="${esc(f.key)}">`
                + `<option value=""></option>`
                + opts.map(o =>
                    `<option value="${esc(o)}"${o === preset ? " selected" : ""}>${esc(o)}</option>`
                ).join("")
                + `</select></label>`;
        }

        return `<label>${esc(f.label)}<input data-spec="${esc(f.key)}" value="${esc(preset)}"></label>`;

    }).join("");

}


function readSpec() {

    const out = {};

    document.querySelectorAll("#qbSpec [data-spec]").forEach(el => {
        out[el.dataset.spec] = el.value;
    });

    return out;

}


function esc(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
        .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}


function readBuilder() {

    const p = data.products.find(
        x => x.id === document.getElementById("qbProduct").value
    );

    const codeEl = document.getElementById("qbCode");

    return {
        id: p ? p.id : "",
        name: p ? p.name : "",
        image: p ? p.image : "",
        code: codeEl ? codeEl.value.trim() : "",
        unit: quoteUnit,
        width: parseFloat(document.getElementById("qbWidth").value) || 0,
        height: parseFloat(document.getElementById("qbHeight").value) || 0,
        qty: parseInt(document.getElementById("qbQty").value) || 1,
        // rate is pulled from the admin catalogue, never typed by the customer
        rate: p ? Number(p.rate) || 0 : 0,
        kgPerSqft: p && p.config ? Number(p.config.kgPerSqft) || 0 : 0,
        spec: readSpec()
    };

}


function addQuoteItem() {

    const item = readBuilder();

    if (!item.id) return;

    if (item.width <= 0 || item.height <= 0) {
        alert("Please enter a width and a height.");
        return;
    }

    quote.items.push(item);

    renderQuoteItems();

    closeQuoteBuilder();

    document
        .getElementById("quoteList")
        .scrollIntoView({ behavior: "smooth", block: "center" });

}


function removeQuoteItem(i) {

    quote.items.splice(i, 1);

    renderQuoteItems();

}


function renderQuoteItems() {

    const box = document.getElementById("quoteItems");

    const empty = document.getElementById("quoteEmpty");

    const actions = document.getElementById("quoteActions");

    if (!quote.items.length) {

        box.innerHTML = "";
        empty.style.display = "block";
        actions.style.display = "none";
        return;

    }

    empty.style.display = "none";
    actions.style.display = "flex";

    // Customer-facing table: type, size, area, qty. No rates, no amounts.
    box.innerHTML = `
    <table class="qtable">
      <thead><tr>
        <th></th><th>Type</th><th>Size</th><th>Area</th><th>Qty</th><th>Total area</th><th></th>
      </tr></thead>
      <tbody>
        ${quote.items.map((it, i) => {

        const u = UNITS[it.unit];
        const a = itemArea(it);

        return `<tr>
            <td><img class="qthumb" src="${itemDrawing(it)}" alt=""></td>
            <td><b>${it.name}</b></td>
            <td>${u.fmt(it.width)} &times; ${u.fmt(it.height)}</td>
            <td>${a.single.toFixed(2)} sq.ft</td>
            <td>${it.qty}</td>
            <td>${a.total.toFixed(2)} sq.ft</td>
            <td><button class="linkbtn" onclick="removeQuoteItem(${i})">Remove</button></td>
          </tr>`;

    }).join("")}
      </tbody>
    </table>`;

}


function readCustomer() {

    quote.customer.name = document.getElementById("custName").value.trim();
    quote.customer.phone = document.getElementById("custPhone").value.trim();
    quote.customer.address = document.getElementById("custAddress").value.trim();

    return quote.customer;

}


// -------------------------------------------------------------------
// RASTERISE AN SVG / IMAGE FOR jsPDF
//
// jsPDF cannot place an SVG directly, so each drawing is painted onto a
// canvas and handed over as a PNG data URI.
//
// targetW is the pixel width to render at, chosen from the size the
// image is printed at (300 dpi => mm / 25.4 * 300). Rendering at a
// blind multiple of the source size produced a 19 MB PDF that was far
// too big to send on WhatsApp.
// -------------------------------------------------------------------

function imageToPng(src, targetW) {

    return new Promise(resolve => {

        const img = new Image();

        img.onload = () => {

            const nw = img.naturalWidth || 400;
            const nh = img.naturalHeight || 300;

            const w = targetW || 600;

            const c = document.createElement("canvas");

            c.width = Math.round(w);
            c.height = Math.round(w * (nh / nw));

            const ctx = c.getContext("2d");

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(img, 0, 0, c.width, c.height);

            try {
                resolve({
                    data: c.toDataURL("image/png"),
                    w: c.width,
                    h: c.height
                });
            } catch (e) {
                resolve(null);
            }

        };

        img.onerror = () => resolve(null);

        img.src = src;

    });

}


// -------------------------------------------------------------------
// PDF
// -------------------------------------------------------------------

// The document itself is built in quote-pdf.js. This wrapper keeps the
// quotation record, so history works whichever layout is in use.
async function buildQuotePdf() {

    const r = await QPDF.build();

    if (!r) return null;

    if (window.Store) {

        const t = r.totals;

        Store.saveQuotation({
            qno: r.qno,
            date: fmtDate(new Date()),
            customer: quote.customer.name,
            phone: quote.customer.phone,
            address: quote.customer.address,
            itemCount: quote.items.length,
            items: quote.items.map(it => ({
                code: it.code || '',
                name: it.name,
                size: UNITS[it.unit].fmt(it.width) + ' x ' + UNITS[it.unit].fmt(it.height),
                qty: it.qty,
                areaSqft: Number(itemArea(it).billedTotal.toFixed(2)),
                rate: Number(it.rate) || 0,
                amount: Number(itemAmount(it).toFixed(2)),
                spec: it.spec || {}
            })),
            subtotal: Number(t.sub.toFixed(2)),
            charges: Number(t.charges.toFixed(2)),
            gstRate: gstRate(),
            gst: Number(t.gst.toFixed(2)),
            grand: money(t.grand)
        });

    }

    return r;

}


// -------------------------------------------------------------------
// ACTIONS
// -------------------------------------------------------------------

async function downloadQuotePdf() {

    const r = await withBusy(buildQuotePdf);

    if (!r) return;

    r.doc.save(r.filename);

}


async function previewQuotePdf() {

    const r = await withBusy(buildQuotePdf);

    if (!r) return;

    window.open(r.doc.output("bloburl"), "_blank");

}


// Share the actual PDF where the browser supports it (Android/iOS
// Chrome and Safari); otherwise download it and open WhatsApp with the
// covering message so the customer attaches the file themselves.
async function shareQuoteWhatsApp() {

    const r = await withBusy(buildQuotePdf);

    if (!r) return;

    const s = data.settings;

    const t = r.totals;

    const message =
        "Hello " + s.businessName + ",\n\n" +
        "Quotation " + r.qno + "\n" +
        "Name: " + quote.customer.name + "\n" +
        quote.items.map((it, i) => {
            const u = UNITS[it.unit];
            const a = itemArea(it);
            return (i + 1) + ". " + it.name + " - " +
                u.fmt(it.width) + " x " + u.fmt(it.height) +
                " x " + it.qty + " nos (" + a.total.toFixed(2) + " sq.ft)";
        }).join("\n") +
        "\n\nGrand Total (incl. " + gstRate() + "% GST): Rs " + money(t.grand) +
        "\n\nPDF quotation attached.";

    const file = new File(
        [r.doc.output("blob")],
        r.filename,
        { type: "application/pdf" }
    );

    if (navigator.canShare && navigator.canShare({ files: [file] })) {

        try {

            await navigator.share({
                files: [file],
                title: "Quotation " + r.qno,
                text: message
            });

            return;

        } catch (e) {

            // user dismissed the share sheet
            if (e && e.name === "AbortError") return;

        }

    }

    // fallback: save the file, then open WhatsApp with the text
    r.doc.save(r.filename);

    const num = (s.inquiry || s.whatsapp || "").replace(/\D/g, "");

    window.open(
        "https://wa.me/91" + num + "?text=" + encodeURIComponent(message),
        "_blank"
    );

    alert(
        "The PDF has been saved to your downloads.\n\n" +
        "WhatsApp is opening with your enquiry — attach the saved PDF " +
        "using the paperclip icon."
    );

}


// small busy-state wrapper, since rasterising + PDF build takes a moment
async function withBusy(fn) {

    const box = document.getElementById("quoteActions");

    if (box) box.classList.add("busy");

    try {

        return await fn();

    } catch (e) {

        console.error(e);

        alert("Sorry — the quotation could not be generated.\n\n" + e.message);

        return null;

    } finally {

        if (box) box.classList.remove("busy");

    }

}


// -------------------------------------------------------------------
// WIRE UP
// -------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {

    const on = (id, ev, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(ev, fn);
    };

    on("qbUnit", "change", syncUnitInputs);
    on("qbProduct", "change", () => { onProductChange(); });

    ["qbWidth", "qbHeight", "qbQty"].forEach(id => {
        on(id, "input", e => {
            e.target.dataset.touched = "1";
            qbPreview();
        });
    });

    renderQuoteItems();

});
