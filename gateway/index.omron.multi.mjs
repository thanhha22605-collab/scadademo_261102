/* =============================================================
 * TotalParking SCADA — Omron FINS gateway (nhiều tháp) + API cấu hình
 * - Đọc song song nhiều PLC CP2E qua FINS, gộp thành snapshot cho web app (WS).
 * - Lưu danh sách PLC ở units.json; giao diện SCADA sửa qua HTTP /config.
 *   cd gateway && npm install && npm run start:omron-multi
 * ============================================================= */
import http from 'node:http';
import fs from 'node:fs';
import pkg from 'omron-fins';
import { WebSocketServer } from 'ws';
import { config } from './config.mjs';
import { PRESETS, resolveUnit } from './presets.mjs';

const { FinsClient } = pkg;
const log = (...a) => console.log(new Date().toISOString(), ...a);
const CONFIG_FILE = new URL('./units.json', import.meta.url);

/* ---- lưu / nạp cấu hình (danh sách PLC dạng UI) ---- */
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return [];
  }
}
function saveConfig(list) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(list, null, 2));
}
let uiUnits = loadConfig();
let runtime = [];
const clients = new Map();
let snapshot = { blocks: [], connected: false, at: Date.now() };

function applyConfig(list) {
  uiUnits = list;
  runtime = uiUnits.filter((u) => u.enabled !== false).map(resolveUnit).filter(Boolean);
  for (const c of clients.values()) {
    try {
      c.close?.();
    } catch {
      /* ignore */
    }
  }
  clients.clear();
  log(`Áp dụng cấu hình: ${runtime.length} PLC đang bật`);
}
applyConfig(uiUnits);

/* ---- đọc FINS ---- */
function parseAddr(s) {
  const m = String(s).trim().toUpperCase().match(/^(CIO|DM|D|WR|W|HR|H|AR|A)?\s*0*(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) throw new Error('Địa chỉ không hợp lệ: ' + s);
  const area = { DM: 'D', WR: 'W', HR: 'H', AR: 'A' }[m[1]] || m[1] || 'CIO';
  return { word: area + m[2], bit: m[3] != null ? Number(m[3]) : null };
}
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
    const fields = {};
    for (const k of ['door', 'estop', 'online', 'fault']) if (u[k]) fields[k] = parseAddr(u[k]);
    const countBits = Array.isArray(u.countBits) ? u.countBits.map(parseAddr) : [];
    const words = [...new Set([...Object.values(fields).map((f) => f.word), ...countBits.map((f) => f.word)])];
    const wv = {};
    await Promise.all(words.map(async (w) => { wv[w] = await readWord(c, w); }));
    const bit = (k, dflt) => {
      const f = fields[k];
      if (!f) return dflt;
      return f.bit == null ? wv[f.word] : Boolean((wv[f.word] >> f.bit) & 1);
    };
    const count = countBits.reduce((n, f) => n + ((wv[f.word] >> f.bit) & 1), 0);
    return { id: u.id, zone: u.zone, capacity: u.capacity, count, doorClosed: bit('door', true), estop: bit('estop', false), online: bit('online', true), fault: bit('fault', false) };
  } catch (e) {
    log(`[${u.id}] lỗi đọc:`, e.message);
    try {
      c.close?.();
    } catch {
      /* ignore */
    }
    clients.delete(u.id);
    return { id: u.id, zone: u.zone, capacity: u.capacity, count: 0, doorClosed: false, estop: false, online: false, fault: false };
  }
}
/* ---- MOCK: sinh số giả để test không cần PLC ---- */
const mockState = new Map();
function readUnitMock(u) {
  let s = mockState.get(u.id);
  if (s == null) s = Math.floor(u.capacity * 0.5);
  if (Math.random() < 0.4) s += Math.random() < 0.5 ? -1 : 1;
  s = Math.max(0, Math.min(u.capacity, s));
  mockState.set(u.id, s);
  return {
    id: u.id,
    zone: u.zone,
    capacity: u.capacity,
    count: s,
    doorClosed: true,
    estop: false,
    online: true,
    fault: Math.random() < 0.03,
  };
}

async function poll() {
  if (!runtime.length) {
    snapshot = { blocks: [], connected: false, at: Date.now() };
    return broadcast();
  }
  const blocks = config.mock
    ? runtime.map(readUnitMock)
    : await Promise.all(runtime.map(readUnit));
  snapshot = { blocks, connected: blocks.some((b) => b.online), at: Date.now() };
  broadcast();
}

/* ---- HTTP (API cấu hình) + WebSocket (snapshot) trên cùng 1 cổng ---- */
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
const server = http.createServer((req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.url === '/config' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      units: uiUnits,
      presets: Object.entries(PRESETS).map(([key, v]) => ({ key, label: v.label, capacity: v.capacity })),
      ipPattern: '192.169.1.(100+N)',
    }));
  }
  if (req.url === '/config' && req.method === 'PUT') {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      try {
        const list = JSON.parse(body);
        if (!Array.isArray(list)) throw new Error('config phải là mảng');
        saveConfig(list);
        applyConfig(list);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, count: runtime.length }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }
  res.setHeader('Content-Type', 'text/plain');
  res.end('TotalParking FINS gateway');
});
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  log('Web app đã kết nối');
  ws.send(JSON.stringify(snapshot));
});
function broadcast() {
  const msg = JSON.stringify(snapshot);
  for (const c of wss.clients) if (c.readyState === 1) c.send(msg);
}

server.listen(config.wsPort, () => {
  log(`FINS multi-gateway: HTTP+WS cổng ${config.wsPort} — ${runtime.length} PLC (từ units.json)`);
});
setInterval(poll, config.pollMs);
