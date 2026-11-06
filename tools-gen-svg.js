// Generates line-drawing SVGs for each uPVC window / door type.
// Uniform 400x300 canvas so they sit evenly in the product grid.
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

const FRAME = '#1d2a44';   // uPVC profile
const GLASS = '#e8f0f8';   // glass fill
const GLASS2 = '#d7e6f3';  // alternate pane
const MESH = '#b9c6d6';    // mosquito mesh
const ACC = '#168a4a';     // motion / direction accent
const HW = '#7c879b';      // hardware

const FW = 7;              // frame stroke width
const MW = 5;              // mullion stroke width

function wrap(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" role="img">
<rect width="400" height="300" fill="#ffffff"/>
${inner}
</svg>`;
}

// outer uPVC frame
function frame(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${FRAME}" stroke-width="${FW}"/>`;
}
function pane(x, y, w, h, fill = GLASS) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${FRAME}" stroke-width="${MW}"/>`;
}
// sliding direction arrow
function arrowH(x1, x2, y) {
  const d = x2 > x1 ? 1 : -1;
  return `<g stroke="${ACC}" stroke-width="3" fill="none" stroke-linecap="round">
<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>
<polyline points="${x2 - 9 * d},${y - 6} ${x2},${y} ${x2 - 9 * d},${y + 6}"/></g>`;
}
function handleV(x, y) {
  return `<rect x="${x - 3}" y="${y - 13}" width="6" height="26" rx="3" fill="${HW}"/>`;
}
function handleH(x, y) {
  return `<rect x="${x - 13}" y="${y - 3}" width="26" height="6" rx="3" fill="${HW}"/>`;
}
// hinge-side opening indicator: dashed triangle pointing to the hinge edge
function hingeTri(x1, y1, x2, y2, xm, ym) {
  return `<polyline points="${x1},${y1} ${xm},${ym} ${x2},${y2}" fill="none" stroke="${ACC}" stroke-width="2.5" stroke-dasharray="7 6"/>`;
}

const S = {};

/* ---------------- WINDOWS ---------------- */

S['sliding-2track'] = () => {
  const x = 40, y = 50, w = 320, h = 200;
  return wrap(`${frame(x, y, w, h)}
${pane(x + 10, y + 10, w / 2 - 15, h - 20, GLASS)}
${pane(x + w / 2 + 5, y + 10, w / 2 - 15, h - 20, GLASS2)}
${handleV(x + w / 2 - 14, y + h / 2)}
${handleV(x + w / 2 + 16, y + h / 2)}
${arrowH(x + 40, x + 125, y + h + 22)}
${arrowH(x + w - 40, x + w - 125, y + h + 22)}`);
};

S['sliding-3track'] = () => {
  const x = 30, y = 50, w = 340, h = 200, pw = w / 3;
  return wrap(`${frame(x, y, w, h)}
${pane(x + 8, y + 10, pw - 12, h - 20, GLASS)}
${pane(x + pw + 4, y + 10, pw - 12, h - 20, GLASS2)}
${pane(x + 2 * pw, y + 10, pw - 10, h - 20, GLASS)}
${handleV(x + pw - 14, y + h / 2)}
${handleV(x + 2 * pw - 18, y + h / 2)}
${arrowH(x + 45, x + 110, y + h + 22)}
${arrowH(x + w - 45, x + w - 110, y + h + 22)}`);
};

S['casement-window'] = () => {
  const x = 60, y = 45, w = 280, h = 210;
  return wrap(`${frame(x, y, w, h)}
${pane(x + 10, y + 10, w / 2 - 15, h - 20)}
${pane(x + w / 2 + 5, y + 10, w / 2 - 15, h - 20)}
${hingeTri(x + w / 2 - 8, y + 14, x + w / 2 - 8, y + h - 14, x + 16, y + h / 2)}
${hingeTri(x + w / 2 + 8, y + 14, x + w / 2 + 8, y + h - 14, x + w - 16, y + h / 2)}
${handleV(x + w / 2 - 18, y + h / 2)}
${handleV(x + w / 2 + 20, y + h / 2)}`);
};

S['fixed-window'] = () => {
  const x = 60, y = 45, w = 280, h = 210;
  return wrap(`${frame(x, y, w, h)}
${pane(x + 12, y + 12, w - 24, h - 24)}
<line x1="${x + 30}" y1="${y + h - 30}" x2="${x + w - 40}" y2="${y + 30}" stroke="#ffffff" stroke-width="14" opacity=".75"/>
<line x1="${x + 70}" y1="${y + h - 24}" x2="${x + w - 26}" y2="${y + 60}" stroke="#ffffff" stroke-width="8" opacity=".6"/>`);
};

