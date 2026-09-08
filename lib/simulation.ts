export type VType = 'SUV' | 'Sedan';
export type Block = {
  id: string;
  zone: string;
  capacity: number;
  state: string;
  doorClosed: boolean;
  estop: boolean;
  paused: boolean;
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
};
export type Sim = {
  blocks: Block[];
  jobs: Job[];
  logs: Log[];
  alarms: Alarm[];
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
      doorClosed: b.id !== 'A-03',
      estop: b.id === 'A-04',
      paused: false,
      slots,
      kinds,
    };
  });
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
        text: 'Nút nhấn khẩn cấp E-Stop đang được kích hoạt cơ học.',
        ack: false,
      },
      {
        id: 'DOOR-A-03',
        block: 'A-03',
        cat: 'operator',
        sev: 'Cao',
        code: 'W-0302',
        device: 'HMI-Panel',
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
        text: 'Pallet P08 đạt giới hạn chu kỳ bảo dưỡng định kỳ ổ bi đỡ ray dẫn hướng.',
        ack: false,
      },
    ],
    nextId: 2,
  };
}
export function blocked(b: Block) {
  return b.estop
    ? 'Dừng khẩn cấp'
    : !b.doorClosed
      ? 'Cửa chưa đóng'
      : b.state === 'Offline'
        ? 'Mất kết nối'
        : b.state === 'Bảo trì'
          ? 'Đang bảo trì'
          : b.state === 'Lỗi'
            ? 'Sự cố thiết bị'
            : b.paused
              ? 'Tạm dừng'
              : '';
}
export function active(j: Job) {
  return j.status === 'Chờ xử lý' || j.status === 'Đang chạy';
}
export function status(b: Block, s: Sim) {
  if (b.state === 'Offline') return 'Offline';
  if (b.state === 'Bảo trì') return 'Bảo trì';
  if (b.state === 'Lỗi') return 'Lỗi';
  if (s.jobs.some((j) => j.block === b.id && j.status === 'Đang chạy'))
    return 'Đang chạy';
  if (b.estop || !b.doorClosed || b.paused || b.state === 'Cảnh báo')
    return 'Cảnh báo';
  return 'Bình thường';
}
export type Action =
  | { type: 'tick'; time: string }
  | {
      type: 'dispatch';
      block: string;
      slot: number;
      plate: string;
      kind: 'in' | 'out';
      time: string;
    }
  | { type: 'cancel'; id: number; time: string }
  | { type: 'ack'; id: string; time: string }
  | {
      type: 'toggle';
      block: string;
      field: 'doorClosed' | 'estop' | 'paused' | 'maintenance' | 'online';
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
export function reduceSim(state: Sim, a: Action): Sim {
  if (a.type === 'dispatch' && validateDispatch(state, a)) return state;
  const s: Sim = structuredClone(state);
  const log = (block: string, text: string) => {
    s.logs.unshift({ id: s.nextId++, time: a.time, block, text });
    s.logs = s.logs.slice(0, 500);
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
        .filter((j) => j.block === b.id && active(j))
        .sort((a, b) => a.id - b.id)[0];
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
      log(alarm.block, `Xác nhận cảnh báo ${alarm.id}`);
    }
  }
  if (a.type === 'toggle') {
    const b = s.blocks.find((b) => b.id === a.block);
    if (!b) return state;
    if (a.field === 'maintenance') {
      if (s.jobs.some((j) => j.block === b.id && active(j))) return state;
      b.state = b.state === 'Bảo trì' ? 'Bình thường' : 'Bảo trì';
    } else if (a.field === 'online')
      b.state = b.state === 'Offline' ? 'Bình thường' : 'Offline';
    else b[a.field] = !b[a.field];
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
    log(
      b.id,
      `${a.field === 'doorClosed' ? 'Cửa an toàn' : a.field === 'estop' ? 'Dừng khẩn cấp' : a.field === 'paused' ? 'Tạm dừng' : a.field === 'maintenance' ? 'Chế độ bảo trì' : 'Kết nối'}: ${a.field === 'maintenance' || a.field === 'online' ? b.state : b[a.field] ? 'Bật' : 'Tắt'}`,
    );
  }
  return s;
}
