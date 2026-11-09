// ===================================================================
// PARAMETRIC ELEVATION DRAWINGS
//
// Draws a to-scale technical elevation of a window or door from its
// actual configuration, in the convention used on fabrication
// quotations:
//
//   - frame and sash profiles drawn at scale thickness
//   - sash labels S1..Sn boxed at the head
//   - circled pane numbers matching the glass note, e.g. "(1,2)"
//   - opening indication: dashed hinge triangles for casement work,
//     horizontal arrows for sliders
//   - running dimensions along the bottom, overall height at the left
//   - GHH (glass handle height) call-out where there is a handle
//   - frame mark (F1) and, for sliders, a track plan beneath
//
// Everything scales from millimetres, so a 600 mm ventilator and a
// 4419 mm shopfront both come out correctly proportioned.
// ===================================================================

const DRAW = (function () {

    // ---------- palette ----------
    const FRAME_DARK = "#3a3f45";   // profile body
    const FRAME_EDGE = "#23272b";   // profile outline
    const FRAME_LITE = "#5a6168";   // profile highlight
    const GLASS = "#b8e2ef";        // clear glazing
    const GLASS_FROST = "#dfe9ee";  // frosted glazing
    const INK = "#1a1a1a";          // dimensions and text
    const DIM = "#555f6a";          // dimension lines
    const ARROW = "#1f6f8b";        // direction arrows
    const HW = "#2b2f33";           // hardware

    // ---------- geometry constants (mm, scaled with the drawing) ----
    const OUTER_MM = 60;    // outer frame face width
    const SASH_MM = 46;     // sash face width
    const MULL_MM = 40;     // mullion / interlock

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // ---------- small svg helpers ----------
    function rect(x, y, w, h, fill, stroke, sw) {
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0, w).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}"`
            + ` fill="${fill || "none"}"${stroke ? ` stroke="${stroke}" stroke-width="${sw || 1}"` : ""}/>`;
    }

    function text(x, y, s, opts) {
        const o = opts || {};
        return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="Arial, Helvetica, sans-serif"`
            + ` font-size="${o.size || 13}" fill="${o.fill || INK}"`
            + `${o.bold ? ' font-weight="bold"' : ""}`
            + ` text-anchor="${o.anchor || "middle"}"`
            + `${o.rotate ? ` transform="rotate(${o.rotate} ${x.toFixed(1)} ${y.toFixed(1)})"` : ""}>${esc(s)}</text>`;
    }

    // a boxed label, as used for S1 / F1 / TN marks
    function tag(cx, cy, s, size) {
        const fs = size || 12;
        const w = String(s).length * fs * 0.68 + 8;
        const h = fs + 7;
        return rect(cx - w / 2, cy - h / 2, w, h, "#ffffff", INK, 1)
            + text(cx, cy + fs * 0.36, s, { size: fs });
    }

    // dimension line with end ticks and a centred figure
    function dimH(x1, x2, y, label, size) {
        const a = 5;
        return `<g stroke="${DIM}" stroke-width="1.1" fill="none">`
            + `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>`
            + `<polyline points="${x1 + a},${y - a} ${x1},${y} ${x1 + a},${y + a}"/>`
            + `<polyline points="${x2 - a},${y - a} ${x2},${y} ${x2 - a},${y + a}"/>`
            + `</g>`
            + `<rect x="${((x1 + x2) / 2 - String(label).length * (size || 15) * 0.34).toFixed(1)}" y="${(y - (size || 15) * 0.78).toFixed(1)}"`
            + ` width="${(String(label).length * (size || 15) * 0.68).toFixed(1)}" height="${((size || 15) * 1.05).toFixed(1)}" fill="#ffffff"/>`
            + text((x1 + x2) / 2, y + (size || 15) * 0.3, label, { size: size || 15 });
    }

    function dimV(y1, y2, x, label, size) {
        const a = 5;
        return `<g stroke="${DIM}" stroke-width="1.1" fill="none">`
            + `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>`
            + `<polyline points="${x - a},${y1 + a} ${x},${y1} ${x + a},${y1 + a}"/>`
            + `<polyline points="${x - a},${y2 - a} ${x},${y2} ${x + a},${y2 - a}"/>`
            + `</g>`
            + text(x - (size || 15) * 0.55, (y1 + y2) / 2, label, { size: size || 15, rotate: -90 });
    }

    function arrowH(x1, x2, y) {
        const d = x2 > x1 ? 1 : -1;
        return `<g stroke="${ARROW}" stroke-width="2" fill="none" stroke-linecap="round">`
            + `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>`
            + `<polyline points="${x2 - 7 * d},${y - 5} ${x2},${y} ${x2 - 7 * d},${y + 5}"/></g>`;
    }

    // circled pane number
    function paneNo(cx, cy, n) {
        return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="13" fill="#ffffff" stroke="${INK}" stroke-width="1.3"/>`
            + text(cx, cy + 5, n, { size: 14 });
    }

    // ---------- opening symbols ----------
    // casement: dashed lines from the two stile corners to the mid-point
    // of the hinge edge. "left" means hinged on the left.
    function casementSymbol(x, y, w, h, hinge) {
        const inset = 4;
        const L = x + inset, R = x + w - inset, T = y + inset, B = y + h - inset;
        let pts;
        if (hinge === "left") pts = `${R},${T} ${L},${(T + B) / 2} ${R},${B}`;
        else if (hinge === "right") pts = `${L},${T} ${R},${(T + B) / 2} ${L},${B}`;
        else if (hinge === "top") pts = `${L},${B} ${(L + R) / 2},${T} ${R},${B}`;
        else pts = `${L},${T} ${(L + R) / 2},${B} ${R},${T}`;   // bottom hung
        return `<polyline points="${pts}" fill="none" stroke="${ARROW}" stroke-width="1.4" stroke-dasharray="7 5"/>`;
    }

    // tilt & turn: a turn triangle plus a tilt triangle
    function tiltTurnSymbol(x, y, w, h, hinge) {
        return casementSymbol(x, y, w, h, hinge)
            + casementSymbol(x, y, w, h, "bottom");
    }

    function handle(x, y, side) {
        // simple lever on the stile
        const d = side === "left" ? -1 : 1;
        return rect(x - 2, y - 16, 4, 32, HW)
            + rect(x, y - 2, 22 * d, 4, HW);
    }

    // ===============================================================
    // MAIN
    //
    // spec:
    //   widthMm, heightMm   overall size
    //   panels              [{ w: <share>, kind, hinge, pane }]
    //                       kind: "fixed" | "casement" | "slider" |
    //                             "tophung" | "tiltturn" | "louvre"
    //   tracks              number of slider tracks (draws a plan)
    //   ghh                 handle height in mm (optional)
    //   frameMark           e.g. "F1"
    //   showDims            default true
    // ===============================================================
    function elevation(spec) {

        const W = Number(spec.widthMm) || 1200;
        const H = Number(spec.heightMm) || 1200;

        const panels = (spec.panels && spec.panels.length)
            ? spec.panels
            : [{ w: 1, kind: "fixed", pane: 1 }];

        const hasPlan = !!spec.tracks && spec.tracks > 1;

        // --- layout box ---
        const padL = 104, padR = 48, padT = 38;
        const padB = hasPlan ? 176 : 104;

        // scale so the drawing fits a sensible canvas
        const boxW = 560;
        const scale = boxW / W;
        const boxH = H * scale;

        const SVGW = boxW + padL + padR;
        const SVGH = boxH + padT + padB;

        const x0 = padL, y0 = padT;

        const of = OUTER_MM * scale;       // outer frame thickness in px
        const sf = SASH_MM * scale;
        const mu = MULL_MM * scale;

        let s = "";

        // ---------- outer frame ----------
        s += rect(x0, y0, boxW, boxH, FRAME_DARK, FRAME_EDGE, 1.4);
        s += rect(x0 + of * 0.42, y0 + of * 0.42, boxW - of * 0.84, boxH - of * 0.84, "none", FRAME_LITE, 0.8);

        // ---------- panel bands ----------
        const totalShare = panels.reduce((a, p) => a + (Number(p.w) || 1), 0);
        const innerX = x0 + of, innerY = y0 + of;
        const innerW = boxW - of * 2, innerH = boxH - of * 2;

        // Panels abut: the sash and interlock profiles are drawn inside
        // each panel, so taking a gap out of one side as well would make
        // equal leaves come out unequal (820/840 instead of 900/900).
        let cx = innerX;
        const geo = [];

        panels.forEach((p, i) => {
            const share = (Number(p.w) || 1) / totalShare;
            const pw = innerW * share;
            geo.push({ x: cx, w: pw, p: p, i: i });
            cx += pw;
        });

        geo.forEach((g, i) => {
            const p = g.p;
            const moving = p.kind && p.kind !== "fixed" && p.kind !== "louvre";

            // sash frame for anything that opens
            let gx = g.x, gy = innerY, gw = g.w, gh = innerH;
            if (moving) {
                s += rect(gx, gy, gw, gh, FRAME_DARK, FRAME_EDGE, 1.2);
                gx += sf; gy += sf; gw -= sf * 2; gh -= sf * 2;
            }

            // glazing
            const fill = p.frosted ? GLASS_FROST : GLASS;
            if (p.kind === "louvre") {
                s += rect(gx, gy, gw, gh, "#ffffff", FRAME_EDGE, 1);
                const n = Math.max(3, Math.round(gh / (28 * scale * 10)) || 6);
                for (let k = 0; k < n; k++) {
                    const ly = gy + 6 + k * ((gh - 12) / n);
                    s += rect(gx + 3, ly, gw - 6, Math.max(3, (gh - 12) / n - 5), fill, FRAME_EDGE, 0.9);
                }
            } else {
                s += rect(gx, gy, gw, gh, fill, FRAME_EDGE, 1);
            }

            const mx = gx + gw / 2, my = gy + gh / 2;

            // opening symbol
            if (p.kind === "casement") s += casementSymbol(gx, gy, gw, gh, p.hinge || "left");
            if (p.kind === "tophung") s += casementSymbol(gx, gy, gw, gh, "top");
            if (p.kind === "tiltturn") s += tiltTurnSymbol(gx, gy, gw, gh, p.hinge || "right");

            // pane number, and slide arrow for sliders
            if (p.kind === "slider") {
                s += paneNo(mx, my - 14, p.pane != null ? p.pane : i + 1);
                const dir = p.dir === "left" ? -1 : 1;
                if (p.dir === "both") {
                    s += arrowH(mx + 4, mx + Math.min(46, gw / 2 - 6), my + 14);
                    s += arrowH(mx - 4, mx - Math.min(46, gw / 2 - 6), my + 14);
                } else {
                    s += arrowH(mx - 22 * dir, mx + Math.min(40, gw / 2 - 8) * dir, my + 14);
                }
            } else if (p.kind !== "louvre") {
                s += paneNo(mx, my, p.pane != null ? p.pane : i + 1);
            }

            // sash tag at the head
            if (moving) s += tag(gx + gw / 2, innerY + 16, "S" + (i + 1));

            // handle + GHH call-out
            if (p.handle) {
                const hy = spec.ghh ? y0 + boxH - (spec.ghh * scale) : my;
                const side = p.handle === "left" ? "left" : "right";
                const hx = side === "left" ? gx + 6 : gx + gw - 6;
                s += handle(hx, hy, side);
                if (spec.ghh) {
                    s += tag(hx + (side === "left" ? 54 : -54), hy + 26, "GHH = " + spec.ghh, 10);
                }
            }
        });

        // ---------- frame mark ----------
        s += tag(x0 + boxW - of - 20, y0 + boxH - of - 18, spec.frameMark || "F1", 11);

        // ---------- dimensions ----------
        if (spec.showDims !== false) {
            // overall height, left
            s += dimV(y0, y0 + boxH, x0 - 46, Math.round(H), 22);

            // running widths along the bottom
            const dy = y0 + boxH + 30;
            if (geo.length > 1) {
                // Running widths are quoted as shares of the OVERALL size,
                // so they add up to the overall figure beneath them — the
                // convention fabrication drawings use.
                geo.forEach(g => {
                    const mm = Math.round(W * (Number(g.p.w) || 1) / totalShare);
                    s += dimH(g.x, g.x + g.w, dy, mm, 18);
                });
                s += dimH(x0, x0 + boxW, dy + 38, Math.round(W), 22);
            } else {
                s += dimH(x0, x0 + boxW, dy, Math.round(W), 22);
            }
        }

        // ---------- slider track plan ----------
        if (hasPlan) {
            const py = y0 + boxH + (geo.length > 1 ? 88 : 56) + 26;
            // Plan through the tracks: one lane per track, each sash shown
            // in its own lane and staggered across the opening, so the
            // overlap and which leaf sits outermost are both readable.
            const n = spec.tracks;
            const lane = 15;
            const planH = 8 + n * lane;

            s += rect(x0, py, boxW, planH, "#ffffff", FRAME_EDGE, 1.2);

            const leaves = Math.max(n, geo.length);
            const segW = boxW / leaves * 1.06;

            for (let k = 0; k < n; k++) {
                const ty = py + 4 + k * lane;
                // spread the leaves left-to-right across the frame
                const sx = leaves > 1
                    ? x0 + (boxW - segW) * (k / (leaves - 1))
                    : x0 + 2;
                s += rect(sx, ty, segW, lane - 3, "#ffffff", FRAME_EDGE, 1);
            }
            s += text(x0 + boxW / 2, py - 5, "OUT", { size: 11, fill: DIM });
            s += text(x0 + boxW / 2, py + planH + 13, "IN", { size: 11, fill: DIM });
            s += tag(x0 + boxW + 18, py + planH / 2, "TN", 11);
        }

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.round(SVGW)} ${Math.round(SVGH)}"`
            + ` width="${Math.round(SVGW)}" height="${Math.round(SVGH)}" role="img">`
            + `<title>${esc(spec.title || "Elevation")}</title>`
            + `<rect width="${Math.round(SVGW)}" height="${Math.round(SVGH)}" fill="#ffffff"/>`
            + s + `</svg>`;
    }

    // ---------------------------------------------------------------
    // Build a panel list for a catalogue product at a given size.
    // Each product carries a "config" describing how it is made up;
    // panel widths are divided from the real width.
    // ---------------------------------------------------------------
    function panelsFor(config, widthMm) {

        const c = config || {};
        const kind = c.kind || "fixed";
        const n = Math.max(1, Number(c.panels) || 1);

        // sliders: equal leaves, alternating slide direction
        if (kind === "slider") {
            const dirs = c.dirs || [];
            return Array.from({ length: n }, (_, i) => ({
                w: 1, kind: "slider", pane: i + 1,
                dir: dirs[i] || (i === 0 ? "right" : i === n - 1 ? "left" : "both"),
                frosted: !!c.frosted
            }));
        }

        // casement / tilt&turn / top hung: alternating hinge sides,
        // handle on the leaf that carries it
        if (kind === "casement" || kind === "tiltturn" || kind === "tophung") {
            return Array.from({ length: n }, (_, i) => ({
                w: 1,
                kind: kind,
                pane: i + 1,
                hinge: kind === "tophung" ? "top" : (i === 0 ? "left" : "right"),
                handle: (n === 1 || i === n - 1) ? (n === 1 ? "right" : "left") : null,
                frosted: !!c.frosted
            }));
        }

        // combination: fixed | opener | fixed
        if (kind === "combination") {
            return [
                { w: 1, kind: "fixed", pane: 1, frosted: !!c.frosted },
                { w: 1.1, kind: c.openerKind || "slider", pane: 2, dir: "right", handle: "left", frosted: !!c.frosted },
                { w: 1, kind: "fixed", pane: 3, frosted: !!c.frosted }
            ];
        }

        if (kind === "louvre") {
            return [{ w: 1, kind: "louvre", pane: 1 }];
        }

        // plain fixed glazing, optionally divided by Georgian bars
        return Array.from({ length: n }, (_, i) => ({
            w: 1, kind: "fixed", pane: i + 1, frosted: !!c.frosted
        }));
    }

    function forProduct(product, widthMm, heightMm, opts) {
        const o = opts || {};
        const c = (product && product.config) || {};
        return elevation({
            widthMm: widthMm,
            heightMm: heightMm,
            panels: panelsFor(c, widthMm),
            tracks: c.tracks || 0,
            ghh: o.ghh != null ? o.ghh : (c.handle ? Math.round(Math.min(1100, heightMm * 0.48)) : 0),
            frameMark: o.frameMark || "F1",
            title: (product && product.name) || "Elevation",
            showDims: o.showDims !== false
        });
    }

    return { elevation: elevation, forProduct: forProduct, panelsFor: panelsFor };

})();

window.DRAW = DRAW;
