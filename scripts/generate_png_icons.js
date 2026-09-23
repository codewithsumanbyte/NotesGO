const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Low-level pure Node.js PNG encoder
function encodePng(width, height, getRgba) {
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getRgba(x, y);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (-(c & 1) & 0xEDB88320);
    }
    return ~c >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    header,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Signed distance to rounded rectangle
function sdRoundRect(px, py, rx, ry, rw, rh, rad) {
  const cx = rx + rw / 2;
  const cy = ry + rh / 2;
  const dx = Math.abs(px - cx) - (rw / 2 - rad);
  const dy = Math.abs(py - cy) - (rh / 2 - rad);
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  const dInside = Math.min(Math.max(dx, dy), 0);
  return Math.hypot(ox, oy) + dInside - rad;
}

// Point in polygon test
function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function renderNotesGoIcon(targetSize) {
  return encodePng(targetSize, targetSize, (targetX, targetY) => {
    // Map to 512x512 master coordinate space
    const x = (targetX / targetSize) * 512;
    const y = (targetY / targetSize) * 512;

    // 1. Squircle background [16, 16, 480, 480], radius 116
    const dSquircle = sdRoundRect(x, y, 16, 16, 480, 480, 116);
    if (dSquircle > 1.5) {
      return [0, 0, 0, 0]; // Transparent outside
    }

    // Border: stroke 8
    const isBorder = dSquircle >= -6 && dSquircle <= 1.5;

    // Radial gradient for background
    const distCenter = Math.hypot(x - 256, y - 200) / 320;
    let bgR = Math.round(30 - distCenter * 23);
    let bgG = Math.round(62 - distCenter * 43);
    let bgB = Math.round(47 - distCenter * 33);
    bgR = Math.max(7, Math.min(30, bgR));
    bgG = Math.max(19, Math.min(62, bgG));
    bgB = Math.max(14, Math.min(47, bgB));

    if (isBorder) {
      // Border color: #244134
      return [36, 65, 52, 255];
    }

    // 2. Elements of NotesGO Logomark
    // A. Left Spine (Pillar 1)
    const dSpine = sdRoundRect(x, y, 156, 136, 80, 240, 28);
    if (dSpine <= 0) {
      // Mint to Teal gradient (#2DD4BF -> #0D9488)
      const t = Math.max(0, Math.min(1, (y - 136) / 240));
      const r = Math.round(45 * (1 - t) + 13 * t);
      const g = Math.round(212 * (1 - t) + 148 * t);
      const b = Math.round(191 * (1 - t) + 136 * t);
      return [r, g, b, 255];
    }

    // B. Diagonal Bridge (Pillar 2)
    const polyBridge = [
      [228, 160],
      [332, 308],
      [356, 300],
      [356, 156],
      [288, 156],
      [288, 216],
      [228, 160]
    ];
    if (pointInPoly(x, y, polyBridge)) {
      // Mint to Emerald gradient (#2DD4BF -> #4ADE80)
      const t = Math.max(0, Math.min(1, (x - 228) / 130));
      const r = Math.round(45 * (1 - t) + 74 * t);
      const g = Math.round(212 * (1 - t) + 222 * t);
      const b = Math.round(191 * (1 - t) + 128 * t);
      return [r, g, b, 255];
    }

    // C. Forward Velocity Chevron (Pillar 3)
    const polyChevron = [
      [284, 376],
      [340, 376],
      [356, 344],
      [356, 260],
      [308, 308],
      [284, 376]
    ];
    if (pointInPoly(x, y, polyChevron)) {
      return [74, 222, 128, 255]; // Emerald #4ADE80
    }

    // D. Velocity Speed Arrow Head
    const polyArrow = [
      [344, 140],
      [396, 192],
      [396, 220],
      [356, 260],
      [356, 192],
      [344, 140]
    ];
    if (pointInPoly(x, y, polyArrow)) {
      return [110, 231, 183, 255]; // Bright mint #6EE7B7
    }

    // E. Sparkle Star at (396, 140)
    const dSparkle = Math.hypot(x - 396, y - 140);
    if (dSparkle <= 7) {
      return [248, 250, 252, 255]; // White center #F8FAFC
    }
    if (dSparkle <= 15) {
      return [74, 222, 128, 255]; // Emerald glow ring
    }

    // Antialias squircle outer edge
    if (dSquircle > 0) {
      const alpha = Math.round(255 * (1 - dSquircle / 1.5));
      return [bgR, bgG, bgB, alpha];
    }

    return [bgR, bgG, bgB, 255];
  });
}

// Generate all standard PWA and Favicon sizes
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons into:', publicDir);

const sizes = [
  { size: 512, name: 'icon-512.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 48, name: 'favicon-48.png' },
  { size: 32, name: 'favicon-32.png' }
];

for (const { size, name } of sizes) {
  const pngBuf = renderNotesGoIcon(size);
  const outPath = path.join(publicDir, name);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`✓ Created ${name} (${size}x${size}, ${pngBuf.length} bytes)`);
}

// Create multi-image or single-image ICO file for public/favicon.ico
// ICO header: 6 bytes. Directory entry: 16 bytes. Then PNG data.
const fav32 = fs.readFileSync(path.join(publicDir, 'favicon-32.png'));
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // 1 Image

const icoDir = Buffer.alloc(16);
icoDir.writeUInt8(32, 0); // Width
icoDir.writeUInt8(32, 1); // Height
icoDir.writeUInt8(0, 2); // Colors
icoDir.writeUInt8(0, 3); // Reserved
icoDir.writeUInt16LE(1, 4); // Color planes
icoDir.writeUInt16LE(32, 6); // Bits per pixel
icoDir.writeUInt32LE(fav32.length, 8); // Size of image data
icoDir.writeUInt32LE(6 + 16, 12); // Offset of image data

const icoBuf = Buffer.concat([icoHeader, icoDir, fav32]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);
console.log('✓ Created favicon.ico');

console.log('All PWA and favicon icons generated successfully!');
