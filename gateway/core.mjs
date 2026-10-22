import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { PRESETS, resolveUnit } from './presets.mjs';

export function parseAddress(value) {
  const m = String(value).trim().toUpperCase().match(/^(CIO|DM|D|WR|W|HR|H|AR|A)?0*(\d+)(?:\.(\d{1,2}))?$/);
  if (!m || Number(m[2]) > 32767 || (m[3] != null && Number(m[3]) > 15)) throw new Error('Địa chỉ PLC không hợp lệ.');
  const area = ({ DM: 'D', WR: 'W', HR: 'H', AR: 'A' })[m[1]] || m[1] || 'CIO';
  return { word: area + Number(m[2]), bit: m[3] == null ? null : Number(m[3]) };
}
function text(value, label, max = 64) {
  let hasControl = false;
  if (typeof value === 'string') {
    for (let index = 0; index < value.length; index++) {
      if (value.charCodeAt(index) < 32) { hasControl = true; break; }
    }
  }
  if (typeof value !== 'string' || !value.trim() || value.length > max || hasControl) throw new Error(label + ' không hợp lệ.');
  return value.trim();
}
export function validateConfig(value) {
  if (!Array.isArray(value) || value.length > 154) throw new Error('Cấu hình phải là mảng tối đa 154 PLC.');
  const ids = new Set(), names = new Set(), endpoints = new Set(), numbers = new Set();
  return value.map(c => {
    if (!c || typeof c !== 'object' || Array.isArray(c)) throw new Error('Mỗi PLC phải là một đối tượng.');
    const n = Number(c.n);
    if (!Number.isInteger(n) || n < 1 || n > 154) throw new Error('Số Block phải từ 1 đến 154.');
    if (!Object.hasOwn(PRESETS, c.type)) throw new Error('Loại tháp không được hỗ trợ.');
    const id = text(c.id ?? `plc-${n}`, 'ID');
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('ID chỉ gồm chữ, số, gạch ngang/gạch dưới.');
    const name = text(c.name || `Block ${n}`, 'Tên PLC');
    const zone = text(c.zone || 'A', 'Zone', 16);
    const host = c.host || `192.168.1.${100 + n}`;
    if (typeof host !== 'string' || !/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.split('.').some(x => Number(x) > 255)) throw new Error('IP PLC không hợp lệ.');
    const port = Number(c.port ?? 9600);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port không hợp lệ.');
    const protocol = c.protocol ?? 'tcp';
    if (protocol !== 'tcp') throw new Error('Gateway hiện chỉ hỗ trợ FINS/TCP.');
    if (c.enabled != null && typeof c.enabled !== 'boolean') throw new Error('Trạng thái bật/tắt không hợp lệ.');
    const door = c.door || 'W1.08';
    if (parseAddress(door).bit == null) throw new Error('Cửa an toàn phải dùng địa chỉ bit.');
    const endpoint = `${host}:${port}`;
    if (ids.has(id) || names.has(name.toLowerCase()) || endpoints.has(endpoint) || numbers.has(n)) throw new Error('Trùng ID, tên, số Block hoặc địa chỉ PLC.');
    ids.add(id); names.add(name.toLowerCase()); endpoints.add(endpoint); numbers.add(n);
    return { id, n, name, zone, host, port, protocol, type: c.type, door, enabled: c.enabled !== false };
  });
}
export function atomicSave(file, units) {
  const valid = validateConfig(units);
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temp, JSON.stringify(valid, null, 2), { mode: 0o600, flag: 'wx' });
    fs.renameSync(temp, file);
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  return valid;
}
export function authorized(header, token) {
  if (!token || token.length < 24 || typeof header !== 'string') return false;
  const supplied = Buffer.from(header), expected = Buffer.from('Bearer ' + token);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
export function readWord(client, address, timeoutMs = 2200) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('FINS read timeout')), timeoutMs);
    try {
      client.read(address, 1, (err, msg) => {
        clearTimeout(timer);
        if (err) return reject(new Error(String(err.message || err)));
        const values = msg?.response?.values ?? msg?.values;
        const raw = Array.isArray(values) && values.length === 1 ? values[0] : undefined;
        // omron-fins trả về int16 CÓ DẤU: word có bit15=1 (vd 0x8000) về dạng số âm.
        // Chấp nhận -32768..65535 rồi chuẩn hóa về unsigned 16-bit để tách bit đúng.
        if (!Number.isInteger(raw) || raw < -32768 || raw > 65535) return reject(new Error('Phản hồi FINS không hợp lệ.'));
        resolve(raw & 0xffff);
      });
    } catch (err) { clearTimeout(timer); reject(err); }
  });
}
const disposedClients = new WeakSet();
function disposeClient(client, disconnect) {
  if (!client || disposedClients.has(client)) return;
  disposedClients.add(client);
  if (disconnect) try { client.disconnect?.(); } catch {}
  try { client.sequenceManager?.close?.(); } catch {}
  try { client.removeAllListeners?.(); } catch {}
}
export function closeClient(client) { disposeClient(client, true); }
export class Poller {
  constructor({ makeClient, publish = () => {}, mock = false, now = Date.now }) {
    Object.assign(this, { makeClient, publish, mock, now });
    this.clients = new Map(); this.lastGood = new Map(); this.units = []; this.generation = 0; this.inFlight = null; this.stopped = false;
  }
  configure(list) {
    const units = validateConfig(list).filter(u => u.enabled).map(resolveUnit);
    this.generation++;
    for (const c of this.clients.values()) closeClient(c);
    this.clients.clear(); this.lastGood.clear(); this.units = units;
    this.publish({ blocks: units.map(u => this.unavailable(u)), connected: false, at: this.now(), source: this.mock ? 'mock' : 'plc' });
  }
  unavailable(u) {
    const previous = this.lastGood.get(u.id);
    return { id: u.id, name: u.name, zone: u.zone, capacity: u.capacity, count: previous?.count ?? null, occupancy: previous?.occupancy ?? Array(u.capacity).fill(null), doorClosed: previous?.doorClosed ?? null, estop: previous?.estop ?? null, fault: previous?.fault ?? null, online: false, quality: previous ? 'stale' : 'unknown', lastGoodAt: previous?.lastGoodAt ?? null };
  }
  async readUnit(u, generation) {
    let c = this.clients.get(u.id);
    if (!c) {
      // FinsClient kết nối bất đồng bộ (TCP + handshake FINS mất vài ms).
      c = this.makeClient(u);
      this.clients.set(u.id, c);
      const evict = () => {
        if (this.clients.get(u.id) === c) this.clients.delete(u.id);
        disposeClient(c, false);
      };
      c.on?.('close', evict); // socket đứt → dọn cả client và timer của sequence manager
      c.on?.('error', () => { evict(); closeClient(c); });
    }
    // Chưa kết nối xong thì báo tạm "không sẵn sàng" và CHỜ vòng poll sau —
    // KHÔNG xóa client (tránh vòng lặp tạo–đọc–xóa khiến không bao giờ đọc được).
    if (c.connected === false) return this.unavailable(u);
    try {
      const fields = Object.fromEntries(['door', 'estop', 'fault'].map(k => [k, parseAddress(u[k])]));
      const bits = u.countBits.map(parseAddress);
      const words = [...new Set([...Object.values(fields), ...bits].map(f => f.word))];
      const values = {};
      // One request at a time on each PLC; separate PLCs may poll in parallel.
      for (const w of words) values[w] = await readWord(c, w);
      const readBit = f => Boolean((values[f.word] >>> f.bit) & 1);
      const occupancy = bits.map(readBit);
      const block = { id: u.id, name: u.name, zone: u.zone, capacity: u.capacity, count: occupancy.filter(Boolean).length, occupancy, doorClosed: readBit(fields.door), estop: readBit(fields.estop), fault: readBit(fields.fault), online: true, quality: 'good', lastGoodAt: this.now() };
      if (generation === this.generation) this.lastGood.set(u.id, block);
      return block;
    } catch {
      if (generation === this.generation && this.clients.get(u.id) === c) { closeClient(c); this.clients.delete(u.id); }
      return this.unavailable(u);
    }
  }
  poll() {
    if (this.stopped) return Promise.resolve();
    if (this.inFlight) return this.inFlight;
    const generation = this.generation;
    this.inFlight = (async () => {
      const blocks = this.mock ? this.units.map(u => {
        const occupancy = Array.from({length:u.capacity},(_,i)=>i<Math.floor(u.capacity/2));
        return {id:u.id,name:u.name,zone:u.zone,capacity:u.capacity,count:occupancy.filter(Boolean).length,occupancy,doorClosed:true,estop:false,fault:false,online:true,quality:'good',lastGoodAt:this.now()};
      }) : await Promise.all(this.units.map(u => this.readUnit(u, generation)));
      if (!this.stopped && generation === this.generation) this.publish({ blocks, connected: blocks.some(b=>b.online), at:this.now(), source:this.mock?'mock':'plc' });
    })().finally(()=>{this.inFlight=null});
    return this.inFlight;
  }
  stop() { this.stopped=true; this.generation++; for (const c of this.clients.values()) closeClient(c); this.clients.clear(); }
}
