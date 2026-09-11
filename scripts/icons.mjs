// Make the PNG and ICO icons out of the one SVG logo.
//   node scripts/icons.mjs
//
// Why these exist: Google will only show a site's icon next to its search
// result when it can read a real 48-pixel-multiple bitmap, and iPhones ignore
// an SVG apple-touch-icon completely. The SVG stays for modern browsers; these
// files are the fallbacks. Uses the headless Chromium already on this machine.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(
  "C:/Users/theor/AppData/Local/Temp/claude/C--Users-theor-Downloads--claude/f7e19af6-13aa-45d4-adba-3c3cf240cdd8/scratchpad/package.json",
);
const { chromium } = require("playwright-core");

const EXE =
  "C:/Users/theor/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const svg = readFileSync(join(pub, "logo-art-of-solar.svg"), "utf8");
// iOS paints its own rounded corners and shows black behind transparency, so
// the touch icon gets a square navy background instead of the rounded one.
const squareSvg = svg.replace('rx="14"', 'rx="0"');

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function render(markup, size) {
  await page.setViewportSize({ width: size, height: size });
  const html = `<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style></head><body>${markup}</body></html>`;
  await page.setContent(html);
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

const out = {};
for (const size of [16, 32, 48, 192, 512]) out[size] = await render(svg, size);
const apple = await render(squareSvg, 180);
await browser.close();

writeFileSync(join(pub, "favicon-48x48.png"), out[48]);
writeFileSync(join(pub, "icon-192.png"), out[192]);
writeFileSync(join(pub, "icon-512.png"), out[512]);
writeFileSync(join(pub, "apple-touch-icon.png"), apple);

// An ICO is a tiny directory followed by the images. PNG entries are allowed
// inside it, so no bitmap conversion is needed.
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon type
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o); // width
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1); // height
    dir.writeUInt8(0, o + 2); // palette
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.buf)]);
}
writeFileSync(
  join(pub, "favicon.ico"),
  ico([16, 32, 48].map((size) => ({ size, buf: out[size] }))),
);

for (const f of ["favicon.ico", "favicon-48x48.png", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]) {
  console.log(f, readFileSync(join(pub, f)).length, "bytes");
}
