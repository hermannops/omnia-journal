import sharp from 'sharp';
import { writeFileSync } from 'fs';

const BG = '#1e40af';
const FG = 'white';

function makeSvg(size, rounded, fontSize) {
  const rx = rounded ? Math.round(size * 0.2) : 0;
  const cy = Math.round(size * 0.67);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="${BG}"/>
  <text x="${size / 2}" y="${cy}" font-family="Arial Black, Arial, sans-serif" font-weight="900"
    font-size="${fontSize}" text-anchor="middle" fill="${FG}"
    dominant-baseline="auto">OJ</text>
</svg>`;
}

const specs = [
  { name: 'icon-192.png',          size: 192, rounded: true,  fontSize: 96  },
  { name: 'icon-512.png',          size: 512, rounded: true,  fontSize: 256 },
  { name: 'icon-maskable-512.png', size: 512, rounded: false, fontSize: 230 },
  { name: 'favicon.png',           size: 32,  rounded: true,  fontSize: 16  },
];

for (const { name, size, rounded, fontSize } of specs) {
  const svg = Buffer.from(makeSvg(size, rounded, fontSize));
  const dest = `static/icons/${name}`;
  await sharp(svg).png().toFile(dest);
  console.log(`✓ ${dest}`);
}
