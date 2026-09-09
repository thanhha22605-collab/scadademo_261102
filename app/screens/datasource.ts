'use client';
import { createSim, type Sim, type Alarm, type VType } from '@/lib/simulation';

/* ============================================================
 * Nguồn dữ liệu cho UI: 'sim' (mô phỏng) hoặc 'plc' (đọc PLC thật).
 * Chọn qua biến môi trường build-time (Vite):
 *   VITE_DATA_SOURCE=plc
 *   VITE_GATEWAY_WS=ws://192.168.1.10:8081
 * Mặc định là 'sim' — không đụng gì tới hành vi hiện tại.
 * ============================================================ */
const env =
  ((import.meta as unknown as { env?: Record<string, string> }).env) ?? {};
export const DATA_MODE: 'sim' | 'plc' =
  env.VITE_DATA_SOURCE === 'plc' ? 'plc' : 'sim';
export const GATEWAY_WS = env.VITE_GATEWAY_WS ?? 'ws://localhost:8081';

/* Snapshot mà gateway gửi xuống (đã ánh xạ tag → ý nghĩa, xem gateway/tagmap.mjs). */
export type PlcBlock = {
  id: string;
  capacity: number;
  count: number;
  doorClosed: boolean;
  estop: boolean;
  online: boolean;
  fault: boolean;
};
export type PlcSnapshot = {
  blocks: PlcBlock[];
  connected: boolean;
  at: number;
};

/* Dựng đối tượng Sim mà mọi màn hình đang đọc, từ snapshot PLC (chỉ đọc). */
export function buildSim(snap: PlcSnapshot): Sim {
  const alarms: Alarm[] = [];
  const blocks = snap.blocks.map((b) => {
    const state = !b.online
      ? 'Offline'
      : b.fault
        ? 'Lỗi'
        : !b.doorClosed || b.estop
          ? 'Cảnh báo'
          : 'Bình thường';
    const count = Math.max(0, Math.min(b.capacity, b.count | 0));
    const slots: (string | null)[] = Array.from({ length: b.capacity }, (_, i) =>
      i < count ? `${b.id}·${String(i + 1).padStart(2, '0')}` : null,
    );
    const kinds: (VType | null)[] = slots.map(() => null);
    if (b.estop)
      alarms.push({ id: `STOP-${b.id}`, block: b.id, text: 'Dừng khẩn cấp đang kích hoạt (PLC).', ack: false, cat: 'operator', sev: 'Nghiêm trọng', code: 'E-0408', device: 'Safety-Relay' });
    if (!b.doorClosed)
      alarms.push({ id: `DOOR-${b.id}`, block: b.id, text: 'Cảm biến cửa chưa đóng (PLC).', ack: false, cat: 'operator', sev: 'Cao', code: 'W-0302', device: 'HMI-Panel' });
    if (!b.online)
      alarms.push({ id: `LINK-${b.id}`, block: b.id, text: 'Mất kết nối bộ điều khiển (PLC).', ack: false, cat: 'system', sev: 'Cao', code: 'E-0901', device: 'PLC-Link' });
    if (b.fault)
      alarms.push({ id: `FAULT-${b.id}`, block: b.id, text: 'Thiết bị báo lỗi (PLC).', ack: false, cat: 'system', sev: 'Nghiêm trọng', code: 'E-0410', device: 'Motor-Lift' });
    return {
      id: b.id,
      zone: b.id[0],
      capacity: b.capacity,
      state,
      mode: b.estop ? ('EStop' as const) : ('Auto' as const),
      doorClosed: b.doorClosed,
      estop: b.estop,
      paused: false,
      locked: false,
      forced: false,
      slots,
      kinds,
    };
  });
  return { blocks, jobs: [], logs: [], alarms, bypasses: [], nextId: 1 };
}

/* Kết nối gateway qua WebSocket, tự kết nối lại khi rớt. */
export class PlcSource {
  private ws: WebSocket | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  constructor(
    private url: string,
    private onSim: (sim: Sim) => void,
  ) {}
  start() {
    this.stopped = false;
    this.open();
  }
  private open() {
    if (this.stopped) return;
    try {
      this.ws = new WebSocket(this.url);
      this.ws.onmessage = (ev) => {
        try {
          const snap = JSON.parse(String(ev.data)) as PlcSnapshot;
          if (Array.isArray(snap.blocks)) this.onSim(buildSim(snap));
        } catch {
          /* bỏ qua gói lỗi */
        }
      };
      this.ws.onclose = () => this.retry();
      this.ws.onerror = () => this.ws?.close();
    } catch {
      this.retry();
    }
  }
  private retry() {
    if (this.stopped) return;
    this.timer = setTimeout(() => this.open(), 3000);
  }
  /* Gửi lệnh ghi xuống gateway (mặc định gateway TỪ CHỐI nếu ALLOW_WRITES=false). */
  command(action: unknown) {
    if (this.ws && this.ws.readyState === 1)
      this.ws.send(JSON.stringify({ type: 'write', action }));
    else console.warn('[PLC] chưa kết nối gateway, bỏ qua lệnh ghi.');
  }
  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.ws?.close();
    this.ws = null;
  }
}

/* Sim khởi tạo cho chế độ PLC trong lúc chờ snapshot đầu tiên. */
export function initialPlcSim(): Sim {
  return createSim();
}
