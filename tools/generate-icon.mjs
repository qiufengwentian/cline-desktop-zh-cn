import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "assets/cline-zh-patch.ico");
function image(size) {
  const stride = size * 4;
  const pixels = Buffer.alloc(stride * size);
  const radius = size * 0.18;
  const inset = Math.max(1, Math.floor(size * 0.16));
  const set = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const row = size - 1 - y;
    const offset = row * stride + x * 4;
    pixels[offset] = color[2]; pixels[offset + 1] = color[1]; pixels[offset + 2] = color[0]; pixels[offset + 3] = color[3];
  };
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const inside = x >= inset && x < size - inset && y >= inset && y < size - inset;
    const corner = Math.min(x - inset, size - inset - 1 - x, y - inset, size - inset - 1 - y);
    if (inside && corner >= 0 && (corner >= radius || (x >= inset + radius && x < size - inset - radius) || (y >= inset + radius && y < size - inset - radius))) set(x, y, [54, 63, 70, 255]);
  }
  const line = Math.max(1, Math.floor(size / 12));
  const left = Math.floor(size * 0.26); const right = Math.floor(size * 0.74);
  const top = Math.floor(size * 0.34); const bottom = Math.floor(size * 0.62);
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) {
    const border = x < left + line || x >= right - line || y < top + line || y >= bottom - line;
    if (border) set(x, y, [245, 245, 245, 255]);
  }
  for (let y = bottom; y < bottom + line * 2; y += 1) for (let x = Math.floor(size * 0.58); x < Math.floor(size * 0.7); x += 1) set(x, y, [245, 245, 245, 255]);
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
