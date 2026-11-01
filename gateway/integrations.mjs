import net from 'node:net';

const unknown = (value) => {
  const text = String(value ?? '').trim();
  return !text || text.toLowerCase() === 'unknown' ? null : text;
};

const measure = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

export function normalizeCameraEvent(payload, now = Date.now) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    throw new Error('Payload camera phải là một đối tượng JSON.');
  const eventId = unknown(payload.event_id ?? payload.eventId);
  if (!eventId || eventId.length > 128)
    throw new Error('Thiếu event_id hợp lệ từ Camera AI.');
  const timestamp = Date.parse(String(payload.timestamp ?? ''));
  return {
    eventId,
    receivedAt: now(),
    cameraAt: Number.isFinite(timestamp) ? timestamp : null,
    plate: unknown(payload.plate)?.toUpperCase() ?? null,
    make: unknown(payload.make),
    model: unknown(payload.model),
    year: unknown(payload.year),
    lengthMm: measure(payload.length_mm ?? payload.lengthMm),
    widthMm: measure(payload.width_mm ?? payload.widthMm),
    heightMm: measure(payload.height_mm ?? payload.heightMm),
    weightKg: measure(payload.weight_kg ?? payload.weightKg),
    category: unknown(payload.category),
    imagePath: unknown(payload.image_path ?? payload.imagePath),
  };
}

export function classifyCameraEvent(event, options = {}) {
  const limits = {
    mechanicalMaxLengthShortMm: 4800,
    mechanicalMaxLengthLongMm: 5000,
    palletMaxWidthMm: 2000,
    palletMaxHeightMm: 1900,
    palletRatingLowKg: 2200,
    palletRatingHighKg: 2600,
    mirrorMarginMm: 200,
    loadMarginKg: 400,
    garageMaxLengthMm: 6000,
    garageMaxWidthMm: 2200,
    garageMaxHeightMm: 2200,
    garageMaxWeightKg: 3500,
    ...options,
  };
  const effectiveWidthMm = event.widthMm
    ? event.widthMm + limits.mirrorMarginMm
    : null;
  const reasons = [];
  if (event.lengthMm > limits.garageMaxLengthMm)
    reasons.push(`dài ${event.lengthMm} mm > ${limits.garageMaxLengthMm}`);
  if (effectiveWidthMm > limits.garageMaxWidthMm)
    reasons.push(
      `rộng ${effectiveWidthMm} mm (đã tính gương) > ${limits.garageMaxWidthMm}`,
    );
  if (event.heightMm > limits.garageMaxHeightMm)
    reasons.push(`cao ${event.heightMm} mm > ${limits.garageMaxHeightMm}`);
  if (event.weightKg > limits.garageMaxWeightKg)
    reasons.push(`nặng ${event.weightKg} kg > ${limits.garageMaxWeightKg}`);
  if (reasons.length)
    return {
      outcome: 'rejected',
      reason: `Vượt giới hạn bãi: ${reasons.join('; ')}`,
      lane: 'normal',
      weightClass: 'THUONG',
      effectiveWidthMm,
      estimatedLoadedWeightKg: event.weightKg
        ? event.weightKg + limits.loadMarginKg
        : null,
    };

  const missing = [
    ['length_mm', event.lengthMm],
    ['width_mm', event.widthMm],
    ['height_mm', event.heightMm],
    ['weight_kg', event.weightKg],
  ]
    .filter(([, value]) => value == null)
    .map(([name]) => name);
  if (missing.length)
    return {
      outcome: 'manual-review',
      reason: `Thiếu số đo: ${missing.join(', ')}`,
      lane: 'normal',
      weightClass: 'THUONG',
      effectiveWidthMm,
      estimatedLoadedWeightKg: null,
    };

  const estimatedLoadedWeightKg = event.weightKg + limits.loadMarginKg;
  const fitsPallet =
    event.lengthMm <= limits.mechanicalMaxLengthLongMm &&
    effectiveWidthMm <= limits.palletMaxWidthMm &&
    event.heightMm <= limits.palletMaxHeightMm &&
    estimatedLoadedWeightKg <= limits.palletRatingHighKg;
  if (!fitsPallet)
    return {
      outcome: 'routed',
      reason: 'Xe được chuyển sang khu đỗ nền.',
      lane: 'normal',
      weightClass: 'THUONG',
      effectiveWidthMm,
      estimatedLoadedWeightKg,
    };
  return {
    outcome: 'routed',
    reason: null,
    lane:
      event.lengthMm <= limits.mechanicalMaxLengthShortMm
        ? 'mechanical-l48'
        : 'mechanical-l5',
    weightClass:
      estimatedLoadedWeightKg <= limits.palletRatingLowKg ? '2200KG' : '2600KG',
    effectiveWidthMm,
    estimatedLoadedWeightKg,
  };
}

