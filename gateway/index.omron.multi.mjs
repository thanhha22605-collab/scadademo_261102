/* =============================================================
 * TotalParking SCADA — Omron FINS gateway (NHIỀU PLC / nhiều cụm)
 * Đọc song song nhiều PLC CP2E (mỗi cụm 1 con) qua FINS/TCP rồi gộp thành
 * một snapshot cho web app. Cấu hình danh sách cụm trong `units.mjs`
 * (copy từ units.example.mjs) — mỗi tín hiệu là 1 địa chỉ PLC.
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
  log('Chưa có units.mjs. Copy units.example.mjs -> units.mjs rồi điền IP/địa chỉ.');
  process.exit(1);
}

/* 'W0.03' -> { word:'W0', bit:3 } ; 'D0' -> { word:'D0', bit:null } */
function parseAddr(s) {
  const m = String(s).trim().toUpperCase().match(/^(CIO|DM|D|WR|W|HR|H|AR|A)?\s*0*(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) throw new Error('Địa chỉ không hợp lệ: ' + s);
  const areaRaw = m[1] || 'CIO';
  const area = { DM: 'D', WR: 'W', HR: 'H', AR: 'A' }[areaRaw] || areaRaw;
  return { word: area + m[2], bit: m[3] != null ? Number(m[3]) : null };
}

const clients = new Map();
let snapshot = { blocks: [], connected: false, at: Date.now() };

function clientFor(u) {
  let c = clients.get(u.id);
  if (c) return c;
  c = FinsClient(u.port ?? config.fins.port, u.host, {
    protocol: u.protocol ?? 'tcp',
    timeout: 2000,
  });
  c.on('error', (e) => log(`[${u.id}] FINS error:`, e?.message || e));
  c.on('timeout', () => log(`[${u.id}] FINS timeout`));
  clients.set(u.id, c);
  return c;
}
function readWord(client, wordAddr) {
  return new Promise((resolve, reject) => {
    try {
      client.read(wordAddr, 1, (err, msg) => {
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
    // gom các tín hiệu đơn (door/estop/online/fault + count nếu là 1 word)
    const fields = {};
    for (const k of ['count', 'door', 'estop', 'online', 'fault'])
      if (u[k]) fields[k] = parseAddr(u[k]);
    // countBits: đếm số bit ON = số xe (dùng cho PLC TASECO, mỗi chỗ 1 bit 车位)
    const countBits = Array.isArray(u.countBits) ? u.countBits.map(parseAddr) : [];
    // đọc mỗi WORD cần thiết đúng 1 lần
    const words = [
      ...new Set([
        ...Object.values(fields).map((f) => f.word),
        ...countBits.map((f) => f.word),
      ]),
    ];
    const wv = {};
    await Promise.all(words.map(async (w) => { wv[w] = await readWord(c, w); }));
    const val = (k, dflt) => {
      const f = fields[k];
      if (!f) return dflt;
      const w = wv[f.word];
      return f.bit == null ? w : Boolean((w >> f.bit) & 1);
    };
    const count = countBits.length
      ? countBits.reduce((n, f) => n + ((wv[f.word] >> f.bit) & 1), 0)
      : val('count', 0);
    return {
      id: u.id,
      capacity: u.capacity,
      count,
      doorClosed: val('door', true),
      estop: val('estop', false),
      online: val('online', true), // đọc được = coi như online
      fault: val('fault', false),
    };
  } catch (e) {
    log(`[${u.id}] lỗi đọc:`, e.message);
    try {
      c.close?.();
    } catch {
      /* ignore */
    }
    clients.delete(u.id);
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
