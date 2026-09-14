'use client';
import {
  createSim,
  refreshBlock,
  type Sim,
  type Alarm,
  type Block,
  type Quality,
} from '@/lib/simulation';

/* ============================================================
 * Nguồn dữ liệu cho UI: 'sim' (mô phỏng) hoặc 'plc' (đọc gateway thật/mock).
 * Chọn qua biến môi trường build-time (Vite):
 *   VITE_DATA_SOURCE=plc
 *   VITE_GATEWAY_WS=ws://localhost:8081
 *   VITE_GATEWAY_TOKEN=<GATEWAY_ADMIN_TOKEN>   (để đọc/ghi API /config)
 * Mặc định là 'sim' — không đụng gì tới hành vi hiện tại.
 * ============================================================ */
const env = ((import.meta as unknown as { env?: Record<string, string> }).env) ?? {};
export const DATA_MODE: 'sim' | 'plc' = env.VITE_DATA_SOURCE === 'plc' ? 'plc' : 'sim';
export const GATEWAY_WS = env.VITE_GATEWAY_WS ?? 'ws://localhost:8081';
/* API HTTP của gateway (cùng cổng WS) để đọc/ghi cấu hình PLC. */
export const GATEWAY_HTTP = env.VITE_GATEWAY_HTTP ?? GATEWAY_WS.replace(/^ws/, 'http');
/* Token quản trị gateway — bắt buộc cho API /config (không dùng cho luồng WS chỉ đọc). */
export const GATEWAY_TOKEN = env.VITE_GATEWAY_TOKEN ?? '';

/* Coi dữ liệu là "cũ" nếu quá lâu không có gói mới (gateway treo/đứt ngầm). */
const STALE_MS = 4000;

/* Snapshot gateway phát xuống (khớp gateway/core.mjs → Poller). */
export type PlcBlock = {
  id: string;
  name?: string;
  zone: string;
  capacity: number;
  count: number | null;
  occupancy?: (boolean | null)[];
  doorClosed: boolean | null;
  estop: boolean | null;
  fault: boolean | null;
  online: boolean;
  quality?: Quality;
  lastGoodAt?: number | null;
};
export type PlcSnapshot = {
  blocks: PlcBlock[];
  connected: boolean;
  at: number;
  source?: 'plc' | 'mock';
};

/* Sim rỗng cho chế độ PLC trong lúc chờ gói đầu tiên — KHÔNG dùng dữ liệu demo. */
export function initialPlcSim(): Sim {
  return {
    clockMs: Date.now(),
    source: 'plc',
    connection: 'loading',
    updatedAt: null,
    blocks: [],
    jobs: [],
    logs: [],
    alarms: [],
    bypasses: [],
    nextId: 1,
  };
}