function accepts(block, weightClass) {
  const kind = block.parkingClass ?? 'any';
  if (kind === 'any') return true;
  if (weightClass === 'THUONG') return kind === 'ground';
  if (weightClass === '2600KG') return kind === 'mechanical-2600';
  return kind === 'mechanical-2200' || kind === 'mechanical-2600';
}

export function allocateCameraEvent(profile, blocks) {
  if (profile.outcome !== 'routed') return { zone: '', block: '' };
  const candidates = blocks
    .filter(
      (block) =>
        block.online &&
        block.operational !== false &&
        block.count != null &&
        block.count < block.capacity &&
        accepts(block, profile.weightClass),
    )
    .sort((left, right) => {
      const load = left.count / left.capacity - right.count / right.capacity;
      if (load) return load;
      return String(left.id).localeCompare(String(right.id), 'vi');
    });
  const selected = candidates[0];
  return selected
    ? { zone: selected.zone, block: selected.id }
    : { zone: '', block: '', noCapacity: true };
}

export function xorChecksum(payload) {
  let value = 0;
  for (const byte of Buffer.from(payload, 'ascii')) value ^= byte;
  return value;
}

export function buildLedFrame({
  port = 0,
  direction = 0,
  arrowColor = 2,
  arrowState = 1,
  values = [0, 0, 0],
  colors = [2, 2, 2],
}) {
  const clamp = (value) => Math.max(0, Math.min(9999, Number(value) || 0));
  const payload =
    `PORT,${port},${direction}.${arrowColor}.${arrowState},` +
    values
      .slice(0, 3)
      .map((value, index) => `${clamp(value)}.${colors[index] ?? 2}`)
      .join(',');
  return `$${payload}*${xorChecksum(payload).toString(16).toUpperCase().padStart(2, '0')}#`;
}

export function isLedAck(ack, port) {
  const match = String(ack).match(/^\$([^*]+)\*([0-9A-Fa-f]{2})#$/);
  if (!match || match[1] !== `PORT,${port},OK`) return false;
  return xorChecksum(match[1]) === Number.parseInt(match[2], 16);
}

function sendLedFrame(panel, frame) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({
      host: panel.host,
      port: panel.port ?? 2022,
    });
    let response = '';
    const timeout = setTimeout(
      () => socket.destroy(new Error('LED ACK timeout')),
      panel.timeoutMs ?? 2500,
    );
    const finish = (error, value) => {
      clearTimeout(timeout);
      socket.removeAllListeners();
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    };
    socket.setEncoding('ascii');
    socket.on('connect', () => socket.write(frame, 'ascii'));
    socket.on('data', (chunk) => {
      response += chunk;
      if (!response.includes('#')) return;
      if (!isLedAck(response, panel.displayPort ?? 0))
        return finish(new Error(`LED ACK không hợp lệ: ${response}`));
      finish(null, response);
    });
    socket.on('error', (error) => finish(error));
  });
}

