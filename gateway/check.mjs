/* =============================================================
 * Công cụ DÒ THANH GHI PLC (Omron FINS) — tìm/đối chiếu địa chỉ.
 * Đọc một dải word (D hoặc W…) và in giá trị mỗi giây; word bit-flags in kèm
 * danh sách BIT đang bật -> tác động cảm biến/nút thật rồi xem BIT/Ô nào đổi.
 *
 * Cách dùng:
 *   node check.mjs <IP> [AREA] [START] [COUNT]
 * Ví dụ:
 *   node check.mjs 192.168.250.11               # đọc D0..15 và W0..7
 *   node check.mjs 192.168.250.11 D 0 20        # đọc D0..D19
 *   node check.mjs 192.168.250.11 W 0 8         # đọc W0..W7 (kèm bit)
 * Dừng: Ctrl + C.
 * ============================================================= */
import pkg from 'omron-fins';
const { FinsClient } = pkg;

const [ip, area, startArg, countArg] = process.argv.slice(2);
if (!ip) {
  console.log('Thiếu IP. Ví dụ: node check.mjs 192.168.250.11 W 0 8');
  process.exit(1);
}
const port = Number(process.env.FINS_PORT || 9600);
const protocol = process.env.FINS_PROTOCOL || 'tcp';

const client = FinsClient(port, ip, { protocol, timeout: 2000 });
client.on('error', (e) => console.log('FINS error:', e?.message || e));
client.on('timeout', () => console.log('FINS timeout — kiểm tra IP/kết nối/đã bật FINS-TCP chưa'));

function read(addr, count) {
  return new Promise((resolve, reject) => {
    client.read(addr, count, (err, msg) => {
      if (err) return reject(err instanceof Error ? err : new Error(String(err)));
      const v = msg?.response?.values ?? msg?.values ?? [];
      resolve(Array.isArray(v) ? v : [v]);
    });
  });
}
const bitsSet = (v) => {
  const out = [];
  for (let i = 0; i < 16; i++) if ((v >> i) & 1) out.push(i);
  return out;
};
const hex = (v) => v.toString(16).toUpperCase().padStart(4, '0');

// Dải cần đọc
const ranges =
  area && startArg
    ? [{ a: area.toUpperCase(), s: Number(startArg), n: Number(countArg || 16) }]
    : [
        { a: 'D', s: 0, n: 16 },
        { a: 'W', s: 0, n: 8 },
      ];

async function tick() {
  const lines = [`\n=== ${ip} @ ${new Date().toLocaleTimeString('vi-VN')} ===`];
  for (const r of ranges) {
    try {
      const vals = await read(r.a + r.s, r.n);
      for (let i = 0; i < vals.length; i++) {
        const addr = `${r.a}${r.s + i}`;
        const v = Number(vals[i]) || 0;
        if (r.a === 'W' || r.a === 'H' || r.a === 'A' || r.a === 'CIO') {
          const set = bitsSet(v);
          lines.push(`${addr.padEnd(6)} = ${String(v).padStart(5)}  (0x${hex(v)})  bit bật: ${set.length ? set.join(',') : '-'}`);
        } else {
          lines.push(`${addr.padEnd(6)} = ${v}`);
        }
      }
    } catch (e) {
      lines.push(`${r.a}${r.s}.. lỗi đọc: ${e.message}`);
    }
  }
  console.log(lines.join('\n'));
}

console.log(`Dò thanh ghi ${ip}:${port}/${protocol} — nhấn Ctrl+C để dừng.`);
console.log('Mẹo: tác động cảm biến/nút (mở cửa, nhấn E-Stop…) rồi xem Ô/BIT nào đổi -> đó là địa chỉ.');
tick();
setInterval(tick, 1000);