S['tilt-turn-window'] = () => {
  const x = 95, y = 45, w = 210, h = 210;
  return wrap(`${frame(x, y, w, h)}
${pane(x + 12, y + 12, w - 24, h - 24)}
${hingeTri(x + w - 18, y + 16, x + w - 18, y + h - 16, x + 18, y + h / 2)}
${hingeTri(x + 18, y + h - 18, x + w - 18, y + h - 18, x + w / 2, y + 20)}
${handleV(x + w - 24, y + h / 2)}`);
};

S['top-hung-window'] = () => {
  const x = 60, y = 60, w = 280, h = 180;
  return wrap(`${frame(x, y, w, h)}
${pane(x + 12, y + 12, w - 24, h - 24)}
${hingeTri(x + 20, y + h - 18, x + w - 20, y + h - 18, x + w / 2, y + 20)}
${handleH(x + w / 2, y + h - 24)}`);
};

S['ventilator'] = () => {
  const x = 125, y = 70, w = 150, h = 160;
  let louvers = '';
  for (let i = 0; i < 3; i++) {
    const ly = y + 22 + i * 20;
    louvers += `<line x1="${x + 18}" y1="${ly}" x2="${x + w - 18}" y2="${ly}" stroke="${FRAME}" stroke-width="5" stroke-linecap="round"/>`;
  }
  return wrap(`${frame(x, y, w, h)}
${louvers}
${pane(x + 14, y + 86, w - 28, h - 100)}
<circle cx="${x + w / 2}" cy="${y + 86 + (h - 100) / 2}" r="22" fill="none" stroke="${FRAME}" stroke-width="5"/>
<g stroke="${FRAME}" stroke-width="4" stroke-linecap="round">
<line x1="${x + w / 2}" y1="${y + 86 + (h - 100) / 2}" x2="${x + w / 2}" y2="${y + 86 + (h - 100) / 2 - 20}"/>
<line x1="${x + w / 2}" y1="${y + 86 + (h - 100) / 2}" x2="${x + w / 2 + 18}" y2="${y + 86 + (h - 100) / 2 + 10}"/>
<line x1="${x + w / 2}" y1="${y + 86 + (h - 100) / 2}" x2="${x + w / 2 - 18}" y2="${y + 86 + (h - 100) / 2 + 10}"/></g>`);
};

S['combination-window'] = () => {
  const x = 30, y = 50, w = 340, h = 200;
  return wrap(`${frame(x, y, w, h)}
${pane(x + 10, y + 10, 110, h - 20, GLASS2)}
${pane(x + 128, y + 10, 110, h - 20, GLASS)}
${pane(x + 246, y + 10, w - 256, h - 20, GLASS2)}
${handleV(x + 232, y + h / 2)}
${arrowH(x + 150, x + 225, y + h + 22)}
<text x="${x + 65}" y="${y + h + 26}" font-family="Arial" font-size="15" fill="${FRAME}" text-anchor="middle">FIXED</text>
<text x="${x + 300}" y="${y + h + 26}" font-family="Arial" font-size="15" fill="${FRAME}" text-anchor="middle">FIXED</text>`);
};

S['bay-window'] = () => {
  return wrap(`<g fill="${GLASS}" stroke="${FRAME}" stroke-width="${FW}" stroke-linejoin="round">
<polygon points="40,110 95,60 95,240 40,240"/>
<polygon points="105,60 295,60 295,240 105,240" fill="${GLASS2}"/>
<polygon points="305,60 360,110 360,240 305,240"/></g>
<line x1="200" y1="66" x2="200" y2="234" stroke="${FRAME}" stroke-width="${MW}"/>
${handleV(190, 150)}${handleV(212, 150)}`);
};

S['arch-window'] = () => {
  const x = 85, y = 60, w = 230, h = 190;
  return wrap(`<path d="M${x} ${y + h} L${x} ${y + 70} A ${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + 70} L${x + w} ${y + h} Z" fill="${GLASS}" stroke="${FRAME}" stroke-width="${FW}" stroke-linejoin="round"/>
<path d="M${x + 12} ${y + 72} A ${w / 2 - 12} ${w / 2 - 12} 0 0 1 ${x + w - 12} ${y + 72}" fill="none" stroke="${FRAME}" stroke-width="${MW}"/>
<line x1="${x + 12}" y1="${y + 72}" x2="${x + w - 12}" y2="${y + 72}" stroke="${FRAME}" stroke-width="${MW}"/>
<line x1="${x + w / 2}" y1="${y + 72}" x2="${x + w / 2}" y2="${y + h}" stroke="${FRAME}" stroke-width="${MW}"/>
${handleV(x + w / 2 - 12, y + 140)}${handleV(x + w / 2 + 14, y + 140)}`);
};

