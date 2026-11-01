import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import {
  Poller,
  atomicSave,
  authorized,
  closeClient,
  parseAddress,
  readWord,
  writeWord,
  validateConfig,
} from './core.mjs';
import {
  allocateCameraEvent,
  buildLedFrame,
  classifyCameraEvent,
  isLedAck,
  normalizeCameraEvent,
  parseCcuFrame,
  xorChecksum,
} from './integrations.mjs';

const TOKEN = '0123456789abcdefghijklmn';
const unit = {
  id: 'tower-1',
  n: 1,
  name: 'Block 1',
  zone: 'A',
  host: '192.168.1.101',
  port: 9600,
  protocol: 'tcp',
  type: 'loai_16',
  door: 'W1.08',
  enabled: true,
};

assert.deepEqual(parseAddress('WR001.15'), { word: 'W1', bit: 15 });
assert.throws(() => parseAddress('W1.16'), /không hợp lệ/);
assert.equal(validateConfig([unit])[0].host, unit.host);
assert.equal(validateConfig([unit])[0].operational, true);
assert.equal(validateConfig([unit])[0].parkingClass, 'any');
assert.equal(validateConfig([{ ...unit, protocol: 'udp' }])[0].protocol, 'udp');
assert.throws(
  () => validateConfig([{ ...unit, protocol: 'serial' }]),
  /FINS\/TCP hoặc FINS\/UDP/,
);
assert.throws(
  () => validateConfig([unit, { ...unit, id: 'tower-2', n: 2 }]),
  /Trùng/,
);
assert.equal(authorized('Bearer ' + TOKEN, TOKEN), true);
assert.equal(authorized('Bearer wrong', TOKEN), false);

const signed = await readWord(
  {
    read(_address, _count, callback) {
      callback(null, { response: { values: [-1] } });
    },
  },
  'W1',
);
assert.equal(signed, 0xffff, 'signed int16 phải được chuẩn hóa unsigned');
await assert.rejects(
  readWord(
    {
      read(_address, _count, callback) {
        callback(null, { values: [] });
      },
    },
    'W1',
  ),
  /không hợp lệ/,
);
const written = await writeWord(
  {
    write(address, value, callback) {
      callback(null, { response: { endCode: 0, address, value } });
    },
  },
  'D1000',
  7,
);
assert.deepEqual(written, { address: 'D1000', value: 7 });
await assert.rejects(writeWord({ write() {} }, 'D1000', -1), /0..65535/);

{
  let disconnected = 0;
  let managerClosed = 0;
  let listenersRemoved = 0;
  closeClient({
    disconnect() {
      disconnected++;
    },
    sequenceManager: {
      close() {
        managerClosed++;
      },
    },
    removeAllListeners() {
      listenersRemoved++;
    },
  });
  assert.deepEqual([disconnected, managerClosed, listenersRemoved], [1, 1, 1]);
}

{
  const camera = normalizeCameraEvent(
    {
      event_id: 'evt-1',
      make: 'Toyota',
      model: 'Camry',
      length_mm: 4800,
      width_mm: 1800,
      height_mm: 1600,
      weight_kg: 1900,
      category: 'Sedan',
    },
    () => 1000,
  );
  assert.equal(camera.plate, null, 'camera không bắt buộc có biển số');
  const profile = classifyCameraEvent(camera);
  assert.equal(profile.weightClass, '2600KG');
  assert.equal(profile.outcome, 'routed');
  const allocation = allocateCameraEvent(profile, [
    {
      id: 'locked',
      zone: 'A',
      online: true,
      operational: false,
      count: 0,
      capacity: 10,
      parkingClass: 'mechanical-2600',
    },
    {
      id: 'open',
      zone: 'B',
      online: true,
      operational: true,
      count: 3,
      capacity: 10,
      parkingClass: 'mechanical-2600',
    },
  ]);
  assert.deepEqual(allocation, { zone: 'B', block: 'open' });
  assert.equal(
    classifyCameraEvent({ ...camera, lengthMm: null }).outcome,
    'manual-review',
  );
}

