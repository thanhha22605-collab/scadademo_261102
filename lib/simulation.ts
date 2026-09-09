export type VType = 'SUV' | 'Sedan';
export type Mode = 'Auto' | 'Manual' | 'Maint' | 'EStop';
export type Block = {
  id: string;
  zone: string;
  capacity: number;
  state: string;
  mode: Mode;
  doorClosed: boolean;
  estop: boolean;
  paused: boolean;
  locked: boolean;
  forced: boolean;
  slots: (string | null)[];
  kinds: (VType | null)[];
};
export type Job = {
  id: number;
  block: string;
  slot: number;
  plate: string;
  kind: 'in' | 'out';
  progress: number;
  status: 'Chờ xử lý' | 'Đang chạy' | 'Hoàn tất' | 'Đã hủy';
  priority: 'VIP' | 'NORMAL';
  hold: boolean;
};
export type Log = { id: number; time: string; block: string; text: string };
export type Alarm = {
  id: string;
  block: string;
  text: string;
  ack: boolean;
  cat?: 'operator' | 'system' | 'maintenance';
  sev?: 'Nghiêm trọng' | 'Cao' | 'Trung bình' | 'Thấp';
  code?: string;
  device?: string;
  ackBy?: string;
  at?: string;
};
export type Bypass = {
  id: number;
  device: string;
  block: string;
  timeout: number;
  reason: string;
  at: string;
};
export type Sim = {
  blocks: Block[];
  jobs: Job[];
  logs: Log[];
  alarms: Alarm[];
  bypasses: Bypass[];
  nextId: number;
};
export const zoneLabel: Record<string, string> = {
  A: 'Zone A – Hầm B1',
  B: 'Zone B – Hầm B2',
  C: 'Zone C – Hầm B3',
};
export const zoneTag: Record<string, string> = { A: 'Z1', B: 'Z2', C: 'Z3' };
export const specs = [
  { id: 'A-01', zone: 'A', count: 16, capacity: 20, state: 'Bình thường' },
  { id: 'A-02', zone: 'A', count: 18, capacity: 20, state: 'Bình thường' },
  { id: 'A-03', zone: 'A', count: 14, capacity: 20, state: 'Cảnh báo' },
  { id: 'A-04', zone: 'A', count: 10, capacity: 20, state: 'Lỗi' },
  { id: 'B-01', zone: 'B', count: 13, capacity: 24, state: 'Bình thường' },
  { id: 'B-02', zone: 'B', count: 0, capacity: 24, state: 'Bảo trì' },
  { id: 'B-03', zone: 'B', count: 15, capacity: 24, state: 'Bình thường' },
  { id: 'C-01', zone: 'C', count: 0, capacity: 16, state: 'Offline' },
  { id: 'C-02', zone: 'C', count: 5, capacity: 16, state: 'Bình thường' },
];
const prefixes = [
  '51H',
  '51G',
  '30A',
  '30F',
  '29A',
  '29B',
  '43C',
  '92B',
  '79C',
];
export function plateType(plate: string): VType {
  let sum = 0;
  for (const c of plate) sum += c.charCodeAt(0);
  return sum % 5 < 2 ? 'SUV' : 'Sedan';
}
function modeOf(id: string): Mode {
  if (id === 'A-04') return 'EStop';
  if (id === 'B-02') return 'Maint';
  return 'Auto';
}
export function createSim(): Sim {
  // Spread exactly 37 SUV across the 91 seeded vehicles for a stable mix.
  let seen = 0;
  const total = specs.reduce((n, b) => n + b.count, 0);
  const suvTarget = 37;
  const blocks: Block[] = specs.map((b, bi) => {
    const slots: (string | null)[] = [];
    const kinds: (VType | null)[] = [];
    for (let i = 0; i < b.capacity; i++) {
      if (i < b.count) {
        slots.push(
          `${prefixes[bi]}-${String(100 + seen).padStart(3, '0').slice(-3)}.${String(10 + (seen % 89)).padStart(2, '0')}`,
        );
        const suv =
          Math.floor((seen * suvTarget) / total) !==
          Math.floor(((seen - 1) * suvTarget) / total);
        kinds.push(suv ? 'SUV' : 'Sedan');
        seen++;
      } else {
        slots.push(null);
        kinds.push(null);
      }
    }
    return {
      ...b,
      mode: modeOf(b.id),
      doorClosed: b.id !== 'A-03',
      estop: b.id === 'A-04',
      paused: false,
      locked: false,
      forced: false,
      slots,
      kinds,
    };
  });
  const a03 = blocks.find((b) => b.id === 'A-03')!;
  return {
    blocks,
    jobs: [
      {
        id: 1,
        block: 'A-02',
        slot: 18,
        plate: '51G-777.01',
        kind: 'in',
        progress: 45,
        status: 'Đang chạy',
        priority: 'NORMAL',
        hold: false,
      },
      {
        id: 2,
        block: 'B-01',
        slot: 13,
        plate: '29A-889.31',
        kind: 'in',
        progress: 20,
        status: 'Đang chạy',
        priority: 'VIP',
        hold: false,
      },
      {
        id: 3,
        block: 'B-03',
        slot: 15,
        plate: '30G-445.62',
        kind: 'in',
        progress: 0,
        status: 'Chờ xử lý',
        priority: 'NORMAL',
        hold: true,
      },
      {
        id: 4,
        block: 'A-03',
        slot: 1,
        plate: a03.slots[1]!,
        kind: 'out',
        progress: 0,
        status: 'Chờ xử lý',
        priority: 'NORMAL',
        hold: true,
      },
      {
        id: 5,
        block: 'C-02',
        slot: 5,
        plate: '29B-556.20',
        kind: 'in',
        progress: 0,
        status: 'Chờ xử lý',
        priority: 'VIP',
        hold: true,
      },
    ],
    logs: [],
    alarms: [
      {
        id: 'SYS-FLT-11',
        block: 'A-04',
        cat: 'system',
        sev: 'Nghiêm trọng',
        code: 'E-0401',
        device: 'Motor-Lift-01',
        at: '08:42:15',
        text: 'Motor nâng hạ quá dòng - quá tải nhiệt cơ cấu truyền động (115°C).',
        ack: false,
      },
      {
        id: 'STOP-A-04',
        block: 'A-04',
        cat: 'operator',
        sev: 'Nghiêm trọng',
        code: 'E-0408',
        device: 'Safety-Relay',
        at: '06:12:33',
        text: 'Nút nhấn khẩn cấp E-Stop đang được kích hoạt cơ học.',
        ack: false,
      },
      {
        id: 'SYS-FLT-05',
        block: 'A-04',
        cat: 'system',
        sev: 'Cao',
        code: 'E-0405',
        device: 'Sensor-LS-03',
        at: '07:55:10',
        text: 'Công tắc giới hạn hành trình dưới không phản hồi - Khay P05.',
        ack: false,
      },
      {
        id: 'SYS-FLT-09',
        block: 'B-03',
        cat: 'system',
        sev: 'Cao',
        code: 'E-0705',
        device: 'Motor-Slide-04',
        at: '08:20:41',
        text: 'Lệch pha dòng điện motor trượt ngang vượt ngưỡng cho phép.',
        ack: false,
      },
      {
        id: 'DOOR-A-03',
        block: 'A-03',
        cat: 'operator',
        sev: 'Cao',
        code: 'W-0302',
        device: 'HMI-Panel',
        at: '08:38:02',
        text: 'Cửa tủ điều khiển tại trạm đang mở - Cảnh báo an ninh.',
        ack: false,
      },
      {
        id: 'LINK-C-01',
        block: 'C-01',
        cat: 'system',
        sev: 'Cao',
        code: 'E-0901',
        device: 'PLC-Link',
        at: '08:05:12',
        text: 'Mất kết nối bộ điều khiển mô phỏng (Modbus TCP timeout).',
        ack: false,
      },
      {
        id: 'MNT-DUE-22',
        block: 'C-02',
        cat: 'maintenance',
        sev: 'Thấp',
        code: 'M-0522',
        device: 'Xích tải',
        at: '07:30:00',
        text: 'Pallet P08 đạt giới hạn chu kỳ bảo dưỡng định kỳ ổ bi đỡ ray dẫn hướng.',
        ack: false,
      },
      {
        id: 'SYS-FLT-07',
        block: 'B-03',
        cat: 'system',
        sev: 'Trung bình',
        code: 'W-0701',
        device: 'AI-VDS',
        at: '08:15:44',
        ackBy: 'operator01',
        text: 'Camera AI-VDS cổng vào mất kết nối - Hệ thống chuyển Fallback.',
        ack: true,
      },
      {
        id: 'MNT-0501',
        block: 'B-01',
        cat: 'maintenance',
        sev: 'Thấp',
        code: 'M-0501',
        device: 'Motor-Slide-02',
        at: '07:30:00',
        ackBy: 'maintenance01',
        text: 'Số chu kỳ chạy nâng trượt đạt ngưỡng mài mòn cao (85% giới hạn).',
        ack: true,
      },
      {
        id: 'OP-0309',
        block: 'A-03',
        cat: 'operator',
        sev: 'Trung bình',
        code: 'W-0309',
        device: 'Photogate',
        at: '06:48:20',
        ackBy: 'operator02',
        text: 'Cảm biến quang phát hiện vật cản tạm thời tại lối ra - đã thông.',
        ack: true,
      },
    ],
    bypasses: [
      {
        id: 6,
        device: 'LS-T3 - Cảm biến hành trình',
        block: 'B-04',
        timeout: 30,
        reason: 'Bảo trì cơ khí định kỳ, cảm biến báo lỗi giả.',
        at: '08:10:00',
      },
    ],
    nextId: 7,
  };
}
export function active(j: Job) {
  return j.status === 'Chờ xử lý' || j.status === 'Đang chạy';
}
export function blocked(b: Block) {
  if (b.estop) return 'Dừng khẩn cấp';
  if (b.state === 'Offline') return 'Mất kết nối';
  if (!b.forced) {
    if (!b.doorClosed) return 'Cửa chưa đóng';
    if (b.state === 'Lỗi') return 'Sự cố thiết bị';
  }
  if (b.state === 'Bảo trì') return 'Đang bảo trì';
  if (b.locked) return 'Block đã khóa';
  if (b.paused) return 'Tạm dừng';
  return '';
}
export function status(b: Block, s: Sim) {
  if (b.state === 'Offline') return 'Offline';
  if (b.state === 'Bảo trì') return 'Bảo trì';
  if (b.state === 'Lỗi') return 'Lỗi';
  if (s.jobs.some((j) => j.block === b.id && j.status === 'Đang chạy'))
    return 'Đang chạy';
  if (
    b.estop ||
    !b.doorClosed ||
    b.paused ||
    b.locked ||
    b.state === 'Cảnh báo'
  )
    return 'Cảnh báo';
  return 'Bình thường';
}
export type Action =
  | { type: 'tick'; time: string }
  | { type: 'load'; sim: Sim }
  | {
      type: 'dispatch';
      block: string;
      slot: number;
      plate: string;
      kind: 'in' | 'out';
      time: string;
      priority?: 'VIP' | 'NORMAL';
    }
  | { type: 'cancel'; id: number; time: string }
  | { type: 'ack'; id: string; time: string; by?: string }
  | {
      type: 'toggle';
      block: string;
      field: 'doorClosed' | 'estop' | 'paused' | 'maintenance' | 'online';
      time: string;
    }
  | { type: 'mode'; block: string; mode: Mode; time: string }
  | { type: 'command'; block: string; cmd: string; time: string }
  | {
      type: 'bypass';
      op: 'add' | 'remove';
      id?: number;
      device?: string;
      block?: string;
      timeout?: number;
      reason?: string;
      time: string;
    }
  | {
      type: 'queue';
      op: 'vip' | 'hold' | 'resume' | 'reject';
      id: number;
      time: string;
    };
