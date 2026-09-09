/* =============================================================
 * TotalParking SCADA — Omron FINS gateway (NHIỀU PLC / nhiều cụm)
 * Đọc song song nhiều PLC CP2E (mỗi cụm 1 con) qua FINS/TCP rồi gộp thành
 * một snapshot cho web app. Cấu hình danh sách cụm trong `units.mjs`
 * (copy từ units.example.mjs).
 *   cd gateway && npm install && npm run start:omron-multi
 * ============================================================= */
import pkg from 'omron-fins';
import { WebSocketServer } from 'ws';
import { config } from './config.mjs';

const { FinsClient } = pkg;
const log = (...a) => console.log(new Date().toISOString(), ...a);

let UNITS;
try {
  ({ UNITS } = await import('./units.mjs'));
} catch {
  log('Chưa có units.mjs. Hãy copy units.example.mjs -> units.mjs và điền IP/địa chỉ.');
  process.exit(1);
}

const clients = new Map(); // id -> FinsClient
let snapshot = { blocks: [], connected: false, at: Date.now() };

function clientFor(u) {
  let c = clients.get(u.id);
  if (c) return c;
  c = FinsClient(u.port ?? 9600, u.host, {
    protocol: u.protocol ?? 'tcp',
    timeout: 2000,
  });
  c.on('error', (e) => log(`[${u.id}] FINS error:`, e?.message || e));
  c.on('timeout', () => log(`[${u.id}] FINS timeout`));
  clients.set(u.id, c);
  return c;
}

function readWord(client, addr) {
  return new Promise((resolve, reject) => {
    try {
      client.read(addr, 1, (err, msg) => {
        if (err) return reject(err instanceof Error ? err : new Error(String(err)));
        const v = msg?.response?.values ?? msg?.values ?? [];
        resolve(Number(Array.isArray(v) ? v[0] : v) || 0);
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function readUnit(u) {
  const c = clientFor(u);
  try {
    const [count, status] = await Promise.all([
      readWord(c, u.countAddr),
      readWord(c, u.statusAddr),
    ]);
    const bit = (n) => Boolean((status >> n) & 1);
    return {
      id: u.id,
      capacity: u.capacity,
      count,
      doorClosed: bit(u.bits.door),
      estop: bit(u.bits.estop),
      online: bit(u.bits.online),
      fault: bit(u.bits.fault),
    };
  } catch (e) {
    log(`[${u.id}] lỗi đọc:`, e.message);
    try {
      c.close?.();
    } catch {
      /* ignore */
    }
    clients.delete(u.id);
    // Mất kết nối cụm này -> báo offline nhưng vẫn giữ block trên sơ đồ.
    return { id: u.id, capacity: u.capacity, count: 0, doorClosed: false, estop: false, online: false, fault: false };
  }
}

async function poll() {
  const blocks = await Promise.all(UNITS.map(readUnit));
  snapshot = { blocks, connected: blocks.some((b) => b.online), at: Date.now() };
  broadcast();
}

const wss = new WebSocketServer({ port: config.wsPort });
wss.on('connection', (ws) => {
  log('Web app đã kết nối');
  ws.send(JSON.stringify(snapshot));
  ws.on('message', () =>
    ws.send(JSON.stringify({ type: 'write-result', ok: false, reason: config.allowWrites ? 'Chưa map lệnh ghi.' : 'Ghi bị khóa.' })),
  );
});
function broadcast() {
  const msg = JSON.stringify(snapshot);
  for (const c of wss.clients) if (c.readyState === 1) c.send(msg);
}

log(`FINS multi-gateway khởi động — ${UNITS.length} cụm — WebSocket ws://localhost:${config.wsPort}`);
setInterval(poll, config.pollMs);
