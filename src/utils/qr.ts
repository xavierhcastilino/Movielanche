/**
 * Minimal QR Code encoder (byte mode, error-correction level M, versions 1-10).
 * Dependency-free so the project's tech stack stays unchanged. Returns a square
 * matrix of booleans where `true` is a dark module.
 */

const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const MAX_VERSION = 10;

const bit = (value: number, index: number) => ((value >>> index) & 1) !== 0;

function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const positions = [6];
  for (let i = 0, pos = size - 7; i < count - 1; i += 1, pos -= step) positions.splice(1, 0, pos);
  return positions;
}

function rawModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const count = Math.floor(version / 7) + 2;
    result -= (25 * count - 10) * count - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

const dataCodewords = (version: number) => Math.floor(rawModules(version) / 8) - ECC_PER_BLOCK[version] * NUM_BLOCKS[version];

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function reedSolomonDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 2);
  }
  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => { result[i] ^= gfMultiply(coef, factor); });
  }
  return result;
}

function addEccAndInterleave(data: number[], version: number): number[] {
  const blocks = NUM_BLOCKS[version];
  const eccLen = ECC_PER_BLOCK[version];
  const raw = Math.floor(rawModules(version) / 8);
  const shortBlocks = blocks - (raw % blocks);
  const shortLen = Math.floor(raw / blocks);
  const divisor = reedSolomonDivisor(eccLen);
  const list: number[][] = [];
  for (let i = 0, k = 0; i < blocks; i += 1) {
    const chunk = data.slice(k, k + shortLen - eccLen + (i < shortBlocks ? 0 : 1));
    k += chunk.length;
    const ecc = reedSolomonRemainder(chunk, divisor);
    if (i < shortBlocks) chunk.push(0);
    list.push(chunk.concat(ecc));
  }
  const result: number[] = [];
  for (let i = 0; i < list[0].length; i += 1) {
    list.forEach((block, j) => { if (i !== shortLen - eccLen || j >= shortBlocks) result.push(block[i]); });
  }
  return result;
}

function penalty(m: boolean[][]): number {
  const size = m.length;
  let score = 0;
  const scanLine = (get: (i: number) => boolean) => {
    let run = 1;
    for (let i = 1; i < size; i += 1) {
      if (get(i) === get(i - 1)) { run += 1; if (run === 5) score += 3; else if (run > 5) score += 1; } else run = 1;
    }
    const bits = Array.from({ length: size }, (_, i) => (get(i) ? 1 : 0)).join('');
    for (const pattern of ['00001011101', '10111010000']) {
      let from = bits.indexOf(pattern);
      while (from !== -1) { score += 40; from = bits.indexOf(pattern, from + 1); }
    }
  };
  for (let y = 0; y < size; y += 1) scanLine((x) => m[y][x]);
  for (let x = 0; x < size; x += 1) scanLine((y) => m[y][x]);
  for (let y = 0; y < size - 1; y += 1) for (let x = 0; x < size - 1; x += 1) {
    if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3;
  }
  const dark = m.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  score += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  return score;
}

const MASKS: Array<(x: number, y: number) => boolean> = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

export function encodeQr(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  let version = 1;
  while (version <= MAX_VERSION && 4 + (version < 10 ? 8 : 16) + bytes.length * 8 > dataCodewords(version) * 8) version += 1;
  if (version > MAX_VERSION) throw new Error('QR payload is too long.');

  const bits: number[] = [];
  const push = (value: number, count: number) => { for (let i = count - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  bytes.forEach((byte) => push(byte, 8));
  const capacity = dataCodewords(version) * 8;
  push(0, Math.min(4, capacity - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));

  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const setFn = (x: number, y: number, dark: boolean) => { modules[y][x] = dark; isFunction[y][x] = true; };

  for (let i = 0; i < size; i += 1) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy += 1) for (let dx = -4; dx <= 4; dx += 1) {
      const x = cx + dx; const y = cy + dy; const dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, dist !== 2 && dist !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const align = alignmentPositions(version);
  align.forEach((ay, i) => align.forEach((ax, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) setFn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));

  const drawFormat = (mask: number) => {
    const formatData = (0 << 3) | mask; // error-correction level M has format bits 00
    let rem = formatData;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const f = ((formatData << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i += 1) setFn(8, i, bit(f, i));
    setFn(8, 7, bit(f, 6)); setFn(8, 8, bit(f, 7)); setFn(7, 8, bit(f, 8));
    for (let i = 9; i < 15; i += 1) setFn(14 - i, 8, bit(f, i));
    for (let i = 0; i < 8; i += 1) setFn(size - 1 - i, 8, bit(f, i));
    for (let i = 8; i < 15; i += 1) setFn(8, size - 15 + i, bit(f, i));
    setFn(8, size - 8, true);
  };
  drawFormat(0);
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const v = (version << 12) | rem;
    for (let i = 0; i < 18; i += 1) {
      const a = size - 11 + (i % 3); const b = Math.floor(i / 3);
      setFn(a, b, bit(v, i)); setFn(b, a, bit(v, i));
    }
  }

  const codewords = addEccAndInterleave(data, version);
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert += 1) for (let j = 0; j < 2; j += 1) {
      const x = right - j;
      const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
      if (!isFunction[y][x] && index < codewords.length * 8) {
        modules[y][x] = bit(codewords[index >>> 3], 7 - (index & 7));
        index += 1;
      }
    }
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) if (!isFunction[y][x] && MASKS[mask](x, y)) modules[y][x] = !modules[y][x];
  };
  let best = 0; let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    applyMask(mask); drawFormat(mask);
    const score = penalty(modules);
    if (score < bestScore) { best = mask; bestScore = score; }
    applyMask(mask);
  }
  applyMask(best); drawFormat(best);
  return modules;
}
