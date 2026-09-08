'use client';
import { useCallback, useEffect, useReducer, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Car,
  CheckCheck,
  Crown,
  Download,
  Hand,
  Lock,
  Play,
  Pause,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Square,
  Unlock,
  Zap,
} from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  createSim,
  reduceSim,
  validateDispatch,
  blocked,
  active,
  status,
  zoneLabel,
  type Sim,
  type Action,
  type Block,
  type Mode,
} from '@/lib/simulation';
import { Tag, Badge } from './ui';
import { ExtraViews, extraPages } from './screens';
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
const time = () => new Date().toLocaleString('vi-VN');
function csv(rows: (string | number)[][], name: string) {
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
function Box({
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
function Choice({
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
function MotorTrend() {
  const pts = Array.from({ length: 60 }, (_, i) => {
    const base = 12 + Math.sin(i / 3) * 3 + Math.sin(i / 1.7) * 1.5;
    const spike = i > 40 && i < 44 ? 6 : 0;
    const v = base + spike;
    const x = 20 + i * (720 / 59);
    const y = 175 - (v / 22) * 150;
    return `${x.toFixed(0)},${y.toFixed(0)}`;
  }).join(' ');
  return (
    <div className="trend">
      <div className="trend-live-top">
        <span className="muted">Dòng điện Motor nâng (Real-time Trend)</span>
        <span className="trend-live-val">
          Giá trị hiện tại: <strong>13.7 A</strong>
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
function PlcCommander({
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
const modeButtons: { m: Mode; label: string }[] = [
  { m: 'Auto', label: 'AUTO' },
  { m: 'Manual', label: 'MANUAL' },
  { m: 'Maint', label: 'MAINT' },
  { m: 'EStop', label: 'ESTOP' },
];
export function SimulatorViews({
  page,
  sim,
  dispatch,
  selected,
  setSelected,
}: {
  page: string;
  sim: Sim;
  dispatch: React.Dispatch<Action>;
  selected: string;
  setSelected: (s: string) => void;
}) {
  const [zone, setZone] = useState('all');
  const [slot, setSlot] = useState(0);
  const [plate, setPlate] = useState('');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('map');
  const [alarmCat, setAlarmCat] = useState('all');
  const [alarmSev, setAlarmSev] = useState('all');
  const [bypDevice, setBypDevice] = useState('Photogate - Cảm biến an toàn');
  const [bypBlock, setBypBlock] = useState('A-01');
  const [bypTimeout, setBypTimeout] = useState('15');
  const [bypReason, setBypReason] = useState('');
  const [bypNote, setBypNote] = useState('');
  const b = sim.blocks.find((x) => x.id === selected) ?? sim.blocks[0];
  const job = sim.jobs.find((j) => j.block === b.id && active(j));
  const pick = (id: string) => {
    setSelected(id);
    setSlot(0);
    setNotice('');
  };
  const toggle = (
    field: 'doorClosed' | 'estop' | 'paused' | 'maintenance' | 'online',
  ) => dispatch({ type: 'toggle', block: b.id, field, time: time() });
  const setMode = (m: Mode) => {
    if (
      m === 'Maint' &&
      sim.jobs.some((j) => j.block === b.id && active(j))
    ) {
      setNotice('Không thể vào bảo trì khi Block còn lệnh đang chờ / chạy.');
      return;
    }
    dispatch({ type: 'mode', block: b.id, mode: m, time: time() });
  };
  const cmd = (c: string) =>
    dispatch({ type: 'command', block: b.id, cmd: c, time: time() });
  const send = useCallback(
    (kind: 'in' | 'out') => {
      const action = {
        type: 'dispatch' as const,
        block: b.id,
        slot,
        plate,
        kind,
        time: time(),
      };
      const error = validateDispatch(sim, action);
      if (error) {
        setNotice(error);
        return;
      }
      dispatch(action);
      setNotice(
        `Đã thêm lệnh ${kind === 'in' ? 'nhập' : 'xuất'} xe vào hàng đợi.`,
      );
      if (kind === 'in') setPlate('');
    },
    [b.id, slot, plate, sim, dispatch],
  );
  if (extraPages.includes(page))
    return <ExtraViews page={page} sim={sim} />;
  const selector = (
    <div className="toolbar">
      <Choice
        label="Phân khu"
        value={zone}
        onChange={(z) => {
          setZone(z);
          const first = sim.blocks.find((b) => z === 'all' || b.zone === z);
          if (first) pick(first.id);
        }}
        options={[
          { value: 'all', label: 'Tất cả phân khu' },
          ...['A', 'B', 'C'].map((z) => ({ value: z, label: zoneLabel[z] })),
        ]}
      />
      <Choice
        label="Block đang chọn"
        value={b.id}
        onChange={pick}
        options={sim.blocks
          .filter((b) => zone === 'all' || b.zone === zone)
          .map((b) => ({ value: b.id, label: 'Block ' + b.id }))}
      />
      <Tag text={status(b, sim)} />
    </div>
  );
  function palletGrid(block: Block) {
    return (
      <div className="pallet-grid">
        {block.slots.map((p, i) => {
          const reserved = sim.jobs.some(
            (j) => j.block === block.id && j.slot === i && active(j),
          );
          const fault = block.state === 'Lỗi' && i === 4;
          return (
            <button
              key={i}
              aria-pressed={selected === block.id && slot === i}
              className={
                'pallet ' +
                (fault ? 'fault ' : p ? 'occupied ' : '') +
                (reserved ? 'reserved ' : '') +
                (selected === block.id && slot === i ? 'selected' : '')
              }
              onClick={() => {
                setSelected(block.id);
                setSlot(i);
                setNotice('');
              }}
            >
              <span className="pallet-number">
                P{String(i + 1).padStart(2, '0')}
              </span>
              <Car size={27} />
              <strong>{p ?? (fault ? 'LỖI' : 'TRỐNG')}</strong>
              <small>
                {reserved
                  ? 'Đang điều phối'
                  : fault
                    ? 'Lỗi vị trí'
                    : p
                      ? 'Có xe'
                      : 'Sẵn sàng'}
              </small>
            </button>
          );
        })}
      </div>
    );
  }

  /* ---------------- OCC / OPERATION CONTROL ---------------- */
  if (page === 'control') {
    const zoneBlocks = sim.blocks.filter(
      (x) => zone === 'all' || x.zone === zone,
    );
    const manual = b.mode === 'Manual';
    return (
      <>
        <div className="occ-badges">
          <Badge tone={b.state === 'Offline' ? 'red' : 'green'}>
            PLC Link: {b.state === 'Offline' ? 'MẤT' : 'OK'}
          </Badge>
          <Badge tone="blue">Operator Session · supervisor01</Badge>
          {b.forced && <Badge tone="red">Force Mode Active</Badge>}
        </div>
        {selector}
        <div className="occ-tabs">
          <button
            className={tab === 'map' ? 'active' : ''}
            onClick={() => setTab('map')}
          >
            Bản đồ vận hành
          </button>
          <button
            className={tab === 'seq' ? 'active' : ''}
            onClick={() => setTab('seq')}
          >
            Sequence View
          </button>
        </div>
        <div className="operation-layout">
          <div className="stack">
            <Box
              title={'Danh sách Block · ' + (zone === 'all' ? 'Tất cả Zone' : zoneLabel[zone])}
              aside={<Badge tone="blue">Mô phỏng thời gian thực</Badge>}
            >
              <div className="block-list">
                {zoneBlocks.map((x) => (
                  <button
                    key={x.id}
                    className={'block-list-card ' + (x.id === b.id ? 'selected' : '')}
                    onClick={() => pick(x.id)}
                  >
                    <div className="block-list-top">
                      <b>Block {x.id}</b>
                      <Tag text={status(x, sim)} />
                    </div>
                    <div className="block-list-meta">
                      <span>Chế độ: {x.mode}</span>
                      <span>
                        Đã đỗ: {x.slots.filter(Boolean).length}/{x.capacity} khay
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </Box>
            {tab === 'map' ? (
              <Box
                title={'Sơ đồ khay đỗ cơ khí (Pallet Grid) · Block ' + b.id}
                aside={
                  <span className="muted">Tổng số: {b.capacity} khay</span>
                }
              >
                <div className="floor-caption">
                  <span>
                    {zoneLabel[b.zone]} / BLOCK {b.id}
                  </span>
                  <span>↑ HƯỚNG DI CHUYỂN</span>
                </div>
                {palletGrid(b)}
                <div className="driveway">
                  ← LÀN LƯU THÔNG <span>VÀO / RA →</span>
                </div>
                <div className="pallet-legend">
                  <span>
                    <i className="lg-empty" />
                    Khay trống
                  </span>
                  <span>
                    <i className="lg-occ" />
                    Đã đăng ký đỗ
                  </span>
                  <span>
                    <i className="lg-res" />
                    Đang vận hành điều phối
                  </span>
                  <span>
                    <i className="lg-fault" />
                    Lỗi vị trí
                  </span>
                </div>
              </Box>
            ) : (
              <Box title={'Sequence View · Block ' + b.id}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {['Lệnh', 'Biển số', 'Khay', 'Loại', 'Tiến trình', 'Trạng thái'].map(
                        (h) => (
                          <TableHead key={h}>{h}</TableHead>
                        ),
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sim.jobs
                      .filter((j) => j.block === b.id)
                      .map((j) => (
                        <TableRow key={j.id}>
                          <TableCell>#{j.id}</TableCell>
                          <TableCell className="mono">{j.plate}</TableCell>
                          <TableCell>P{String(j.slot + 1).padStart(2, '0')}</TableCell>
                          <TableCell>{j.kind === 'in' ? 'Gọi vào' : 'Trả ra'}</TableCell>
                          <TableCell>
                            <div className="queue-progress">
                              <Progress value={j.progress} />
                              <span>{j.progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              tone={
                                j.hold
                                  ? 'amber'
                                  : j.status === 'Đang chạy'
                                    ? 'blue'
                                    : j.status === 'Hoàn tất'
                                      ? 'green'
                                      : 'purple'
                              }
                            >
                              {j.hold ? 'Hold' : j.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
                {!sim.jobs.some((j) => j.block === b.id) && (
                  <div className="empty-state">Block chưa có lệnh nào.</div>
                )}
              </Box>
            )}
          </div>
          <div className="stack">
            <Box
              title={'Control Panel · Block ' + b.id}
              aside={<Tag text={status(b, sim)} />}
            >
              <div className="control-line">
                <span>Chế độ hoạt động</span>
                <strong>{b.mode.toUpperCase()}</strong>
              </div>
              <div className="control-line">
                <span>Liên động an toàn</span>
                <Tag text={blocked(b) || 'Bình thường'} />
              </div>
              <div className="control-line">
                <span>Trạng thái khóa</span>
                <strong>{b.locked ? 'Đã khóa' : 'Mở'}</strong>
              </div>
              <div className="ctrl-section">Chế độ hoạt động (Mode Selector)</div>
              <div className="mode-selector">
                {modeButtons.map((m) => (
                  <button
                    key={m.m}
                    className={
                      'mode-btn ' +
                      (m.m === 'EStop' ? 'estop ' : '') +
                      (b.mode === m.m ? 'active' : '')
                    }
                    onClick={() => setMode(m.m)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="ctrl-section">Hành động khởi chạy (Block Commands)</div>
              <div className="cmd-grid">
                <button className="cmd-btn go" onClick={() => cmd('START')}>
                  <Play size={14} /> START
                </button>
                <button className="cmd-btn stop" onClick={() => cmd('STOP')}>
                  <Square size={14} /> STOP
                </button>
                <button className="cmd-btn" onClick={() => cmd('PAUSE')}>
                  <Pause size={14} /> PAUSE
                </button>
                <button className="cmd-btn" onClick={() => cmd('RESUME')}>
                  <RotateCcw size={14} /> RESUME
                </button>
                <button
                  className={'cmd-btn ' + (b.locked ? 'active' : '')}
                  onClick={() => cmd('LOCK')}
                >
                  <Lock size={14} /> KHÓA
                </button>
                <button className="cmd-btn" onClick={() => cmd('UNLOCK')}>
                  <Unlock size={14} /> MỞ KHÓA
                </button>
                <button className="cmd-btn" onClick={() => cmd('DISABLE_MAINT')}>
                  Kết thúc bảo trì
                </button>
                <button
                  className={'cmd-btn ' + (b.forced ? 'active' : '')}
                  onClick={() => cmd('FORCE')}
                >
                  <Zap size={14} /> Cưỡng bức
                </button>
                <button className="cmd-btn warn" onClick={() => cmd('SIM_FAULT')}>
                  Giả lập lỗi
                </button>
                <button className="cmd-btn warn" onClick={() => cmd('SIM_JAM')}>
                  Giả lập kẹt
                </button>
              </div>
              {notice && (
                <div className="notice" role="status">
                  {notice}
                </div>
              )}
              {job && (
                <div className="job-progress">
                  <div>
                    <span>{blocked(b) ? 'Lệnh đang bị giữ' : job.status}</span>
                    <strong>{job.progress}%</strong>
                  </div>
                  <Progress value={job.progress} />
                  <small>
                    {job.plate} ·{' '}
                    {job.progress < 30
                      ? 'Kiểm tra và tiếp nhận'
                      : job.progress < 70
                        ? 'Di chuyển pallet'
                        : 'Đưa xe về vị trí'}
                  </small>
                </div>
              )}
            </Box>
            <Box title="Gọi / Trả xe thủ công (Manual only)">
              {!manual && (
                <div className="notice amber">
                  Chỉ thao tác được khi Block ở chế độ MANUAL. Chọn MANUAL ở
                  Mode Selector.
                </div>
              )}
              <div className="control-line">
                <span>Khay đang chọn</span>
                <strong>P{String(slot + 1).padStart(2, '0')}</strong>
              </div>
              <div className="control-line">
                <span>Biển số tại khay</span>
                <strong>{b.slots[slot] ?? 'Không có xe'}</strong>
              </div>
              <label className="field">
                <span>Biển số xe gọi vào</span>
                <input
                  placeholder="51H-123.45"
                  value={plate}
                  disabled={!manual}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                />
              </label>
              <div className="control-actions">
                <button
                  className="primary"
                  disabled={!manual || !!blocked(b) || !!b.slots[slot]}
                  onClick={() => send('in')}
                >
                  <ArrowDownLeft size={16} /> Gửi lệnh Gọi xe
                </button>
                <button
                  className="secondary"
                  disabled={!manual || !!blocked(b) || !b.slots[slot]}
                  onClick={() => send('out')}
                >
                  <ArrowUpRight size={16} /> Gửi lệnh Trả xe
                </button>
              </div>
            </Box>
            <Box title="Gửi lệnh trực tiếp PLC (Direct PLC)">
              <p className="hint">
                Mô phỏng chu trình lệnh xuống PLC: Send → Sent → Accepted →
                Running → Done.
              </p>
              <PlcCommander block={b.id} dispatch={dispatch} />
            </Box>
          </div>
        </div>
      </>
    );
  }

  /* ---------------- SAFETY INTERLOCK ---------------- */
  if (page === 'safety') {
    const conditions = [
      {
        label: 'Cửa an toàn đóng',
        ok: b.doorClosed,
        detail: 'Đóng kín trước khi vận hành',
      },
      {
        label: 'Không kích hoạt E-Stop',
        ok: !b.estop,
        detail: 'Nút dừng khẩn cấp phải nhả',
      },
      {
        label: 'Kết nối bộ điều khiển PLC',
        ok: b.state !== 'Offline',
        detail: 'Modbus TCP heartbeat',
      },
      {
        label: 'Không ở chế độ bảo trì',
        ok: b.state !== 'Bảo trì',
        detail: 'Maintenance mode phải tắt',
      },
      {
        label: 'Thiết bị không báo lỗi',
        ok: b.state !== 'Lỗi',
        detail: 'Không có fault đang treo',
      },
      {
        label: 'Block không bị khóa',
        ok: !b.locked,
        detail: 'Lock/Unlock từ Control Panel',
      },
    ];
    const anyBypass = sim.bypasses.length > 0 || sim.blocks.some((x) => x.forced);
    return (
      <>
        {anyBypass && (
          <div className="force-banner">
            <ShieldCheck size={16} />
            <b>CẢNH BÁO: ĐANG CÓ THIẾT BỊ BỊ BYPASS / FORCE HOẠT ĐỘNG</b>
            <Badge tone="red">Force Mode Active</Badge>
          </div>
        )}
        {selector}
        <Box
          title={'Ma trận điều kiện an toàn · Block ' + b.id}
          aside={<span className="muted">Quét chu kỳ: 500ms</span>}
        >
          <div className="table-scroll">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Điều kiện an toàn</th>
                  <th>Vị trí</th>
                  <th>Trạng thái</th>
                  <th>Hành động đề xuất</th>
                </tr>
              </thead>
              <tbody>
                {conditions.map((c, i) => (
                  <tr key={c.label}>
                    <td>{String(i + 1).padStart(2, '0')}</td>
                    <td>{c.label}</td>
                    <td>Block {b.id}</td>
                    <td>
                      <Badge tone={c.ok ? 'green' : 'red'}>
                        {c.ok ? 'OK' : 'LỖI'}
                      </Badge>
                    </td>
                    <td>{c.ok ? 'Đạt điều kiện' : c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={'notice ' + (blocked(b) ? 'amber' : 'green')}>
            {blocked(b)
              ? `Block đang khóa: ${blocked(b)}`
              : 'Tất cả điều kiện đã thỏa mãn. Có thể nhập / xuất xe.'}
          </div>
        </Box>
        <div className="two-col">
          <Box title={'Điều khiển tín hiệu an toàn · Block ' + b.id}>
            <div className="safety-grid one">
              {[
                { field: 'doorClosed' as const, label: 'Cửa an toàn đóng', value: b.doorClosed },
                { field: 'estop' as const, label: 'Dừng khẩn cấp (E-STOP)', value: b.estop },
                { field: 'online' as const, label: 'Kết nối bộ điều khiển', value: b.state !== 'Offline' },
                { field: 'maintenance' as const, label: 'Chế độ bảo trì', value: b.state === 'Bảo trì' },
              ].map((x) => (
                <div className="safety-card" key={x.field}>
                  <h3>{x.label}</h3>
                  <Switch
                    aria-label={x.label}
                    checked={x.value}
                    disabled={
                      x.field === 'maintenance' &&
                      sim.jobs.some((j) => j.block === b.id && active(j))
                    }
                    onCheckedChange={() => toggle(x.field)}
                  />
                </div>
              ))}
            </div>
          </Box>
          <Box title="Tạo lệnh Bypass Sensor mới">
            <Choice
              label="Thiết bị / cảm biến"
              value={bypDevice}
              onChange={setBypDevice}
              options={[
                'Photogate - Cảm biến an toàn',
                'LS-T3 - Cảm biến hành trình',
                'Lift Motor - Quá tải động cơ nâng',
              ].map((v) => ({ value: v, label: v }))}
            />
            <Choice
              label="Vị trí Block đỗ"
              value={bypBlock}
              onChange={setBypBlock}
              options={sim.blocks.map((x) => ({ value: x.id, label: 'Block ' + x.id }))}
            />
            <Choice
              label="Thời gian tự động tắt (Timeout)"
              value={bypTimeout}
              onChange={setBypTimeout}
              options={[
                { value: '5', label: '5 phút' },
                { value: '15', label: '15 phút' },
                { value: '30', label: '30 phút' },
                { value: '60', label: '60 phút (1 giờ)' },
              ]}
            />
            <label className="field">
              <span>Lý do Bypass (bắt buộc)</span>
              <input
                placeholder="Vd: Bảo trì cơ khí định kỳ, sensor báo lỗi giả…"
                value={bypReason}
                onChange={(e) => setBypReason(e.target.value)}
              />
            </label>
            <div className="control-actions">
              <button
                className="primary"
                onClick={() => {
                  if (!bypReason.trim()) {
                    setBypNote('Vui lòng nhập lý do bypass.');
                    return;
                  }
                  dispatch({
                    type: 'bypass',
                    op: 'add',
                    device: bypDevice,
                    block: bypBlock,
                    timeout: Number(bypTimeout),
                    reason: bypReason.trim(),
                    time: time(),
                  });
                  setBypReason('');
                  setBypNote('Đã kích hoạt bypass. Force Mode được bật.');
                }}
              >
                Kích hoạt Bypass
              </button>
            </div>
            {bypNote && (
              <div className="notice amber" role="status">
                {bypNote}
              </div>
            )}
          </Box>
        </div>
        <Box
          title="Danh sách Sensor đang Bypass"
          aside={<span className="muted">{sim.bypasses.length} thiết bị</span>}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {['Thiết bị', 'Block', 'Timeout', 'Lý do', 'Lúc', 'Thao tác'].map(
                  (h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sim.bypasses.map((bp) => (
                <TableRow key={bp.id}>
                  <TableCell>{bp.device}</TableCell>
                  <TableCell>{bp.block}</TableCell>
                  <TableCell>{bp.timeout} phút</TableCell>
                  <TableCell>{bp.reason}</TableCell>
                  <TableCell className="mono">{bp.at}</TableCell>
                  <TableCell>
                    <button
                      className="secondary"
                      onClick={() =>
                        dispatch({
                          type: 'bypass',
                          op: 'remove',
                          id: bp.id,
                          time: time(),
                        })
                      }
                    >
                      Gỡ bypass
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!sim.bypasses.length && (
            <div className="empty-state">
              <ShieldCheck />
              Không có sensor nào đang bị bypass.
            </div>
          )}
        </Box>
      </>
    );
  }

  /* ---------------- ALARMS & EVENTS ---------------- */
  if (page === 'alarms') {
    const catName: Record<string, string> = {
      operator: 'Lỗi thao tác',
      system: 'Lỗi thiết bị',
      maintenance: 'Đến hạn bảo trì',
    };
    const count = (c: string) =>
      sim.alarms.filter((a) => !a.ack && a.cat === c).length;
    const rows = sim.alarms.filter(
      (a) =>
        (alarmCat === 'all' || a.cat === alarmCat) &&
        (alarmSev === 'all' || a.sev === alarmSev),
    );
    const zoneOf = (blk: string) => blk[0];
    return (
      <>
        <div className="metrics metrics-4">
          <div className="kpi kpi-red">
            <div className="kpi-top">
              <span>Lỗi thiết bị / hệ thống</span>
            </div>
            <strong>{count('system')}</strong>
            <small>Yêu cầu can thiệp kỹ thuật</small>
          </div>
          <div className="kpi kpi-amber">
            <div className="kpi-top">
              <span>Lỗi thao tác vận hành</span>
            </div>
            <strong>{count('operator')}</strong>
            <small>Nhấn E-Stop hoặc mở cửa tủ</small>
          </div>
          <div className="kpi kpi-blue">
            <div className="kpi-top">
              <span>Thiết bị đến hạn bảo trì</span>
            </div>
            <strong>{count('maintenance')}</strong>
            <small>Dựa trên chu kỳ và giờ chạy</small>
          </div>
          <div className="kpi kpi-green">
            <div className="kpi-top">
              <span>Đã xác nhận (ACK)</span>
            </div>
            <strong>{sim.alarms.filter((a) => a.ack).length}</strong>
            <small>Nhân viên đang xử lý</small>
          </div>
        </div>
        <Box
          title="Nhật ký cảnh báo & sự cố"
          aside={
            <button
              className="secondary"
              onClick={() =>
                csv(
                  [
                    ['Thời gian', 'Phân loại', 'Mức độ', 'Zone', 'Block', 'Thiết bị', 'Mã lỗi', 'Mô tả', 'Trạng thái', 'Người ACK'],
                    ...sim.alarms.map((a) => [
                      a.at ?? '',
                      a.cat ? catName[a.cat] : '',
                      a.sev ?? '',
                      zoneOf(a.block),
                      a.block,
                      a.device ?? '',
                      a.code ?? '',
                      a.text,
                      a.ack ? 'Đã xác nhận' : 'Đang hoạt động',
                      a.ackBy ?? '',
                    ]),
                  ],
                  'totalparking-alarms.csv',
                )
              }
            >
              <Download size={16} /> Xuất Excel
            </button>
          }
        >
          <div className="toolbar">
            <Choice
              label="Phân loại lỗi"
              value={alarmCat}
              onChange={setAlarmCat}
              options={[
                { value: 'all', label: 'Tất cả phân loại' },
                { value: 'system', label: 'Lỗi thiết bị / hệ thống' },
                { value: 'operator', label: 'Lỗi thao tác vận hành' },
                { value: 'maintenance', label: 'Đến hạn bảo trì' },
              ]}
            />
            <Choice
              label="Mức độ"
              value={alarmSev}
              onChange={setAlarmSev}
              options={[
                { value: 'all', label: 'Tất cả mức độ' },
                ...['Nghiêm trọng', 'Cao', 'Trung bình', 'Thấp'].map((s) => ({
                  value: s,
                  label: s,
                })),
              ]}
            />
          </div>
          <div className="table-scroll">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Phân loại</th>
                  <th>Mức độ</th>
                  <th>Zone</th>
                  <th>Block</th>
                  <th>Thiết bị</th>
                  <th>Mã lỗi</th>
                  <th>Mô tả sự cố</th>
                  <th>Trạng thái</th>
                  <th>Người ACK</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{a.at ?? '—'}</td>
                    <td>{a.cat ? catName[a.cat] : '—'}</td>
                    <td>
                      <Badge
                        tone={
                          a.sev === 'Nghiêm trọng'
                            ? 'red'
                            : a.sev === 'Cao'
                              ? 'amber'
                              : a.sev === 'Trung bình'
                                ? 'blue'
                                : 'green'
                        }
                      >
                        {a.sev}
                      </Badge>
                    </td>
                    <td>{zoneOf(a.block)}</td>
                    <td>{a.block}</td>
                    <td>{a.device ?? '—'}</td>
                    <td className="mono">{a.code ?? '—'}</td>
                    <td>{a.text}</td>
                    <td>
                      <Tag text={a.ack ? 'Hoàn tất' : 'Cảnh báo'} />
                    </td>
                    <td>{a.ackBy ?? '—'}</td>
                    <td>
                      <button
                        className="secondary"
                        disabled={a.ack}
                        onClick={() =>
                          dispatch({ type: 'ack', id: a.id, time: time() })
                        }
                      >
                        <CheckCheck size={15} /> ACK
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <div className="empty-state">
              <ShieldCheck />
              Không có cảnh báo phù hợp bộ lọc.
            </div>
          )}
        </Box>
      </>
    );
  }

  /* ---------------- QUEUE ---------------- */
  if (page === 'queue') {
    const eta = (p: number) => Math.max(0, Math.round((100 - p) / 10)) + 's';
    const jobState = (j: (typeof sim.jobs)[number]) =>
      j.hold
        ? 'BỊ HOLD'
        : j.status === 'Đang chạy'
          ? 'ĐANG CHẠY'
          : j.status === 'Chờ xử lý'
            ? 'CHỜ CHẠY'
            : j.status.toUpperCase();
    const kindOf = (blk: string, i: number) =>
      sim.blocks.find((x) => x.id === blk)?.kinds[i] ?? '—';
    const rejected = sim.jobs.filter((j) => j.status === 'Đã hủy');
    const queueRow = (j: (typeof sim.jobs)[number], exit: boolean) => (
      <TableRow key={j.id}>
        <TableCell className="mono">{j.plate}</TableCell>
        <TableCell>{kindOf(j.block, j.slot)}</TableCell>
        <TableCell>
          {j.priority === 'VIP' ? (
            <Badge tone="amber">VIP</Badge>
          ) : (
            <span className="muted">NORMAL</span>
          )}
        </TableCell>
        <TableCell>
          {exit
            ? `P${String(j.slot + 1).padStart(2, '0')} (Block ${j.block})`
            : `Block ${j.block}`}
        </TableCell>
        <TableCell>
          <Badge
            tone={
              j.hold
                ? 'amber'
                : j.status === 'Đang chạy'
                  ? 'blue'
                  : j.status === 'Chờ xử lý'
                    ? 'purple'
                    : 'green'
            }
          >
            {jobState(j)}
          </Badge>
        </TableCell>
        <TableCell className="mono">{active(j) ? eta(j.progress) : '—'}</TableCell>
        <TableCell>
          <div className="row-actions">
            {j.priority !== 'VIP' && (
              <button
                className="mini"
                onClick={() =>
                  dispatch({ type: 'queue', op: 'vip', id: j.id, time: time() })
                }
              >
                <Crown size={13} /> VIP
              </button>
            )}
            {j.hold ? (
              <button
                className="mini"
                onClick={() =>
                  dispatch({ type: 'queue', op: 'resume', id: j.id, time: time() })
                }
              >
                <Play size={13} /> Resume
              </button>
            ) : (
              <button
                className="mini"
                onClick={() =>
                  dispatch({ type: 'queue', op: 'hold', id: j.id, time: time() })
                }
              >
                <Hand size={13} /> Hold
              </button>
            )}
            <button
              className="mini danger"
              onClick={() =>
                dispatch({ type: 'queue', op: 'reject', id: j.id, time: time() })
              }
            >
              <Ban size={13} /> Reject
            </button>
          </div>
        </TableCell>
      </TableRow>
    );
    const entry = sim.jobs.filter((j) => j.kind === 'in' && active(j));
    const exit = sim.jobs.filter((j) => j.kind === 'out' && active(j));
    return (
      <>
        <Box
          title="Hàng đợi xe gửi vào bãi (Entry Queue)"
          aside={<span className="muted">{entry.length} xe đang chờ</span>}
        >
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  {['Biển số', 'Loại xe', 'Ưu tiên', 'Block chỉ định', 'Trạng thái', 'ETA', 'Hành động'].map(
                    (h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ),
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>{entry.map((j) => queueRow(j, false))}</TableBody>
            </Table>
          </div>
          {!entry.length && (
            <div className="empty-state">
              <Car />
              Chưa có xe chờ vào. Tạo lệnh tại Điều khiển vận hành.
            </div>
          )}
        </Box>
        <Box
          title="Hàng đợi xe lấy ra bãi (Exit Queue)"
          aside={<span className="muted">{exit.length} xe đang chờ</span>}
        >
          <div className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  {['Biển số', 'Loại xe', 'Ưu tiên', 'Vị trí đỗ', 'Trạng thái', 'ETA', 'Hành động'].map(
                    (h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ),
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>{exit.map((j) => queueRow(j, true))}</TableBody>
            </Table>
          </div>
          {!exit.length && (
            <div className="empty-state">Chưa có xe chờ lấy ra.</div>
          )}
        </Box>
        <div className="two-col">
          <Box title="Hiệu suất điều phối hàng đợi">
            <Rows3
              rows={[
                ['Thời gian trung bình xử lý', '12.5s'],
                ['Tỷ lệ điều phối đúng hạn', '98.4%'],
                ['Tỷ lệ xe bị từ chối đỗ', '1.2%'],
              ]}
            />
          </Box>
          <Box title="Danh sách xe bị từ chối / hủy (Rejected)">
            {rejected.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Biển số</TableHead>
                    <TableHead>Loại lệnh</TableHead>
                    <TableHead>Block</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rejected.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="mono">{j.plate}</TableCell>
                      <TableCell>{j.kind === 'in' ? 'Nhập' : 'Xuất'}</TableCell>
                      <TableCell>{j.block}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="empty-state">Chưa có lệnh bị từ chối.</div>
            )}
          </Box>
        </div>
      </>
    );
  }

  /* ---------------- TRACKING ---------------- */
  if (page === 'tracking') {
    const cars = sim.blocks
      .flatMap((b) =>
        b.slots.flatMap((plate, i) =>
          plate
            ? [{ plate, block: b.id, zone: b.zone, slot: i, kind: b.kinds[i] }]
            : [],
        ),
      )
      .filter((c) =>
        `${c.plate} ${c.block}`.toLowerCase().includes(query.toLowerCase()),
      );
    return (
      <>
        <div className="two-col">
          <Box title="Tìm kiếm xe & định vị nhanh">
            <label className="search-field">
              <Search size={17} />
              <input
                aria-label="Tìm biển số hoặc Block"
                placeholder="Biển số hoặc mã thẻ xe…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="control-line">
              <span>Đầu đọc cổng vào (In-Gate)</span>
              <Badge tone="green">ONLINE</Badge>
            </div>
            <div className="control-line">
              <span>Đầu đọc cổng ra (Out-Gate)</span>
              <Badge tone="green">ONLINE</Badge>
            </div>
          </Box>
          <Box title="Hành trình Pallet di chuyển">
            <ol className="journey">
              <li>
                <b>STEP 1 · Quét RFID & phân loại cổng vào</b>
                <span>
                  Phát hiện xe tại Cổng 1, chụp ảnh LPR biển số và gán khay đỗ.
                </span>
              </li>
              <li>
                <b>STEP 2 · Bàn nâng nhận khay đỗ</b>
                <span>
                  Xác nhận cảm biến tải trọng, motor phanh nhả và bàn nâng di
                  chuyển.
                </span>
              </li>
              <li>
                <b>STEP 3 · Xếp khay vào ô đỗ chỉ định</b>
                <span>Di chuyển ngang pallet bằng cơ cấu Slide Runner.</span>
              </li>
            </ol>
          </Box>
        </div>
        <Box
          title="Truy vết xe & pallet"
          aside={<span className="muted">{cars.length} xe</span>}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {['Biển số', 'Loại xe', 'Phân khu', 'Block', 'Pallet', 'Trạng thái'].map(
                  (h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cars.map((c) => (
                <TableRow key={c.plate}>
                  <TableCell className="mono">{c.plate}</TableCell>
                  <TableCell>{c.kind ?? '—'}</TableCell>
                  <TableCell>Zone {c.zone}</TableCell>
                  <TableCell>{c.block}</TableCell>
                  <TableCell>P{String(c.slot + 1).padStart(2, '0')}</TableCell>
                  <TableCell>
                    <Tag text="Đang chạy" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!cars.length && (
            <div className="empty-state">Không tìm thấy xe phù hợp.</div>
          )}
        </Box>
      </>
    );
  }

  /* ---------------- HISTORIAN ---------------- */
  function download() {
    csv(
      [
        ['Thời gian', 'Block', 'Nội dung'],
        ...sim.logs.map((l) => [l.time, l.block, l.text]),
      ],
      'totalparking-nhat-ky.csv',
    );
  }
  return (
    <div className="stack">
      <Box
        title="Biểu đồ xu hướng kỹ thuật (Historian & Trend)"
        aside={
          <div className="hist-select">
            <Choice
              label=""
              value={b.id}
              onChange={pick}
              options={sim.blocks.map((x) => ({
                value: x.id,
                label: 'Block ' + x.id,
              }))}
            />
          </div>
        }
      >
        <div className="hist-metrics">
          <Badge tone="blue">Dòng điện Motor nâng (A)</Badge>
          <span className="muted">Nhiệt độ động cơ (°C)</span>
          <span className="muted">Tần số biến tần VFD (Hz)</span>
        </div>
        <MotorTrend />
      </Box>
      <Box
        title="Nhật ký vận hành"
        aside={
          <button
            className="secondary"
            disabled={!sim.logs.length}
            onClick={download}
          >
            <Download size={16} /> Xuất CSV
          </button>
        }
      >
        <p className="hint">
          500 sự kiện gần nhất trong phiên mô phỏng. Tải lại trang sẽ khởi tạo
          lại dữ liệu.
        </p>
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Block</TableHead>
                <TableHead>Sự kiện</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sim.logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.time}</TableCell>
                  <TableCell>{l.block}</TableCell>
                  <TableCell>{l.text}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!sim.logs.length && (
          <div className="empty-state">
            Chưa có sự kiện. Nhật ký sẽ xuất hiện khi bạn thao tác.
          </div>
        )}
      </Box>
    </div>
  );
}
function Rows3({ rows }: { rows: [string, string][] }) {
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
