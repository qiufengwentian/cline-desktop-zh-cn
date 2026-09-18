import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "assets/cline-zh-patch.ico");
const glyphs = {
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
};

function image(size) {
  const stride = size * 4;
  const pixels = Buffer.alloc(stride * size);
  const scale = Math.max(1, Math.floor(size / 32));
  const radius = size * 0.46;
  const center = (size - 1) / 2;
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const row = size - 1 - y;
    const offset = row * stride + x * 4;
    pixels[offset] = color[2]; pixels[offset + 1] = color[1]; pixels[offset + 2] = color[0]; pixels[offset + 3] = color[3];
  };
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const distance = Math.hypot(x - center, y - center);
    if (distance <= radius) set(x, y, [42, 102, 204, 255]);
    if (distance > radius - Math.max(1, size / 24) && distance <= radius) set(x, y, [18, 48, 100, 255]);
  }
  const glyphScale = Math.max(1, Math.floor(size / 28));
  const gap = glyphScale * 2;
  const glyphWidth = 5 * glyphScale;
  const glyphHeight = 7 * glyphScale;
  const totalWidth = glyphWidth * 2 + gap;
  const startX = Math.floor((size - totalWidth) / 2);
  const startY = Math.floor((size - glyphHeight) / 2);
  ["Z", "H"].forEach((letter, letterIndex) => {
    glyphs[letter].forEach((line, row) => [...line].forEach((cell, column) => {
      if (cell !== "1") return;
      for (let dy = 0; dy < glyphScale; dy += 1) for (let dx = 0; dx < glyphScale; dx += 1) set(startX + letterIndex * (glyphWidth + gap) + column * glyphScale + dx, startY + row * glyphScale + dy, [255, 255, 255, 255]);
    }));
  });
  const dib = Buffer.alloc(40 + pixels.length + Math.ceil(size / 32) * 4 * size);
  dib.writeUInt32LE(40, 0); dib.writeInt32LE(size, 4); dib.writeInt32LE(size * 2, 8); dib.writeUInt16LE(1, 12); dib.writeUInt16LE(32, 14); dib.writeUInt32LE(0, 16); dib.writeUInt32LE(pixels.length, 20);
  pixels.copy(dib, 40);
  return dib;
}

const sizes = [16, 32, 48, 256];
const images = sizes.map(image);
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((data, index) => {
  const size = sizes[index]; const entry = 6 + index * 16;
  header[entry] = size === 256 ? 0 : size; header[entry + 1] = size === 256 ? 0 : size; header[entry + 2] = 0; header[entry + 3] = 0;
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6); header.writeUInt32LE(data.length, entry + 8); header.writeUInt32LE(offset, entry + 12); offset += data.length;
});
await mkdir(resolve(root, "assets"), { recursive: true });
await writeFile(output, Buffer.concat([header, ...images]));
console.log(`已生成补丁图标：${output}`);