{
  const frame = buildLedFrame({
    port: 1,
    direction: 3,
    values: [12, 34, 56],
  });
  assert.match(frame, /^\$PORT,1,3\.2\.1,12\.2,34\.2,56\.2\*[0-9A-F]{2}#$/);
  const ackPayload = 'PORT,1,OK';
  const ack = `$${ackPayload}*${xorChecksum(ackPayload).toString(16).toUpperCase().padStart(2, '0')}#`;
  assert.equal(isLedAck(ack, 1), true);
  assert.equal(isLedAck(ack, 2), false);
}

{
  const sensors = '0'.repeat(20) + '1'.repeat(10) + '2'.repeat(2);
  const payload = `CCU,02,1,0,1,${sensors},${'3'.repeat(32)}`;
  const frame = `$${payload}*${xorChecksum(payload).toString(16).toUpperCase().padStart(2, '0')}#`;
  const parsed = parseCcuFrame(frame);
  assert.equal(parsed.ok, true);
  assert.deepEqual(
    [parsed.value.empty, parsed.value.occupied, parsed.value.fault],
    [20, 10, 2],
  );
}

{
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-gateway-'));
  const file = path.join(directory, 'units.json');
  fs.writeFileSync(file, JSON.stringify([unit]));
  assert.throws(() => atomicSave(file, [null]), /đối tượng/);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), [unit]);
  const saved = atomicSave(file, [{ ...unit, name: 'Block A' }]);
  assert.equal(saved[0].name, 'Block A');
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8'))[0].name, 'Block A');
  fs.rmSync(directory, { recursive: true, force: true });
}

class FakeClient extends EventEmitter {
  connected = false;
  reads = 0;
  disconnected = false;
  sequenceManager = {
    close: () => {
      this.managerClosed = true;
    },
  };
  read(_address, _count, callback) {
    this.reads++;
    setTimeout(() => callback(null, { response: { values: [0] } }), 2);
  }
  disconnect() {
    this.disconnected = true;
    this.connected = false;
  }
}

{
  const snapshots = [];
  const client = new FakeClient();
  const poller = new Poller({
    makeClient: () => client,
    publish: (snapshot) => snapshots.push(snapshot),
    now: () => 1234,
  });
  poller.configure([unit]);
  await poller.poll();
  assert.equal(client.reads, 0, 'không đọc trước khi FINS kết nối');
  client.connected = true;
  const first = poller.poll();
  const second = poller.poll();
  assert.strictEqual(first, second, 'không được chồng hai vòng polling');
  await first;
  assert.equal(snapshots.at(-1).blocks[0].quality, 'good');
  poller.stop();
  assert.equal(client.disconnected, true);
  assert.equal(client.managerClosed, true);
}

{
  const client = new FakeClient();
  const poller = new Poller({ makeClient: () => client });
  poller.configure([unit]);
  await poller.poll();
  client.emit('close');
  assert.equal(
    poller.clients.has(unit.id),
    false,
    'client đã đóng phải được loại khỏi cache',
  );
  assert.equal(
    client.managerClosed,
    true,
    'close tự nhiên phải dọn timer sequence manager',
  );
  poller.stop();
}

{
  let now = 1000;
  class BusyClient extends FakeClient {
    connected = true;
    read(_address, _count, callback) {
      this.reads++;
      callback(new Error('FINS/TCP handshake endCode 0x00000020'));
    }
  }
  const client = new BusyClient();
  const snapshots = [];
  const poller = new Poller({
    makeClient: () => client,
    publish: (snapshot) => snapshots.push(snapshot),
    now: () => now,
    finsBusyRetryMs: 300000,
  });
  poller.configure([unit]);
  await poller.poll();
  const failed = snapshots.at(-1).blocks[0];
  assert.equal(failed.retryAt, 301000);
  const reads = client.reads;
  now += 1000;
  await poller.poll();
  assert.equal(client.reads, reads, '0x20 phải giãn retry, không đốt khe TCP');
  poller.stop();
}

console.log(
  'PASS: gateway validation, auth, camera contract, routing, LED/CCU protocol, atomic save, signed words, FINS readiness/backoff, poll lock and cleanup.',
);
