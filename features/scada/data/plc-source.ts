'use client';
import {
  refreshBlock,
  type Sim,
  type Alarm,
  type Block,
  type Quality,
} from '@/features/scada/model/simulation';

/* ============================================================
 * Nguồn dữ liệu cho UI: 'sim' (mô phỏng) hoặc 'plc' (đọc gateway thật/mock).
 * Chọn qua biến môi trường build-time (Vite):
 *   VITE_DATA_SOURCE=plc
 *   VITE_GATEWAY_WS=ws://localhost:8081
 * Mặc định là 'sim' — không đụng gì tới hành vi hiện tại.
 * ============================================================ */
const env =
  (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
export const DATA_MODE: 'sim' | 'plc' =
  env.VITE_DATA_SOURCE === 'plc' ? 'plc' : 'sim';
export const GATEWAY_WS = env.VITE_GATEWAY_WS ?? 'ws://localhost:8081';
/* API HTTP của gateway (cùng cổng WS) để đọc/ghi cấu hình PLC. */
export const GATEWAY_HTTP =
  env.VITE_GATEWAY_HTTP ?? GATEWAY_WS.replace(/^ws/, 'http');

/* Coi dữ liệu là "cũ" nếu quá lâu không có gói mới (gateway treo/đứt ngầm). */
const STALE_MS = 10000;

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
  const snapshotAt = Number.isFinite(snap.at) ? snap.at : Date.now();
  const receivedAt = Date.now();
  const alarmAt = new Date(snapshotAt).toLocaleString('vi-VN');
  const alarms: Alarm[] = [];
  const blocks: Block[] = snap.blocks.map((b) => {
    const quality: Quality = b.quality ?? (b.online ? 'good' : 'unknown');
    const occupancy: (boolean | null)[] =
      b.occupancy && b.occupancy.length === b.capacity
        ? b.occupancy
        : Array.from({ length: b.capacity }, () => null);
    /* Gateway chỉ có bitmap hiện diện, không có biển số. Không tạo dữ liệu giả. */
    const slots: (string | null)[] = occupancy.map(() => null);
    const kinds = occupancy.map(() => null);
    /* Giữ giá trị last-good khi quality=stale để không tự xóa alarm lúc mất đọc. */
    const doorClosed = b.doorClosed ?? null;
    const estop = b.estop ?? null;
    const fault = b.fault ?? null;

    if (!b.online)
      alarms.push({
        id: `LINK-${b.id}`,
        block: b.id,
        zone: b.zone,
        text: 'Mất kết nối bộ điều khiển (PLC).',
        ack: false,
        active: true,
        cat: 'system',
        sev: 'Cao',
        code: 'E-0901',
        device: 'PLC-Link',
        at: alarmAt,
      });
    if (estop === true)
      alarms.push({
        id: `STOP-${b.id}`,
        block: b.id,
        zone: b.zone,
        text: 'Dừng khẩn cấp đang kích hoạt (PLC).',
        ack: false,
        active: true,
        cat: 'operator',
        sev: 'Nghiêm trọng',
        code: 'E-0408',
        device: 'Safety-Relay',
        at: alarmAt,
      });
    if (doorClosed === false)
      alarms.push({
        id: `DOOR-${b.id}`,
        block: b.id,
        zone: b.zone,
        text: 'Cảm biến cửa chưa đóng (PLC).',
        ack: false,
        active: true,
        cat: 'operator',
        sev: 'Cao',
        code: 'W-0302',
        device: 'HMI-Panel',
        at: alarmAt,
      });
    if (fault === true)
      alarms.push({
        id: `FAULT-${b.id}`,
        block: b.id,
        zone: b.zone,
        text: 'Thiết bị báo lỗi (PLC).',
        ack: false,
        active: true,
        cat: 'system',
        sev: 'Nghiêm trọng',
        code: 'E-0410',
        device: 'Motor-Lift',
        at: alarmAt,
      });

    return refreshBlock({
      id: b.id,
      name: b.name,
      zone: b.zone,
      capacity: b.capacity,
      state: 'Bình thường',
      mode: null,
      doorClosed,
      estop,
      paused: null,
      safetyLatched: null,
      locked: null,
      forced: false,
      online: b.online,
      fault,
      maintenance: null,
      jammed: null,
      quality,
      photogateClear: null,
      limitOk: null,
      overloadOk: null,
      bypassed: [],
      occupancy,
      reportedCount: b.count,
      slots,
      kinds,
    });
  });
  return {
    clockMs: snapshotAt,
    source: snap.source ?? 'plc',
    /* Nhận được snapshot nghĩa là đường WebSocket tới gateway đang online.
     * snap.connected phản ánh ít nhất một PLC online, thể hiện ở từng Block. */
    connection: 'online',
    updatedAt: receivedAt,
    blocks,
    jobs: [],
    logs: [],
    alarms,
    bypasses: [],
    nextId: 1,
  };
}

function markConnection(sim: Sim, connection: 'stale' | 'offline'): Sim {
  const alarm: Alarm = {
    id: connection === 'offline' ? 'GATEWAY-OFFLINE' : 'GATEWAY-STALE',
    block: 'Gateway',
    text:
      connection === 'offline'
        ? 'Mất kết nối WebSocket tới gateway PLC.'
        : 'Dữ liệu gateway quá hạn; trạng thái hiện tại chưa được xác nhận.',
    ack: false,
    active: true,
    cat: 'system',
    sev: connection === 'offline' ? 'Nghiêm trọng' : 'Cao',
    code: 'E-GW01',
    device: 'SCADA-Gateway',
    at: new Date().toLocaleTimeString('vi-VN'),
  };
  return {
    ...sim,
    connection,
    blocks: sim.blocks.map((block) =>
      refreshBlock({
        ...block,
        quality: block.quality === 'unknown' ? 'unknown' : 'stale',
      }),
    ),
    alarms: [
      alarm,
      ...sim.alarms.filter(
        (item) => item.id !== 'GATEWAY-STALE' && item.id !== 'GATEWAY-OFFLINE',
      ),
    ],
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
    if (
      this.last.connection === 'online' &&
      Date.now() - this.last.updatedAt > STALE_MS
    )
      this.emit(markConnection(this.last, 'stale'));
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
        if (this.stopped) return;
        this.emit(markConnection(this.last ?? initialPlcSim(), 'offline'));
        this.retry();
      };
      this.ws.onerror = () => this.ws?.close();
    } catch {
      this.emit(markConnection(this.last ?? initialPlcSim(), 'offline'));
      this.retry();
    }
  }
  private retry() {
    if (this.stopped) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.open();
    }, 3000);
  }
  stop() {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.watchdog) clearInterval(this.watchdog);
    if (this.ws) this.ws.onclose = null;
    this.ws?.close();
    this.ws = null;
  }
}
