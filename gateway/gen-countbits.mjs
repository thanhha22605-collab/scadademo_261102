/* =============================================================
 * Sinh danh sách bit "chỗ đỗ" (车位) để đếm số xe — từ bảng Symbols export.
 * Lọc mọi dòng có chữ 车位 (kể cả bị lỗi font GBK: "³µÎ»") rồi lấy địa chỉ BIT.
 *
 * Cách dùng:
 *   node gen-countbits.mjs symbols.txt              # tự tìm 车位 / ³µÎ»
 *   node gen-countbits.mjs symbols.txt "车位"        # chỉ định từ khoá khác
 * Dán kết quả (mảng bits) vào một preset loại tháp trong presets.mjs.
 * ============================================================= */
import fs from 'node:fs';

const [file, kwArg] = process.argv.slice(2);
if (!file) {
  console.log('Cách dùng: node gen-countbits.mjs <file-symbols> ["từ khoá"]');
  process.exit(1);
}
const buf = fs.readFileSync(file);
const latin = buf.toString('latin1').split(/\r?\n/);
const utf8 = buf.toString('utf8').split(/\r?\n/);
const KW = kwArg ? [kwArg] : ['车位', '³µÎ»'];
// bỏ qua bit TỔNG theo tầng (X层车位) để tránh đếm trùng — chỉ giữ chỗ có số
const SKIP = ['层车位', '²ã³µÎ»'];
const addrRx = /\b(W|H|A|CIO|D)0*(\d+)\.(\d{1,2})\b/i;

const seen = new Set();
const out = [];
for (let i = 0; i < latin.length; i++) {
  const hay = latin[i] + ' ' + (utf8[i] || '');
  if (!KW.some((k) => hay.includes(k))) continue;
  if (SKIP.some((k) => hay.includes(k))) continue;
  const m = latin[i].match(addrRx);
  if (!m) continue;
  const a = m[1].toUpperCase() + m[2] + '.' + m[3].padStart(2, '0');
  if (!seen.has(a)) {
    seen.add(a);
    out.push(a);
  }
}
console.log(`// ${out.length} bit chỗ đỗ (车位) — đối chiếu tổng với số HMI hiển thị`);
console.log('countBits: [');
for (let i = 0; i < out.length; i += 8)
  console.log('  ' + out.slice(i, i + 8).map((a) => `'${a}'`).join(', ') + ',');
console.log('],');
