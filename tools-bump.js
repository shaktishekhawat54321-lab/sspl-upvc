// Stamps a version onto every local script/stylesheet reference in the
// HTML pages, so browsers fetch the new files after a deployment instead
// of serving a stale cached copy.
//
//   node tools-bump.js            -> bump to a fresh timestamp
//   node tools-bump.js 12         -> set an explicit version
//
// GitHub Pages sends caching headers we do not control, so without this
// a customer who visited before an update can keep running the old
// JavaScript against the new data for hours.
const fs = require('fs');

const LOCAL = /^(?!https?:)(?!\/\/)[\w./-]+\.(js|css)$/;
const PAGES = ['index.html', 'admin.html'];

const version = process.argv[2] || String(Math.floor(Date.now() / 1000));

let changed = 0;

PAGES.forEach(page => {

    let h = fs.readFileSync(page, 'utf8');

    h = h.replace(/(src|href)="([^"]+)"/g, (full, attr, url) => {
        const bare = url.split('?')[0];
        if (!LOCAL.test(bare)) return full;          // leave CDN and page links alone
        changed++;
        return `${attr}="${bare}?v=${version}"`;
    });

    fs.writeFileSync(page, h);
});

// Roll the service-worker cache name too. Without this an installed app
// keeps serving the previous build out of its own cache and never sees
// the update, however many times the asset URLs change.
if (fs.existsSync('sw.js')) {
    const sw = fs.readFileSync('sw.js', 'utf8')
        .replace(/const CACHE_VERSION = '[^']*';/, "const CACHE_VERSION = 'v" + version + "';");
    fs.writeFileSync('sw.js', sw);
    console.log('rolled the service-worker cache to v' + version);
}

console.log(`stamped ${changed} local asset references with v=${version}`);
