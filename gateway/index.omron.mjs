/* =============================================================
 * TotalParking SCADA — Omron FINS gateway (cho CP2E / CP1 / CJ / CS…)
 * Đọc Data Memory (D) của PLC qua FINS/TCP rồi phát cho web app qua WebSocket.
 * Chạy trên máy CÙNG MẠNG với PLC.
 *   cd gateway && npm install && npm run start:omron
 *
 * Chuẩn bị trên PLC (CX-Programmer / CX-One):
 *   - Bật Ethernet, đặt IP (mặc định 192.168.250.1), bật FINS/TCP cổng 9600.
 *   - Trong ladder, ghi số xe vào D0.. và word trạng thái (bit) vào D100..
 *     (xem tagmap.omron.mjs).
 * ============================================================= */
import pkg from 'omron-fins';
import { WebSocketServer } from 'ws';
import { config } from './config.mjs';
import { BLOCKS, COUNT_BASE, STATUS_BASE, buildBlocks } from './tagmap.omron.mjs';

const { FinsClient } = pkg;
const N = BLOCKS.length;
const log = (...a) => console.log(new Date().toISOString(), ...a);

let client = null;
let snapshot = { blocks: [], connected: false, at: Date.now() };

function makeClient() {
  const c = FinsClient(config.fins.port, config.fins.host, {
    protocol: config.fins.protocol,
    timeout: 2000,
  });
  c.on('error', (e) => log('FINS error:', e?.message || e));
  c.on('timeout', () => log('FINS timeout'));
  return c;
}

/* Bọc lệnh đọc FINS thành Promise; hỗ trợ vài dạng response khác nhau. */
function finsRead(addr, count) {
  return new Promise((resolve, reject) => {
    try {
      client.read(addr, count, (err, msg) => {
        if (err) return reject(err instanceof Error ? err : new Error(String(err)));
        const values =
          msg?.response?.values ?? msg?.values ?? msg?.response ?? null;
        if (Array.isArray(values)) resolve(values);
        else reject(new Error('FINS: phản hồi không hợp lệ'));
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function poll() {
  try {
    if (!client) client = makeClient();
    const [counts, statuses] = await Promise.all([
      finsRead(COUNT_BASE, N),
      finsRead(STATUS_BASE, N),
    ]);
    snapshot = { blocks: buildBlocks(counts, statuses), connected: true, at: Date.now() };
  } catch (e) {
    log('Lỗi đọc FINS:', e.message);
    snapshot = { ...snapshot, connected: false, at: Date.now() };
    try {
      client?.close?.();
    } catch {
      /* ignore */
    }
    client = null; // tạo lại ở vòng sau
  }
  broadcast();
}

/* ---- WebSocket phát snapshot cho web app ---- */
const wss = new WebSocketServer({ port: config.wsPort });
wss.on('connection', (ws) => {
  log('Web app đã kết nối');
  ws.send(JSON.stringify(snapshot));
  ws.on('message', (raw) => {
    if (!config.allowWrites) {
      ws.send(JSON.stringify({ type: 'write-result', ok: false, reason: 'Ghi bị khóa (ALLOW_WRITES=false).' }));
      return;
    }
    // TODO: map lệnh ghi -> client.write('D...', [..]) với whitelist cẩn thận.
    try {
      const { action } = JSON.parse(String(raw));
      log('Nhận lệnh ghi (chưa map):', action?.type, action?.block ?? '');
    } catch {
      /* ignore */
    }
    ws.send(JSON.stringify({ type: 'write-result', ok: false, reason: 'Chưa map lệnh ghi trong gateway.' }));
  });
});
function broadcast() {
  const msg = JSON.stringify(snapshot);
  for (const c of wss.clients) if (c.readyState === 1) c.send(msg);
}

log(`FINS gateway khởi động — WebSocket ws://localhost:${config.wsPort}`);
log(`PLC ${config.fins.host}:${config.fins.port}/${config.fins.protocol}, đọc ${N} block từ ${COUNT_BASE}/${STATUS_BASE}, chu kỳ ${config.pollMs}ms`);
setInterval(poll, config.pollMs);
