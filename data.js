// SSPL default catalogue. Loaded by both index.html and admin.html.
// Rates are 0 here on purpose — the owner sets them in the Admin Panel.
const DEFAULT_DATA = {
  "settings": {
    "businessName": "Sani Steels Pvt Ltd",
    "shortName": "SSPL",
    "phone": "7005132355",
    "inquiry": "7005132355",
    "whatsapp": "7005132355",
    "email": "online@coreindia.co.in",
    "address": "The Arch, 9th Mile, Khanapara–Jorabat Road, Near NES Bharat Petrol Pump, Above Kawasaki Showroom, Jorabat, Meghalaya 793101",
    "hours": "9:30 AM – 7:30 PM",
    "gstRate": 18,
    "quotePrefix": "SSPL/UPVC/",
    "validityDays": 15,
    "mmDivisor": 90000,
    "minAreaSqft": 10,
    "terms": [
      "Rates are per sq.ft of the finished opening size and include standard profile, glass and hardware.",
      "Minimum billable area is 10 sq.ft per unit.",
      "GST is charged extra as shown above.",
      "50% advance with the order, balance before dispatch.",
      "Delivery in 2–3 weeks from the date of final measurement and advance.",
      "Site measurement is final; sizes given by the customer are taken as approximate.",
      "Installation is charged extra unless stated otherwise.",
      "Toughened glass, mosquito mesh, grills and special colours are charged extra.",
      "This quotation is valid for the period shown above."
    ],
    "logo": "images/sspl-logo.svg",
    "heroEyebrow": "uPVC WINDOWS • uPVC DOORS • SINCE 1967",
    "heroTitle": "uPVC Windows & Doors, Made to Your Size",
    "heroText": "Pick a type, enter your width and height, and get a quotation in seconds — then send it straight to us on WhatsApp.",
    "heroImage": "images/types/sliding-3track.svg"
  },
  "products": [
    {
      "id": "upvc-sliding-2track",
      "cat": "Windows",
      "name": "uPVC 2 Track Sliding Window",
      "text": "Two sliding shutters on a 2-track frame. The everyday choice for bedrooms and living rooms.",
      "rate": 0,
      "image": "images/types/sliding-2track.svg"
    },
    {
      "id": "upvc-sliding-3track",
      "cat": "Windows",
      "name": "uPVC 3 Track Sliding Window",
      "text": "Three shutters on a 3-track frame — wider openings, or two glass shutters plus a mesh.",
      "rate": 0,
      "image": "images/types/sliding-3track.svg"
    },
    {
      "id": "upvc-casement-window",
      "cat": "Windows",
      "name": "uPVC Casement Window",
      "text": "Side-hung shutters that swing fully open. Best airflow and the easiest to clean.",
      "rate": 0,
      "image": "images/types/casement-window.svg"
    },
    {
      "id": "upvc-fixed-window",
      "cat": "Windows",
      "name": "uPVC Fixed Window",
      "text": "Sealed glass panel that does not open. Maximum light and the lowest cost per sq.ft.",
      "rate": 0,
      "image": "images/types/fixed-window.svg"
    },
    {
      "id": "upvc-tilt-turn-window",
      "cat": "Windows",
      "name": "uPVC Tilt & Turn Window",
      "text": "One handle, two actions — tilt in from the top for airflow, or swing fully open.",
      "rate": 0,
      "image": "images/types/tilt-turn-window.svg"
    },
    {
      "id": "upvc-top-hung-window",
      "cat": "Windows",
      "name": "uPVC Top Hung Window",
      "text": "Hinged at the top, opens outward. Stays usable in the rain.",
      "rate": 0,
      "image": "images/types/top-hung-window.svg"
    },
    {
      "id": "upvc-ventilator",
      "cat": "Windows",
      "name": "uPVC Ventilator",
      "text": "Compact louvered vent with an exhaust fan cut-out. For kitchens, toilets and utility areas.",
      "rate": 0,
      "image": "images/types/ventilator.svg"
    },
    {
      "id": "upvc-combination-window",
      "cat": "Windows",
      "name": "uPVC Combination Window",
      "text": "Fixed glass panels either side of a sliding or openable centre.",
      "rate": 0,
      "image": "images/types/combination-window.svg"
    },
    {
      "id": "upvc-bay-window",
      "cat": "Windows",
      "name": "uPVC Bay Window",
      "text": "Three-sided window projecting outward from the wall. A feature window for living rooms.",
      "rate": 0,
      "image": "images/types/bay-window.svg"
    },
    {
      "id": "upvc-arch-window",
      "cat": "Windows",
      "name": "uPVC Arch Window",
      "text": "Arched top profile for staircases, porches and elevation features.",
      "rate": 0,
      "image": "images/types/arch-window.svg"
    },
    {
      "id": "upvc-mosquito-sliding",
      "cat": "Windows",
      "name": "uPVC Sliding Window with Mosquito Net",
      "text": "Sliding window with a built-in mesh shutter on its own track.",
      "rate": 0,
      "image": "images/types/mosquito-sliding.svg"
    },
    {
      "id": "upvc-louvered-window",
      "cat": "Windows",
      "name": "uPVC Louvered Window",
      "text": "Adjustable glass or uPVC blades. Ventilation with privacy.",
      "rate": 0,
      "image": "images/types/louvered-window.svg"
    },
    {
      "id": "upvc-main-door",
      "cat": "Doors",
      "name": "uPVC Main Door",
      "text": "Reinforced panelled entrance door with a multi-point lock. Your main entry.",
      "rate": 0,
      "image": "images/types/main-door.svg"
    },
    {
      "id": "upvc-sliding-door",
      "cat": "Doors",
      "name": "uPVC Sliding Door",
      "text": "Large sliding glass door for balconies, terraces and garden openings.",
      "rate": 0,
      "image": "images/types/sliding-door.svg"
    },
    {
      "id": "upvc-casement-door",
      "cat": "Doors",
      "name": "uPVC Casement Door",
      "text": "Single side-hung door with a glazed upper panel.",
      "rate": 0,
      "image": "images/types/casement-door.svg"
    },
    {
      "id": "upvc-french-door",
      "cat": "Doors",
      "name": "uPVC French Door",
      "text": "Twin glazed doors opening from the centre. Wide, bright, classic.",
      "rate": 0,
      "image": "images/types/french-door.svg"
    },
    {
      "id": "upvc-bathroom-door",
      "cat": "Doors",
      "name": "uPVC Bathroom Door",
      "text": "Fully waterproof door with a louvered base vent. Will not swell, rot or warp.",
      "rate": 0,
      "image": "images/types/bathroom-door.svg"
    },
    {
      "id": "upvc-balcony-door",
      "cat": "Doors",
      "name": "uPVC Balcony Door",
      "text": "Openable door leaf with a fixed glass side panel.",
      "rate": 0,
      "image": "images/types/balcony-door.svg"
    },
    {
      "id": "upvc-sliding-folding-door",
      "cat": "Doors",
      "name": "uPVC Sliding Folding Door",
      "text": "Multiple panels that fold and stack to one side, opening the full width.",
      "rate": 0,
      "image": "images/types/sliding-folding-door.svg"
    },
    {
      "id": "upvc-mosquito-net-shutter",
      "cat": "Accessories",
      "name": "Mosquito Net Shutter",
      "text": "Separate mesh shutter added to an existing window or door.",
      "rate": 0,
      "image": "images/types/mosquito-net-shutter.svg"
    },
    {
      "id": "upvc-safety-grill",
      "cat": "Accessories",
      "name": "uPVC Safety Grill",
      "text": "MS or aluminium security grill finished to match the uPVC frame.",
      "rate": 0,
      "image": "images/types/safety-grill.svg"
    }
  ]
};
