// Converts the SSPL logo PDF (pure vector: m/l/c/h/f/f*/k) into an SVG.
// PDF y-axis points up, SVG's points down, so every y is flipped: y' = H - y.
const fs = require('fs');
const zlib = require('zlib');

const SRC = process.argv[2];
const DST = process.argv[3];
// optional colour overrides: "C M Y K=#rrggbb,..."
const OVERRIDES = {};
(process.argv[4] || '').split(',').filter(Boolean).forEach(pair => {
  const [k, v] = pair.split('=');
  OVERRIDES[k.trim()] = v.trim();
});

const buf = fs.readFileSync(SRC);
const str = buf.toString('latin1');

// --- page box ---
const mb = str.match(/MediaBox\s*\[([\d.\s-]+)\]/);
const [x0, y0, x1, y1] = mb[1].trim().split(/\s+/).map(Number);
const W = x1 - x0, H = y1 - y0;

// --- content stream ---
const objIdx = str.indexOf('/Contents');
const contentRef = str.slice(objIdx).match(/\/Contents\s+(\d+)\s+0\s+R/)[1];
const oStart = str.indexOf(contentRef + ' 0 obj');
const lenM = str.slice(oStart).match(/\/Length\s+(\d+)/);
const len = Number(lenM[1]);
let s = str.indexOf('stream', oStart) + 6;
while (buf[s] === 13 || buf[s] === 10) s++;
const content = zlib.inflateSync(buf.slice(s, s + len)).toString('latin1');

// --- CMYK -> RGB ---
function cmyk(c, m, y, k) {
  const key = [c, m, y, k].map(n => n.toFixed(2)).join(' ');
  if (OVERRIDES[key]) return OVERRIDES[key];
  const f = v => Math.round(255 * (1 - Math.min(1, v)) * (1 - Math.min(1, k)));
  const hex = n => n.toString(16).padStart(2, '0');
  return '#' + hex(f(c)) + hex(f(m)) + hex(f(y));
}

// --- tokenise ---
const toks = content.replace(/[\r\n]+/g, ' ').trim().split(/\s+/);
const num = [];
let fill = '#000000';
let path = [];
const out = [];
const Y = v => (H - v).toFixed(2);
const X = v => v.toFixed(2);

function flush(rule) {
  if (!path.length) return;
  out.push(`<path d="${path.join(' ')}" fill="${fill}"${rule === 'evenodd' ? ' fill-rule="evenodd"' : ''}/>`);
  path = [];
}

for (let i = 0; i < toks.length; i++) {
  const t = toks[i];
  if (/^-?[\d.]+$/.test(t)) { num.push(parseFloat(t)); continue; }
  switch (t) {
    case 'k': {
      const [c, m, y, kk] = num.slice(-4);
      fill = cmyk(c, m, y, kk);
      break;
    }
    case 'm': {
      const [x, y] = num.slice(-2);
      path.push(`M ${X(x)} ${Y(y)}`);
      break;
    }
    case 'l': {
      const [x, y] = num.slice(-2);
      path.push(`L ${X(x)} ${Y(y)}`);
      break;
    }
    case 'c': {
      const [a, b, c2, d, e, f] = num.slice(-6);
      path.push(`C ${X(a)} ${Y(b)} ${X(c2)} ${Y(d)} ${X(e)} ${Y(f)}`);
      break;
    }
    case 'h': path.push('Z'); break;
    case 'f': flush('nonzero'); break;
    case 'f*': flush('evenodd'); break;
    case 'n': path = []; break;
    default: break;
  }
  num.length = 0;
}
flush('nonzero');

// In the PDF the panel behind "STEELS" is the white page itself, so the SVG
// needs an explicit white backdrop or it goes transparent.
const bg = process.argv.includes('--whitebg')
  ? `<rect width="${W.toFixed(2)}" height="${H.toFixed(2)}" fill="#ffffff"/>\n`
  : '';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}" width="${Math.round(W)}" height="${Math.round(H)}" role="img">
<title>Sani Steels Pvt Ltd</title>
${bg}${out.join('\n')}
</svg>
`;
fs.writeFileSync(DST, svg, 'utf8');
console.log(`paths: ${out.length}  viewBox: ${W.toFixed(2)} x ${H.toFixed(2)}  -> ${DST}`);
console.log('fills used: ' + [...new Set(out.map(p => p.match(/fill="(#[0-9a-f]{6})"/)[1]))].join(', '));