/* Dựng đối tượng Sim mà mọi màn hình đang đọc, từ snapshot PLC (chỉ đọc). */
export function buildSim(snap: PlcSnapshot): Sim {
  const alarms: Alarm[] = [];
  const blocks: Block[] = snap.blocks.map((b) => {
    const quality: Quality = b.quality ?? (b.online ? 'good' : 'unknown');
    const known = b.online && quality === 'good';
    const occupancy: (boolean | null)[] =
      b.occupancy && b.occupancy.length === b.capacity
        ? b.occupancy
        : Array.from({ length: b.capacity }, () => null);
    const slots: (string | null)[] = occupancy.map((p, i) =>
      p === true ? `${b.id}·${String(i + 1).padStart(2, '0')}` : null,
    );
    /* Loại/biển số xe: gateway không đọc được → chưa biết. */
    const kinds = occupancy.map(() => null);
    const doorClosed = known ? (b.doorClosed ?? true) : true;
    const estop = known ? (b.estop ?? false) : false;
    const fault = known ? (b.fault ?? false) : false;

    if (!b.online)
      alarms.push({ id: `LINK-${b.id}`, block: b.id, text: 'Mất kết nối bộ điều khiển (PLC).', ack: false, active: true, cat: 'system', sev: 'Cao', code: 'E-0901', device: 'PLC-Link' });
    if (known && estop)
      alarms.push({ id: `STOP-${b.id}`, block: b.id, text: 'Dừng khẩn cấp đang kích hoạt (PLC).', ack: false, active: true, cat: 'operator', sev: 'Nghiêm trọng', code: 'E-0408', device: 'Safety-Relay' });
    if (known && !doorClosed)
      alarms.push({ id: `DOOR-${b.id}`, block: b.id, text: 'Cảm biến cửa chưa đóng (PLC).', ack: false, active: true, cat: 'operator', sev: 'Cao', code: 'W-0302', device: 'HMI-Panel' });
    if (known && fault)
      alarms.push({ id: `FAULT-${b.id}`, block: b.id, text: 'Thiết bị báo lỗi (PLC).', ack: false, active: true, cat: 'system', sev: 'Nghiêm trọng', code: 'E-0410', device: 'Motor-Lift' });

    return refreshBlock({
      id: b.id,
      name: b.name,
      zone: b.zone,
      capacity: b.capacity,
      state: 'Bình thường',
      mode: estop ? 'EStop' : 'Auto',
      doorClosed,
      estop,
      paused: false,
      locked: false,
      forced: false,
      online: b.online,
      fault,
      maintenance: false,
      jammed: false,
      quality,
      photogateClear: true,
      limitOk: true,
      overloadOk: true,
      bypassed: [],
      occupancy,
      reportedCount: b.count,
      slots,
      kinds,
    });
  });
  return {
    clockMs: snap.at,
    source: snap.source ?? 'plc',
    connection: snap.connected ? 'online' : 'stale',
    updatedAt: snap.at,
    blocks,
    jobs: [],
    logs: [],
    alarms,
    bypasses: [],
    nextId: 1,
  };
}

/* Kết nối gateway qua WebSocket, tự kết nối lại khi rớt, có watchdog phát hiện treo. */
export class PlcSource {
  private ws: WebSocket | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private last: Sim | null = null;
  constructor(
    private url: string,
    private onSim: (sim: Sim) => void,
  ) {}
  start() {
    this.stopped = false;
    this.open();
    this.watchdog = setInterval(() => this.checkStale(), 1000);
  }
  private emit(sim: Sim) {
    this.last = sim;
    this.onSim(sim);
  }
  private checkStale() {
    if (!this.last || this.last.updatedAt == null) return;
    if (this.last.connection === 'online' && Date.now() - this.last.updatedAt > STALE_MS)
      this.emit({ ...this.last, connection: 'stale' });
  }
  private open() {
    if (this.stopped) return;
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onmessage = (ev) => {
        try {
          const snap = JSON.parse(String(ev.data)) as PlcSnapshot;
          if (Array.isArray(snap.blocks)) this.emit(buildSim(snap));
        } catch {
          /* bỏ qua gói lỗi */
        }
      };
      this.ws.onclose = () => {
        if (this.last) this.emit({ ...this.last, connection: 'offline' });
        this.retry();
      };
      this.ws.onerror = () => this.ws?.close();
    } catch {
      this.retry();
    }
  }
  private retry() {
    if (this.stopped) return;
    this.retryTimer = setTimeout(() => this.open(), 3000);
  }
  /* Gateway hiện CHỈ ĐỌC; giữ hàm để tương thích, nhưng không có điều khiển thật. */
  command(action: unknown) {
    if (this.ws && this.ws.readyState === 1)
      this.ws.send(JSON.stringify({ type: 'write', action }));
  }
  stop() {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.watchdog) clearInterval(this.watchdog);
    this.ws?.close();
    this.ws = null;
  }
}

/* Sim khởi tạo cho chế độ mô phỏng thuần. */
export function simSeed(): Sim {
  return createSim();
}
