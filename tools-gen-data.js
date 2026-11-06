// Builds data.js — the SSPL default catalogue.
const fs = require('fs');

const img = n => 'images/types/' + n + '.svg';

const P = [
  // ---------- WINDOWS ----------
  ['upvc-sliding-2track', 'Windows', 'uPVC 2 Track Sliding Window', 'Two sliding shutters on a 2-track frame. The everyday choice for bedrooms and living rooms.', 'sliding-2track'],
  ['upvc-sliding-3track', 'Windows', 'uPVC 3 Track Sliding Window', 'Three shutters on a 3-track frame — wider openings, or two glass shutters plus a mesh.', 'sliding-3track'],
  ['upvc-casement-window', 'Windows', 'uPVC Casement Window', 'Side-hung shutters that swing fully open. Best airflow and the easiest to clean.', 'casement-window'],
  ['upvc-fixed-window', 'Windows', 'uPVC Fixed Window', 'Sealed glass panel that does not open. Maximum light and the lowest cost per sq.ft.', 'fixed-window'],
  ['upvc-tilt-turn-window', 'Windows', 'uPVC Tilt & Turn Window', 'One handle, two actions — tilt in from the top for airflow, or swing fully open.', 'tilt-turn-window'],
  ['upvc-top-hung-window', 'Windows', 'uPVC Top Hung Window', 'Hinged at the top, opens outward. Stays usable in the rain.', 'top-hung-window'],
  ['upvc-ventilator', 'Windows', 'uPVC Ventilator', 'Compact louvered vent with an exhaust fan cut-out. For kitchens, toilets and utility areas.', 'ventilator'],
  ['upvc-combination-window', 'Windows', 'uPVC Combination Window', 'Fixed glass panels either side of a sliding or openable centre.', 'combination-window'],
  ['upvc-bay-window', 'Windows', 'uPVC Bay Window', 'Three-sided window projecting outward from the wall. A feature window for living rooms.', 'bay-window'],
  ['upvc-arch-window', 'Windows', 'uPVC Arch Window', 'Arched top profile for staircases, porches and elevation features.', 'arch-window'],
  ['upvc-mosquito-sliding', 'Windows', 'uPVC Sliding Window with Mosquito Net', 'Sliding window with a built-in mesh shutter on its own track.', 'mosquito-sliding'],
  ['upvc-louvered-window', 'Windows', 'uPVC Louvered Window', 'Adjustable glass or uPVC blades. Ventilation with privacy.', 'louvered-window'],

  // ---------- DOORS ----------
  ['upvc-main-door', 'Doors', 'uPVC Main Door', 'Reinforced panelled entrance door with a multi-point lock. Your main entry.', 'main-door'],
  ['upvc-sliding-door', 'Doors', 'uPVC Sliding Door', 'Large sliding glass door for balconies, terraces and garden openings.', 'sliding-door'],
  ['upvc-casement-door', 'Doors', 'uPVC Casement Door', 'Single side-hung door with a glazed upper panel.', 'casement-door'],
  ['upvc-french-door', 'Doors', 'uPVC French Door', 'Twin glazed doors opening from the centre. Wide, bright, classic.', 'french-door'],
  ['upvc-bathroom-door', 'Doors', 'uPVC Bathroom Door', 'Fully waterproof door with a louvered base vent. Will not swell, rot or warp.', 'bathroom-door'],
  ['upvc-balcony-door', 'Doors', 'uPVC Balcony Door', 'Openable door leaf with a fixed glass side panel.', 'balcony-door'],
  ['upvc-sliding-folding-door', 'Doors', 'uPVC Sliding Folding Door', 'Multiple panels that fold and stack to one side, opening the full width.', 'sliding-folding-door'],

  // ---------- ACCESSORIES ----------
  ['upvc-mosquito-net-shutter', 'Accessories', 'Mosquito Net Shutter', 'Separate mesh shutter added to an existing window or door.', 'mosquito-net-shutter'],
  ['upvc-safety-grill', 'Accessories', 'uPVC Safety Grill', 'MS or aluminium security grill finished to match the uPVC frame.', 'safety-grill'],
];

const data = {
  settings: {
    businessName: 'Sani Steels Pvt Ltd',
    shortName: 'SSPL',
    phone: '7005132355',
    inquiry: '7005132355',
    whatsapp: '7005132355',
    email: 'online@coreindia.co.in',
    address: 'The Arch, 9th Mile, Khanapara–Jorabat Road, Near NES Bharat Petrol Pump, Above Kawasaki Showroom, Jorabat, Meghalaya 793101',
    hours: '9:30 AM – 7:30 PM',
    gstRate: 18,
    quotePrefix: 'SSPL/UPVC/',
    validityDays: 15,
    // mm -> sq.ft divisor. 90000 is the trade convention; 92903.04 is exact.
    mmDivisor: 90000,
    // Trade minimum: anything smaller is billed at this area. 0 turns it off.
    minAreaSqft: 10,
    terms: [
      'Rates are per sq.ft of the finished opening size and include standard profile, glass and hardware.',
      'Minimum billable area is 10 sq.ft per unit.',
      'GST is charged extra as shown above.',
      '50% advance with the order, balance before dispatch.',
      'Delivery in 2–3 weeks from the date of final measurement and advance.',
      'Site measurement is final; sizes given by the customer are taken as approximate.',
      'Installation is charged extra unless stated otherwise.',
      'Toughened glass, mosquito mesh, grills and special colours are charged extra.',
      'This quotation is valid for the period shown above.',
    ],
    logo: 'images/sspl-logo.svg',
    heroEyebrow: 'uPVC WINDOWS • uPVC DOORS • SINCE 1967',
    heroTitle: 'uPVC Windows & Doors, Made to Your Size',
    heroText: 'Pick a type, enter your width and height, and get a quotation in seconds — then send it straight to us on WhatsApp.',
    heroImage: 'images/types/sliding-3track.svg',
  },
  products: P.map(([id, cat, name, text, svg]) => ({
    id, cat, name, text, rate: 0, image: img(svg),
  })),
};

const out =
  '// SSPL default catalogue. Loaded by both index.html and admin.html.\n' +
  '// Rates are 0 here on purpose — the owner sets them in the Admin Panel.\n' +
  'const DEFAULT_DATA = ' + JSON.stringify(data, null, 2) + ';\n';

fs.writeFileSync(process.argv[2], out, 'utf8');
console.log('products: ' + data.products.length);
console.log('categories: ' + [...new Set(data.products.map(p => p.cat))].join(', '));