export function createLedPublisher({ panels = [], intervalMs = 5000 } = {}) {
  let timer = null;
  let latest = null;
  const states = new Map(
    panels.map((panel) => [
      panel.id,
      { id: panel.id, online: false, lastOkAt: null, lastError: null },
    ]),
  );
  const publish = async () => {
    if (!latest) return;
    const zones = [...new Set(latest.blocks.map((block) => block.zone))]
      .sort((left, right) => String(left).localeCompare(String(right), 'vi'))
      .slice(0, 3);
    const values = zones.map((zone) =>
      latest.blocks
        .filter((block) => block.zone === zone && block.operational !== false)
        .reduce(
          (sum, block) =>
            sum + Math.max(0, block.capacity - (block.count ?? block.capacity)),
          0,
        ),
    );
    while (values.length < 3) values.push(0);
    await Promise.all(
      panels.map(async (panel) => {
        const state = states.get(panel.id);
        const frame = buildLedFrame({
          port: panel.displayPort ?? 0,
          direction: panel.direction ?? 0,
          values,
          colors: panel.colors ?? [2, 2, 2],
        });
        try {
          await sendLedFrame(panel, frame);
          Object.assign(state, {
            online: true,
            lastOkAt: Date.now(),
            lastError: null,
            lastFrame: frame,
          });
        } catch (error) {
          Object.assign(state, {
            online: false,
            lastError: String(error?.message || error),
            lastFrame: frame,
          });
        }
      }),
    );
  };
  return {
    update(snapshot) {
      latest = snapshot;
    },
    start() {
      if (!panels.length || timer) return;
      void publish();
      timer = setInterval(() => void publish(), Math.min(10000, intervalMs));
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    state() {
      const list = [...states.values()];
      return {
        configured: panels.length > 0,
        panels: list.length,
        online: list.filter((item) => item.online).length,
        items: list,
      };
    },
  };
}

export function parseCcuFrame(frame) {
  const match = String(frame).match(/^\$([^*]+)\*([0-9A-Fa-f]{2})#$/);
  if (!match) return { ok: false, reason: 'frame' };
  if (xorChecksum(match[1]) !== Number.parseInt(match[2], 16))
    return { ok: false, reason: 'crc' };
  const parts = match[1].split(',');
  if (parts[0] !== 'CCU') return { ok: false, reason: 'type' };
  if (parts[1] === '01') return { ok: false, reason: 'heartbeat' };
  if (parts[1] !== '02') return { ok: false, reason: 'type' };
  if (parts.length < 7 || parts[5].length !== 32 || parts[6].length !== 32)
    return { ok: false, reason: 'fields' };
  const totalZcu = Number(parts[2]);
  const zcuId = Number(parts[3]);
  const connected = Number(parts[4]) === 1;
  if (
    !Number.isInteger(totalZcu) ||
    !Number.isInteger(zcuId) ||
    zcuId < 0 ||
    zcuId > 15 ||
    !/^[0-3]{32}$/.test(parts[5]) ||
    !/^[0-3]{32}$/.test(parts[6])
  )
    return { ok: false, reason: 'fields' };
  const sensors = parts[5] + parts[6];
  const count = (value) => {
    let total = 0;
    for (let index = 0; index < sensors.length; index++)
      if (sensors[index] === value) total++;
    return total;
  };
  return {
    ok: true,
    value: {
      totalZcu,
      zcuId,
      connected,
      empty: count('0'),
      occupied: count('1'),
      fault: count('2'),
      uninstalled: count('3'),
      channel1: parts[5],
      channel2: parts[6],
      at: Date.now(),
    },
  };
}

export function createPgsServer({
  host = '127.0.0.1',
  port = 0,
  onUpdate,
} = {}) {
  const zcus = new Map();
  const counters = { accepted: 0, invalid: 0, crc: 0, heartbeat: 0 };
  let server = null;
  let listening = false;
  const state = () => {
    const items = [...zcus.values()];
    return {
      configured: port > 0,
      listening,
      port: port || null,
      zcuTotal: items.length,
      connected: items.filter((item) => item.connected).length,
      empty: items.reduce((sum, item) => sum + item.empty, 0),
      occupied: items.reduce((sum, item) => sum + item.occupied, 0),
      fault: items.reduce((sum, item) => sum + item.fault, 0),
      uninstalled: items.reduce((sum, item) => sum + item.uninstalled, 0),
      lastAt:
        items.reduce((latest, item) => Math.max(latest, item.at), 0) || null,
      counters: { ...counters },
      items,
    };
  };
  return {
    start() {
      if (!port || server) return;
      server = net.createServer((socket) => {
        socket.setEncoding('ascii');
        let buffer = '';
        socket.on('data', (chunk) => {
          buffer += chunk;
          let end;
          while ((end = buffer.indexOf('#')) >= 0) {
            const start = buffer.indexOf('$');
            if (start < 0 || start > end) {
              buffer = buffer.slice(end + 1);
              counters.invalid++;
              continue;
            }
            const raw = buffer.slice(start, end + 1);
            buffer = buffer.slice(end + 1);
            const parsed = parseCcuFrame(raw);
            if (!parsed.ok) {
              if (parsed.reason === 'crc') counters.crc++;
              else if (parsed.reason === 'heartbeat') counters.heartbeat++;
              else counters.invalid++;
              continue;
            }
            counters.accepted++;
            zcus.set(parsed.value.zcuId, parsed.value);
            onUpdate?.(state());
          }
          if (buffer.length > 8192) buffer = '';
        });
      });
      server.on('error', (error) => {
        listening = false;
        console.error('PGS/CCU server:', error?.message || error);
      });
      server.listen(port, host, () => {
        listening = true;
        onUpdate?.(state());
      });
    },
    stop() {
      listening = false;
      server?.close();
      server = null;
    },
    state,
  };
}
