'use client';
import { useState } from 'react';
import {
  Activity,
  Camera,
  Cpu,
  CreditCard,
  Download,
  FileText,
  Gauge,
  HardDrive,
  Lock,
  RefreshCw,
  Route,
  Save,
  Server,
  Settings as SettingsIcon,
  Timer,
  Users,
  Video,
  Wrench,
  Zap,
} from 'lucide-react';
import { Panel, Badge, Tag, Bar } from './ui';
import type { Sim } from '@/lib/simulation';

/* ---------- small shared bits ---------- */
function Kpi({
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
function Rows({ children }: { children: React.ReactNode }) {
  return <div className="def-rows">{children}</div>;
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="def-row">
      <span>{k}</span>
      <strong>{v}</strong>
    </div>
  );
}

/* ============ FLOOR PLAN ============ */
const floorZones = [
  { z: 1, suv: '05/16', sedan: '06/18', occ: 23, cap: 34 },
  { z: 2, suv: '07/16', sedan: '11/22', occ: 20, cap: 38 },
  { z: 3, suv: '12/16', sedan: '18/24', occ: 10, cap: 40 },
  { z: 4, suv: '14/18', sedan: '20/26', occ: 10, cap: 44 },
  { z: 5, suv: '06/12', sedan: '09/18', occ: 15, cap: 30 },
  { z: 6, suv: '04/15', sedan: '06/20', occ: 10, cap: 35 },
];
function FloorPlan() {
  return (
    <>
      <div className="blueprint-head">
        <div>
          <div className="eyebrow">SCADA · AI-VDS · PLC BLOCK · HMI BLOCK</div>
          <h2>Tổng hợp hệ thống phần mềm SCADA</h2>
          <p>
            Giám sát tổng mặt bằng, trạng thái đỗ xe cơ khí và điều phối giao
            thông phân khu.
          </p>
        </div>
        <div className="blueprint-meta">
          <div>
            <small>PROJECT</small>
            <b>SORA GARDENS II</b>
          </div>
          <div>
            <small>SYSTEM BY</small>
            <b>TOTAL PARKING</b>
          </div>
        </div>
      </div>
      <div className="remarks">
        <span>REMARKS:</span>
        <Badge tone="blue">PSH-7 (7 SPACES)</Badge>
        <Badge tone="purple">PSH-5 (5 SPACES)</Badge>
        <Badge tone="amber">PSH-3 (3 SPACES)</Badge>
        <span className="remarks-conn">
          Trạng thái kết nối ZCU/PGS: <Badge tone="green">ONLINE</Badge>
        </span>
      </div>
      <div className="floor-map">
        {floorZones.map((zn) => {
          const pct = Math.round((zn.occ / zn.cap) * 100);
          return (
            <div className="floor-zone" key={zn.z}>
              <div className="floor-zone-head">
                <b>ZONE {zn.z}</b>
                <span className="muted">{pct}%</span>
              </div>
              <div className="floor-cells">
                {Array.from({ length: zn.cap }, (_, i) => (
                  <i key={i} className={i < zn.occ ? 'on' : ''} />
                ))}
              </div>
              <div className="floor-zone-info">
                <span>SUV: {zn.suv}</span>
                <span>Sedan: {zn.sedan}</span>
                <span>
                  Mật độ: {zn.occ}/{zn.cap}
                </span>
              </div>
              <Bar value={pct} />
            </div>
          );
        })}
      </div>
      <div className="chart-legend">
        <span>
          <i className="green-dot" />
          Đã đỗ xe
        </span>
        <span>
          <i className="blue-dot" />
          Vị trí trống
        </span>
        <span className="muted">Sơ đồ mô phỏng · Puzzle Parking</span>
      </div>
    </>
  );
}

/* ============ ROUTING (AI-VDS) ============ */
const routeZones = [
  { z: 'Zone A – Hầm B1', free: 11, occ: 23, cap: 34, pct: 68, suv: 9, load: 'Trung bình' },
  { z: 'Zone B – Hầm B2', free: 18, occ: 20, cap: 38, pct: 53, suv: 8, load: 'Bình thường' },
  { z: 'Zone C – Hầm B3', free: 30, occ: 10, cap: 40, pct: 25, suv: 4, load: 'Rảnh rỗi' },
  { z: 'Zone D – Tầng 1', free: 34, occ: 10, cap: 44, pct: 23, suv: 4, load: 'Rảnh rỗi' },
];
const classified = [
  {
    type: 'SUV',
    tone: 'amber',
    plate: '51G-12345',
    dim: 'Cao: 1.65m · Dài: 4.85m',
    block: 'Block A-02',
    card: 'SUV-Card (Yellow)',
    time: '08:41:55',
    state: 'Đã phân loại',
  },
  {
    type: 'Sedan',
    tone: 'green',
    plate: '30H-88877',
    dim: 'Cao: 1.45m · Dài: 4.20m',
    block: 'Block B-01',
    card: 'Sedan-Card (Green)',
    time: '08:42:10',
    state: 'Đang dẫn đường',
  },
  {
    type: 'OVERSIZED',
    tone: 'red',
    plate: '43A-56789',
    dim: 'Cao: 1.85m (> 1.80m) · Dài: 5.20m',
    block: 'Vượt giới hạn vật lý bãi đỗ',
    card: 'Từ chối cấp thẻ',
    time: '08:42:30',
    state: 'Từ chối / Rejected',
  },
];
const peripherals = [
  { k: 'Gửi AI-VDS', v: 'Mất kết nối', t: 'red', at: '08:15:44' },
  { k: 'LED Ngoài trời', v: 'Hoạt động', t: 'green', at: '08:42:25' },
  { k: 'LED Trong hầm', v: 'Hoạt động', t: 'green', at: '08:42:27' },
  { k: 'Hệ thống PGS', v: 'Hoạt động', t: 'green', at: '08:42:28' },
  { k: 'Máy phát thẻ', v: 'Giữ thẻ (Hold)', t: 'amber', at: '08:42:30' },
  { k: 'Bộ điều khiển ZCU', v: 'Hoạt động', t: 'green', at: '08:42:15' },
];
function Routing() {
  return (
    <>
      <div className="notice amber routing-fallback">
        <b>AI-VDS đang hoạt động ở chế độ Fallback (Dự phòng)</b>
        <span>
          Mất tín hiệu heartbeat từ cổng đo quét chính. Dữ liệu kích thước đang
          được quét thủ công hoặc dùng cảm biến dự phòng ZCU tại cổng vào.
        </span>
      </div>
      <div className="two-col">
        <div className="stack">
          <Panel title="Mật độ & Cân bằng tải Zone" pad>
            {routeZones.map((r) => (
              <div className="route-zone" key={r.z}>
                <div className="route-zone-top">
                  <div>
                    <b>{r.z}</b>
                    <small>
                      {r.free} khay trống ({r.occ}/{r.cap} đỗ)
                    </small>
                  </div>
                  <strong>{r.pct}%</strong>
                </div>
                <Bar value={r.pct} />
                <div className="route-zone-foot">
                  <span>Khay chứa SUV: {r.suv} khay</span>
                  <span>Mức tải: {r.load}</span>
                </div>
              </div>
            ))}
          </Panel>
          <Panel title="Điều phối tín hiệu & Cân bằng tải" pad>
            <div className="control-line">
              <span>Logic cân bằng tải tự động</span>
              <Badge tone="green">ACTIVE</Badge>
            </div>
            <Rows>
              <Row k="Ngưỡng lệch mật độ kích hoạt" v="> 20%" />
              <Row k="Lệch tải hiện tại" v="Zone A (68%) vs Zone C (25%) = 43%" />
              <Row k="Đang hướng xe sang" v="Zone C (mật độ thấp nhất)" />
              <Row k="Màn hình 55'' trạm phân loại" v="Hiển thị chỉ đường" />
              <Row k="Loại thẻ đề xuất" v="Thẻ Sedan (Xanh lá)" />
            </Rows>
            <div className="api-block">
              <div className="api-line">
                <span className="mono">POST /api/v1/access-control/allow</span>
                <Badge tone="green">200 OK</Badge>
              </div>
              <pre>
                {`{ "plate": "30H-88877", "type": "Sedan",
  "card_id": "RFID-09884",
  "recommended_zone": "Zone B", "status": "Allowed" }`}
              </pre>
            </div>
          </Panel>
        </div>
        <div className="stack">
          <Panel title="Phân loại xe đang tiếp nhận (AI-VDS Camera)" pad>
            <div className="notice amber">
              <b>Cảnh báo xe quá khổ:</b> Xe 43A-56789 vượt giới hạn bãi đỗ
              (&gt; 1.80m). Đã khóa máy phát thẻ tự động.
            </div>
            {classified.map((c) => (
              <div className={'classify-card ' + c.tone} key={c.plate}>
                <div className="classify-top">
                  <Badge tone={c.tone}>{c.type}</Badge>
                  <span className="mono">{c.plate}</span>
                  <span className="muted">{c.time}</span>
                </div>
                <div className="classify-dim">{c.dim}</div>
                <div className="classify-foot">
                  <span>
                    Đề xuất: <b>{c.block}</b> · {c.card}
                  </span>
                  <Tag text={c.state} />
                </div>
              </div>
            ))}
          </Panel>
          <Panel title="Trạng thái truyền thông & Thiết bị ngoại vi" pad>
            <div className="periph-grid">
              {peripherals.map((p) => (
                <div className="periph" key={p.k}>
                  <span>{p.k}</span>
                  <Badge tone={p.t}>{p.v}</Badge>
                  <small>Cập nhật: {p.at}</small>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ============ MAINTENANCE ============ */
const blockFreq = [
  { id: 'B01', z: 'Zone A', cyc: '3,820', rt: '1240h', pct: 38 },
  { id: 'B02', z: 'Zone A', cyc: '2,910', rt: '980h', pct: 29 },
  { id: 'B03', z: 'Zone A', cyc: '4,110', rt: '1540h', pct: 41 },
  { id: 'B04', z: 'Zone A', cyc: '5,640', rt: '2100h', pct: 56 },
  { id: 'B05', z: 'Zone B', cyc: '2,100', rt: '760h', pct: 21 },
  { id: 'B06', z: 'Zone B', cyc: '2,450', rt: '890h', pct: 25 },
  { id: 'B07', z: 'Zone B', cyc: '8,900', rt: '3200h', pct: 89 },
  { id: 'B08', z: 'Zone B', cyc: '1,780', rt: '540h', pct: 18 },
  { id: 'B09', z: 'Zone C', cyc: '1,200', rt: '420h', pct: 12 },
  { id: 'B10', z: 'Zone C', cyc: '1,050', rt: '380h', pct: 11 },
  { id: 'B11', z: 'Zone C', cyc: '0', rt: '0h', pct: 0 },
  { id: 'B12', z: 'Zone C', cyc: '880', rt: '290h', pct: 9 },
];
const workOrders = [
  ['A', 'Block A-04', 'Motor Nâng Hạ', '5,640', '6,000', '2100/2400', '2026-06-15', 'Khẩn cấp', 'red'],
  ['B', 'Block B-01', 'Motor Trượt Ngang', '2,100', '2,500', '760/1000', '2026-06-22', 'Cao', 'amber'],
  ['A', 'Block A-03', 'Xích nâng', '4,110', '5,000', '1540/2000', '2026-06-30', 'Cao', 'amber'],
  ['B', 'Block B-03', 'Dầu hộp số', '8,900', '10,000', '3200/4000', '2026-07-10', 'Trung bình', 'blue'],
  ['A', 'Block A-02', 'Cảm biến kích thước', '2,910', '5,000', '980/2000', '2026-07-20', 'Thấp', 'green'],
];
function Maintenance() {
  const [tab, setTab] = useState('overview');
  return (
    <>
      <div className="occ-tabs">
        <button
          className={tab === 'overview' ? 'active' : ''}
          onClick={() => setTab('overview')}
        >
          Tổng quan & lịch bảo trì
        </button>
        <button
          className={tab === 'remote' ? 'active' : ''}
          onClick={() => setTab('remote')}
        >
          Chẩn đoán lỗi từ xa (Remote Diagnostics)
        </button>
      </div>
      {tab === 'remote' ? (
        <>
          <div className="metrics metrics-4">
            <Kpi label="Độ sẵn sàng (Availability)" value="99.85%" sub="Chuẩn OEE công nghiệp" tone="green" icon={Gauge} />
            <Kpi label="Chỉ số MTBF" value="364 giờ" sub="Trung bình giữa 2 sự cố" tone="blue" icon={Timer} />
            <Kpi label="Chỉ số MTTR" value="18.5 phút" sub="Thời gian phục hồi trung bình" tone="purple" icon={RefreshCw} />
            <Kpi label="Sự cố hoạt động" value="1" sub="Chờ xử lý khẩn cấp" tone="red" icon={Activity} />
          </div>
          <Panel title="Nhật ký sự cố thiết bị & Nguyên nhân gốc (Fault History Log)" pad>
            <div className="table-scroll">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Thiết bị</th>
                    <th>Mã lỗi</th>
                    <th>Nguyên nhân gốc</th>
                    <th>Hành động khắc phục</th>
                    <th>Người ACK/Reset</th>
                  </tr>
                </thead>
                <tbody>
                  {faultLog.map((r, i) => (
                    <tr key={i}>
                      <td className="mono">{r[0]}</td>
                      <td>{r[1]}</td>
                      <td className="mono">{r[2]}</td>
                      <td>{r[3]}</td>
                      <td>{r[4]}</td>
                      <td>{r[5]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : (
        <>
      <div className="metrics metrics-4">
        <Kpi label="Khẩn cấp" value="1" sub="thiết bị" tone="red" icon={Wrench} />
        <Kpi label="Ưu tiên cao" value="2" sub="thiết bị" tone="amber" icon={Activity} />
        <Kpi label="Tổng work order" value="5" sub="trong 30 ngày" tone="blue" icon={FileText} />
        <Kpi label="Block đang bảo trì" value="1" sub="block" tone="purple" icon={SettingsIcon} />
      </div>
      <Panel title="Tần suất hoạt động theo Block" pad>
        <div className="freq-grid">
          {blockFreq.map((b) => (
            <div className="freq" key={b.id}>
              <div className="freq-head">
                <b>{b.id}</b>
                <small>{b.z}</small>
              </div>
              <div className="freq-meta">
                <span>Chu kỳ: {b.cyc}</span>
                <span>Runtime: {b.rt}</span>
              </div>
              <Bar value={b.pct} />
              <span className="freq-pct">{b.pct}%</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        title="Danh sách Work Order đề xuất"
        aside={<span className="muted">Sắp xếp theo mức ưu tiên</span>}
        pad
      >
        <div className="table-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Block</th>
                <th>Thiết bị</th>
                <th>Chu kỳ</th>
                <th>Giới hạn</th>
                <th>Runtime</th>
                <th>Ngày dự kiến</th>
                <th>Ưu tiên</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((w) => (
                <tr key={w[1] as string}>
                  <td>{w[0]}</td>
                  <td>{w[1]}</td>
                  <td>{w[2]}</td>
                  <td className="mono">{w[3]}</td>
                  <td className="mono">{w[4]}</td>
                  <td className="mono">{w[5]}</td>
                  <td>{w[6]}</td>
                  <td>
                    <Badge tone={w[8] as string}>{w[7]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
        </>
      )}
    </>
  );
}

/* ============ ASSET TREE ============ */
function Assets() {
  return (
    <div className="two-col">
      <Panel title="Cấu trúc phân cấp thiết bị" pad>
        <div className="tree">
          <div className="tree-node root">🏢 TotalParking SCADA</div>
          <div className="tree-node l1">▸ Zone A (Hầm B1)</div>
          <div className="tree-node l2">▸ Block A-01</div>
          <div className="tree-node l2 open">▾ Block B-04</div>
          <div className="tree-node l3 fault">
            ⚙ Motor Nâng Hạ <Badge tone="red">LỖI</Badge>
          </div>
          <div className="tree-node l3">
            🔌 Biến tần VFD Nâng <Badge tone="amber">STOP</Badge>
          </div>
          <div className="tree-node l3">
            📡 Cảm biến hành trình LS-T3 <Badge tone="green">OK</Badge>
          </div>
          <div className="tree-node l1">▸ Zone B (Hầm B2)</div>
          <div className="tree-node l1">▸ Zone C (Hầm B3)</div>
        </div>
      </Panel>
      <Panel
        title="Động cơ Nâng hạ (Block B-04)"
        aside={<Badge tone="red">Trạng thái: Lỗi</Badge>}
        pad
      >
        <div className="asset-metrics">
          <div>
            <small>RUNTIME TÍCH LŨY</small>
            <b>1,240 giờ</b>
          </div>
          <div>
            <small>SỐ CHU KỲ ĐỖ XE</small>
            <b>45,120 lần</b>
          </div>
          <div className="warn">
            <small>NHIỆT ĐỘ CUỘN DÂY</small>
            <b>115°C</b>
          </div>
        </div>
        <h4 className="sub-head">Thông số kỹ thuật</h4>
        <Rows>
          <Row k="Hãng sản xuất" v="Mitsubishi Electric" />
          <Row k="Model động cơ" v="SF-JR 7.5kW 4P" />
          <Row k="Số serial" v="S/N: 2026-MTR-881A" />
          <Row k="Ngày lắp đặt" v="12/03/2026" />
        </Rows>
        <h4 className="sub-head">Lịch trình bảo dưỡng</h4>
        <Rows>
          <Row k="Bảo trì gần nhất" v="15/06/2026" />
          <Row k="Dự kiến bảo trì tiếp theo" v="15/07/2026" />
          <Row k="Vật tư thay thế đi kèm" v="Cuộn hút phanh, bôi trơn xích nâng" />
        </Rows>
      </Panel>
    </div>
  );
}

/* ============ REMOTE DIAGNOSTICS ============ */
const faultLog = [
  ['08:42:15', 'Motor-Lift-01 · A-04', 'E-0401', 'Quá tải nhiệt cuộn dây (115°C)', 'Chờ can thiệp', '—'],
  ['07:55:10', 'Sensor-LS-03 · A-04', 'E-0405', 'Công tắc giới hạn hành trình dưới không phản hồi', 'Reset cảm biến', 'operator02'],
  ['08:15:44', 'AI-VDS · B-03', 'W-0701', 'Camera cổng vào mất kết nối - chuyển Fallback', 'Chuyển cảm biến ZCU', 'operator01'],
  ['07:30:00', 'Motor-Slide-02 · B-01', 'M-0501', 'Số chu kỳ nâng trượt đạt 85% ngưỡng mài mòn', 'Lên lịch bảo trì', 'maintenance01'],
];
function Diagnostics() {
  return (
    <>
      <div className="metrics metrics-4">
        <Kpi label="Độ sẵn sàng (Availability)" value="99.85%" sub="Chuẩn OEE công nghiệp" tone="green" icon={Gauge} />
        <Kpi label="Chỉ số MTBF" value="364 giờ" sub="Trung bình giữa 2 sự cố" tone="blue" icon={Timer} />
        <Kpi label="Chỉ số MTTR" value="18.5 phút" sub="Thời gian phục hồi trung bình" tone="purple" icon={RefreshCw} />
        <Kpi label="Sự cố hoạt động" value="1 sự cố" sub="Chờ xử lý khẩn cấp" tone="red" icon={Activity} />
      </div>
      <Panel title="Nhật ký sự cố thiết bị & Nguyên nhân gốc (Fault History Log)" pad>
        <div className="table-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Thiết bị</th>
                <th>Mã lỗi</th>
                <th>Nguyên nhân gốc (Root Cause)</th>
                <th>Hành động khắc phục</th>
                <th>Người ACK/Reset</th>
              </tr>
            </thead>
            <tbody>
              {faultLog.map((r, i) => (
                <tr key={i}>
                  <td className="mono">{r[0]}</td>
                  <td>{r[1]}</td>
                  <td className="mono">{r[2]}</td>
                  <td>{r[3]}</td>
                  <td>{r[4]}</td>
                  <td>{r[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* ============ REPORTS ============ */
const weekDensity = [
  ['Thứ Hai (T2)', 64],
  ['Thứ Ba (T3)', 78],
  ['Thứ Tư (T4)', 70],
  ['Thứ Năm (T5)', 85],
  ['Thứ Sáu (T6)', 92],
  ['Thứ Bảy (T7)', 55],
  ['Chủ Nhật (CN)', 40],
] as const;
const reportCats = [
  'Mật độ & Lưu lượng',
  'Phân tích lỗi & Pareto',
  'Lịch sử bảo trì',
  'Lịch sử thẻ xe',
  'Báo cáo doanh thu từ xa',
  'Tần suất hoạt động Pallet',
];
const paretoFaults: [string, number][] = [
  ['Quá tải nhiệt motor nâng', 42],
  ['Cảm biến hành trình lỗi', 27],
  ['Mất kết nối AI-VDS', 15],
  ['Kẹt cơ cấu trượt', 9],
  ['Khác', 7],
];
const revenueBars: [string, number][] = [
  ['Zone A – Hầm B1', 82],
  ['Zone B – Hầm B2', 64],
  ['Zone C – Hầm B3', 38],
  ['Zone D – Tầng 1', 29],
];
const maintHistory = [
  ['15/06/2026', 'Block A-04', 'Motor Nâng Hạ', 'Thay cuộn hút phanh'],
  ['10/06/2026', 'Block B-03', 'Hộp số', 'Thay dầu bôi trơn'],
  ['02/06/2026', 'Block A-02', 'Cảm biến', 'Hiệu chuẩn AI-VDS'],
  ['28/05/2026', 'Block B-01', 'Xích nâng', 'Căng lại xích, tra mỡ'],
];
function ReportBody({ cat }: { cat: number }) {
  if (cat === 1)
    return (
      <Panel title="Phân tích Pareto lỗi thiết bị (%)" pad>
        {paretoFaults.map(([d, v]) => (
          <div className="week-row" key={d}>
            <span>{d}</span>
            <Bar value={v} tone="#ff8996" />
            <b>{v}%</b>
          </div>
        ))}
      </Panel>
    );
  if (cat === 2)
    return (
      <Panel title="Lịch sử bảo trì đã thực hiện" pad>
        <div className="table-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Block</th>
                <th>Thiết bị</th>
                <th>Nội dung</th>
              </tr>
            </thead>
            <tbody>
              {maintHistory.map((r, i) => (
                <tr key={i}>
                  <td className="mono">{r[0]}</td>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                  <td>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    );
  if (cat === 3)
    return (
      <Panel title="Lịch sử quẹt thẻ xe (RFID)" pad>
        <div className="table-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Mã thẻ</th>
                <th>Biển số</th>
                <th>Lần dùng cuối</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c[0] as string}>
                  <td className="mono">{c[0]}</td>
                  <td className="mono">{c[1]}</td>
                  <td>{c[8]}</td>
                  <td>
                    <Badge tone={c[7] ? 'green' : 'amber'}>
                      {c[6] as string}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    );
  if (cat === 4)
    return (
      <Panel title="Doanh thu bãi đỗ theo Zone (triệu đồng)" pad>
        {revenueBars.map(([d, v]) => (
          <div className="week-row" key={d}>
            <span>{d}</span>
            <Bar value={v} tone="#31cba4" />
            <b>{v} tr</b>
          </div>
        ))}
      </Panel>
    );
  if (cat === 5)
    return (
      <Panel title="Tần suất hoạt động Pallet (chu kỳ/tháng)" pad>
        {blockFreq.slice(0, 8).map((b) => (
          <div className="week-row" key={b.id}>
            <span>
              {b.id} · {b.z}
            </span>
            <Bar value={b.pct} />
            <b>{b.cyc}</b>
          </div>
        ))}
      </Panel>
    );
  return (
    <div className="two-col">
      <Panel title="Mật độ đỗ xe theo ngày trong tuần (%)" pad>
        {weekDensity.map(([d, v]) => (
          <div className="week-row" key={d}>
            <span>{d}</span>
            <Bar value={v} />
            <b>{v}%</b>
          </div>
        ))}
      </Panel>
      <Panel title="Phân loại phương tiện đỗ thực tế" pad>
        <div className="vtype-row">
          <span>Xe SUV (Gầm cao)</span>
          <b className="amber-t">47% (37 xe)</b>
        </div>
        <Bar value={47} tone="#f1bc5b" />
        <div className="vtype-row">
          <span>Xe Sedan / Hatchback</span>
          <b className="blue-t">49% (54 xe)</b>
        </div>
        <Bar value={49} tone="#4095ff" />
        <div className="vtype-row">
          <span>Xe quá khổ (Từ chối)</span>
          <b className="red-t">4% (3 xe)</b>
        </div>
        <Bar value={4} tone="#ff8996" />
      </Panel>
    </div>
  );
}
function Reports() {
  const [cat, setCat] = useState(0);
  return (
    <div className="two-col reports-col">
      <Panel title="Danh mục báo cáo" pad>
        <div className="report-cats">
          {reportCats.map((c, i) => (
            <button
              key={c}
              className={i === cat ? 'active' : ''}
              onClick={() => setCat(i)}
            >
              {c}
            </button>
          ))}
        </div>
      </Panel>
      <div className="stack">
        <ReportBody cat={cat} />
      </div>
    </div>
  );
}

/* ============ RFID CARDS ============ */
const cards = [
  ['TH-00123', '51G-12345', 'Nguyễn Văn An', 'SUV', 'Zone 1', 'Block A-01', 'Hoạt động', true, '08:30:00'],
  ['TH-00456', '30H-88877', 'Trần Thị Bình', 'Sedan', 'Zone 2', 'Block B-02', 'Hoạt động', true, '07:45:20'],
  ['TH-00789', '43A-56789', 'Lê Quốc Cường', 'SUV', 'Zone 1', 'Block A-02', 'Hoạt động', true, '06:55:10'],
  ['TH-01011', '92B-11223', 'Phạm Minh Dũng', 'Sedan', 'Zone 4', 'Block C-02', 'Đã khóa', false, '2026-05-30'],
  ['TH-01213', '79C-44556', 'Hoàng Thị Lan', 'SUV', 'Zone 2', 'Block B-01', 'Hoạt động', true, '2026-06-07'],
];
function Cards() {
  return (
    <>
      <div className="metrics metrics-3">
        <Kpi label="Tổng số thẻ đang quản lý" value="5" tone="blue" icon={CreditCard} />
        <Kpi label="Thẻ đang hoạt động" value="4" tone="green" icon={CreditCard} />
        <Kpi label="Thẻ bị khóa / hết hạn" value="1" tone="red" icon={Lock} />
      </div>
      <Panel title="Danh sách thẻ từ bãi đỗ (RFID Card Management)" pad>
        <div className="table-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Mã thẻ</th>
                <th>Biển số</th>
                <th>Chủ xe</th>
                <th>Loại xe</th>
                <th>Zone</th>
                <th>Block</th>
                <th>Trạng thái</th>
                <th>Đồng bộ HMI</th>
                <th>Dùng cuối</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c[0] as string}>
                  <td className="mono">{c[0]}</td>
                  <td className="mono">{c[1]}</td>
                  <td>{c[2]}</td>
                  <td>{c[3]}</td>
                  <td>{c[4]}</td>
                  <td>{c[5]}</td>
                  <td>
                    <Tag text={c[6] === 'Hoạt động' ? 'Bình thường' : 'Bảo trì'} />
                  </td>
                  <td>
                    <Badge tone={c[7] ? 'green' : 'amber'}>
                      {c[7] ? 'Đã đồng bộ' : 'Chưa đồng bộ'}
                    </Badge>
                  </td>
                  <td>{c[8]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* ============ CCTV ============ */
const cams = [
  { id: 'CAM-IN', name: 'Cổng Vào 1', sub: 'Cổng đo quét AI-VDS' },
  { id: 'CAM-ZONE-A', name: 'Hầm B1', sub: 'Khu vực Block B-01 → B-04' },
  { id: 'CAM-OUT', name: 'Cổng Ra 1', sub: 'Trả xe / nhận dạng người nhận' },
  { id: 'CAM-ZONE-B', name: 'Hầm B2', sub: 'Khu vực Block B-05 → B-08' },
];
function Cctv() {
  return (
    <div className="cctv-grid">
      {cams.map((c) => (
        <div className="cctv" key={c.id}>
          <div className="cctv-bar">
            <span className="mono">
              {c.id}: {c.name}
            </span>
            <Badge tone="red">LIVE</Badge>
          </div>
          <div className="cctv-screen">
            <Video size={34} />
            <span>{c.sub}</span>
            <span className="cctv-noise" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ ENERGY ============ */
const energyBlocks = [
  ['Block A-01 (Zone A – Hầm B1)', 420, 29.5],
  ['Block B-01 (Zone B – Hầm B2)', 380, 26.7],
  ['Block B-03 (Zone B – Hầm B2)', 310, 21.8],
  ['Block A-04 (Zone A – Hầm B1)', 190, 13.4],
  ['Block C-02 (Zone C – Hầm B3)', 120, 8.5],
] as const;
function Energy() {
  return (
    <>
      <div className="metrics metrics-4">
        <Kpi label="Điện năng tiêu thụ tháng" value="1,420 kWh" sub="↓ 4.2% so với tháng trước" tone="blue" icon={Zap} />
        <Kpi label="Công suất đỉnh (Peak Load)" value="32.4 kW" sub="Ghi nhận lúc 17:35 hôm qua" tone="amber" icon={Activity} />
        <Kpi label="Hệ số công suất" value="0.94" sub="Đạt chuẩn bù công suất phản kháng" tone="green" icon={Gauge} />
        <Kpi label="Chi phí điện ước tính" value="4.260.000 đ" sub="Tạm tính theo biểu giá kinh doanh" tone="purple" icon={FileText} />
      </div>
      <Panel title="Phân bổ điện năng theo Block" pad>
        {energyBlocks.map(([n, kwh, pct]) => (
          <div className="week-row" key={n}>
            <span>{n}</span>
            <Bar value={pct as number} tone="#b198fa" />
            <b>
              {kwh} kWh ({pct}%)
            </b>
          </div>
        ))}
      </Panel>
    </>
  );
}

/* ============ SETTINGS ============ */
function Field({
  label,
  value,
  type = 'text',
}: {
  label: string;
  value: string;
  type?: string;
}) {
  return (
    <label className="set-field">
      <span>{label}</span>
      <input defaultValue={value} type={type} />
    </label>
  );
}
function Toggle({ label, on = false }: { label: string; on?: boolean }) {
  const [v, setV] = useState(on);
  return (
    <button
      type="button"
      className="set-toggle"
      aria-pressed={v}
      onClick={() => setV(!v)}
    >
      <span>{label}</span>
      <span className={'sw ' + (v ? 'on' : '')} />
    </button>
  );
}
function Settings() {
  const [saved, setSaved] = useState('');
  return (
    <>
      {saved && (
        <div className="notice green" role="status">
          {saved}
        </div>
      )}
      <div className="settings-grid">
        <Panel title="Kết nối truyền thông PLC/HMI" pad>
          <Field label="IP SCADA Server (LUMI SCADA)" value="192.168.1.100" />
          <Field label="Port Modbus TCP" value="502" />
          <Field label="Chu kỳ polling (ms)" value="500" />
          <Field label="Timeout kết nối (ms)" value="3000" />
        </Panel>
        <Panel title="Cơ sở dữ liệu SCADA" pad>
          <Field label="DB Host Address" value="192.168.1.200" />
          <Field label="DB Name" value="lumi_scada_tp" />
          <Field label="Lưu trữ cảnh báo & sự kiện (ngày)" value="730" />
          <Field label="Tần suất tự động backup (giờ)" value="12" />
        </Panel>
        <Panel title="Cảnh báo & SMS" pad>
          <Field label="Email nhận cảnh báo Critical" value="admin@totalparking.vn" />
          <Field label="SMS nhận cảnh báo quá nhiệt motor" value="+84981234567" />
          <Field label="Ngưỡng báo động rung lắc (mm/s²)" value="15" />
        </Panel>
        <Panel title="Tích hợp API & Webhook (Third-Party)" pad>
          <Field label="Webhook URL gửi cảnh báo lỗi" value="https://api.totalparking.vn/v1/webhook/alarms" />
          <Field label="Webhook Secret Authorization" value="••••••••••••••••" type="password" />
          <Toggle label="Chỉ gửi cảnh báo nghiêm trọng" on />
        </Panel>
        <Panel title="Tùy chọn giao diện vận hành" pad>
          <Toggle label="Giao diện tối (Dark Mode)" on />
          <Toggle label="Tự động Ack alarm mức độ Thấp" />
          <Toggle label="Bật thông báo còi / âm thanh" on />
          <Toggle label="Hiển thị timestamp thời gian thực" on />
        </Panel>
        <Panel title="Chẩn đoán Server & Tài nguyên" pad>
          <Rows>
            <Row k="SCADA Software Version" v="v2.4.1" />
            <Row k="Thời gian hoạt động (Uptime)" v="127 ngày 14 giờ 22 phút" />
            <Row k="Tải CPU hiện tại" v="23%" />
            <Row k="Sử dụng RAM vật lý" v="1.8 GB / 8.0 GB" />
            <Row k="Kích thước cơ sở dữ liệu" v="12.4 GB" />
          </Rows>
        </Panel>
      </div>
      <div className="settings-actions">
        <button
          className="secondary"
          onClick={() => setSaved('Đã khôi phục cài đặt mặc định (mô phỏng).')}
        >
          <RefreshCw size={15} /> Khôi phục mặc định
        </button>
        <button
          className="primary"
          onClick={() => setSaved('Đã lưu cài đặt hệ thống (mô phỏng).')}
        >
          <Save size={15} /> Lưu cài đặt
        </button>
      </div>
    </>
  );
}

/* ============ USERS & PERMISSIONS ============ */
const roles = [
  { r: 'Administrator', t: 'red', p: ['Toàn quyền hệ thống', 'Forced Mode (Admin)', 'Quản lý người dùng', 'Cấu hình cổng API'] },
  { r: 'Supervisor', t: 'blue', p: ['Reset / Ack Alarm', 'Xem tất cả phân khu', 'Tạo & Xuất báo cáo', 'Xác nhận điều khiển nguy hiểm'] },
  { r: 'Maintenance', t: 'amber', p: ['Maintenance Mode', 'Kiểm tra cảm biến / VFD', 'Xem chi tiết Block', 'Xử lý Work Order'] },
  { r: 'Operator', t: 'green', p: ['Dashboard giám sát', 'Đọc thông tin cảnh báo', 'Điều hướng giao thông', 'Quản lý quẹt thẻ'] },
  { r: 'Remote Support', t: 'purple', p: ['Chỉ đọc (Read-Only)', 'Không được điều khiển', 'Đọc logs chẩn đoán', 'Giới hạn phiên 1 giờ'] },
];
const online = [
  ['Supervisor', 'supervisor01', '07:00:00', '192.168.1.10'],
  ['Operator', 'operator01', '07:30:00', '192.168.1.11'],
  ['Maintenance', 'maintenance01', '08:00:00', '192.168.1.15'],
  ['Remote Support', 'remote_eng01', '07:55:00', '203.162.x.x'],
];
const audit = [
  ['08:40:22', 'supervisor01', 'Supervisor', 'Block A-04', 'Reset Alarm E-0401', true, 'Đã xử lý quá nhiệt motor, reset biến tần VFD.'],
  ['08:35:10', 'maintenance01', 'Maintenance', 'Block B-03', 'Chuyển Maintenance Mode', true, 'Bảo trì định kỳ vòng xích truyền động.'],
  ['08:28:05', 'operator01', 'Operator', 'Block A-03', 'Ack Alarm W-0302', true, 'Đã đóng kín cửa tủ điện điều khiển.'],
  ['07:30:00', 'admin01', 'Admin', 'Block A-04', 'Kích hoạt Forced Mode', false, 'Mật khẩu xác thực cấp 2 sai - Hủy yêu cầu.'],
];
function UsersView() {
  return (
    <>
      <Panel title="Ma trận phân quyền hệ thống (User Permission Matrix)" pad>
        <div className="role-grid">
          {roles.map((r) => (
            <div className="role-card" key={r.r}>
              <Badge tone={r.t}>{r.r}</Badge>
              <ul>
                {r.p.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
      <div className="two-col">
        <Panel title="Tài khoản đang kết nối trực tuyến" pad>
          <div className="online-grid">
            {online.map((o) => (
              <div className="online" key={o[1]}>
                <div>
                  <b>{o[1]}</b>
                  <small>{o[0]}</small>
                </div>
                <div className="online-meta">
                  <span>Đăng nhập: {o[2]}</span>
                  <span>IP: {o[3]}</span>
                </div>
                <Badge tone="green">Online</Badge>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Nhật ký Audit Log vận hành" pad>
          <div className="table-scroll">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Người dùng</th>
                  <th>Lệnh gửi</th>
                  <th>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a, i) => (
                  <tr key={i}>
                    <td className="mono">{a[0]}</td>
                    <td>{a[1]}</td>
                    <td>{a[4]}</td>
                    <td>
                      <Badge tone={a[5] ? 'green' : 'red'}>
                        {a[5] ? 'Thành công' : 'Bị từ chối'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ============ BACKUP & HEALTH ============ */
function Backup() {
  return (
    <>
      <div className="metrics metrics-4">
        <Kpi label="Tải CPU Server" value="12.5%" sub="Nhiệt độ CPU: 42°C" tone="green" icon={Cpu} />
        <Kpi label="Bộ nhớ RAM tiêu thụ" value="4.2 / 16 GB" sub="Ổ cứng trống: 180 GB" tone="blue" icon={HardDrive} />
        <Kpi label="Trạng thái pin UPS" value="100%" sub="Thời gian dự phòng: 45 phút" tone="amber" icon={Zap} />
        <Kpi label="Sao lưu gần nhất" value="02:00 Hôm nay" sub="Trạng thái: Thành công" tone="purple" icon={Server} />
      </div>
      <div className="two-col">
        <Panel title="Cấu hình kết nối hệ thống" pad>
          <div className="control-line">
            <span>Database Server connection</span>
            <Badge tone="green">Connected</Badge>
          </div>
          <div className="control-line">
            <span>Modbus TCP Heartbeat</span>
            <Badge tone="green">Online</Badge>
          </div>
          <div className="control-line">
            <span>Replication Slave</span>
            <Badge tone="green">Synchronized</Badge>
          </div>
        </Panel>
        <Panel title="Nhật ký sao lưu Database gần đây" pad>
          <div className="table-scroll">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Loại backup</th>
                  <th>Dung lượng</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['05/07/2026 02:00:05', 'Tự động (Daily)', '142 MB'],
                  ['04/07/2026 02:00:03', 'Tự động (Daily)', '141 MB'],
                  ['03/07/2026 02:00:04', 'Tự động (Daily)', '140 MB'],
                ].map((b, i) => (
                  <tr key={i}>
                    <td className="mono">{b[0]}</td>
                    <td>{b[1]}</td>
                    <td className="mono">{b[2]}</td>
                    <td>
                      <Badge tone="green">Thành công</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ---------- router + action buttons ---------- */
export const screenAction: Record<
  string,
  { label: string; icon: React.ComponentType<{ size?: number }> } | undefined
> = {
  maintenance: { label: 'Xuất Work Order', icon: Download },
  cards: { label: 'Cài đặt thẻ mới', icon: CreditCard },
  diagnostics: { label: 'Làm mới dữ liệu', icon: RefreshCw },
  backup: { label: 'Backup ngay', icon: Server },
  cctv: { label: 'Xem tất cả (Grid)', icon: Camera },
  routing: { label: 'AI-VDS Fallback', icon: Route },
  users: { label: 'Audit Log', icon: Users },
};
export function ExtraViews({ page }: { page: string; sim: Sim }) {
  switch (page) {
    case 'floorplan':
      return <FloorPlan />;
    case 'routing':
      return <Routing />;
    case 'maintenance':
      return <Maintenance />;
    case 'assets':
      return <Assets />;
    case 'diagnostics':
      return <Diagnostics />;
    case 'reports':
      return <Reports />;
    case 'cards':
      return <Cards />;
    case 'cctv':
      return <Cctv />;
    case 'energy':
      return <Energy />;
    case 'settings':
      return <Settings />;
    case 'users':
      return <UsersView />;
    case 'backup':
      return <Backup />;
    default:
      return null;
  }
}
export const extraPages = [
  'floorplan',
  'routing',
  'maintenance',
  'assets',
  'diagnostics',
  'reports',
  'cards',
  'cctv',
  'energy',
  'settings',
  'users',
  'backup',
];
