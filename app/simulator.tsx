'use client';
import { useCallback, useEffect, useReducer, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Car,
  CheckCheck,
  Download,
  Search,
  ShieldCheck,
  Square,
  Play,
  Pause,
  RotateCcw,
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
  type Sim,
  type Action,
  type Block,
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
  const [filter, setFilter] = useState('all');
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
          ...['A', 'B', 'C'].map((z) => ({ value: z, label: 'Zone ' + z })),
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
          return (
            <button
              key={i}
              aria-pressed={selected === block.id && slot === i}
              className={
                'pallet ' +
                (p ? 'occupied ' : '') +
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
              <strong>{p ?? 'TRỐNG'}</strong>
              <small>
                {reserved ? 'Đã xếp lệnh' : p ? 'Có xe' : 'Sẵn sàng'}
              </small>
            </button>
          );
        })}
      </div>
    );
  }
  if (page === 'control')
    return (
      <>
        {selector}
        <div className="operation-layout">
          <Box
            title={'Sơ đồ pallet · Block ' + b.id}
            aside={
              <span className="muted">
                {b.slots.filter(Boolean).length}/{b.capacity} xe
              </span>
            }
          >
            <div className="block-picker">
              {sim.blocks
                .filter((x) => zone === 'all' || x.zone === zone)
                .map((x) => (
                  <button
                    className={x.id === b.id ? 'selected' : ''}
                    key={x.id}
                    onClick={() => pick(x.id)}
                  >
                    {x.id}
                    <span
                      className={'mini-dot ' + (blocked(x) ? 'amber' : 'green')}
                    />
                  </button>
                ))}
            </div>
            <div className="floor-caption">
              <span>
                ZONE {b.zone} / BLOCK {b.id}
              </span>
              <span>↑ HƯỚNG DI CHUYỂN</span>
            </div>
            {palletGrid(b)}
            <div className="driveway">
              ← LÀN LƯU THÔNG <span>VÀO / RA →</span>
            </div>
            <div className="chart-legend">
              <span>
                <i className="green-dot" />
                Có xe
              </span>
              <span>
                <i className="blue-dot" />
                Đang chọn
              </span>
              <span>
                <i className="purple-dot" />
                Đã xếp lệnh
              </span>
            </div>
          </Box>
          <div className="stack">
            <Box
              title={'Điều khiển Block ' + b.id}
              aside={<Tag text={status(b, sim)} />}
            >
              <div className="control-line">
                <span>Liên động an toàn</span>
                <Tag text={blocked(b) || 'Bình thường'} />
              </div>
              <div className="control-line">
                <span>Pallet đang chọn</span>
                <strong>P{String(slot + 1).padStart(2, '0')}</strong>
              </div>
              <div className="control-line">
                <span>Biển số hiện tại</span>
                <strong>{b.slots[slot] ?? 'Không có xe'}</strong>
              </div>
              <div className="control-actions">
                <button className="secondary" onClick={() => toggle('paused')}>
                  {b.paused ? <Play size={16} /> : <Pause size={16} />}{' '}
                  {b.paused ? 'Tiếp tục' : 'Tạm dừng'}
                </button>
                <button
                  className={'secondary ' + (b.estop ? '' : 'danger')}
                  onClick={() => toggle('estop')}
                >
                  {b.estop ? <RotateCcw size={16} /> : <Square size={16} />}{' '}
                  {b.estop ? 'Nhả E-STOP' : 'E-STOP'}
                </button>
              </div>
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
            <Box title="Điều phối xe">
              <label className="field">
                <span>Biển số xe nhập</span>
                <input
                  placeholder="51H-123.45"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                />
              </label>
              <p className="hint">
                Chọn pallet trống để nhập xe, hoặc pallet có xe để xuất. Mỗi
                lệnh mô phỏng mất khoảng 10 giây.
              </p>
              <div className="control-actions">
                <button
                  className="primary"
                  disabled={!!blocked(b) || !!b.slots[slot]}
                  onClick={() => send('in')}
                >
                  <ArrowDownLeft size={17} />
                  Nhập xe
                </button>
                <button
                  className="secondary"
                  disabled={!!blocked(b) || !b.slots[slot]}
                  onClick={() => send('out')}
                >
                  <ArrowUpRight size={17} />
                  Xuất xe
                </button>
              </div>
              {notice && (
                <div className="notice" role="status">
                  {notice}
                </div>
              )}
              {blocked(b) && (
                <div className="notice amber">
                  Lệnh bị khóa: {blocked(b)}. Kiểm tra màn hình Safety
                  Interlock.
                </div>
              )}
            </Box>
          </div>
        </div>
      </>
    );
  if (page === 'safety')
    return (
      <>
        {selector}
        <Box
          title={'Safety Interlock · Block ' + b.id}
          aside={<ShieldCheck size={20} />}
        >
          <p className="hint">
            Thay đổi tín hiệu mô phỏng để quan sát khóa lệnh và cảnh báo. Xác
            nhận cảnh báo không tự khôi phục tín hiệu an toàn.
          </p>
          <div className="safety-grid">
            {[
              {
                field: 'doorClosed' as const,
                label: 'Cửa an toàn đóng',
                description: 'Mở cửa sẽ giữ tiến trình và khóa lệnh mới.',
                value: b.doorClosed,
              },
              {
                field: 'estop' as const,
                label: 'Dừng khẩn cấp (E-STOP)',
                description: 'Bật để dừng mọi chuyển động trong Block.',
                value: b.estop,
              },
              {
                field: 'online' as const,
                label: 'Kết nối bộ điều khiển',
                description: 'Mất kết nối sẽ giữ lệnh đang thực hiện.',
                value: b.state !== 'Offline',
              },
              {
                field: 'maintenance' as const,
                label: 'Chế độ bảo trì',
                description:
                  'Chỉ đổi chế độ khi Block không còn lệnh đang chờ hoặc chạy.',
                value: b.state === 'Bảo trì',
              },
            ].map((x) => (
              <div className="safety-card" key={x.field}>
                <div>
                  <h3>{x.label}</h3>
                  <p>{x.description}</p>
                </div>
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
          <div className={'notice ' + (blocked(b) ? 'amber' : 'green')}>
            {blocked(b)
              ? `Block đang khóa: ${blocked(b)}`
              : 'Tất cả điều kiện đã thỏa mãn. Có thể nhập / xuất xe.'}
          </div>
        </Box>
      </>
    );
  if (page === 'alarms')
    return (
      <Box
        title="Cảnh báo đang hoạt động"
        aside={
          <span className="muted">
            {sim.alarms.length} cảnh báo ·{' '}
            {sim.alarms.filter((a) => !a.ack).length} chưa xác nhận
          </span>
        }
      >
        <p className="hint">
          Khôi phục tín hiệu tại Safety Interlock để giải trừ cảnh báo. Lịch sử
          thao tác được lưu trong Nhật ký của phiên mô phỏng.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              {[
                'Mã cảnh báo',
                'Nguồn phát',
                'Nội dung',
                'Trạng thái',
                'Thao tác',
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sim.alarms.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="mono">{a.id}</TableCell>
                <TableCell>Block {a.block}</TableCell>
                <TableCell>{a.text}</TableCell>
                <TableCell>
                  <Tag text={a.ack ? 'Đã xác nhận' : 'Chưa xác nhận'} />
                </TableCell>
                <TableCell>
                  <button
                    className="secondary"
                    disabled={a.ack}
                    onClick={() =>
                      dispatch({ type: 'ack', id: a.id, time: time() })
                    }
                  >
                    <CheckCheck size={16} />
                    Xác nhận
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!sim.alarms.length && (
          <div className="empty-state">
            <ShieldCheck />
            Không có cảnh báo đang hoạt động.
          </div>
        )}
      </Box>
    );
  if (page === 'queue')
    return (
      <Box
        title="Hàng đợi nhập / xuất xe"
        aside={
          <span className="muted">
            {sim.jobs.filter(active).length} lệnh đang xử lý
          </span>
        }
      >
        <div className="toolbar">
          <Choice
            label="Trạng thái"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'active', label: 'Đang xử lý' },
              { value: 'done', label: 'Đã kết thúc' },
            ]}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              {[
                'Lệnh',
                'Biển số',
                'Block / Pallet',
                'Loại',
                'Tiến trình',
                'Trạng thái',
                'Thao tác',
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sim.jobs
              .filter(
                (j) =>
                  filter === 'all' ||
                  (filter === 'active' ? active(j) : !active(j)),
              )
              .map((j) => (
                <TableRow key={j.id}>
                  <TableCell>#{j.id}</TableCell>
                  <TableCell className="mono">{j.plate}</TableCell>
                  <TableCell>
                    {j.block} / P{String(j.slot + 1).padStart(2, '0')}
                  </TableCell>
                  <TableCell>
                    {j.kind === 'in' ? 'Nhập xe' : 'Xuất xe'}
                  </TableCell>
                  <TableCell>
                    <div className="queue-progress">
                      <Progress value={j.progress} />
                      <span>{j.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Tag
                      text={
                        active(j) &&
                        blocked(sim.blocks.find((b) => b.id === j.block)!)
                          ? 'Đang giữ lệnh'
                          : j.status
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      className="secondary"
                      disabled={j.status !== 'Chờ xử lý'}
                      onClick={() =>
                        dispatch({ type: 'cancel', id: j.id, time: time() })
                      }
                    >
                      Hủy lệnh chờ
                    </button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        {!sim.jobs.filter(
          (j) =>
            filter === 'all' || (filter === 'active' ? active(j) : !active(j)),
        ).length && (
          <div className="empty-state">
            <Car />
            Chưa có lệnh phù hợp. Tạo lệnh tại Điều khiển vận hành.
          </div>
        )}
      </Box>
    );
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
      <Box
        title="Truy vết xe & pallet"
        aside={<span className="muted">{cars.length} xe</span>}
      >
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Tìm biển số hoặc Block"
            placeholder="Tìm biển số hoặc Block…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <Table>
          <TableHeader>
            <TableRow>
              {[
                'Biển số',
                'Loại xe',
                'Phân khu',
                'Block',
                'Pallet',
                'Trạng thái',
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
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
                  <Tag text="Đang đỗ" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!cars.length && (
          <div className="empty-state">Không tìm thấy xe phù hợp.</div>
        )}
      </Box>
    );
  }
  function download() {
    const rows = [
      ['Thời gian', 'Block', 'Nội dung'],
      ...sim.logs.map((l) => [l.time, l.block, l.text]),
    ];
    const csv =
      '\ufeff' +
      rows
        .map((r) => r.map((c) => '"' + c.replaceAll('"', '""') + '"').join(','))
        .join('\r\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'totalparking-nhat-ky.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="stack">
      <Box
        title="Biểu đồ xu hướng kỹ thuật (Historian & Trend)"
        aside={<span className="muted">Motor nâng · Block B-04</span>}
      >
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
            <Download size={16} />
            Xuất CSV
          </button>
        }
      >
      <p className="hint">
        500 sự kiện gần nhất trong phiên mô phỏng. Tải lại trang sẽ khởi tạo lại
        dữ liệu.
      </p>
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
        {!sim.logs.length && (
          <div className="empty-state">
            Chưa có sự kiện. Nhật ký sẽ xuất hiện khi bạn thao tác.
          </div>
        )}
      </Box>
    </div>
  );
}