S['mosquito-sliding'] = () => {
  const x = 30, y = 50, w = 340, h = 200, pw = w / 3;
  let mesh = '';
  const mx = x + 2 * pw, my = y + 10, mw = pw - 10, mh = h - 20;
  for (let i = 8; i < mw; i += 9) mesh += `<line x1="${mx + i}" y1="${my}" x2="${mx + i}" y2="${my + mh}" stroke="${MESH}" stroke-width="1.6"/>`;
  for (let i = 8; i < mh; i += 9) mesh += `<line x1="${mx}" y1="${my + i}" x2="${mx + mw}" y2="${my + i}" stroke="${MESH}" stroke-width="1.6"/>`;
  return wrap(`${frame(x, y, w, h)}
${pane(x + 8, y + 10, pw - 12, h - 20, GLASS)}
${pane(x + pw + 4, y + 10, pw - 12, h - 20, GLASS2)}
<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" fill="#f7fafc"/>
${mesh}
<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" fill="none" stroke="${FRAME}" stroke-width="${MW}"/>
<text x="${mx + mw / 2}" y="${y + h + 26}" font-family="Arial" font-size="15" fill="${ACC}" text-anchor="middle">MESH</text>
${arrowH(x + 50, x + 115, y + h + 22)}`);
};

S['louvered-window'] = () => {
  const x = 95, y = 50, w = 210, h = 200;
  let l = '';
  for (let i = 0; i < 7; i++) {
    const ly = y + 24 + i * 24;
    l += `<rect x="${x + 16}" y="${ly}" width="${w - 32}" height="12" rx="6" fill="${GLASS}" stroke="${FRAME}" stroke-width="3"/>`;
  }
  return wrap(`${frame(x, y, w, h)}${l}${handleV(x + w - 10, y + h / 2)}`);
};

/* ---------------- DOORS ---------------- */

S['main-door'] = () => {
  const x = 120, y = 30, w = 160, h = 245;
  return wrap(`${frame(x, y, w, h)}
<rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" fill="${GLASS2}" stroke="${FRAME}" stroke-width="${MW}"/>
<rect x="${x + 26}" y="${y + 26}" width="${w - 52}" height="78" fill="#ffffff" stroke="${FRAME}" stroke-width="3.5"/>
<rect x="${x + 26}" y="${y + 118}" width="${w - 52}" height="60" fill="#ffffff" stroke="${FRAME}" stroke-width="3.5"/>
<rect x="${x + 26}" y="${y + 192}" width="${w - 52}" height="36" fill="#ffffff" stroke="${FRAME}" stroke-width="3.5"/>
<circle cx="${x + w - 26}" cy="${y + h / 2}" r="7" fill="${HW}"/>
<rect x="${x + w - 30}" y="${y + h / 2 + 10}" width="8" height="30" rx="4" fill="${HW}"/>
${hingeTri(x + w - 14, y + 16, x + w - 14, y + h - 16, x + 16, y + h / 2)}`);
};

S['sliding-door'] = () => {
  const x = 40, y = 30, w = 320, h = 245;
  return wrap(`${frame(x, y, w, h)}
${pane(x + 10, y + 10, w / 2 - 15, h - 20, GLASS)}
${pane(x + w / 2 + 5, y + 10, w / 2 - 15, h - 20, GLASS2)}
${handleV(x + w / 2 - 16, y + h / 2)}
${handleV(x + w / 2 + 18, y + h / 2)}
${arrowH(x + 45, x + 125, y + h + 18)}
${arrowH(x + w - 45, x + w - 125, y + h + 18)}`);
};

S['casement-door'] = () => {
  const x = 125, y = 30, w = 150, h = 245;
  return wrap(`${frame(x, y, w, h)}
${pane(x + 12, y + 12, w - 24, h - 24, GLASS)}
<line x1="${x + 12}" y1="${y + 150}" x2="${x + w - 12}" y2="${y + 150}" stroke="${FRAME}" stroke-width="${MW}"/>
${handleV(x + w - 24, y + 130)}
${hingeTri(x + w - 16, y + 18, x + w - 16, y + h - 18, x + 18, y + h / 2)}`);
};

