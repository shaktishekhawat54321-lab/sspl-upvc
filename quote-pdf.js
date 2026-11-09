// ===================================================================
// QUOTATION DOCUMENT
//
// Builds the full multi-page quotation:
//
//   1  cover letter on the letterhead          (optional)
//   2+ one specification block per item, two to a page — elevation
//      drawing, computed values, profile accessories, remarks
//   n  summary table of every line, in the columns chosen in Admin
//   n  totals: components, area, basic, charges, GST, grand total,
//      amount in words, average price per sq.ft
//   n  terms, installation pre-requisites, bank details, acceptance
//
// Every page carries the letterhead and a "page x of y" footer.
//
// Which columns, spec fields and totals rows appear is entirely driven
// by settings, so this file does not need editing to change the sheet.
// ===================================================================

const QPDF = (function () {

    const NAVY = [29, 42, 68];
    const GREEN = [0, 166, 81];
    const GREY = [105, 114, 130];
    const LINE = [222, 227, 235];
    const SOFT = [248, 250, 252];

    const M = 13;                 // page margin, mm
    const BLOCK_H = 108;          // item block height; two fit a page
    let PW = 210, PH = 297;

    // ---------- helpers ----------

    function S() { return data.settings; }

    function shown(list) {
        const a = S()[list];
        return (Array.isArray(a) ? a : []).filter(x => x && x.show !== false);
    }

    // value of one column for one line
    function cellValue(col, it, i) {

        const u = UNITS[it.unit] || UNITS.mm;
        const a = itemArea(it);
        const spec = it.spec || {};

        switch (col.key) {
            case 'sno': return String(i + 1);
            case 'drawing': return '';                       // painted in a hook
            case 'code': return it.code || ('W' + (i + 1));
            case 'name': return it.name;
            case 'location': return spec.location || '';
            case 'profile': return spec.profile || '';
            case 'glass': return spec.glass || '';
            case 'size': return u.fmt(it.width) + ' x ' + u.fmt(it.height);
            case 'areaSqft': return a.billedSingle.toFixed(2) + (a.minApplied ? ' *' : '');
            case 'qty': return String(it.qty);
            case 'totalArea': return a.billedTotal.toFixed(2);
            case 'weight': return ((Number(it.kgPerSqft) || 0) * a.billedTotal).toFixed(2);
            case 'rate': return money(it.rate);
            case 'amount': return money(itemAmount(it));
            default: return spec[col.key] || '';             // custom column
        }
    }

    // ---------- letterhead, drawn on every page ----------

    async function letterhead(doc, logo, meta) {

        const s = S();
        let y = M;

        if (logo) {
            const lw = 52, lh = lw * (logo.h / logo.w);
            doc.addImage(logo.data, 'PNG', M, y, lw, lh, 'ql', 'MEDIUM');
            y += lh + 1;
        } else {
            doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...NAVY);
            doc.text(s.businessName, M, y + 5);
            y += 8;
        }

        doc.setFont('helvetica', 'normal').setFontSize(6.8).setTextColor(...GREY);
        const addr = doc.splitTextToSize(s.address || '', 92);
        doc.text(addr, M, y + 3);
        y += 3 + addr.length * 2.9;

        let line2 = 'Phone / WhatsApp: ' + (s.inquiry || '');
        if (s.email) line2 += '   |   ' + s.email;
        if (s.website) line2 += '   |   ' + s.website;
        doc.text(line2, M, y);
        if (s.gstin) { y += 3; doc.text('GSTIN : ' + s.gstin, M, y); }

        // right block
        doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(...NAVY);
        doc.text('QUOTATION', PW - M, M + 6, { align: 'right' });

        doc.setFontSize(7.6);
        let my = M + 12;
        [['Quotation No.', meta.qno], ['Date', meta.date], ['Valid Until', meta.valid],
        meta.project ? ['Project', meta.project] : null].filter(Boolean).forEach(([k, v]) => {
            doc.setFont('helvetica', 'normal').setTextColor(...GREY);
            doc.text(k, PW - M - 30, my, { align: 'right' });
            doc.setFont('helvetica', 'bold').setTextColor(30, 30, 30);
            doc.text(String(v), PW - M, my, { align: 'right' });
            my += 4;
        });

        const base = Math.max(y, my) + 3;
        doc.setDrawColor(...GREEN).setLineWidth(0.7);
        doc.line(M, base, PW - M, base);

        return base + 6;
    }

    // ---------- cover page ----------

    function coverPage(doc, y, cust) {

        const s = S();

        doc.setFont('helvetica', 'normal').setFontSize(9.4).setTextColor(40, 44, 52);

        (s.coverLetter || []).forEach(p => {
            const w = doc.splitTextToSize(p, PW - 2 * M);
            if (y + w.length * 4.6 > PH - 50) { doc.addPage(); y = M + 6; }
            doc.text(w, M, y);
            y += w.length * 4.6 + 3.4;
        });

        y += 8;
        doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...NAVY);
        doc.text('To', M, y);
        y += 5;
        doc.setFontSize(12).setTextColor(20, 20, 20);
        doc.text(cust.name || '', M, y);
        y += 5;
        doc.setFont('helvetica', 'normal').setFontSize(8.6).setTextColor(...GREY);
        if (cust.phone) { doc.text('Phone: ' + cust.phone, M, y); y += 4; }
        if (cust.address) {
            const ca = doc.splitTextToSize(cust.address, 110);
            doc.text(ca, M, y); y += ca.length * 4;
        }

        y += 14;
        doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...NAVY);
        doc.text('For ' + s.businessName, M, y);
        y += 10;
        doc.setFont('helvetica', 'normal').setFontSize(8.4).setTextColor(...GREY);
        doc.text('Authorised Signatory', M, y);

        return y;
    }

    // ---------- one item specification block ----------

    async function itemBlock(doc, y, it, i, png) {

        const s = S();
        const u = UNITS[it.unit] || UNITS.mm;
        const a = itemArea(it);
        const spec = it.spec || {};

        const H = BLOCK_H;
        const colW = (PW - 2 * M);
        const drawW = 66;

        // header strip
        doc.setFillColor(...NAVY);
        doc.rect(M, y, colW, 7, 'F');
        doc.setFont('helvetica', 'bold').setFontSize(8.4).setTextColor(255, 255, 255);
        doc.text('Code : ' + (it.code || ('W' + (i + 1))) + '    |    ' + it.name, M + 2, y + 4.9);
        doc.text('Size : W = ' + Math.round(toMm(it.width, it.unit)) + ' ; H = ' + Math.round(toMm(it.height, it.unit)) + ' mm',
            PW - M - 2, y + 4.9, { align: 'right' });

        const top = y + 7;

        // frame
        doc.setDrawColor(...LINE).setLineWidth(0.25);
        doc.rect(M, top, colW, H - 7);

        // --- drawing ---
        if (png) {
            const maxW = drawW - 6, maxH = H - 7 - 14;
            const r = png.w / png.h;
            let w = maxW, h = w / r;
            if (h > maxH) { h = maxH; w = h * r; }
            doc.addImage(png.data, 'PNG', M + 3 + (maxW - w) / 2, top + 4 + (maxH - h) / 2, w, h,
                'it' + i, 'MEDIUM');
        }
        doc.setFont('helvetica', 'normal').setFontSize(6.6).setTextColor(...GREY);
        doc.text('View From Inside', M + drawW / 2, top + H - 7 - 3, { align: 'center' });
        doc.line(M + drawW, top, M + drawW, top + H - 7);

        // --- computed values ---
        const cx = M + drawW + 4;
        const cw = 56;
        let cy = top + 6;

        doc.setFont('helvetica', 'bold').setFontSize(7.6).setTextColor(...NAVY);
        doc.text('Computed Values', cx, cy);
        cy += 1.5;
        doc.setDrawColor(...GREEN).setLineWidth(0.4);
        doc.line(cx, cy, cx + 24, cy);
        cy += 4;

        const rows = [
            ['Sq.Ft. per window', a.billedSingle.toFixed(3)],
            ['Value per Sq.Ft.', money(it.rate) + ' INR'],
            ['Unit Price', money(a.billedSingle * (Number(it.rate) || 0)) + ' INR'],
            ['Quantity', it.qty + ' Pcs'],
            ['Value', money(itemAmount(it)) + ' INR'],
        ];
        if ((Number(it.kgPerSqft) || 0) > 0) {
            rows.push(['Weight', ((Number(it.kgPerSqft) || 0) * a.billedTotal).toFixed(3) + ' KG']);
        }

        doc.setFontSize(7.2);
        rows.forEach(([k, v], idx) => {
            if (idx % 2 === 0) { doc.setFillColor(...SOFT); doc.rect(cx - 1, cy - 3, cw, 4.6, 'F'); }
            doc.setFont('helvetica', 'normal').setTextColor(...GREY);
            doc.text(k, cx, cy);
            doc.setFont('helvetica', 'bold').setTextColor(25, 25, 25);
            doc.text(String(v), cx + cw - 2, cy, { align: 'right' });
            cy += 4.6;
        });

        // --- specification / accessories ---
        const sx = cx + cw + 5;
        const sw = PW - M - sx - 2;
        let sy = top + 6;

        doc.setFont('helvetica', 'bold').setFontSize(7.6).setTextColor(...NAVY);
        doc.text('Profile & Accessories', sx, sy);
        sy += 1.5;
        doc.setDrawColor(...GREEN).setLineWidth(0.4);
        doc.line(sx, sy, sx + 28, sy);
        sy += 4;

        doc.setFontSize(7);
        shown('specFields').forEach(f => {
            const v = spec[f.key];
            if (!v) return;
            if (sy > top + H - 7 - 4) return;                 // ran out of room
            doc.setFont('helvetica', 'normal').setTextColor(...GREY);
            doc.text(f.label + ' :', sx, sy);
            doc.setFont('helvetica', 'bold').setTextColor(25, 25, 25);
            const vv = doc.splitTextToSize(String(v), sw - 26);
            doc.text(vv[0] + (vv.length > 1 ? '…' : ''), sx + 26, sy);
            sy += 4;
        });

        return y + H + 4;
    }

    // ---------- totals ----------

    function totalsBlock(doc, y, t) {

        const s = S();
        const boxW = 96;
        const boxX = PW - M - boxW;

        doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...NAVY);
        doc.text('Quote Total', M, y + 4);

        y += 8;

        const fmt = {
            count: () => t.pieces + ' Pcs',
            area: () => t.area.toFixed(2) + ' Sq.Ft.',
            weight: () => t.weight.toFixed(2) + ' KG',
            basic: () => money(t.sub) + ' INR',
            charge: r => money(Number(r.amount) || 0) + ' INR',
            deduct: r => '- ' + money(Number(r.amount) || 0) + ' INR',
            project: () => money(t.project) + ' INR',
            gst: () => money(t.gst) + ' INR',
            grand: () => 'Rs ' + money(t.grand),
            avgex: () => money(t.avgExGst) + ' INR',
            avginc: () => money(t.avgIncGst) + ' INR',
        };

        shown('totalRows').forEach(r => {

            // a zero charge is noise on the sheet
            if ((r.kind === 'charge' || r.kind === 'deduct') && !(Number(r.amount) > 0)) return;

            const label = r.kind === 'gst' ? r.label + ' @ ' + gstRate() + '%' : r.label;
            const value = (fmt[r.kind] || (() => ''))(r);

            if (r.kind === 'grand') {
                doc.setFillColor(...NAVY);
                doc.rect(boxX, y - 3.6, boxW, 9, 'F');
                doc.setFont('helvetica', 'bold').setFontSize(9.6).setTextColor(255, 255, 255);
                doc.text(label.toUpperCase(), boxX + 2, y + 2.4);
                doc.text(value, PW - M - 2, y + 2.4, { align: 'right' });
                y += 11;
                return;
            }

            doc.setFontSize(8.4);
            doc.setFont('helvetica', 'normal').setTextColor(...GREY);
            doc.text(label, boxX + 2, y);
            doc.setFont('helvetica', 'bold').setTextColor(30, 30, 30);
            doc.text(value, PW - M - 2, y, { align: 'right' });
            y += 5;
        });

        // amount in words, to the left of the totals
        doc.setFont('helvetica', 'italic').setFontSize(7.8).setTextColor(...GREY);
        const words = doc.splitTextToSize('Amount in words: ' + amountInWords(t.grand), PW - 2 * M - boxW - 6);
        doc.text(words, M, y - 6);

        return y + 4;
    }

    // ---------- a numbered list section ----------

    function listSection(doc, y, title, items) {

        if (!items || !items.length) return y;

        if (y > PH - 50) { doc.addPage(); y = M + 6; }

        doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...NAVY);
        doc.text(title, M, y);
        y += 2;
        doc.setDrawColor(...GREEN).setLineWidth(0.5);
        doc.line(M, y, M + Math.min(60, title.length * 1.9), y);
        y += 5;

        doc.setFont('helvetica', 'normal').setFontSize(7.6).setTextColor(70, 75, 85);

        items.forEach((line, i) => {
            const w = doc.splitTextToSize((i + 1) + '. ' + line, PW - 2 * M - 4);
            if (y + w.length * 3.5 > PH - 24) { doc.addPage(); y = M + 6; }
            doc.text(w, M + 1, y);
            y += w.length * 3.5 + 1.4;
        });

        return y + 5;
    }

    // ---------- acceptance ----------

    function acceptance(doc, y) {

        const s = S();

        if (y > PH - 56) { doc.addPage(); y = M + 6; }

        doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(50, 55, 65);
        const w = doc.splitTextToSize(s.acceptanceText || '', PW - 2 * M);
        doc.text(w, M, y);
        y += w.length * 4 + 20;

        doc.setDrawColor(120, 128, 140).setLineWidth(0.4);
        doc.line(M, y, M + 62, y);
        doc.line(PW - M - 62, y, PW - M, y);

        doc.setFontSize(7.6).setTextColor(...GREY);
        doc.text('Authorised Signatory', M, y + 4);
        doc.text('Signature of Customer', PW - M, y + 4, { align: 'right' });

        return y + 10;
    }

    // ===============================================================
    // BUILD
    // ===============================================================

    async function build() {

        const cust = readCustomer();

        if (!cust.name) {
            alert('Please enter the customer name.');
            document.getElementById('custName').focus();
            return null;
        }
        if (!quote.items.length) {
            alert('Please add at least one window or door.');
            return null;
        }

        const s = S();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        PW = doc.internal.pageSize.getWidth();
        PH = doc.internal.pageSize.getHeight();

        const today = new Date();
        const valid = new Date(today);
        valid.setDate(valid.getDate() + (Number(s.validityDays) || 15));

        const meta = {
            qno: quoteNumber(),
            date: fmtDate(today),
            valid: fmtDate(valid),
            project: quote.project || ''
        };

        // rasterise once
        const logo = await imageToPng(s.logo, 740);

        const pngs = [];
        for (let i = 0; i < quote.items.length; i++) {
            pngs.push(await imageToPng(itemDrawing(quote.items[i]), 560));
        }

        const t = quoteTotals();

        // ---- page 1: cover ----
        let y = await letterhead(doc, logo, meta);

        if (s.showCoverLetter !== false) {
            coverPage(doc, y, cust);
            doc.addPage();
            y = await letterhead(doc, logo, meta);
        } else {
            doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...NAVY);
            doc.text('QUOTATION FOR', M, y);
            doc.setFontSize(12).setTextColor(20, 20, 20);
            doc.text(cust.name, M, y + 6);
            y += 14;
        }

        // ---- specification blocks, two per page ----
        for (let i = 0; i < quote.items.length; i++) {

            if (y + BLOCK_H + 4 > PH - 16) {
                doc.addPage();
                y = await letterhead(doc, logo, meta);
            }

            y = await itemBlock(doc, y, quote.items[i], i, pngs[i]);
        }

        // ---- summary table in the chosen columns ----
        const cols = shown('columns');

        if (cols.length) {

            doc.addPage();
            y = await letterhead(doc, logo, meta);

            doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...NAVY);
            doc.text('Summary', M, y + 3);
            y += 8;

            // Only the drawing and serial columns get a fixed width; the rest
            // are auto-sized. Fixing every width overflowed the page as soon
            // as optional columns were switched on.
            const colStyles = {};
            cols.forEach((c, i) => {
                colStyles[i] = { halign: c.align || 'left' };
                if (c.key === 'drawing') colStyles[i].cellWidth = 24;
                if (c.key === 'sno') colStyles[i].cellWidth = 7;
                if (c.key === 'amount') colStyles[i].fontStyle = 'bold';
            });

            // Narrow the type face a little when a lot of columns are on.
            const dense = cols.length > 9;

            const drawIdx = cols.findIndex(c => c.key === 'drawing');

            doc.autoTable({
                startY: y,
                head: [cols.map(c => c.label)],
                body: quote.items.map((it, i) => cols.map(c => cellValue(c, it, i))),
                theme: 'grid',
                margin: { left: M, right: M },
                styles: {
                    font: 'helvetica', fontSize: dense ? 5.9 : 6.8, cellPadding: dense ? 1.1 : 1.6,
                    lineColor: LINE, lineWidth: 0.2, textColor: [35, 35, 35], valign: 'middle',
                    overflow: 'linebreak'
                },
                headStyles: {
                    fillColor: NAVY, textColor: [255, 255, 255], fontSize: dense ? 5.6 : 6.4,
                    fontStyle: 'bold', halign: 'center', valign: 'middle'
                },
                alternateRowStyles: { fillColor: SOFT },
                columnStyles: colStyles,
                didParseCell: d => {
                    if (d.section === 'body' && d.column.index === drawIdx) {
                        d.cell.styles.minCellHeight = 15;
                    }
                },
                didDrawCell: d => {
                    if (d.section !== 'body' || d.column.index !== drawIdx) return;
                    const png = pngs[d.row.index];
                    if (!png) return;
                    const maxW = d.cell.width - 2, maxH = d.cell.height - 2;
                    const r = png.w / png.h;
                    let w = maxW, h = w / r;
                    if (h > maxH) { h = maxH; w = h * r; }
                    doc.addImage(png.data, 'PNG',
                        d.cell.x + (d.cell.width - w) / 2,
                        d.cell.y + (d.cell.height - h) / 2, w, h,
                        'sum' + d.row.index, 'MEDIUM');
                }
            });

            y = doc.lastAutoTable.finalY + 4;

            if (quote.items.some(it => itemArea(it).minApplied)) {
                doc.setFont('helvetica', 'italic').setFontSize(6.6).setTextColor(...GREY);
                doc.text('* Billed at the minimum area of ' + minArea().toFixed(2)
                    + ' sq.ft per unit (actual size is smaller).', M, y);
                y += 4;
            }
        }

        // ---- totals ----
        if (y + 62 > PH - 16) { doc.addPage(); y = await letterhead(doc, logo, meta); }
        y = totalsBlock(doc, y + 4, t);

        // ---- terms, prerequisites, bank, acceptance ----
        doc.addPage();
        y = await letterhead(doc, logo, meta);

        y = listSection(doc, y, 'TERMS & CONDITIONS', s.terms);

        if (s.showPrerequisites !== false) {
            y = listSection(doc, y, 'PRE-REQUISITES FOR INSTALLATION', s.prerequisites);
        }

        if (s.showBankDetails && (s.bankDetails || []).length) {
            if (y > PH - 46) { doc.addPage(); y = M + 6; }
            doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...NAVY);
            doc.text('BANK DETAILS', M, y);
            y += 6;
            doc.setFont('helvetica', 'normal').setFontSize(7.8).setTextColor(60, 65, 75);
            s.bankDetails.forEach(b => { doc.text(b, M + 1, y); y += 4; });
            y += 4;
        }

        if (s.showAcceptance !== false) y = acceptance(doc, y);

        // ---- footer on every page ----
        const pages = doc.internal.getNumberOfPages();

        for (let p = 1; p <= pages; p++) {
            doc.setPage(p);
            doc.setDrawColor(...LINE).setLineWidth(0.3);
            doc.line(M, PH - 12, PW - M, PH - 12);
            doc.setFont('helvetica', 'normal').setFontSize(6.6).setTextColor(...GREY);
            doc.text(s.businessName + '  |  ' + (s.inquiry || '') + '  |  ' + (s.email || ''), M, PH - 8);
            doc.text(p + ' of ' + pages, PW - M, PH - 8, { align: 'right' });
            doc.setFontSize(6);
            doc.text('This is a computer-generated quotation. Prices are subject to final site measurement.',
                M, PH - 5);
        }

        const safe = cust.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');

        return {
            doc: doc,
            filename: 'SSPL-Quotation-' + safe + '-' + meta.qno.split('/').pop() + '.pdf',
            totals: t,
            qno: meta.qno
        };
    }

    return { build: build };

})();

window.QPDF = QPDF;
