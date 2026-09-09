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
import { status, zoneTag } from '@/lib/simulation';
import { Panel, Badge, Tag, type ScreenProps } from './shared';

function Trend() {
  return (
    <div className="trend">
      <div className="chart-label">TỶ LỆ LẤP ĐẦY (%)</div>
      <svg
        viewBox="0 0 760 205"
        role="img"
        aria-label="Biểu đồ dữ liệu mẫu mật độ đỗ xe các Zone từ 06 giờ đến 12 giờ"
      >
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
  const activeAlarms = sim.alarms.filter((a) => !a.ack);
  const cnt = (c: string) => activeAlarms.filter((a) => a.cat === c).length;
  return (
    <Panel
      title="Hệ thống cảnh báo thời gian thực (SCADA Alarms Live)"
      aside={<span className="muted">Chu kỳ cập nhật: 15s</span>}
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
                  {zoneTag[a.block[0]]} · Block {a.block} · {a.device ?? '—'}
                </td>
                <td>{a.text}</td>
                <td>
                  <button
                    className="secondary"
                    onClick={() =>
                      dispatch({
                        type: 'ack',
                        id: a.id,
                        time: new Date().toLocaleString('vi-VN'),
                      })
                    }
                  >
                    Xác nhận
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
    count: b.slots.filter(Boolean).length,
    state: status(b, sim),
  }));
  const total = blocks.reduce((n, b) => n + b.count, 0);
  const capacity = blocks.reduce((n, b) => n + b.capacity, 0);
  const suv = sim.blocks.reduce(
    (n, b) => n + b.kinds.filter((k) => k === 'SUV').length,
    0,
  );
  const sedan = total - suv;
  const available = sim.blocks.reduce(
    (n, b) => n + (b.state === 'Bảo trì' ? 0 : b.slots.filter((p) => !p).length),
    0,
  );
  const downCount = sim.blocks.filter(
    (b) => b.state === 'Offline' || b.state === 'Lỗi',
  ).length;
  const activeAlarms = sim.alarms.filter((a) => !a.ack).length;
  const firstAlarm = sim.alarms.find((a) => !a.ack);
  return (
    <>
      <div className="metrics metrics-6">
        {[
          { label: 'Tổng Block', value: '9', sub: '3 phân khu', icon: Layers, tone: 'blue' },
          { label: 'Tổng Pallet', value: '184', sub: 'Sức chứa toàn hệ thống', icon: CircleParking, tone: 'purple' },
          { label: 'Xe đang đỗ', value: String(total), sub: Math.round((total / capacity) * 100) + '% công suất', icon: Car, tone: 'green' },
          { label: 'Vị trí khả dụng', value: String(available), sub: capacity - total - available + ' vị trí trống bị khóa', icon: Grid2X2, tone: 'blue' },
          { label: 'Xe SUV', value: String(suv), sub: Math.round((suv / total) * 100) + '% tổng số xe', icon: Car, tone: 'amber' },
          { label: 'Xe Sedan', value: String(sedan), sub: Math.round((sedan / total) * 100) + '% tổng số xe', icon: Car, tone: 'green' },
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
              {['A', 'B', 'C'].map((z, i) => {
                const list = blocks.filter((b) => b.zone === z);
                const count = list.reduce((s, b) => s + b.count, 0);
                const cap = list.reduce((s, b) => s + b.capacity, 0);
                return (
                  <div className={'zone-row zone-' + i} key={z}>
                    <div>
                      <span>
                        <b>Zone {z}</b>
                        <small>
                          {count} / {cap} pallet
                        </small>
                      </span>
                      <strong>
                        {Math.round((count / cap) * 100)}
                        <small>%</small>
                      </strong>
                    </div>
                    <Progress value={(count / cap) * 100} />
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel title="Kết nối hệ thống">
            <div className="conn-list">
              {connectivity.map((c) => (
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
            {downCount} block lỗi/offline <ChevronRight size={14} />
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
                  Block {b.id}
                  <small>{zoneTag[b.zone]}</small>
                </span>
                <ChevronRight size={15} />
              </div>
              <div className="block-numbers">
                <strong>
                  {b.count}
                  <small> / {b.capacity}</small>
                </strong>
                <span>{Math.round((b.count / b.capacity) * 100)}%</span>
              </div>
              <Progress value={(b.count / b.capacity) * 100} />
              <Tag text={b.state} />
            </button>
          ))}
        </div>
      </Panel>
      <ScadaAlarmsLive sim={sim} dispatch={dispatch} />
    </>
  );
}