export function validateDispatch(
  s: Sim,
  a: { block: string; slot: number; plate: string; kind: 'in' | 'out' },
): string {
  const b = s.blocks.find((b) => b.id === a.block);
  if (!b) return 'Block không tồn tại.';
  if (blocked(b)) return `Không thể gửi lệnh: ${blocked(b)}.`;
  if (!Number.isInteger(a.slot) || a.slot < 0 || a.slot >= b.capacity)
    return 'Chọn một pallet hợp lệ.';
  if (s.jobs.some((j) => active(j) && j.block === b.id && j.slot === a.slot))
    return 'Pallet đã có lệnh trong hàng đợi.';
  if (a.kind === 'out' && !b.slots[a.slot]) return 'Pallet này không có xe.';
  if (a.kind === 'in') {
    if (b.slots[a.slot]) return 'Pallet đã có xe.';
    const p = a.plate.trim().toUpperCase();
    if (!/^[0-9]{2}[A-Z]{1,2}-[0-9]{3}\.[0-9]{2}$/.test(p))
      return 'Nhập biển số dạng 51H-123.45.';
    if (
      s.blocks.some((b) => b.slots.includes(p)) ||
      s.jobs.some((j) => active(j) && j.kind === 'in' && j.plate === p)
    )
      return 'Biển số đã có trong hệ thống hoặc hàng đợi.';
  }
  return '';
}
const cmdLabel: Record<string, string> = {
  START: 'Khởi chạy Block (START)',
  STOP: 'Dừng Block (STOP)',
  PAUSE: 'Tạm dừng (PAUSE)',
  RESUME: 'Tiếp tục (RESUME)',
  LOCK: 'Khóa Block',
  UNLOCK: 'Mở khóa Block',
  DISABLE_MAINT: 'Kết thúc chế độ bảo trì',
  FORCE: 'Cưỡng bức Admin (Force Mode)',
  SIM_FAULT: 'Giả lập lỗi thiết bị',
  SIM_JAM: 'Giả lập kẹt cơ cấu',
  PLC: 'Gửi lệnh trực tiếp xuống PLC',
};
export function reduceSim(state: Sim, a: Action): Sim {
  // Nạp trọn snapshot (dùng khi đọc dữ liệu thật từ PLC qua gateway).
  if (a.type === 'load') return a.sim;
  if (a.type === 'dispatch' && validateDispatch(state, a)) return state;
  const s: Sim = structuredClone(state);
  const log = (block: string, text: string) => {
    s.logs.unshift({ id: s.nextId++, time: a.time, block, text });
    s.logs = s.logs.slice(0, 500);
  };
  const syncAlarms = (b: Block) => {
    const sync = (
      id: string,
      on: boolean,
      text: string,
      extra: Partial<Alarm> = {},
    ) => {
      if (on) {
        if (!s.alarms.some((x) => x.id === id))
          s.alarms.unshift({ id, block: b.id, text, ack: false, ...extra });
      } else s.alarms = s.alarms.filter((x) => x.id !== id);
    };
    sync(
      `DOOR-${b.id}`,
      !b.doorClosed,
      'Cảm biến cửa chưa đóng. Khóa lệnh vận hành.',
      { cat: 'operator', sev: 'Cao', code: 'W-0302', device: 'HMI-Panel' },
    );
    sync(`STOP-${b.id}`, b.estop, 'Dừng khẩn cấp đang kích hoạt.', {
      cat: 'operator',
      sev: 'Nghiêm trọng',
      code: 'E-0408',
      device: 'Safety-Relay',
    });
    sync(
      `LINK-${b.id}`,
      b.state === 'Offline',
      'Mất kết nối bộ điều khiển mô phỏng.',
      { cat: 'system', sev: 'Cao', code: 'E-0901', device: 'PLC-Link' },
    );
  };
  if (a.type === 'dispatch') {
    const b = s.blocks.find((b) => b.id === a.block)!;
    const plate =
      a.kind === 'in' ? a.plate.trim().toUpperCase() : b.slots[a.slot]!;
    s.jobs.unshift({
      id: s.nextId++,
      block: b.id,
      slot: a.slot,
      plate,
      kind: a.kind,
      progress: 0,
      status: 'Chờ xử lý',
      priority: a.priority ?? 'NORMAL',
      hold: false,
    });
    log(
      b.id,
      `Đã xếp lệnh ${a.kind === 'in' ? 'nhập' : 'xuất'} xe ${plate} · P${String(a.slot + 1).padStart(2, '0')}`,
    );
  }
  if (a.type === 'tick') {
    for (const b of s.blocks) {
      if (blocked(b)) continue;
      const j = s.jobs
        .filter((j) => j.block === b.id && active(j) && !j.hold)
        .sort((x, y) => {
          if (x.priority !== y.priority) return x.priority === 'VIP' ? -1 : 1;
          return x.id - y.id;
        })[0];
      if (!j) continue;
      if (j.status === 'Chờ xử lý') {
        j.status = 'Đang chạy';
        log(b.id, `Bắt đầu ${j.kind === 'in' ? 'nhập' : 'xuất'} xe ${j.plate}`);
      }
      j.progress = Math.min(100, j.progress + 10);
      if (j.progress === 100) {
        b.slots[j.slot] = j.kind === 'in' ? j.plate : null;
        b.kinds[j.slot] = j.kind === 'in' ? plateType(j.plate) : null;
        j.status = 'Hoàn tất';
        log(
          b.id,
          `Hoàn tất ${j.kind === 'in' ? 'nhập' : 'xuất'} xe ${j.plate}`,
        );
      }
    }
  }
  if (a.type === 'cancel') {
    const j = s.jobs.find((j) => j.id === a.id);
    if (j?.status === 'Chờ xử lý') {
      j.status = 'Đã hủy';
      log(j.block, `Hủy lệnh chờ #${j.id}`);
    }
  }
  if (a.type === 'ack') {
    const alarm = s.alarms.find((x) => x.id === a.id);
    if (alarm && !alarm.ack) {
      alarm.ack = true;
      alarm.ackBy = a.by ?? 'supervisor01';
      log(alarm.block, `Xác nhận cảnh báo ${alarm.id}`);
    }
  }
  if (a.type === 'toggle') {
    const b = s.blocks.find((b) => b.id === a.block);
    if (!b) return state;
    if (a.field === 'maintenance') {
      if (s.jobs.some((j) => j.block === b.id && active(j))) return state;
      b.state = b.state === 'Bảo trì' ? 'Bình thường' : 'Bảo trì';
      b.mode = b.state === 'Bảo trì' ? 'Maint' : 'Auto';
    } else if (a.field === 'online')
      b.state = b.state === 'Offline' ? 'Bình thường' : 'Offline';
    else b[a.field] = !b[a.field];
    if (a.field === 'estop') b.mode = b.estop ? 'EStop' : 'Auto';
    syncAlarms(b);
    log(
      b.id,
      `${a.field === 'doorClosed' ? 'Cửa an toàn' : a.field === 'estop' ? 'Dừng khẩn cấp' : a.field === 'paused' ? 'Tạm dừng' : a.field === 'maintenance' ? 'Chế độ bảo trì' : 'Kết nối'}: ${a.field === 'maintenance' || a.field === 'online' ? b.state : b[a.field] ? 'Bật' : 'Tắt'}`,
    );
  }
  if (a.type === 'mode') {
    const b = s.blocks.find((b) => b.id === a.block);
    if (!b) return state;
    if (a.mode === 'Maint' && s.jobs.some((j) => j.block === b.id && active(j)))
      return state;
    b.mode = a.mode;
    b.estop = a.mode === 'EStop';
    if (a.mode === 'Maint') b.state = 'Bảo trì';
    else if (b.state === 'Bảo trì') b.state = 'Bình thường';
    syncAlarms(b);
    log(b.id, `Chuyển chế độ vận hành: ${a.mode.toUpperCase()}`);
  }
  if (a.type === 'command') {
    const b = s.blocks.find((b) => b.id === a.block);
    if (!b) return state;
    if (a.cmd === 'START' || a.cmd === 'RESUME') b.paused = false;
    else if (a.cmd === 'STOP' || a.cmd === 'PAUSE') b.paused = true;
    else if (a.cmd === 'LOCK') b.locked = true;
    else if (a.cmd === 'UNLOCK') b.locked = false;
    else if (a.cmd === 'FORCE') b.forced = !b.forced;
    else if (a.cmd === 'DISABLE_MAINT') {
      if (b.state === 'Bảo trì' && !s.jobs.some((j) => j.block === b.id && active(j))) {
        b.state = 'Bình thường';
        b.mode = 'Auto';
      }
    } else if (a.cmd === 'SIM_FAULT') {
      if (b.state === 'Lỗi') {
        b.state = 'Bình thường';
        s.alarms = s.alarms.filter((x) => x.id !== `FAULT-${b.id}`);
      } else {
        b.state = 'Lỗi';
        if (!s.alarms.some((x) => x.id === `FAULT-${b.id}`))
          s.alarms.unshift({
            id: `FAULT-${b.id}`,
            block: b.id,
            cat: 'system',
            sev: 'Nghiêm trọng',
            code: 'E-0410',
            device: 'Motor-Lift',
            at: a.time.slice(-8),
            text: 'Giả lập lỗi thiết bị nâng hạ - cần kiểm tra.',
            ack: false,
          });
      }
    } else if (a.cmd === 'SIM_JAM') {
      b.paused = true;
      if (!s.alarms.some((x) => x.id === `JAM-${b.id}`))
        s.alarms.unshift({
          id: `JAM-${b.id}`,
          block: b.id,
          cat: 'system',
          sev: 'Cao',
          code: 'E-0412',
          device: 'Slide-Runner',
          at: a.time.slice(-8),
          text: 'Giả lập kẹt cơ cấu trượt ngang - dừng an toàn.',
          ack: false,
        });
    }
    log(b.id, cmdLabel[a.cmd] ?? a.cmd);
  }
  if (a.type === 'bypass') {
    if (a.op === 'add' && a.device && a.block && a.reason) {
      s.bypasses.unshift({
        id: s.nextId++,
        device: a.device,
        block: a.block,
        timeout: a.timeout ?? 15,
        reason: a.reason,
        at: a.time.slice(-8),
      });
      log(a.block, `Kích hoạt Bypass ${a.device} (${a.timeout ?? 15} phút)`);
    } else if (a.op === 'remove' && a.id != null) {
      const bp = s.bypasses.find((x) => x.id === a.id);
      s.bypasses = s.bypasses.filter((x) => x.id !== a.id);
      if (bp) log(bp.block, `Gỡ Bypass ${bp.device}`);
    }
  }
  if (a.type === 'queue') {
    const j = s.jobs.find((j) => j.id === a.id);
    if (!j) return state;
    if (a.op === 'vip') {
      j.priority = 'VIP';
      log(j.block, `Nâng ưu tiên VIP lệnh #${j.id} · ${j.plate}`);
    } else if (a.op === 'hold' && active(j)) {
      j.hold = true;
      log(j.block, `Giữ (Hold) lệnh #${j.id} · ${j.plate}`);
    } else if (a.op === 'resume') {
      j.hold = false;
      log(j.block, `Tiếp tục lệnh #${j.id} · ${j.plate}`);
    } else if (a.op === 'reject' && active(j)) {
      j.status = 'Đã hủy';
      log(j.block, `Từ chối lệnh #${j.id} · ${j.plate}`);
    }
  }
  return s;
}
