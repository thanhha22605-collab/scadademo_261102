import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import pkg from 'omron-fins';
import { WebSocketServer } from 'ws';
import { config } from './config.mjs';
import { PRESETS } from './presets.mjs';
import {
  Poller,
  atomicSave,
  authorized,
  parseAddress,
  validateConfig,
} from './core.mjs';
import {
  databaseConfigured,
  databaseReady,
  deleteCard,
  initDatabase,
  listAccessEvents,
  listAlarmAcks,
  listAudit,
  listCards,
  saveAccessEvent,
  saveAlarmAck,
  saveCameraEvent,
  upsertCard,
} from './db.mjs';
import {
  allocateCameraEvent,
  classifyCameraEvent,
  createLedPublisher,
  createPgsServer,
  normalizeCameraEvent,
} from './integrations.mjs';

await initDatabase().catch((error) =>
  console.error('MySQL chưa sẵn sàng:', error?.message || error),
);

const file = fileURLToPath(new URL('./units.json', import.meta.url));
let units = [];
let configValid = true;
try {
  units = validateConfig(JSON.parse(fs.readFileSync(file, 'utf8')));
} catch (e) {
  configValid = e.code === 'ENOENT';
  console.error(
    e.code === 'ENOENT'
      ? 'Chưa có cấu hình PLC.'
      : 'Cấu hình không hợp lệ; gateway khởi động ở trạng thái chưa cấu hình.',
  );
}
let snapshot = {
  blocks: [],
  connected: false,
  at: Date.now(),
  source: config.mock ? 'mock' : 'plc',
};
let lastVehicle = null;
let lastHttpLedAt = 0;
const origins = new Set(config.allowedOrigins);
function originAllowed(req) {
  return !req.headers.origin || origins.has(req.headers.origin);
}
function json(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}
function readJsonBody(req, limit = 65536) {
  return new Promise((resolve, reject) => {
    let raw = '',
      size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Dữ liệu vượt giới hạn.'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('JSON không hợp lệ.'));
      }
    });
    req.on('error', reject);
  });
}
function broadcast() {
  const payload = JSON.stringify({
    ...snapshot,
    lastVehicle,
    pgs: pgs.state(),
    led: ledPublisher.state(),
  });
  for (const client of wss.clients)
    if (client.readyState === 1) {
      try {
        client.send(payload);
      } catch {}
    }
}
async function updateLed() {
  if (!config.ledControllerUrl) return;
  if (Date.now() - lastHttpLedAt < config.ledRefreshMs) return;
  lastHttpLedAt = Date.now();
  const total = snapshot.blocks.reduce((sum, block) => sum + block.capacity, 0);
  const occupied = snapshot.blocks.reduce(
    (sum, block) => sum + (block.count ?? 0),
    0,
  );
  const byZone = Object.fromEntries(
    [...new Set(snapshot.blocks.map((block) => block.zone))].map((zone) => {
      const blocks = snapshot.blocks.filter((block) => block.zone === zone);
      const capacity = blocks.reduce((sum, block) => sum + block.capacity, 0);
      const count = blocks.reduce((sum, block) => sum + (block.count ?? 0), 0);
      return [zone, { free: Math.max(0, capacity - count), capacity, count }];
    }),
  );
  try {
    await fetch(config.ledControllerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        free: Math.max(0, total - occupied),
        total,
        occupied,
        byZone,
        at: snapshot.at,
      }),
    });
  } catch (error) {
    console.error('Không cập nhật được LED:', error?.message || error);
  }
}
const ledPublisher = createLedPublisher({
  panels: config.ledPanels,
  intervalMs: config.ledRefreshMs,
});
const pgs = createPgsServer({
  host: config.pgsHost,
  port: config.pgsPort,
  onUpdate: () => broadcast(),
});
const poller = new Poller({
  mock: config.mock,
  finsBusyRetryMs: config.finsBusyRetryMs,
  makeClient(u) {
    const c = pkg.FinsClient(u.port, u.host, {
      protocol: u.protocol,
      timeout: 2000,
    });
    c.on('error', () => {});
    c.on('timeout', () => {});
    return c;
  },
  publish(data) {
    snapshot = data;
    ledPublisher.update(data);
    broadcast();
    void updateLed();
  },
});
const server = http.createServer(async (req, res) => {
  if (!originAllowed(req))
    return json(res, 403, { ok: false, error: 'Origin không được phép.' });
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  const pathname = new URL(req.url, 'http://gateway.local').pathname;
  if (pathname === '/health' && req.method === 'GET')
    return json(res, 200, {
      ok: configValid,
      configured: units.length > 0,
      connected: snapshot.connected,
      online: snapshot.blocks.filter((block) => block.online).length,
      total: snapshot.blocks.length,
      at: snapshot.at,
      source: snapshot.source,
      readOnly: !config.allowWrites,
      plcWritesEnabled: config.allowWrites,
      ledConfigured: Boolean(config.ledControllerUrl),
      ledTcp: ledPublisher.state(),
      pgs: pgs.state(),
      cameraIngestConfigured: Boolean(config.cameraToken),
      cameraLastAt: lastVehicle?.receivedAt ?? null,
      databaseConfigured: databaseConfigured(),
      databaseReady: databaseReady(),
    });
  if (pathname === '/api/camera/ingest' && req.method === 'POST') {
    const supplied = String(req.headers.authorization || '').replace(
      /^Bearer\s+/i,
      '',
    );
    if (!config.cameraToken || supplied !== config.cameraToken)
      return json(res, 401, {
        ok: false,
        error: 'Camera ingest token không hợp lệ.',
      });
    try {
      const data = await readJsonBody(req);
      const event = normalizeCameraEvent(data);
      const profile = classifyCameraEvent(event, config.classifier);
      const allocation = allocateCameraEvent(profile, snapshot.blocks);
      lastVehicle = {
        ...event,
        ...profile,
        ...allocation,
      };
      if (allocation.noCapacity) {
        lastVehicle.outcome = 'no-capacity';
        lastVehicle.reason = 'Không còn Block phù hợp đang online và nhận xe.';
      }
      if (databaseReady()) await saveCameraEvent(lastVehicle);
      broadcast();
      return json(res, 200, { status: 'ok', vehicle: lastVehicle });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }
  if (pathname === '/api/access-events' && req.method === 'GET') {
    if (!databaseReady())
      return json(res, 503, { ok: false, error: 'MySQL chưa sẵn sàng.' });
    const search = new URL(req.url, 'http://gateway.local').searchParams;
    try {
      return json(res, 200, {
        ok: true,
        events: await listAccessEvents(
          search.get('q') || '',
          Number(search.get('limit') || 500),
        ),
      });
    } catch (error) {
      return json(res, 500, { ok: false, error: error.message });
    }
  }
  if (pathname === '/api/access-events' && req.method === 'POST') {
    if (!authorized(req.headers.authorization, config.adminToken))
      return json(res, 401, {
        ok: false,
        error: 'Cần token quản trị gateway.',
      });
    if (!databaseReady())
      return json(res, 503, { ok: false, error: 'MySQL chưa sẵn sàng.' });
    try {
      const data = await readJsonBody(req);
      if (!data.uid || !['IN', 'OUT'].includes(data.direction) || !data.result)
        throw new Error('Thiếu UID, direction IN/OUT hoặc kết quả.');
      await saveAccessEvent(data);
      return json(res, 200, { ok: true });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }
  if (pathname === '/api/audit' && req.method === 'GET') {
    if (!databaseReady())
      return json(res, 503, { ok: false, error: 'MySQL chưa sẵn sàng.' });
    try {
      return json(res, 200, { ok: true, rows: await listAudit(500) });
    } catch (error) {
      return json(res, 500, { ok: false, error: error.message });
    }
  }
  if (pathname === '/api/cards' && req.method === 'GET') {
    if (!databaseReady())
      return json(res, 503, { ok: false, error: 'MySQL chưa sẵn sàng.' });
    try {
      return json(res, 200, {
        ok: true,
        cards: await listCards(
          new URL(req.url, 'http://gateway.local').searchParams.get('q') || '',
        ),
      });
    } catch (error) {
      return json(res, 500, { ok: false, error: error.message });
    }
  }
  if (pathname === '/api/cards' && req.method === 'PUT') {
    if (!authorized(req.headers.authorization, config.adminToken))
      return json(res, 401, {
        ok: false,
        error: 'Cần token quản trị gateway.',
      });
    if (!databaseReady())
      return json(res, 503, { ok: false, error: 'MySQL chưa sẵn sàng.' });
    try {
      const data = await readJsonBody(req);
      if (!data.card || !data.by)
        throw new Error('Thiếu card hoặc người thao tác.');
      await upsertCard(data.card, String(data.by));
      return json(res, 200, { ok: true });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }
  if (pathname === '/api/cards' && req.method === 'DELETE') {
    if (!authorized(req.headers.authorization, config.adminToken))
      return json(res, 401, {
        ok: false,
        error: 'Cần token quản trị gateway.',
      });
    if (!databaseReady())
      return json(res, 503, { ok: false, error: 'MySQL chưa sẵn sàng.' });
    try {
      const data = await readJsonBody(req);
      if (!data.id || !data.by)
        throw new Error('Thiếu mã thẻ hoặc người thao tác.');
      await deleteCard(String(data.id), String(data.by));
      return json(res, 200, { ok: true });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }
  if (pathname === '/api/alarms/ack' && req.method === 'POST') {
    if (!authorized(req.headers.authorization, config.adminToken))
      return json(res, 401, {
        ok: false,
        error: 'Cần token quản trị gateway.',
      });
    if (!databaseReady())
      return json(res, 503, { ok: false, error: 'MySQL chưa sẵn sàng.' });
    try {
      const data = await readJsonBody(req);
      if (!data.id || !data.by)
        throw new Error('Thiếu mã alarm hoặc người xác nhận.');
      const saved = await saveAlarmAck(String(data.id), String(data.by));
      if (!saved)
        return json(res, 409, {
          ok: false,
          error: 'Cảnh báo đã được xác nhận trước đó.',
        });
      return json(res, 200, { ok: true });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }
  if (pathname === '/api/alarms/ack' && req.method === 'GET') {
    if (!databaseReady())
      return json(res, 503, { ok: false, error: 'MySQL chưa sẵn sàng.' });
    try {
      return json(res, 200, { ok: true, acks: await listAlarmAcks() });
    } catch (error) {
      return json(res, 500, { ok: false, error: error.message });
    }
  }
  if (
    (pathname === '/api/plc/search-result' ||
      pathname === '/api/plc/weight-class' ||
      pathname === '/api/plc/card-decision') &&
    req.method === 'POST'
  ) {
    if (!authorized(req.headers.authorization, config.adminToken))
      return json(res, 401, {
        ok: false,
        error: 'Cần token quản trị gateway.',
      });
    if (!config.allowWrites)
      return json(res, 403, {
        ok: false,
        error:
          'Ghi PLC đang khóa. Đặt ENABLE_PLC_WRITES=true sau khi hoàn tất FAT/SAT.',
      });
    try {
      const data = await readJsonBody(req);
      const unitId = String(data.unitId || '');
      if (pathname.endsWith('card-decision')) {
        const accepted = data.accepted === true;
        const weight = String(data.weightClass || '');
        const weightValue = { '2200KG': 2200, '2600KG': 2600, THUONG: 0 }[
          weight
        ];
        if (weightValue == null)
          throw new Error('weightClass phải là 2200KG, 2600KG hoặc THUONG.');
        const weightAddress = parseAddress(
          process.env.PLC_CARD_WEIGHT_ADDRESS || 'D402',
        );
        const permitAddress = parseAddress(
          process.env.PLC_CARD_PERMIT_ADDRESS || 'W75.0',
        );
        await poller.writeUnit(
          unitId,
          weightAddress.word +
            (weightAddress.bit == null ? '' : `.${weightAddress.bit}`),
          weightValue,
        );
        await poller.writeUnit(
          unitId,
          permitAddress.word +
            (permitAddress.bit == null ? '' : `.${permitAddress.bit}`),
          accepted ? 1 : 0,
        );
        return json(res, 200, {
          ok: true,
          accepted,
          weightClass: weight,
          weightAddress: process.env.PLC_CARD_WEIGHT_ADDRESS || 'D402',
          permitAddress: process.env.PLC_CARD_PERMIT_ADDRESS || 'W75.0',
        });
      }
      if (pathname.endsWith('search-result')) {
        const value = Number(data.blockNumber);
        if (!Number.isInteger(value) || value < 0 || value > 154)
          throw new Error('blockNumber phải từ 0 đến 154.');
        await poller.writeUnit(unitId, 'D1000', value);
        setTimeout(() => {
          void poller
            .writeUnit(unitId, 'D1000', 0)
            .catch((error) =>
              console.error('Không reset được D1000:', error?.message || error),
            );
        }, 30000);
        return json(res, 200, {
          ok: true,
          address: 'D1000',
          value,
          autoResetMs: 30000,
        });
      }
      const value = Number(data.weightClass);
      if (![1, 2, 3].includes(value))
        throw new Error('weightClass phải là 1, 2 hoặc 3.');
      await poller.writeUnit(unitId, 'D1004', value);
      return json(res, 200, { ok: true, address: 'D1004', value });
    } catch (error) {
      return json(res, 400, { ok: false, error: error.message });
    }
  }
  if (pathname !== '/config')
    return json(res, 404, { ok: false, error: 'Không tìm thấy API.' });
  if (!authorized(req.headers.authorization, config.adminToken))
    return json(res, 401, {
      ok: false,
      error:
        'Cần token quản trị gateway (GATEWAY_ADMIN_TOKEN, tối thiểu 24 ký tự).',
    });
  if (req.method === 'GET')
    return json(res, 200, {
      units,
      presets: Object.entries(PRESETS).map(([key, v]) => ({
        key,
        label: v.label,
        capacity: v.capacity,
      })),
      readOnly: true,
    });
  if (req.method !== 'PUT')
    return json(res, 405, { ok: false, error: 'Phương thức không hỗ trợ.' });
  let body = '',
    size = 0,
    overLimit = false;
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > 65536) {
      overLimit = true;
      body = '';
    } else if (!overLimit) body += chunk;
  });
  req.on('end', () => {
    if (overLimit)
      return json(res, 413, { ok: false, error: 'Cấu hình vượt 64 KB.' });
    try {
      const next = validateConfig(JSON.parse(body));
      atomicSave(file, next); // validate and persist before replacing the working runtime
      units = next;
      configValid = true;
      poller.configure(next);
      json(res, 200, { ok: true, count: next.filter((u) => u.enabled).length });
    } catch (e) {
      json(res, 400, { ok: false, error: e.message });
    }
  });
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 65536 });
server.on('upgrade', (req, socket, head) => {
  if (!originAllowed(req)) {
    socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});
wss.on('connection', (ws) => {
  ws.send(
    JSON.stringify({
      ...snapshot,
      lastVehicle,
      pgs: pgs.state(),
      led: ledPublisher.state(),
    }),
  );
  ws.on('message', (raw) => {
    let id = null;
    try {
      id = JSON.parse(String(raw)).id ?? null;
    } catch {}
    ws.send(
      JSON.stringify({
        type: 'write-result',
        id,
        ok: false,
        reason: 'Gateway chỉ đọc; chưa hỗ trợ điều khiển PLC.',
      }),
    );
  });
});
poller.configure(units);
let timer;
async function loop() {
  try {
    await poller.poll();
  } catch (error) {
    console.error('Lỗi vòng polling:', error?.message || error);
  } finally {
    if (!poller.stopped) timer = setTimeout(loop, config.pollMs);
  }
}
server.listen(config.wsPort, config.bindHost, () => {
  console.log(
    `Gateway ${config.mock ? 'MOCK' : 'PLC'} CHỈ ĐỌC: http://${config.bindHost}:${config.wsPort}`,
  );
  if (!config.adminToken)
    console.log('API cấu hình đang khóa: chưa đặt GATEWAY_ADMIN_TOKEN.');
  ledPublisher.start();
  pgs.start();
  void loop();
});
function stop() {
  clearTimeout(timer);
  poller.stop();
  ledPublisher.stop();
  pgs.stop();
  for (const c of wss.clients) c.close();
  wss.close();
  server.close();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
