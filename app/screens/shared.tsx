'use client';
import { useEffect, useReducer, useState } from 'react';
import { Send } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  createSim,
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

/* ---- simulation lifecycle hook ---- */
export function useSimulation() {
  const [sim, dispatch] = useReducer(reduceSim, undefined, createSim);
  useEffect(() => {
    const t = setInterval(
      () =>
        dispatch({ type: 'tick', time: new Date().toLocaleString('vi-VN') }),
      1000,
    );
    return () => clearInterval(t);
  }, []);
  return { sim, dispatch };
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
          ...['A', 'B', 'C'].map((z) => ({ value: z, label: zoneLabel[z] })),
        ]}
      />
      <Choice
        label="Block đang chọn"
        value={b.id}
        onChange={onPick}
        options={sim.blocks
          .filter((x) => zone === 'all' || x.zone === zone)
          .map((x) => ({ value: x.id, label: 'Block ' + x.id }))}
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
        <span className="muted">{m.label} (Real-time Trend)</span>
        <span className="trend-live-val">
          Giá trị hiện tại: <strong>{m.cur}</strong>
        </span>
        <Badge tone="green">Sóng PLC Live</Badge>
      </div>
      <svg viewBox="0 0 760 200" role="img" aria-label="Đồ thị dòng điện motor nâng">
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
}: {
  block: string;
  dispatch: React.Dispatch<Action>;
}) {
  const [stage, setStage] = useState('idle');
  useEffect(() => {
    if (stage === 'idle' || stage === 'done') return;
    const next: Record<string, string> = {
      sent: 'accepted',
      accepted: 'running',
      running: 'done',
    };
    const t = setTimeout(() => setStage(next[stage]), 750);
    return () => clearTimeout(t);
  }, [stage]);
  const order = ['sent', 'accepted', 'running', 'done'];
  const busy = stage !== 'idle' && stage !== 'done';
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
      <div className="plc-stages">
        {['Sent', 'Accepted', 'Running', 'Done'].map((s, i) => (
          <span key={s} className={order.indexOf(stage) >= i ? 'on' : ''}>
            {s}
          </span>
        ))}
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