S['french-door'] = () => {
  const x = 70, y = 30, w = 260, h = 245;
  const grid = (px) => {
    let g = '';
    for (let i = 1; i < 3; i++) g += `<line x1="${px + 10}" y1="${y + 12 + i * (h - 24) / 3}" x2="${px + w / 2 - 22}" y2="${y + 12 + i * (h - 24) / 3}" stroke="${FRAME}" stroke-width="3"/>`;
    return g;
  };
  return wrap(`${frame(x, y, w, h)}
${pane(x + 10, y + 10, w / 2 - 15, h - 20, GLASS)}
${pane(x + w / 2 + 5, y + 10, w / 2 - 15, h - 20, GLASS)}
${grid(x)}${grid(x + w / 2 - 5)}
${handleV(x + w / 2 - 16, y + h / 2)}${handleV(x + w / 2 + 18, y + h / 2)}
${hingeTri(x + w / 2 - 10, y + 18, x + w / 2 - 10, y + h - 18, x + 18, y + h / 2)}
${hingeTri(x + w / 2 + 12, y + 18, x + w / 2 + 12, y + h - 18, x + w - 18, y + h / 2)}`);
};

S['bathroom-door'] = () => {
  const x = 130, y = 30, w = 140, h = 245;
  let lo = '';
  for (let i = 0; i < 4; i++) lo += `<line x1="${x + 24}" y1="${y + 196 + i * 14}" x2="${x + w - 24}" y2="${y + 196 + i * 14}" stroke="${FRAME}" stroke-width="4" stroke-linecap="round"/>`;
  return wrap(`${frame(x, y, w, h)}
<rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" fill="${GLASS2}" stroke="${FRAME}" stroke-width="${MW}"/>
<rect x="${x + 26}" y="${y + 30}" width="${w - 52}" height="90" fill="#ffffff" stroke="${FRAME}" stroke-width="3.5"/>
${lo}
<circle cx="${x + w - 26}" cy="${y + 150}" r="7" fill="${HW}"/>
${hingeTri(x + w - 14, y + 16, x + w - 14, y + h - 16, x + 16, y + h / 2)}`);
};

S['balcony-door'] = () => {
  const x = 100, y = 30, w = 200, h = 245;
  return wrap(`${frame(x, y, w, h)}
${pane(x + 10, y + 10, 72, h - 20, GLASS2)}
${pane(x + 92, y + 10, w - 102, h - 20, GLASS)}
<text x="${x + 46}" y="${y + h + 22}" font-family="Arial" font-size="14" fill="${FRAME}" text-anchor="middle">FIXED</text>
${handleV(x + 104, y + h / 2)}
${hingeTri(x + 100, y + 18, x + 100, y + h - 18, x + w - 20, y + h / 2)}`);
};

S['sliding-folding-door'] = () => {
  const x = 40, y = 22, w = 320, h = 222;
  let p = '';
  for (let i = 0; i < 4; i++) p += pane(x + 10 + i * 78, y + 10, 70, h - 20, i % 2 ? GLASS2 : GLASS);
  return wrap(`${frame(x, y, w, h)}${p}
${arrowH(x + 250, x + 60, y + h + 18)}
<text x="${x + w / 2}" y="${y + h + 40}" font-family="Arial" font-size="15" fill="${ACC}" text-anchor="middle">FOLDS TO ONE SIDE</text>`);
};

/* ---------------- ACCESSORIES ---------------- */

S['mosquito-net-shutter'] = () => {
  const x = 110, y = 50, w = 180, h = 200;
  let mesh = '';
  for (let i = 10; i < w - 20; i += 9) mesh += `<line x1="${x + 10 + i}" y1="${y + 10}" x2="${x + 10 + i}" y2="${y + h - 10}" stroke="${MESH}" stroke-width="1.6"/>`;
  for (let i = 10; i < h - 20; i += 9) mesh += `<line x1="${x + 10}" y1="${y + 10 + i}" x2="${x + w - 10}" y2="${y + 10 + i}" stroke="${MESH}" stroke-width="1.6"/>`;
  return wrap(`${frame(x, y, w, h)}
<rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" fill="#f7fafc"/>
${mesh}
<rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" fill="none" stroke="${FRAME}" stroke-width="${MW}"/>`);
};

S['safety-grill'] = () => {
  const x = 80, y = 50, w = 240, h = 200;
  let g = '';
  for (let i = 1; i < 6; i++) g += `<line x1="${x + i * (w / 6)}" y1="${y + 12}" x2="${x + i * (w / 6)}" y2="${y + h - 12}" stroke="${FRAME}" stroke-width="5" stroke-linecap="round"/>`;
  for (let i = 1; i < 3; i++) g += `<line x1="${x + 12}" y1="${y + i * (h / 3)}" x2="${x + w - 12}" y2="${y + i * (h / 3)}" stroke="${FRAME}" stroke-width="5" stroke-linecap="round"/>`;
  return wrap(`${frame(x, y, w, h)}<rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" fill="${GLASS}"/>${g}`);
};

let n = 0;
for (const [name, fn] of Object.entries(S)) {
  fs.writeFileSync(path.join(OUT, name + '.svg'), fn(), 'utf8');
  n++;
}
console.log('wrote ' + n + ' svg files to ' + OUT);
