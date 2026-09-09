/* =============================================================
 * TotalParking SCADA — Modbus TCP gateway
 * Đọc tín hiệu PLC (Modbus TCP) và phát cho web app qua WebSocket.
 * Chạy trên máy CÙNG MẠNG với PLC (không chạy trong Cloudflare Worker).
 *   cd gateway && npm install && npm start
 * ============================================================= */
import ModbusRTU from 'modbus-serial';
import { WebSocketServer } from 'ws';
import { config } from './config.mjs';
import { BLOCKS, readSnapshot } from './tagmap.mjs';

const log = (...a) => console.log(new Date().toISOString(), ...a);
const client = new ModbusRTU();
let snapshot = { blocks: [], connected: false, at: Date.now() };
let connecting = false;

async function connect() {
  if (connecting) return;
  connecting = true;
  try {
    await client.connectTCP(config.plc.host, { port: config.plc.port });
    client.setID(config.plc.unitId);
    client.setTimeout(1000);
    log(`PLC đã kết nối ${config.plc.host}:${config.plc.port} (ID ${config.plc.unitId})`);
  } catch (e) {
    log('PLC kết nối thất bại:', e.message, '— thử lại sau 3s');
    setTimeout(connect, 3000);
  } finally {
    connecting = false;
  }
}

async function poll() {
  if (!client.isOpen) {
    connect();
    return;
  }
  try {
    const blocks = await readSnapshot(client);
    snapshot = { blocks, connected: true, at: Date.now() };
  } catch (e) {
    log('Lỗi đọc PLC:', e.message);
    snapshot = { ...snapshot, connected: false, at: Date.now() };
    try {
      client.close(() => {});
    } catch {
      /* ignore */
    }
  }
  broadcast();
}

/* ---- WebSocket phát snapshot cho web app ---- */
const wss = new WebSocketServer({ port: config.wsPort });
wss.on('connection', (ws) => {
  log('Web app đã kết nối');
  ws.send(JSON.stringify(snapshot));
  ws.on('message', (raw) => handleWrite(ws, raw));
});
function broadcast() {
  const msg = JSON.stringify(snapshot);
  for (const c of wss.clients) if (c.readyState === 1) c.send(msg);
}

/* ---- GHI XUỐNG PLC (mặc định TẮT) ----
 * Đây là phần nguy hiểm: cần whitelist lệnh, xác thực và xác nhận trước khi bật.
 * Ví dụ ánh xạ tối thiểu: toggle E-Stop/cửa của 1 block sang coil tương ứng. */
async function handleWrite(ws, raw) {
  if (!config.allowWrites) {
    ws.send(JSON.stringify({ type: 'write-result', ok: false, reason: 'Ghi bị khóa (ALLOW_WRITES=false).' }));
    return;
  }
  try {
    const { action } = JSON.parse(String(raw));
    // TODO: ánh xạ action → địa chỉ coil/register và whitelist cẩn thận.
    // Ví dụ (đang comment cho an toàn):
    // if (action?.type === 'toggle' && action.field === 'estop') {
    //   const b = BLOCKS.find((x) => x.id === action.block);
    //   if (b) await client.writeCoil(b.coilEstop, true);
    // }
    log('Nhận lệnh ghi (chưa map):', action?.type, action?.block ?? '');
    ws.send(JSON.stringify({ type: 'write-result', ok: false, reason: 'Chưa map lệnh ghi trong gateway.' }));
  } catch (e) {
    ws.send(JSON.stringify({ type: 'write-result', ok: false, reason: e.message }));
  }
}

log(`Gateway khởi động — WebSocket ws://localhost:${config.wsPort}`);
log(`Đọc ${BLOCKS.length} block, chu kỳ ${config.pollMs}ms, ghi PLC: ${config.allowWrites ? 'BẬT' : 'tắt'}`);
connect();
setInterval(poll, config.pollMs);
