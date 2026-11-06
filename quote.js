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

    const gst = sub * gstRate() / 100;

    return {
        sub: sub,
        gst: gst,
        grand: sub + gst
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

    document.getElementById("qbUnit").value = quoteUnit;

    syncUnitInputs();
    qbPreview();

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


function qbPreview() {

    const p = data.products.find(
        x => x.id === document.getElementById("qbProduct").value
    );

    if (!p) return;

    document.getElementById("qbImage").src = p.image;
    document.getElementById("qbImage").alt = p.name;
    document.getElementById("qbDesc").textContent = p.text;

    const item = readBuilder();

    const area = itemArea(item);

    document.getElementById("qbArea").textContent =
        area.single.toFixed(2) + " sq.ft";

    document.getElementById("qbTotalArea").textContent =
        area.total.toFixed(2) + " sq.ft";

}


function readBuilder() {

    const p = data.products.find(
        x => x.id === document.getElementById("qbProduct").value
    );

    return {
        id: p ? p.id : "",
        name: p ? p.name : "",
        image: p ? p.image : "",
        unit: quoteUnit,
        width: parseFloat(document.getElementById("qbWidth").value) || 0,
        height: parseFloat(document.getElementById("qbHeight").value) || 0,
        qty: parseInt(document.getElementById("qbQty").value) || 1,
        // rate is pulled from the admin catalogue, never typed by the customer
        rate: p ? Number(p.rate) || 0 : 0
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
            <td><img class="qthumb" src="${it.image}" alt=""></td>
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

const NAVY = [29, 42, 68];
const GREEN = [22, 138, 74];
const GREY = [105, 114, 130];
const LINE = [222, 227, 235];


async function buildQuotePdf() {

    const cust = readCustomer();

    if (!cust.name) {
        alert("Please enter the customer name.");
        document.getElementById("custName").focus();
        return null;
    }

    if (!quote.items.length) {
        alert("Please add at least one window or door.");
        return null;
    }

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const PW = doc.internal.pageSize.getWidth();   // 210
    const M = 14;                                   // page margin

    const s = data.settings;

    // ---------- header ----------

    // 62 mm wide at ~300 dpi
    const logo = await imageToPng(s.logo, 740);

    let y = M;

    if (logo) {

        const lw = 62;
        const lh = lw * (logo.h / logo.w);

        doc.addImage(logo.data, "PNG", M, y, lw, lh, "sspllogo", "MEDIUM");

        y += lh;

    } else {

        doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(...NAVY);
        doc.text(s.businessName, M, y + 6);

        y += 10;

    }

    // company address under the logo
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...GREY);

    const addr = doc.splitTextToSize(s.address || "", 96);

    doc.text(addr, M, y + 4);

    doc.text(
        "Phone / WhatsApp: " + (s.inquiry || "") + "   |   " + (s.email || ""),
        M,
        y + 4 + addr.length * 3.4
    );

    // ---------- quotation meta (right) ----------

    doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(...NAVY);
    doc.text("QUOTATION", PW - M, M + 7, { align: "right" });

    const today = new Date();

    const valid = new Date(today);
    valid.setDate(valid.getDate() + (Number(s.validityDays) || 15));

    const qno = quoteNumber();

    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(60, 60, 60);

    const meta = [
        ["Quotation No.", qno],
        ["Date", fmtDate(today)],
        ["Valid Until", fmtDate(valid)]
    ];

    let my = M + 14;

    meta.forEach(([k, v]) => {
        doc.setTextColor(...GREY);
        doc.text(k, PW - M - 34, my, { align: "right" });
        doc.setTextColor(30, 30, 30);
        doc.setFont("helvetica", "bold");
        doc.text(String(v), PW - M, my, { align: "right" });
        doc.setFont("helvetica", "normal");
        my += 5;
    });

    y = Math.max(y + 4 + addr.length * 3.4, my) + 6;

    // green rule
    doc.setDrawColor(...GREEN).setLineWidth(0.8);
    doc.line(M, y, PW - M, y);

    y += 7;

    // ---------- customer ----------

    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...NAVY);
    doc.text("QUOTATION FOR", M, y);

    y += 5;

    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(20, 20, 20);
    doc.text(cust.name, M, y);

    y += 5;

    doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...GREY);

    if (cust.phone) {
        doc.text("Phone: " + cust.phone, M, y);
        y += 4;
    }

    if (cust.address) {
        const ca = doc.splitTextToSize(cust.address, 110);
        doc.text(ca, M, y);
        y += ca.length * 4;
    }

    y += 4;

    // ---------- items table ----------

    // Pre-render every drawing so autoTable can paint them synchronously.
    const pngs = {};

    for (const it of quote.items) {
        if (!pngs[it.image]) {
            // ~20 mm wide in the table at ~300 dpi
            pngs[it.image] = await imageToPng(it.image, 260);
        }
    }

    const body = quote.items.map((it, i) => {

        const u = UNITS[it.unit];
        const a = itemArea(it);

        return [
            String(i + 1),
            "",                                   // drawing painted in the hook
            it.name,
            u.fmt(it.width) + " x " + u.fmt(it.height),
            a.billedSingle.toFixed(2) + (a.minApplied ? " *" : ""),
            String(it.qty),
            a.billedTotal.toFixed(2),
            money(it.rate),
            money(itemAmount(it))
        ];

    });

    doc.autoTable({
        startY: y,
        head: [[
            "#", "Drawing", "Type / Description", "Size",
            "Area\n(sq.ft)", "Qty", "Total Area\n(sq.ft)",
            "Rate\n(Rs/sq.ft)", "Amount (Rs)"
        ]],
        body: body,
        theme: "grid",
        margin: { left: M, right: M },
        styles: {
            font: "helvetica",
            fontSize: 7.8,
            cellPadding: 2,
            lineColor: LINE,
            lineWidth: 0.2,
            textColor: [35, 35, 35],
            valign: "middle"
        },
        headStyles: {
            fillColor: NAVY,
            textColor: [255, 255, 255],
            fontSize: 7.2,
            fontStyle: "bold",
            halign: "center",
            valign: "middle"
        },
        columnStyles: {
            0: { cellWidth: 7, halign: "center" },
            1: { cellWidth: 22 },
            2: { cellWidth: 40 },
            3: { cellWidth: 26, halign: "center" },
            4: { cellWidth: 16, halign: "right" },
            5: { cellWidth: 10, halign: "center" },
            6: { cellWidth: 18, halign: "right" },
            7: { cellWidth: 18, halign: "right" },
            8: { halign: "right", fontStyle: "bold" }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        // reserve height for the drawing
        didParseCell: d => {
            if (d.section === "body" && d.column.index === 1) {
                d.cell.styles.minCellHeight = 16;
            }
        },
        didDrawCell: d => {

            if (d.section !== "body" || d.column.index !== 1) return;

            const it = quote.items[d.row.index];

            const png = it && pngs[it.image];

            if (!png) return;

            const maxW = d.cell.width - 3;
            const maxH = d.cell.height - 3;

            const ratio = png.w / png.h;

            let w = maxW, h = w / ratio;

            if (h > maxH) { h = maxH; w = h * ratio; }

            // alias = image src, so a repeated type is stored once
            doc.addImage(
                png.data,
                "PNG",
                d.cell.x + (d.cell.width - w) / 2,
                d.cell.y + (d.cell.height - h) / 2,
                w,
                h,
                it.image,
                "MEDIUM"
            );

        }
    });

    y = doc.lastAutoTable.finalY + 4;

    // footnote if any row was lifted to the minimum billable area
    if (quote.items.some(it => itemArea(it).minApplied)) {

        doc.setFont("helvetica", "italic").setFontSize(6.8).setTextColor(...GREY);

        doc.text(
            "* Billed at the minimum area of " + minArea().toFixed(2) +
            " sq.ft per unit (actual size is smaller).",
            M,
            y + 1
        );

        y += 4;

    }

    y += 4;

    // ---------- totals ----------

    const t = quoteTotals();

    const boxW = 78;
    const boxX = PW - M - boxW;

    const rows = [
        ["Subtotal", money(t.sub)],
        ["GST @ " + gstRate() + "%", money(t.gst)]
    ];

    doc.setFontSize(9);

    rows.forEach(([k, v]) => {
        doc.setFont("helvetica", "normal").setTextColor(...GREY);
        doc.text(k, boxX + 2, y);
        doc.setFont("helvetica", "normal").setTextColor(30, 30, 30);
        doc.text(v, PW - M - 2, y, { align: "right" });
        y += 5.5;
    });

    doc.setDrawColor(...LINE).setLineWidth(0.3);
    doc.line(boxX, y - 3.5, PW - M, y - 3.5);

    // grand total band
    doc.setFillColor(...NAVY);
    doc.rect(boxX, y - 1, boxW, 10, "F");

    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(255, 255, 255);
    doc.text("GRAND TOTAL", boxX + 2, y + 5.5);
    doc.text("Rs " + money(t.grand), PW - M - 2, y + 5.5, { align: "right" });

    // amount in words (left of the totals)
    doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(...GREY);

    const words = doc.splitTextToSize(
        "Amount in words: " + amountInWords(t.grand),
        PW - 2 * M - boxW - 6
    );

    doc.text(words, M, y + 2);

    y += 16;

    // ---------- terms ----------

    const terms = Array.isArray(s.terms) ? s.terms : [];

    if (terms.length) {

        // start a new page if there is no room
        if (y > 236) { doc.addPage(); y = M; }

        doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...NAVY);
        doc.text("TERMS & CONDITIONS", M, y);

        y += 4;

        doc.setDrawColor(...GREEN).setLineWidth(0.5);
        doc.line(M, y, M + 34, y);

        y += 5;

        doc.setFont("helvetica", "normal").setFontSize(7.6).setTextColor(70, 75, 85);

        terms.forEach((line, i) => {

            const wrapped = doc.splitTextToSize((i + 1) + ". " + line, PW - 2 * M - 4);

            if (y + wrapped.length * 3.4 > 276) { doc.addPage(); y = M; }

            doc.text(wrapped, M + 1, y);

            y += wrapped.length * 3.4 + 1.4;

        });

    }

    // ---------- footer on every page ----------

    const pages = doc.internal.getNumberOfPages();

    for (let p = 1; p <= pages; p++) {

        doc.setPage(p);

        const PH = doc.internal.pageSize.getHeight();

        doc.setDrawColor(...LINE).setLineWidth(0.3);
        doc.line(M, PH - 14, PW - M, PH - 14);

        doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...GREY);

        doc.text(
            s.businessName + "  |  " + (s.inquiry || "") + "  |  " + (s.email || ""),
            M,
            PH - 9.5
        );

        doc.text("Page " + p + " of " + pages, PW - M, PH - 9.5, { align: "right" });

        doc.setFontSize(6.5);
        doc.text(
            "This is a computer-generated quotation. Prices are subject to final site measurement.",
            M,
            PH - 6
        );

    }

    // Record the quotation. In cloud mode this lands in Firestore so the
    // owner sees it on any device; otherwise it stays on this browser.
    if (window.Store) {

        Store.saveQuotation({
            qno: qno,
            date: fmtDate(today),
            customer: cust.name,
            phone: cust.phone,
            address: cust.address,
            itemCount: quote.items.length,
            items: quote.items.map(it => ({
                name: it.name,
                size: UNITS[it.unit].fmt(it.width) + " x " + UNITS[it.unit].fmt(it.height),
                qty: it.qty,
                areaSqft: Number(itemArea(it).billedTotal.toFixed(2)),
                rate: Number(it.rate) || 0,
                amount: Number(itemAmount(it).toFixed(2))
            })),
            subtotal: Number(t.sub.toFixed(2)),
            gstRate: gstRate(),
            gst: Number(t.gst.toFixed(2)),
            grand: money(t.grand)
        });

    }


    const safeName = cust.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");

    return {
        doc: doc,
        filename: "SSPL-Quotation-" + safeName + "-" + qno.split("/").pop() + ".pdf",
        totals: t,
        qno: qno
    };

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
    on("qbProduct", "change", qbPreview);

    ["qbWidth", "qbHeight", "qbQty"].forEach(id => {
        on(id, "input", e => {
            e.target.dataset.touched = "1";
            qbPreview();
        });
    });

    renderQuoteItems();

});
