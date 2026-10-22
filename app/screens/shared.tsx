'use client';
import { useEffect, useReducer, useState } from 'react';
import { Send } from 'lucide-react';
import { DATA_MODE, GATEWAY_WS, PlcSource, initialPlcSim } from './datasource';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  createSim,
  blockLabel,
  reduceSim,
  status,
  zoneLabel,
  type Sim,
  type Action,
  type Mode,
} from '@/lib/simulation';
import { Panel, Badge, Tag, Bar } from '../ui';

/* ---- re-export shared primitives so screens import from one place ---- */
export { Panel, Badge, Tag, Bar };
export type { Sim, Action, Mode };

/* ---- props every screen module receives ---- */
export type ScreenProps = {
  sim: Sim;
  dispatch: React.Dispatch<Action>;
  selected: string;
  setSelected: (s: string) => void;
  setPage: (p: string) => void;
};

/* ---- simulation lifecycle hook ----
 * Mặc định (VITE_DATA_SOURCE=sim): chạy bộ mô phỏng trong bộ nhớ.
 * Khi VITE_DATA_SOURCE=plc: đọc snapshot thật từ gateway qua WebSocket và
 * nạp vào UI bằng action 'load'. Gateway hiện chỉ đọc; reducer khóa mọi action
 * thay đổi trạng thái PLC ngoại trừ ACK cục bộ.
 */
export function useSimulation() {
  /* Chế độ PLC khởi tạo bằng Sim RỖNG (không dữ liệu demo); mọi màn chờ gói đầu tiên.
   * Reducer tự chặn các action ghi khi source !== 'sim' (chỉ cho 'load' + 'ack'),
   * nên cả hai chế độ đều dùng chung baseDispatch mà vẫn an toàn chỉ-đọc. */
  const [sim, dispatch] = useReducer(
    reduceSim,
    undefined,
    DATA_MODE === 'plc' ? initialPlcSim : createSim,
  );
  useEffect(() => {
    if (DATA_MODE === 'plc') {
      const src = new PlcSource(GATEWAY_WS, (s) => dispatch({ type: 'load', sim: s }));
      src.start();
      return () => src.stop();
    }
    const t = setInterval(
      () => dispatch({ type: 'tick', time: time(), nowMs: Date.now() }),
      1000,
    );
    return () => clearInterval(t);
  }, []);
  return { sim, dispatch };
}

/* Nguồn PLC là CHỈ ĐỌC: mọi thao tác điều khiển trong UI phải khóa lại. */
export function isReadOnly(sim: Sim) {
  return sim.source !== 'sim';
}
const CONN: Record<Sim['connection'], { label: string; tone: string }> = {
  loading: { label: 'Đang chờ dữ liệu…', tone: 'amber' },
  online: { label: 'Đang kết nối', tone: 'green' },
  stale: { label: 'Dữ liệu cũ', tone: 'amber' },
  offline: { label: 'Mất kết nối', tone: 'red' },
};
export function ConnectionBadge({ sim }: { sim: Sim }) {
  if (sim.source === 'sim') return <Badge tone="blue">Chế độ mô phỏng</Badge>;
  const c = CONN[sim.connection];
  return (
    <Badge tone={c.tone}>
      {sim.source === 'mock' ? 'Gateway giả lập · ' : 'Gateway PLC · '}
      {c.label}
    </Badge>
  );
}
/* Empty-state dùng chung khi chưa có Block nào (chưa cấu hình / chờ dữ liệu). */
export function EmptyState({ sim, what }: { sim: Sim; what?: string }) {
  const msg =
    sim.source === 'sim'
      ? 'Không có dữ liệu.'
      : sim.connection === 'loading'
        ? 'Đang chờ dữ liệu đầu tiên từ gateway…'
        : sim.connection === 'offline'
          ? 'Mất kết nối gateway. Đang thử kết nối lại…'
          : 'Chưa cấu hình PLC nào. Vào “Cấu hình PLC” để khai báo tháp.';
  return (
    <div className="empty-state">
      {msg}
      {what ? <div className="muted">{what}</div> : null}
    </div>
  );
}

