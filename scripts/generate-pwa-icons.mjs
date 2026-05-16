import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");
const svg = readFileSync(join(iconsDir, "icon-512.svg"));

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of sizes) {
  await sharp(svg).resize(size, size).png().toFile(join(iconsDir, name));
}

const maskableInner = 410;
const maskable = await sharp(svg)
  .resize(maskableInner, maskableInner)
  .extend({
    top: 51,
    bottom: 51,
    left: 51,
    right: 51,
    background: { r: 10, g: 10, b: 10, alpha: 1 },
  })
  .png()
  .toBuffer();

await sharp(maskable).toFile(join(iconsDir, "icon-512-maskable.png"));

console.log("PWA PNG icons generated in public/icons/");
