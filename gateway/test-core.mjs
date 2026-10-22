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
  validateConfig,
} from './core.mjs';

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
assert.throws(() => validateConfig([{ ...unit, protocol: 'udp' }]), /FINS\/TCP/);
assert.throws(() => validateConfig([unit, { ...unit, id: 'tower-2', n: 2 }]), /Trùng/);
assert.equal(authorized('Bearer ' + TOKEN, TOKEN), true);
assert.equal(authorized('Bearer wrong', TOKEN), false);

const signed = await readWord({
  read(_address, _count, callback) {
    callback(null, { response: { values: [-1] } });
  },
}, 'W1');
assert.equal(signed, 0xffff, 'signed int16 phải được chuẩn hóa unsigned');
await assert.rejects(
  readWord({ read(_address, _count, callback) { callback(null, { values: [] }); } }, 'W1'),
  /không hợp lệ/,
);

{
  let disconnected = 0;
  let managerClosed = 0;
  let listenersRemoved = 0;
  closeClient({
    disconnect() { disconnected++; },
    sequenceManager: { close() { managerClosed++; } },
    removeAllListeners() { listenersRemoved++; },
  });
  assert.deepEqual([disconnected, managerClosed, listenersRemoved], [1, 1, 1]);
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
  sequenceManager = { close: () => { this.managerClosed = true; } };
  read(_address, _count, callback) {
    this.reads++;
    setTimeout(() => callback(null, { response: { values: [0] } }), 2);
  }
  disconnect() { this.disconnected = true; this.connected = false; }
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
  assert.equal(poller.clients.has(unit.id), false, 'client đã đóng phải được loại khỏi cache');
  assert.equal(client.managerClosed, true, 'close tự nhiên phải dọn timer sequence manager');
  poller.stop();
}

console.log('PASS: gateway validation, auth, atomic save, signed words, FINS readiness, poll lock and cleanup.');
