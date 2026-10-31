'use client';
import {
  Panel,
  Badge,
  Tag,
  Bar,
  Rows,
  Row,
} from '@/features/scada/components/shared';

const routeZones = [
  {
    z: 'Zone A – Hầm B1',
    free: 11,
    occ: 23,
    cap: 34,
    pct: 68,
    suv: 9,
    load: 'Trung bình',
  },
  {
    z: 'Zone B – Hầm B2',
    free: 18,
    occ: 20,
    cap: 38,
    pct: 53,
    suv: 8,
    load: 'Bình thường',
  },
  {
    z: 'Zone C – Hầm B3',
    free: 30,
    occ: 10,
    cap: 40,
    pct: 25,
    suv: 4,
    load: 'Rảnh rỗi',
  },
  {
    z: 'Zone D – Tầng 1',
    free: 34,
    occ: 10,
    cap: 44,
    pct: 23,
    suv: 4,
    load: 'Rảnh rỗi',
  },
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
export default function Routing() {
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
              <Row
                k="Lệch tải hiện tại"
                v="Zone A (68%) vs Zone C (25%) = 43%"
              />
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
          <Panel title="Màn hình 55'' & Bảng LED chỉ dẫn" pad>
            <div className="led-board">
              <div className="led-line">
                <span>LED Matrix ngoài trời</span>
                <b className="led-text">SUV 38 · SEDAN 55 · THƯỜNG 24</b>
              </div>
              <div className="led-line">
                <span>LED chỉ dẫn hầm</span>
                <b className="led-text">
                  ZONE B ← 18 &nbsp; | &nbsp; ZONE C ↑ 30
                </b>
              </div>
            </div>
            <Rows>
              <Row
                k="Màn hình 55'' trạm phân loại"
                v="Hoạt động · Hiển thị chỉ đường"
              />
              <Row k="Loại thẻ đề xuất" v="Thẻ Sedan (Xanh lá)" />
              <Row k="Vị trí khuyên dùng" v="Zone B · Block B-01" />
            </Rows>
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
