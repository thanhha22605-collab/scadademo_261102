import assert from 'node:assert/strict';
import {
  createSim,
  reduceSim,
  validateDispatch,
  blocked,
  isActiveAlarm,
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
  91,
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
/* --- Hồi quy #1: fault KHÔNG dính vào jam/alarm hệ thống khác --- */
{
  const T = 't';
  let f = createSim();
  f = reduceSim(f, { type: 'command', block: 'C-02', cmd: 'SIM_JAM', time: T });
  f = reduceSim(f, { type: 'command', block: 'C-02', cmd: 'SIM_FAULT', time: T });
  f = reduceSim(f, { type: 'command', block: 'C-02', cmd: 'SIM_FAULT', time: T });
  f = reduceSim(f, { type: 'command', block: 'C-02', cmd: 'SIM_JAM', time: T });
  const c = f.blocks.find((b) => b.id === 'C-02');
  assert.equal(c.fault, false, '#1 fault không được kẹt do JAM');
  assert.equal(c.jammed, false, '#1 jammed đã tắt');
  assert.equal(c.state, 'Bình thường', '#1 block trở lại bình thường');
}

/* --- Hồi quy #5: LOCK rồi UNLOCK cho block chạy lại, không kẹt pause --- */
{
  const T = 't';
  let l = createSim();
  l = reduceSim(l, { type: 'command', block: 'A-02', cmd: 'LOCK', time: T });
  assert.equal(blocked(l.blocks.find((b) => b.id === 'A-02')), 'Block đã khóa');
  l = reduceSim(l, { type: 'command', block: 'A-02', cmd: 'UNLOCK', time: T });
  const b = l.blocks.find((x) => x.id === 'A-02');
  assert.equal(b.paused, false, '#5 UNLOCK không để lại pause');
  assert.equal(blocked(b), '', '#5 A-02 vận hành lại sau UNLOCK');
  l = reduceSim(l, { type: 'tick', time: T });
  assert.equal(l.jobs.find((j) => j.id === 1).progress, 55, '#5 job tiếp tục sau UNLOCK');
}

/* --- Hồi quy #2: đóng cửa lại → DOOR alarm chuyển sang resolved (không còn active) --- */
{
  const T = 't';
  let a = createSim();
  a = reduceSim(a, { type: 'toggle', block: 'B-01', field: 'doorClosed', time: T });
  assert.ok(a.alarms.some((x) => x.id === 'DOOR-B-01' && isActiveAlarm(x)), '#2 mở cửa tạo DOOR active');
  a = reduceSim(a, { type: 'toggle', block: 'B-01', field: 'doorClosed', time: T });
  assert.equal(isActiveAlarm(a.alarms.find((x) => x.id === 'DOOR-B-01')), false, '#2 đóng cửa → resolved');
}

/* --- Hồi quy #4: lệnh đã kết thúc bị giới hạn (không rò rỉ) --- */
{
  const T = 't';
  let p = createSim();
  for (let i = 0; i < 260; i++) {
    const plate = `51H-${String(100 + i).slice(-3)}.${String(10 + (i % 80)).padStart(2, '0')}`;
    p = reduceSim(p, { type: 'dispatch', block: 'A-01', slot: 16, plate, kind: 'in', time: T });
    p = reduceSim(p, { type: 'cancel', id: p.jobs[0].id, time: T });
  }
  const finished = p.jobs.filter((j) => j.status === 'Đã hủy' || j.status === 'Hoàn tất').length;
  assert.ok(finished <= 200, `#4 lệnh đã kết thúc bị giới hạn (=${finished})`);
}

console.log(
  'PASS: occupancy, dispatch, duplicates, queue, door interlock, acknowledgement, completion, retrieval, cancellation, invalid input, maintenance, E-STOP, offline, fault/jam decouple (#1), lock-unlock (#5), alarm resolve (#2), job pruning (#4).',
);
