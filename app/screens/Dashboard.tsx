'use client';
import {
  Bell,
  Car,
  ChevronRight,
  CircleParking,
  Grid2X2,
  Layers,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  status,
  zoneTag,
  summary,
  percent,
  countOf,
  availableOf,
  isActiveAlarm,
  blockLabel,
} from '@/lib/simulation';
import {
  Panel,
  Badge,
  Tag,
  ConnectionBadge,
  EmptyState,
  type ScreenProps,
} from './shared';

function Trend() {
  return (
    <div className="trend">
      <div className="chart-label">TỶ LỆ LẤP ĐẦY (%)</div>
      <svg
        viewBox="0 0 760 205"
        aria-label="Biểu đồ dữ liệu mẫu mật độ đỗ xe các Zone từ 06 giờ đến 12 giờ"
      >
        <title>Biểu đồ dữ liệu mẫu mật độ đỗ xe từ 06 giờ đến 12 giờ</title>
        <defs>
          <linearGradient id="fade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity=".2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((n, i) => (
          <g key={n}>
            <line
              x1="38"
              x2="740"
              y1={175 - i * 37}
              y2={175 - i * 37}
              stroke="#283548"
              strokeDasharray="3 5"
            />
            <text x="5" y={179 - i * 37} fill="#8293ac" fontSize="12">
              {n}
            </text>
          </g>
        ))}
        <path
          d="M38 135 L155 113 L272 98 L389 75 L506 67 L623 55 L740 50 L740 175 L38 175Z"
          fill="url(#fade)"
        />
        <path
          d="M38 135 L155 113 L272 98 L389 75 L506 67 L623 55 L740 50"
          fill="none"
          stroke="#4095ff"
          strokeWidth="2.5"
        />
        <path
          d="M38 150 L155 140 L272 115 L389 105 L506 101 L623 88 L740 93"
          fill="none"
          stroke="#31cba4"
          strokeWidth="2.5"
        />
        <path
          d="M38 166 L155 161 L272 151 L389 143 L506 136 L623 126 L740 132"
          fill="none"
          stroke="#a487ff"
          strokeWidth="2.5"
        />
        {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00'].map(
          (t, i) => (
            <text
              key={t}
              x={38 + i * 117}
              y="202"
              textAnchor="middle"
              fill="#8293ac"
              fontSize="12"
            >
              {t}
            </text>
          ),
        )}
      </svg>
      <div className="chart-legend">
        <span>
          <i className="blue-dot" />
          Zone A
        </span>
        <span>
          <i className="green-dot" />
          Zone B
        </span>
        <span>
          <i className="purple-dot" />
          Zone C
        </span>
        <span className="muted">Lịch sử mẫu</span>
      </div>
    </div>
  );
}
const connectivity = [
  { name: 'PLC Block', ok: true },
  { name: 'HMI Block', ok: true },
  { name: 'AI-VDS', ok: true },
  { name: 'LED / PGS', ok: true },
  { name: 'SCADA Server', ok: true },
];
const alarmCatName: Record<string, string> = {
  operator: 'Lỗi thao tác',
  system: 'Lỗi thiết bị',
  maintenance: 'Đến hạn bảo trì',
};
function ScadaAlarmsLive({ sim, dispatch }: Pick<ScreenProps, 'sim' | 'dispatch'>) {
  const severity = { 'Nghiêm trọng': 4, Cao: 3, 'Trung bình': 2, Thấp: 1 };
  const activeAlarms = sim.alarms
    .filter((a) => isActiveAlarm(a))
    .sort(
      (a, b) =>
        Number(a.ack) - Number(b.ack) ||
        (severity[b.sev ?? 'Thấp'] ?? 0) - (severity[a.sev ?? 'Thấp'] ?? 0),
    );
  const cnt = (c: string) => activeAlarms.filter((a) => a.cat === c).length;
  const sourceName = (id: string) => {
    if (id === 'Gateway') return 'Gateway';
    const block = sim.blocks.find((item) => item.id === id);
    return block ? blockLabel(block) : `Block ${id}`;
  };
  return (
    <Panel
      title="Hệ thống cảnh báo thời gian thực (SCADA Alarms Live)"
      aside={
        <span className="muted">
          {sim.source === 'sim' ? 'Chu kỳ mô phỏng: 1s' : 'Cập nhật theo gateway'}
        </span>
      }
    >
      <div className="alarms-live-cats">
        <div className="alive-cat amber">
          <div>
            <span>Lỗi thao tác vận hành</span>
            <small>Operator Errors</small>
          </div>
          <strong>{cnt('operator')}</strong>
        </div>
        <div className="alive-cat red">
          <div>
            <span>Lỗi hệ thống / thiết bị</span>
            <small>System &amp; Device Faults</small>
          </div>
          <strong>{cnt('system')}</strong>
        </div>
        <div className="alive-cat blue">
          <div>
            <span>Thiết bị đến hạn bảo trì</span>
            <small>Maintenance Due</small>
          </div>
          <strong>{cnt('maintenance')}</strong>
        </div>
      </div>
      <div className="table-scroll">
        <table className="grid-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Mã lỗi</th>
              <th>Phân loại cảnh báo</th>
              <th>Nguồn phát</th>
              <th>Nội dung chi tiết</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {activeAlarms.slice(0, 6).map((a) => (
              <tr key={a.id}>
                <td className="mono">{a.at ?? '—'}</td>
                <td className="mono">{a.code ?? '—'}</td>
                <td>
                  <Badge
                    tone={
                      a.cat === 'system'
                        ? 'red'
                        : a.cat === 'operator'
                          ? 'amber'
                          : 'blue'
                    }
                  >
                    {a.cat ? alarmCatName[a.cat] : '—'}
                  </Badge>
                </td>
                <td>
                  {(a.zone && `Zone ${a.zone}`) || zoneTag[a.block[0]] || 'Hệ thống'} ·{' '}
                  {sourceName(a.block)} · {a.device ?? '—'}
                </td>
                <td>{a.text}</td>
                <td>
                  <button
                    className="secondary"
                    disabled={a.ack}
                    onClick={() =>
                      dispatch({
                        type: 'ack',
                        id: a.id,
                        time: new Date().toLocaleString('vi-VN'),
                      })
                    }
                  >
                    {a.ack ? 'Đã ACK' : 'Xác nhận'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!activeAlarms.length && (
        <div className="empty-state">Không có cảnh báo đang hoạt động.</div>
      )}
    </Panel>
  );
}
export default function Dashboard({
  sim,
  dispatch,
  setSelected,
  setPage,
}: ScreenProps) {
  const blocks = sim.blocks.map((b) => ({
    ...b,
    count: countOf(b),
    avail: availableOf(b, sim),
    state: status(b, sim),
  }));
  const sum = summary(sim);
  const activeRows = sim.alarms.filter((a) => isActiveAlarm(a));
  const activeAlarms = activeRows.length;
  const firstAlarm = activeRows.find((a) => !a.ack) ?? activeRows[0];
  const downCount = sim.blocks.filter(
    (b) => !b.online || b.fault || b.quality !== 'good',
  ).length;
  /* Kết nối: chế độ sim là dữ liệu mẫu; nguồn PLC phản ánh trạng thái thật. */
  const conn =
    sim.source === 'sim'
      ? connectivity
      : [
          { name: 'Gateway', ok: sim.connection === 'online' },
          {
            name: 'PLC (tổng)',
            ok:
              sim.connection === 'online' &&
              sim.blocks.some((b) => b.online && b.quality === 'good'),
          },
          {
            name: 'Chất lượng dữ liệu',
            ok: sim.blocks.length > 0 && sim.blocks.every((b) => b.quality === 'good'),
          },
        ];

  if (!sim.blocks.length)
    return (
      <>
        <div className="occ-badges">
          <ConnectionBadge sim={sim} />
        </div>
        <EmptyState sim={sim} what="Dashboard sẽ hiển thị khi có Block dữ liệu." />
      </>
    );
  const capacity = sum.capacity;
  return (
    <>
      <div className="occ-badges">
        <ConnectionBadge sim={sim} />
        {sum.unknown && <Badge tone="amber">Một số dữ liệu chưa xác nhận</Badge>}
      </div>
      <div className="metrics metrics-6">
        {[
          { label: 'Tổng Block', value: String(sim.blocks.length), sub: sum.zones.length + ' phân khu', icon: Layers, tone: 'blue' },
          { label: 'Tổng Pallet', value: String(capacity), sub: 'Sức chứa toàn hệ thống', icon: CircleParking, tone: 'purple' },
          { label: 'Xe đang đỗ', value: String(sum.total), sub: percent(sum.total, capacity) + '% công suất' + (sum.unknown ? ' · có ô chưa rõ' : ''), icon: Car, tone: 'green' },
          { label: 'Vị trí khả dụng', value: String(sum.available), sub: Math.max(0, capacity - sum.total - sum.available) + ' vị trí chưa khả dụng/chưa rõ', icon: Grid2X2, tone: 'blue' },
          { label: 'Xe SUV', value: String(sum.suv), sub: percent(sum.suv, sum.total) + '% tổng số xe', icon: Car, tone: 'amber' },
          { label: 'Xe Sedan', value: String(sum.sedan), sub: sum.unclassified > 0 ? sum.unclassified + ' xe chưa phân loại' : percent(sum.sedan, sum.total) + '% tổng số xe', icon: Car, tone: 'green' },
        ].map((m) => (
          <div className="metric" key={m.label}>
            <div>
              <span>{m.label}</span>
              <strong>{m.value}</strong>
              <small>{m.sub}</small>
            </div>
            <div className={'metric-icon ' + m.tone}>
              <m.icon size={22} />
            </div>
          </div>
        ))}
      </div>
      <div className="alarm-strip">
        <Bell size={17} />
        <strong>{activeAlarms} cảnh báo đang hoạt động</strong>
        <span>
          {firstAlarm
            ? (firstAlarm.code ? '[' + firstAlarm.code + '] ' : '') +
              firstAlarm.block +
              ' · ' +
              firstAlarm.text
            : 'Tất cả tín hiệu an toàn bình thường'}
        </span>
        <button onClick={() => setPage('alarms')}>
          Xem chi tiết <ChevronRight size={15} />
        </button>
      </div>
      <div className="dashboard-grid">
        <Panel
          title="Mật độ khai thác theo thời gian"
          aside={<span className="muted">Ca sáng · Dữ liệu mẫu</span>}
        >
          <Trend />
        </Panel>
        <div className="stack">
          <Panel title="Mật độ theo Zone">
            <div className="zone-list">
              {sum.zones.map((z, i) => {
                const list = blocks.filter((b) => b.zone === z);
                const count = list.reduce((s, b) => s + (b.count ?? 0), 0);
                const cap = list.reduce((s, b) => s + b.capacity, 0);
                return (
                  <div className={'zone-row zone-' + (i % 3)} key={z}>
                    <div>
                      <span>
                        <b>Zone {z}</b>
                        <small>
                          {count} / {cap} pallet
                        </small>
                      </span>
                      <strong>
                        {percent(count, cap)}
                        <small>%</small>
                      </strong>
                    </div>
                    <Progress value={percent(count, cap)} />
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel
            title="Kết nối hệ thống"
            aside={<span className="muted">{sim.source === 'sim' ? 'Dữ liệu mẫu' : 'Thời gian thực'}</span>}
          >
            <div className="conn-list">
              {conn.map((c) => (
                <div className="conn-row" key={c.name}>
                  <span>{c.name}</span>
                  <Badge tone={c.ok ? 'green' : 'red'}>
                    {c.ok ? 'Kết nối' : 'Mất kết nối'}
                  </Badge>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
      <Panel
        title="Trạng thái các Block"
        aside={
          <span className="muted">
            {downCount} block lỗi/offline/dữ liệu xấu <ChevronRight size={14} />
          </span>
        }
      >
        <div className="block-grid">
          {blocks.map((b) => (
            <button
              className="block-card"
              key={b.id}
              onClick={() => {
                setSelected(b.id);
                setPage('control');
              }}
            >
              <div className="block-card-top">
                <span className="block-icon">
                  <Layers size={19} />
                </span>
                <span>
                  {blockLabel(b)}
                  <small>{zoneTag[b.zone] ?? `Zone ${b.zone}`}</small>
                </span>
                <ChevronRight size={15} />
              </div>
              <div className="block-numbers">
                <strong>
                  {b.count ?? '—'}
                  <small> / {b.capacity}</small>
                </strong>
                <span>{b.count == null ? '—' : percent(b.count, b.capacity) + '%'}</span>
              </div>
              <Progress value={percent(b.count ?? 0, b.capacity)} />
              <Tag text={b.state} />
            </button>
          ))}
        </div>
      </Panel>
      <ScadaAlarmsLive sim={sim} dispatch={dispatch} />
    </>
  );
}