/* ---- helpers ---- */
export const time = () => new Date().toLocaleString('vi-VN');
export function csv(rows: (string | number)[][], name: string) {
  const body =
    '﻿' +
    rows
      .map((r) =>
        r.map((c) => '"' + String(c).replaceAll('"', '""') + '"').join(','),
      )
      .join('\r\n');
  const url = URL.createObjectURL(
    new Blob([body], { type: 'text/csv;charset=utf-8;' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---- layout primitives ---- */
export function Box({
  title,
  children,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        {aside}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (s: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v !== null) onChange(v);
        }}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue>
            {options.find((o) => o.value === value)?.label ?? value}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
export function Kpi({
  label,
  value,
  sub,
  tone = 'blue',
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
  icon?: React.ComponentType<{ size?: number }>;
}) {
  return (
    <div className={'kpi kpi-' + tone}>
      <div className="kpi-top">
        <span>{label}</span>
        {Icon && <Icon size={16} />}
      </div>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}
export function Rows({ children }: { children: React.ReactNode }) {
  return <div className="def-rows">{children}</div>;
}
export function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="def-row">
      <span>{k}</span>
      <strong>{v}</strong>
    </div>
  );
}
export function Rows3({ rows }: { rows: [string, string][] }) {
  return (
    <div className="def-rows">
      {rows.map(([k, v]) => (
        <div className="def-row" key={k}>
          <span>{k}</span>
          <strong>{v}</strong>
        </div>
      ))}
    </div>
  );
}

/* ---- block selector toolbar (shared by OCC + Safety) ---- */
export function BlockSelector({
  sim,
  current,
  zone,
  setZone,
  onPick,
}: {
  sim: Sim;
  current: string;
  zone: string;
  setZone: (z: string) => void;
  onPick: (id: string) => void;
}) {
  const b = sim.blocks.find((x) => x.id === current) ?? sim.blocks[0];
  if (!b) return <EmptyState sim={sim} />;
  const zones = [...new Set(sim.blocks.map((x) => x.zone))].sort();
  return (
    <div className="toolbar">
      <Choice
        label="Phân khu"
        value={zone}
        onChange={(z) => {
          setZone(z);
          const first = sim.blocks.find((x) => z === 'all' || x.zone === z);
          if (first) onPick(first.id);
        }}
        options={[
          { value: 'all', label: 'Tất cả phân khu' },
          ...zones.map((z) => ({ value: z, label: zoneLabel[z] ?? `Zone ${z}` })),
        ]}
      />
      <Choice
        label="Block đang chọn"
        value={b.id}
        onChange={onPick}
        options={sim.blocks
          .filter((x) => zone === 'all' || x.zone === zone)
          .map((x) => ({ value: x.id, label: blockLabel(x) }))}
      />
      <Tag text={status(b, sim)} />
    </div>
  );
}

/* ---- historian trend chart ---- */
export const histMetrics: Record<
  string,
  { label: string; cur: string; base: number; amp: number; max: number }
> = {
  current: { label: 'Dòng điện Motor nâng (A)', cur: '13.7 A', base: 12, amp: 4, max: 22 },
  temp: { label: 'Nhiệt độ động cơ (°C)', cur: '78 °C', base: 70, amp: 9, max: 120 },
  vfd: { label: 'Tần số biến tần VFD (Hz)', cur: '42.5 Hz', base: 40, amp: 7, max: 60 },
};
export function MotorTrend({ metric = 'current' }: { metric?: string }) {
  const m = histMetrics[metric] ?? histMetrics.current;
  const pts = Array.from({ length: 60 }, (_, i) => {
    const base =
      m.base + Math.sin(i / 3) * (m.amp * 0.6) + Math.sin(i / 1.7) * (m.amp * 0.4);
    const spike = i > 40 && i < 44 ? m.amp * 1.2 : 0;
    const v = base + spike;
    const x = 20 + i * (720 / 59);
    const y = 175 - (v / m.max) * 150;
    return `${x.toFixed(0)},${y.toFixed(0)}`;
  }).join(' ');
  return (
    <div className="trend">
      <div className="trend-live-top">
        <span className="muted">{m.label} (xu hướng mô phỏng)</span>
        <span className="trend-live-val">
          Giá trị hiện tại: <strong>{m.cur}</strong>
        </span>
        <Badge tone="blue">Dữ liệu mô phỏng</Badge>
      </div>
      <svg viewBox="0 0 760 200" aria-label="Đồ thị dòng điện motor nâng">
        <title>Đồ thị dòng điện motor nâng</title>
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1="20"
            x2="740"
            y1={175 - i * 37}
            y2={175 - i * 37}
            stroke="#243347"
            strokeDasharray="3 5"
          />
        ))}
        <polyline points={pts} fill="none" stroke="#4095ff" strokeWidth="2" />
      </svg>
    </div>
  );
}

/* ---- direct-PLC command sequencer ---- */
export function PlcCommander({
  block,
  dispatch,
  readOnly = false,
}: {
  block: string;
  dispatch: React.Dispatch<Action>;
  readOnly?: boolean;
}) {
  /* Vòng đời lệnh: chỉ hiển thị "Done" khi có bằng chứng hoàn tất.
   * - Gateway hiện CHỈ ĐỌC → khóa gửi, nêu rõ chưa hỗ trợ điều khiển.
   * - Chế độ mô phỏng → chuỗi trạng thái là mô phỏng, có nhãn rõ ràng. */
  const [stage, setStage] = useState('idle');
  useEffect(() => {
    if (stage === 'idle' || stage === 'done') return;
    const next: Record<string, string> = { sent: 'accepted', accepted: 'running', running: 'done' };
    const t = setTimeout(() => setStage(next[stage]), 750);
    return () => clearTimeout(t);
  }, [stage]);
  const order = ['sent', 'accepted', 'running', 'done'];
  const busy = stage !== 'idle' && stage !== 'done';
  if (readOnly)
    return (
      <div className="plc-box">
        <button className="secondary" disabled>
          <Send size={15} /> Send
        </button>
        <span className="muted">Gateway chỉ đọc — chưa hỗ trợ điều khiển PLC.</span>
      </div>
    );
  return (
    <div className="plc-box">
      <button
        className="secondary"
        disabled={busy}
        onClick={() => {
          setStage('sent');
          dispatch({ type: 'command', block, cmd: 'PLC', time: time() });
        }}
      >
        <Send size={15} /> Send
      </button>
      <div className="plc-stages" aria-label="Chuỗi trạng thái mô phỏng">
        {['Sent', 'Accepted', 'Running', 'Done'].map((s, i) => (
          <span key={s} className={order.indexOf(stage) >= i ? 'on' : ''}>
            {s}
          </span>
        ))}
        <span className="muted">· mô phỏng</span>
      </div>
    </div>
  );
}
export const modeButtons: { m: Mode; label: string }[] = [
  { m: 'Auto', label: 'AUTO' },
  { m: 'Manual', label: 'MANUAL' },
  { m: 'Maint', label: 'MAINT' },
  { m: 'EStop', label: 'ESTOP' },
];
