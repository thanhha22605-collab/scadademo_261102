import assert from 'node:assert/strict';
import {
  createSim,
  reduceSim,
  validateDispatch,
  blocked,
} from '../lib/simulation.ts';
let s = createSim();
const act = {
  type: 'dispatch',
  block: 'A-01',
  slot: 16,
  plate: '51H-999.99',
  kind: 'in',
  time: 'test',
};
assert.equal(
  s.blocks.reduce((n, b) => n + b.slots.filter(Boolean).length, 0),
  81,
);
assert.equal(validateDispatch(s, act), '');
s = reduceSim(s, act);
assert.match(validateDispatch(s, act), /Pallet đã có lệnh/);
const duplicate = { ...act, slot: 17 };
assert.match(validateDispatch(s, duplicate), /Biển số đã có/);
s = reduceSim(s, { type: 'tick', time: 'test' });
assert.equal(s.jobs[0].progress, 10);
s = reduceSim(s, {
  type: 'toggle',
  block: 'A-01',
  field: 'doorClosed',
  time: 'test',
});
assert.ok(blocked(s.blocks[0]));
s = reduceSim(s, { type: 'tick', time: 'test' });
assert.equal(s.jobs[0].progress, 10);
s = reduceSim(s, { type: 'ack', id: 'DOOR-A-01', time: 'test' });
assert.ok(blocked(s.blocks[0]));
s = reduceSim(s, {
  type: 'toggle',
  block: 'A-01',
  field: 'doorClosed',
  time: 'test',
});
for (let i = 0; i < 9; i++) s = reduceSim(s, { type: 'tick', time: 'test' });
assert.equal(s.jobs[0].status, 'Hoàn tất');
assert.equal(s.blocks[0].slots[16], '51H-999.99');
s = reduceSim(s, { ...act, kind: 'out', plate: '' });
for (let i = 0; i < 10; i++) s = reduceSim(s, { type: 'tick', time: 'test' });
assert.equal(s.blocks[0].slots[16], null);
s = reduceSim(s, act);
s = reduceSim(s, { type: 'cancel', id: s.jobs[0].id, time: 'test' });
assert.equal(s.jobs[0].status, 'Đã hủy');
assert.equal(s.blocks[0].slots[16], null);
assert.match(validateDispatch(s, { ...act, plate: 'invalid' }), /biển số/);
assert.match(validateDispatch(s, { ...act, block: 'B-02' }), /bảo trì/);
assert.match(validateDispatch(s, { ...act, block: 'C-01' }), /kết nối/);
s = reduceSim(s, act);
s = reduceSim(s, {
  type: 'toggle',
  block: 'A-01',
  field: 'estop',
  time: 'test',
});
s = reduceSim(s, { type: 'tick', time: 'test' });
assert.equal(s.jobs[0].progress, 0);
s = reduceSim(s, {
  type: 'toggle',
  block: 'A-01',
  field: 'estop',
  time: 'test',
});
s = reduceSim(s, {
  type: 'toggle',
  block: 'A-01',
  field: 'online',
  time: 'test',
});
s = reduceSim(s, { type: 'tick', time: 'test' });
assert.equal(s.jobs[0].progress, 0);
console.log(
  'PASS: occupancy, dispatch, duplicates, queue, door interlock, acknowledgement, completion, retrieval, cancellation, invalid input, maintenance, E-STOP, offline.',
);
