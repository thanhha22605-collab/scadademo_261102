export type VType = 'SUV' | 'Sedan';
export type Mode = 'Auto' | 'Manual' | 'Maint' | 'EStop';
export type Quality = 'good' | 'stale' | 'unknown';
export type Block = {
  name?: string;
  online: boolean;
  fault: boolean | null;
  maintenance: boolean | null;
  jammed: boolean | null;
  quality: Quality;
  photogateClear: boolean | null;
  limitOk: boolean | null;
  overloadOk: boolean | null;
  bypassed: string[];
  occupancy?: (boolean | null)[];
  reportedCount?: number | null;
  id: string;
  zone: string;
  capacity: number;
  state: string;
  mode: Mode | null;
  doorClosed: boolean | null;
  estop: boolean | null;
  paused: boolean | null;
  safetyLatched: boolean | null;
  locked: boolean | null;
  forced: boolean;
  slots: (string | null)[];
  kinds: (VType | null)[];
  monitored?: boolean;
  operational?: boolean;
  parkingClass?: 'any' | 'mechanical-2200' | 'mechanical-2600' | 'ground';
  lastGoodAt?: number | null;
  lastError?: string | null;
  retryAt?: number | null;
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
  active?: boolean;
  resolvedAt?: string;
  id: string;
  block: string;
  zone?: string;
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
  expiresAt: number;
  id: number;
  device: string;
  block: string;
  timeout: number;
  reason: string;
  at: string;
};
export type CameraVehicle = {
  eventId: string;
  receivedAt: number;
  cameraAt?: number | null;
  plate?: string | null;
  make?: string | null;
  model?: string | null;
  year?: string | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  weightKg?: number | null;
  category?: string | null;
  imagePath?: string | null;
  lane?: string;
  weightClass?: string;
  outcome?: 'routed' | 'rejected' | 'manual-review' | 'no-capacity';
  reason?: string | null;
  zone?: string;
  block?: string;
};
export type PgsSummary = {
  configured: boolean;
  listening: boolean;
  port?: number | null;
  zcuTotal: number;
  connected: number;
  empty: number;
  occupied: number;
  fault: number;
  uninstalled: number;
  lastAt?: number | null;
};
export type LedSummary = {
  configured: boolean;
  panels: number;
  online: number;
  items?: {
    id: string;
    online: boolean;
    lastOkAt?: number | null;
    lastError?: string | null;
  }[];
};
export type Sim = {
  clockMs: number;
  source: 'sim' | 'plc' | 'mock';
  connection: 'loading' | 'online' | 'stale' | 'offline';
  updatedAt: number | null;
  blocks: Block[];
  jobs: Job[];
  logs: Log[];
  alarms: Alarm[];
  bypasses: Bypass[];
  nextId: number;
  integrations?: {
    camera?: CameraVehicle | null;
    pgs?: PgsSummary | null;
    led?: LedSummary | null;
  };
};
export const zoneLabel: Record<string, string> = {
  A: 'Zone A – Hầm B1',
  B: 'Zone B – Hầm B2',
  C: 'Zone C – Hầm B3',
};
export const zoneTag: Record<string, string> = { A: 'Z1', B: 'Z2', C: 'Z3' };
export const blockLabel = (b: Pick<Block, 'id' | 'name'>) =>
  b.name?.trim() || `Block ${b.id}`;
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
          `${prefixes[bi]}-${String(100 + seen)
            .padStart(3, '0')
            .slice(-3)}.${String(10 + (seen % 89)).padStart(2, '0')}`,
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
      online: b.state !== 'Offline',
      fault: b.state === 'Lỗi' || b.id === 'B-03',
      maintenance: b.state === 'Bảo trì',
      jammed: false,
      quality: 'good',
      photogateClear: true,
      limitOk: true,
      overloadOk: true,
      bypassed: [],
      mode: modeOf(b.id),
      doorClosed: b.id !== 'A-03',
      estop: b.id === 'A-04',
      paused: false,
      safetyLatched: false,
      locked: false,
      forced: false,
      slots,
      kinds,
    };
  });
  const a03 = blocks.find((b) => b.id === 'A-03')!;
  return {
    clockMs: Date.now(),
    source: 'sim',
    connection: 'online',
    updatedAt: null,
    blocks: blocks.map(refreshBlock),
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
        text: 'Mất kết nối bộ điều khiển mô phỏng (FINS timeout).',
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
        active: false,
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
    bypasses: [],
    nextId: 7,
  };
}
export function active(j: Job) {
  return j.status === 'Chờ xử lý' || j.status === 'Đang chạy';
}
export function refreshBlock(b: Block): Block {
  b.forced = b.bypassed.length > 0;
  b.state = !b.online
    ? 'Offline'
    : b.fault === true || b.jammed === true
      ? 'Lỗi'
      : b.maintenance === true
        ? 'Bảo trì'
        : b.estop === true ||
            b.doorClosed === false ||
            b.photogateClear === false ||
            b.limitOk === false ||
            b.overloadOk === false
          ? 'Cảnh báo'
          : 'Bình thường';
  return b;
}
export function interlockReason(b: Block) {
  if (!b.online) return 'Mất kết nối';
  if (b.quality !== 'good') return 'Dữ liệu chưa xác nhận';
  if (b.estop === null) return 'Tín hiệu E-Stop chưa được ánh xạ';
  if (b.estop) return 'Dừng khẩn cấp';
  if (b.doorClosed === null) return 'Tín hiệu cửa chưa được ánh xạ';
  if (!b.doorClosed) return 'Cửa chưa đóng';
  if (b.fault === null) return 'Tín hiệu lỗi thiết bị chưa được ánh xạ';
  if (b.fault) return 'Sự cố thiết bị';
  if (b.jammed === null) return 'Tín hiệu kẹt cơ cấu chưa được ánh xạ';
  if (b.jammed) return 'Kẹt cơ cấu';
  if (b.maintenance === null) return 'Trạng thái bảo trì chưa được ánh xạ';
  if (b.maintenance) return 'Đang bảo trì';
  // Tín hiệu chưa ánh xạ (null) KHÔNG chặn vận hành/giám sát; chỉ chặn khi xác định = false.
  if (
    b.photogateClear === false &&
    !b.bypassed.includes('Photogate - Cảm biến an toàn')
  )
    return 'Vật cản tại Photogate';
  if (
    b.limitOk === false &&
    !b.bypassed.includes('LS-T3 - Cảm biến hành trình')
  )
    return 'Lỗi cảm biến hành trình';
  if (
    b.overloadOk === false &&
    !b.bypassed.includes('Lift Motor - Quá tải động cơ nâng')
  )
    return 'Quá tải động cơ';
  return '';
}
export function blocked(b: Block) {
  const reason = interlockReason(b);
  if (reason) return reason;
  if (b.locked === null) return 'Trạng thái khóa chưa được ánh xạ';
  if (b.locked) return 'Block đã khóa';
  if (b.safetyLatched === null)
    return 'Trạng thái chốt liên động chưa được ánh xạ';
  if (b.safetyLatched) return 'Liên động đã tác động — cần START/RESUME';
  if (b.paused === null) return 'Trạng thái chạy/dừng chưa được ánh xạ';
  if (b.paused) return 'Tạm dừng — cần START/RESUME';
  return '';
}
export function status(b: Block, s: Sim) {
  const reason = blocked(b);
  if (reason) return reason;
  const job = s.jobs.find((j) => j.block === b.id && j.status === 'Đang chạy');
  return job?.hold ? 'Đang giữ lệnh' : job ? 'Đang chạy' : 'Bình thường';
}
export function isActiveAlarm(a: Alarm) {
  return a.active !== false;
}
export function occupancyOf(b: Block): (boolean | null)[] {
  return b.occupancy ?? b.slots.map(Boolean);
}
export function countOf(b: Block): number | null {
  return b.reportedCount === undefined
    ? b.slots.filter(Boolean).length
    : b.reportedCount;
}
export function availableOf(b: Block, s: Sim) {
  return blocked(b)
    ? 0
    : occupancyOf(b).filter(
        (p, i) =>
          p === false &&
          !s.jobs.some((j) => active(j) && j.block === b.id && j.slot === i),
      ).length;
}
export function summary(s: Sim) {
  const capacity = s.blocks.reduce((n, b) => n + b.capacity, 0);
  const total = s.blocks.reduce((n, b) => n + (countOf(b) ?? 0), 0);
  const suv = s.blocks.reduce(
    (n, b) => n + b.kinds.filter((k) => k === 'SUV').length,
    0,
  );
  const sedan = s.blocks.reduce(
    (n, b) => n + b.kinds.filter((k) => k === 'Sedan').length,
    0,
  );
  return {
    capacity,
    total,
    suv,
    sedan,
    unclassified: Math.max(0, total - suv - sedan),
    available: s.blocks.reduce((n, b) => n + availableOf(b, s), 0),
    unknown: s.blocks.some((b) => countOf(b) === null || b.quality !== 'good'),
    zones: [...new Set(s.blocks.map((b) => b.zone))],
  };
}
export const percent = (n: number, d: number) =>
  d > 0 ? Math.round((n / d) * 100) : 0;
