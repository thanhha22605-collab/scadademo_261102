/* =============================================================
 * Kiểm chứng đường đọc FINS THẬT mà KHÔNG cần PLC.
 * Dựng một FINS/TCP server giả (đáp handshake + trả word có bit15 set),
 * chạy Poller thật (mock=false) đọc qua omron-fins, rồi so kết quả.
 *   node gateway/test-fins.mjs
 * ============================================================= */
import net from 'node:net';
import assert from 'node:assert/strict';
import pkg from 'omron-fins';
import { Poller } from './core.mjs';

/* ---- Bản đồ thanh ghi giả cho 1 tháp loai_16 (capacity 16) ----
 * countBits: W8.00-05, W2.12-13, W1.13-14, W4.12-14, W3.13-15
 * estop W0.00, fault W15.07, door W1.08
 * Vùng W (work) mã FINS = 0xB1 = 177. */
const W = 177;
const REG = new Map();
const set = (addr, val) => REG.set(`${W}:${addr}`, val & 0xffff);
set(8, 0x003f); // W8: bit0..5 = 1  -> 6 xe (chỗ 0..5)
set(2, 0x1000); // W2: bit12=1,bit13=0 -> +1 (chỗ 6)
set(1, 0x2100); // W1: bit13=1(chỗ8), bit8=1 (cửa ĐÓNG); bit14=0
set(4, 0x5000); // W4: bit12=1(chỗ10), bit13=0, bit14=1(chỗ12) -> +2
set(3, 0x8000); // W3: bit15=1(chỗ15) -> +1  *** word ÂM khi đọc int16 -> test Fix B ***
set(0, 0x0000); // W0: estop bit0 = 0
set(15, 0x0000); // W15: fault bit7 = 0
// Kỳ vọng: count = 6+1+1+2+1 = 11; doorClosed=true; estop=false; fault=false; occupancy[15]=true.
const EXPECT = { count: 11, capacity: 16, doorClosed: true, estop: false, fault: false, online: true, quality: 'good', occ15: true };

/* ---- FINS/TCP server giả ---- */
function startFakeServer(port) {
  return new Promise((resolve) => {
    const server = net.createServer((sock) => {
      let acc = Buffer.alloc(0);
      sock.on('data', (chunk) => {
        acc = Buffer.concat([acc, chunk]);
        while (acc.length >= 8) {
          if (acc.slice(0, 4).toString() !== 'FINS') { sock.destroy(); return; }
          const len = acc.readUInt32BE(4);
          const total = 8 + len;
          if (acc.length < total) break; // chờ đủ 1 khung
          const msg = acc.slice(0, total);
          acc = acc.slice(total);
          const cmd = msg.readUInt32BE(8);
          if (cmd === 0x00) {
            // handshake: trả 24 byte (client node=2, server node=1)
            const r = Buffer.alloc(24);
            r.write('FINS', 0);
            r.writeUInt32BE(16, 4);
            r.writeUInt32BE(0x01, 8);
            r.writeUInt32BE(0, 12);
            r.writeUInt32BE(2, 16); // byte19 = client node
            r.writeUInt32BE(1, 20); // byte23 = server node
            sock.write(r);
          } else if (cmd === 0x02) {
            const fins = msg.slice(16); // khung FINS
            const sid = fins[9];
            if (fins[10] === 0x01 && fins[11] === 0x01) {
              const memArea = fins[12];
              const addr = fins.readUInt16BE(13);
              const count = fins.readUInt16BE(16);
              const data = Buffer.alloc(count * 2);
              for (let i = 0; i < count; i++) data.writeUInt16BE(REG.get(`${memArea}:${addr + i}`) ?? 0, i * 2);
              const header = Buffer.from([0xc1, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x01, 0x00, sid]);
              const body = Buffer.concat([header, Buffer.from([0x01, 0x01, 0x00, 0x00]), data]);
              const tcp = Buffer.alloc(16);
              tcp.write('FINS', 0);
              tcp.writeUInt32BE(8 + body.length, 4);
              tcp.writeUInt32BE(0x02, 8);
              tcp.writeUInt32BE(0, 12);
              sock.write(Buffer.concat([tcp, body]));
            }
          }
        }
      });
      sock.on('error', () => {});
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const PORT = 9781;
  const server = await startFakeServer(PORT);
  let latest = null;
  const poller = new Poller({
    mock: false,
    makeClient: (u) => pkg.FinsClient(u.port, u.host, { protocol: 'tcp', timeout: 2000 }),
    publish: (snap) => { latest = snap; },
  });
  poller.configure([
    { id: 'plc-1', n: 1, name: 'Tháp test', type: 'loai_16', host: '127.0.0.1', port: PORT, zone: 'A', enabled: true },
  ]);

  // Vòng 1 client chưa nối xong -> unavailable; chờ handshake rồi poll tiếp.
  let b = null;
  for (let i = 0; i < 30; i++) {
    await poller.poll();
    b = latest?.blocks?.[0];
    if (b?.online) break;
    await sleep(120);
  }

  console.log('Snapshot đọc được:', JSON.stringify({ id: b?.id, online: b?.online, quality: b?.quality, count: b?.count, capacity: b?.capacity, doorClosed: b?.doorClosed, estop: b?.estop, fault: b?.fault, occLen: b?.occupancy?.length, occ15: b?.occupancy?.[15] }, null, 0));

  assert.ok(b, 'phải có block');
  assert.equal(b.online, EXPECT.online, 'Fix A: gateway KẾT NỐI & ĐỌC được PLC thật');
  assert.equal(b.quality, EXPECT.quality, 'chất lượng dữ liệu = good');
  assert.equal(b.count, EXPECT.count, `số xe đọc đúng (=${EXPECT.count})`);
  assert.equal(b.capacity, EXPECT.capacity, 'sức chứa đúng preset');
  assert.equal(b.occupancy.length, 16, 'occupancy đủ 16 chỗ');
  assert.equal(b.occupancy[15], EXPECT.occ15, 'Fix B: chỗ 15 (W3.15, word 0x8000) đọc = có xe');
  assert.equal(b.doorClosed, EXPECT.doorClosed, 'cửa đóng đọc đúng');
  assert.equal(b.estop, EXPECT.estop, 'E-Stop đọc đúng');
  assert.equal(b.fault, EXPECT.fault, 'fault đọc đúng');

  // Đổi 1 word rồi đọc lại -> count phải đổi (chứng minh đọc động, không phải hằng số).
  set(3, 0xe000); // W3: bit13,14,15 = 1 -> +3 (thay vì +1)
  latest = null;
  for (let i = 0; i < 10; i++) { await poller.poll(); if (latest?.blocks?.[0]?.online) break; await sleep(100); }
  const b2 = latest.blocks[0];
  console.log('Sau khi bật thêm W3.13/W3.14: count =', b2.count, '(kỳ vọng 13)');
  assert.equal(b2.count, 13, 'đọc động: count cập nhật theo thanh ghi PLC');

  poller.stop();
  server.close();
  console.log('\nPASS: gateway kết nối FINS/TCP, đọc word (kể cả bit15), đếm xe & tín hiệu đúng, cập nhật động.');
  process.exit(0);
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