export type Action =
  | { type: 'tick'; time: string; nowMs?: number }
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
  | { type: 'report-incident'; block: string; time: string; by?: string }
  | {
      type: 'toggle';
      block: string;
      field:
        | 'doorClosed'
        | 'estop'
        | 'paused'
        | 'maintenance'
        | 'online'
        | 'photogateClear'
        | 'limitOk'
        | 'overloadOk';
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
  if (s.source !== 'sim') return 'Nguồn PLC chỉ đọc, không hỗ trợ điều phối.';
  const b = s.blocks.find((b) => b.id === a.block);
  if (!b) return 'Block không tồn tại.';
  if (blocked(b)) return `Không thể gửi lệnh: ${blocked(b)}.`;
  if (!Number.isInteger(a.slot) || a.slot < 0 || a.slot >= b.capacity)
    return 'Chọn một pallet hợp lệ.';
  if (s.jobs.some((j) => active(j) && j.block === b.id && j.slot === a.slot))
    return 'Pallet đã có lệnh trong hàng đợi.';
  const occupied = occupancyOf(b)[a.slot];
  if (occupied === null) return 'Chưa xác nhận được trạng thái pallet.';
  if (a.kind === 'out' && !occupied) return 'Pallet này không có xe.';
  if (a.kind === 'in') {
    if (occupied) return 'Pallet đã có xe.';
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
  SIM_FAULT: 'Giả lập lỗi thiết bị',
  SIM_JAM: 'Giả lập kẹt cơ cấu',
  PLC: 'Gửi lệnh trực tiếp xuống PLC',
};
export function reduceSim(state: Sim, a: Action): Sim {
  // Nạp trọn snapshot (dùng khi đọc dữ liệu thật từ PLC qua gateway).
  if (a.type === 'load') {
    const next = structuredClone(a.sim);
    next.logs = state.logs;
    next.nextId = state.nextId;
    next.alarms = next.alarms.map((alarm) => {
      const previous = state.alarms.find(
        (x) => x.id === alarm.id && isActiveAlarm(x),
      );
      return previous
        ? {
            ...alarm,
            ack: previous.ack,
            ackBy: previous.ackBy,
            at: previous.at,
          }
        : alarm;
    });
    const localIncidents = state.alarms.filter(
      (alarm) =>
        alarm.id.startsWith('INCIDENT-') &&
        !next.alarms.some((item) => item.id === alarm.id),
    );
    const resolved = state.alarms
      .filter(
        (x) =>
          !x.id.startsWith('INCIDENT-') &&
          isActiveAlarm(x) &&
          !next.alarms.some((a) => a.id === x.id),
      )
      .map((x) => ({
        ...x,
        active: false,
        resolvedAt: new Date(next.clockMs).toLocaleString('vi-VN'),
      }));
    next.alarms = [
      ...next.alarms,
      ...localIncidents,
      ...resolved,
      ...state.alarms.filter(
        (x) => !isActiveAlarm(x) && !next.alarms.some((a) => a.id === x.id),
      ),
    ].slice(0, 500);
    return next;
  }
  if (
    state.source !== 'sim' &&
    a.type !== 'ack' &&
    a.type !== 'report-incident'
  )
    return state;
  if (a.type === 'dispatch' && validateDispatch(state, a)) return state;
  const s: Sim = structuredClone(state);
  const log = (block: string, text: string) => {
    s.logs.unshift({ id: s.nextId++, time: a.time, block, text });
    s.logs = s.logs.slice(0, 500);
  };
  const activateAlarm = (alarm: Alarm) => {
    if (s.alarms.some((x) => x.id === alarm.id && isActiveAlarm(x))) return;
    s.alarms = s.alarms.filter((x) => x.id !== alarm.id);
    s.alarms.unshift({ ...alarm, active: true });
  };
  const resolveAlarm = (id: string) => {
    s.alarms = s.alarms.map((x) =>
      x.id === id && isActiveAlarm(x)
        ? { ...x, active: false, resolvedAt: a.time }
        : x,
    );
  };
  const syncAlarms = (b: Block) => {
    const sync = (
      id: string,
      on: boolean,
      text: string,
      extra: Partial<Alarm> = {},
    ) => {
      if (on) {
        activateAlarm({
          id,
          block: b.id,
          text,
          ack: false,
          at: a.time,
          ...extra,
        });
      } else resolveAlarm(id);
    };
    sync(
      `DOOR-${b.id}`,
      !b.doorClosed,
      'Cảm biến cửa chưa đóng. Khóa lệnh vận hành.',
      { cat: 'operator', sev: 'Cao', code: 'W-0302', device: 'HMI-Panel' },
    );
    sync(`STOP-${b.id}`, b.estop === true, 'Dừng khẩn cấp đang kích hoạt.', {
      cat: 'operator',
      sev: 'Nghiêm trọng',
      code: 'E-0408',
      device: 'Safety-Relay',
    });
    sync(`LINK-${b.id}`, !b.online, 'Mất kết nối bộ điều khiển mô phỏng.', {
      cat: 'system',
      sev: 'Cao',
      code: 'E-0901',
      device: 'PLC-Link',
    });
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
    s.clockMs = Math.max(s.clockMs, a.nowMs ?? s.clockMs + 1000);
    for (const expired of s.bypasses.filter((x) => x.expiresAt <= s.clockMs))
      log(expired.block, 'Bypass hết hạn: ' + expired.device);
    s.bypasses = s.bypasses.filter((x) => x.expiresAt > s.clockMs);
    for (const b of s.blocks) {
      b.bypassed = s.bypasses
        .filter((x) => x.block === b.id)
        .map((x) => x.device);
      refreshBlock(b);
    }
    for (const b of s.blocks) {
      if (blocked(b)) continue;
      const running = s.jobs.find(
        (j) => j.block === b.id && j.status === 'Đang chạy',
      );
      const j =
        running ??
        s.jobs
          .filter(
            (j) => j.block === b.id && j.status === 'Chờ xử lý' && !j.hold,
          )
          .sort(
            (x, y) =>
              (x.priority === y.priority ? 0 : x.priority === 'VIP' ? -1 : 1) ||
              x.id - y.id,
          )[0];
      if (!j || j.hold) continue;
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
  if (a.type === 'report-incident') {
    const block = s.blocks.find((item) => item.id === a.block);
    if (!block) return state;
    const id = `INCIDENT-${s.nextId++}`;
    s.alarms.unshift({
      id,
      block: block.id,
      zone: block.zone,
      cat: 'operator',
      sev: 'Nghiêm trọng',
      code: 'SU-CO-KHAN',
      device: 'HMI-Panel',
      text: 'Người vận hành báo sự cố khẩn. Chỉ ghi nhận cảnh báo, không gửi lệnh dừng PLC.',
      ack: false,
      active: true,
      at: a.time,
    });
    log(
      block.id,
      `Báo sự cố khẩn bởi ${a.by ?? 'supervisor01'}; không gửi lệnh dừng máy`,
    );
  }
  if (a.type === 'toggle') {
    const b = s.blocks.find((b) => b.id === a.block);
    if (!b) return state;
    if (a.field === 'maintenance') {
      if (s.jobs.some((j) => j.block === b.id && active(j))) return state;
      b.maintenance = !b.maintenance;
      if (!b.estop) b.mode = b.maintenance ? 'Maint' : 'Auto';
    } else {
      b[a.field] = !b[a.field];
      if (a.field === 'estop')
        b.mode = b.estop ? 'EStop' : b.maintenance ? 'Maint' : 'Auto';
    }
    if (
      interlockReason(b) &&
      s.jobs.some((j) => j.block === b.id && j.status === 'Đang chạy')
    )
      b.safetyLatched = true;
    refreshBlock(b);
    syncAlarms(b);
    log(b.id, 'Thay đổi tín hiệu ' + a.field);
  }
  if (a.type === 'mode') {
    const b = s.blocks.find((b) => b.id === a.block);
    if (!b) return state;
    if (a.mode === 'Maint' && s.jobs.some((j) => j.block === b.id && active(j)))
      return state;
    if (b.estop && a.mode !== 'EStop') {
      log(b.id, 'Từ chối đổi mode: cần nhả E-STOP trước.');
      return s;
    }
    b.mode = a.mode;
    if (a.mode === 'EStop') b.estop = true;
    else b.maintenance = a.mode === 'Maint';
    if (
      interlockReason(b) &&
      s.jobs.some((j) => j.block === b.id && j.status === 'Đang chạy')
    )
      b.safetyLatched = true;
    refreshBlock(b);
    syncAlarms(b);
    log(b.id, 'Chuyển mode ' + a.mode);
  }
  if (a.type === 'command') {
    const b = s.blocks.find((b) => b.id === a.block);
    if (!b) return state;
    if (a.cmd === 'START' || a.cmd === 'RESUME') {
      const reason = interlockReason(b) || (b.locked ? 'Block đã khóa' : '');
      if (reason) {
        log(b.id, `Từ chối ${a.cmd}: ${reason}.`);
        return s;
      }
      b.paused = false;
      b.safetyLatched = false;
    } else if (a.cmd === 'STOP' || a.cmd === 'PAUSE') b.paused = true;
    else if (a.cmd === 'LOCK')
      b.locked = true; // 'locked' đã chặn tick; không cần pause thêm (tránh kẹt pause sau UNLOCK)
    else if (a.cmd === 'UNLOCK') b.locked = false;
    else if (a.cmd === 'DISABLE_MAINT') {
      b.maintenance = false;
      if (!b.estop) b.mode = 'Auto';
    } else if (a.cmd === 'SIM_FAULT') {
      // fault chỉ phản ánh alarm FAULT của CHÍNH block; không suy từ jam/alarm hệ thống khác
      const id = 'FAULT-' + b.id;
      const wasActive = s.alarms.some((x) => x.id === id && isActiveAlarm(x));
      if (wasActive) resolveAlarm(id);
      else
        activateAlarm({
          id,
          block: b.id,
          cat: 'system',
          sev: 'Nghiêm trọng',
          device: 'Sim-Fault',
          text: 'Lỗi thiết bị mô phỏng.',
          ack: false,
          at: a.time,
        });
      b.fault = s.alarms.some(
        (x) =>
          x.block === b.id &&
          x.cat === 'system' &&
          isActiveAlarm(x) &&
          x.device !== 'PLC-Link' &&
          x.device !== 'AI-VDS' &&
          x.device !== 'Sim-Jam',
      );
      if (
        b.fault &&
        s.jobs.some((j) => j.block === b.id && j.status === 'Đang chạy')
      )
        b.safetyLatched = true;
    } else if (a.cmd === 'SIM_JAM') {
      const id = 'JAM-' + b.id;
      b.jammed = !s.alarms.some((x) => x.id === id && isActiveAlarm(x));
      if (b.jammed)
        activateAlarm({
          id,
          block: b.id,
          cat: 'system',
          sev: 'Cao',
          device: 'Sim-Jam',
          text: 'Kẹt cơ cấu mô phỏng.',
          ack: false,
          at: a.time,
        });
      else resolveAlarm(id);
      if (
        b.jammed &&
        s.jobs.some((j) => j.block === b.id && j.status === 'Đang chạy')
      )
        b.safetyLatched = true;
    } else if (a.cmd !== 'PLC') return state;
    refreshBlock(b);
    syncAlarms(b);
    log(b.id, cmdLabel[a.cmd] ?? a.cmd);
  }
  if (a.type === 'bypass') {
    if (a.op === 'add' && a.device && a.block && a.reason?.trim()) {
      if (
        !s.blocks.some((b) => b.id === a.block) ||
        ![
          'Photogate - Cảm biến an toàn',
          'LS-T3 - Cảm biến hành trình',
          'Lift Motor - Quá tải động cơ nâng',
        ].includes(a.device) ||
        ![5, 15, 30, 60].includes(a.timeout ?? 15)
      )
        return state;
      s.bypasses = s.bypasses.filter(
        (x) => !(x.block === a.block && x.device === a.device),
      );
      s.bypasses.unshift({
        id: s.nextId++,
        device: a.device,
        block: a.block,
        timeout: a.timeout ?? 15,
        expiresAt: s.clockMs + (a.timeout ?? 15) * 60000,
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
    if (!j || !active(j)) return state;
    if (a.op === 'vip') {
      j.priority = 'VIP';
      log(j.block, `Nâng ưu tiên VIP lệnh #${j.id} · ${j.plate}`);
    } else if (a.op === 'hold' && active(j)) {
      j.hold = true;
      log(j.block, `Giữ (Hold) lệnh #${j.id} · ${j.plate}`);
    } else if (a.op === 'resume') {
      j.hold = false;
      log(j.block, `Tiếp tục lệnh #${j.id} · ${j.plate}`);
    } else if (a.op === 'reject' && j.status === 'Chờ xử lý') {
      j.status = 'Đã hủy';
      log(j.block, `Từ chối lệnh #${j.id} · ${j.plate}`);
    }
  }
  for (const b of s.blocks) {
    b.bypassed = s.bypasses
      .filter((x) => x.block === b.id && x.expiresAt > s.clockMs)
      .map((x) => x.device);
    if (
      interlockReason(b) &&
      s.jobs.some((j) => j.block === b.id && j.status === 'Đang chạy')
    )
      b.safetyLatched = true;
    refreshBlock(b);
  }
  // Giữ mọi lệnh đang hoạt động + 200 lệnh đã kết thúc gần nhất (jobs xếp mới→cũ) để không rò rỉ.
  let finished = 0;
  s.jobs = s.jobs.filter((j) => active(j) || finished++ < 200);
  return s;
}
