'use client';
import { useState } from 'react';
import {
  Panel,
  Badge,
  Tag,
  Bar,
  Rows,
  Row,
  type ScreenProps,
} from '@/features/scada/components/shared';
import { countOf, zoneLabel } from '@/features/scada/model/simulation';
import {
  DRIVER_EVENT,
  DRIVER_STORAGE_KEY,
  type DriverInstruction,
} from '@/features/scada/screens/monitoring/DriverDisplay';

const fallbackClassified = [
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
const fallbackPeripherals = [
  { k: 'Gửi AI-VDS', v: 'Mất kết nối', t: 'red', at: '08:15:44' },
  { k: 'LED Ngoài trời', v: 'Hoạt động', t: 'green', at: '08:42:25' },
  { k: 'LED Trong hầm', v: 'Hoạt động', t: 'green', at: '08:42:27' },
  { k: 'Hệ thống PGS', v: 'Hoạt động', t: 'green', at: '08:42:28' },
  { k: 'Máy phát thẻ', v: 'Giữ thẻ (Hold)', t: 'amber', at: '08:42:30' },
  { k: 'Bộ điều khiển ZCU', v: 'Hoạt động', t: 'green', at: '08:42:15' },
];
const routeOptions = [
  {
    key: '2200',
    label: 'Dưới 2200KG',
    vehicleClass: 'Xe nhẹ · dưới 2200 kg',
    zone: 'Zone C',
    block: 'Block C-02',
    route: 'Cổng vào → Làn trung tâm → Đi thẳng → Zone C → Block C-02',
  },
  {
    key: '2600',
    label: '2200–2600KG',
    vehicleClass: 'Xe trung · 2200–2600 kg',
    zone: 'Zone B',
    block: 'Block B-01',
    route: 'Cổng vào → Làn trung tâm → Rẽ trái → Zone B → Block B-01',
  },
  {
    key: 'normal',
    label: 'Đỗ thường',
    vehicleClass: 'Đỗ thường',
    zone: 'Zone A',
    block: 'Block A-02',
    route: 'Cổng vào → Làn ngoài → Rẽ phải → Zone A → Block A-02',
  },
] as const;

export default function Routing({ sim }: ScreenProps) {
  const [route, setRoute] = useState<(typeof routeOptions)[number]>(
    routeOptions[2],
  );
  const [plate, setPlate] = useState('30H-88877');
  const camera = sim.integrations?.camera;
  const pgs = sim.integrations?.pgs;
  const led = sim.integrations?.led;
  const live = sim.source !== 'sim';
  const routeZones = [...new Set(sim.blocks.map((block) => block.zone))]
    .sort()
    .map((zone) => {
      const blocks = sim.blocks.filter((block) => block.zone === zone);
      const cap = blocks.reduce((sum, block) => sum + block.capacity, 0);
      const occ = blocks.reduce((sum, block) => sum + (countOf(block) ?? 0), 0);
      const free = Math.max(0, cap - occ);
      const pct = cap ? Math.round((occ / cap) * 100) : 0;
      return {
        id: zone,
        z: zoneLabel[zone] ?? `Zone ${zone}`,
        free,
        occ,
        cap,
        pct,
        suv: blocks.reduce(
          (sum, block) =>
            sum + block.kinds.filter((kind) => kind === 'SUV').length,
          0,
        ),
        load: pct >= 80 ? 'Cao' : pct >= 50 ? 'Trung bình' : 'Rảnh rỗi',
      };
    });
  const highestZone = routeZones.reduce(
    (best, item) => (!best || item.pct > best.pct ? item : best),
    routeZones[0],
  );
  const lowestZone = routeZones.reduce(
    (best, item) => (!best || item.pct < best.pct ? item : best),
    routeZones[0],
  );
  const balanceGap =
    highestZone && lowestZone ? highestZone.pct - lowestZone.pct : 0;
  const totalOccupied = routeZones.reduce((sum, zone) => sum + zone.occ, 0);
  const totalFree = routeZones.reduce((sum, zone) => sum + zone.free, 0);
  const totalSuv = routeZones.reduce((sum, zone) => sum + zone.suv, 0);
  const totalSedan = sim.blocks.reduce(
    (sum, block) => sum + block.kinds.filter((kind) => kind === 'Sedan').length,
    0,
  );
  const classified = camera
    ? [
        {
          type: camera.category || camera.weightClass || 'CHƯA XÁC ĐỊNH',
          tone:
            camera.outcome === 'rejected' || camera.outcome === 'no-capacity'
              ? 'red'
              : camera.outcome === 'manual-review'
                ? 'amber'
                : 'green',
          plate:
            camera.plate ||
            [camera.make, camera.model].filter(Boolean).join(' ') ||
            camera.eventId,
          dim: [
            camera.lengthMm ? `Dài ${camera.lengthMm}mm` : null,
            camera.widthMm ? `Rộng ${camera.widthMm}mm` : null,
            camera.heightMm ? `Cao ${camera.heightMm}mm` : null,
            camera.weightKg ? `Không tải ${camera.weightKg}kg` : null,
          ]
            .filter(Boolean)
            .join(' · '),
          block: camera.block
            ? `Block ${camera.block}`
            : camera.reason || 'Chờ operator xử lý',
          card: camera.weightClass || 'Chưa phân hạng tải',
          time: new Date(camera.receivedAt).toLocaleTimeString('vi-VN'),
          state:
            camera.outcome === 'routed'
              ? 'Đã phân tuyến'
              : camera.outcome === 'manual-review'
                ? 'Cần kiểm tra tay'
                : camera.outcome === 'no-capacity'
                  ? 'Hết chỗ phù hợp'
                  : 'Từ chối',
        },
      ]
    : live
      ? []
      : fallbackClassified;
  const peripherals = live
    ? [
        {
          k: 'Gateway PLC',
          v: sim.connection === 'online' ? 'Hoạt động' : 'Mất kết nối',
          t: sim.connection === 'online' ? 'green' : 'red',
          at: sim.updatedAt
            ? new Date(sim.updatedAt).toLocaleTimeString('vi-VN')
            : '—',
        },
        {
          k: 'Camera AI',
          v: camera ? 'Đã nhận sự kiện' : 'Chưa có dữ liệu',
          t: camera ? 'green' : 'amber',
          at: camera
            ? new Date(camera.receivedAt).toLocaleTimeString('vi-VN')
            : '—',
        },
        {
          k: 'Bảng LED TCP',
          v: led?.configured
            ? `${led.online}/${led.panels} online`
            : 'Chưa cấu hình',
          t: !led?.configured
            ? 'amber'
            : led.online === led.panels
              ? 'green'
              : 'red',
          at: led?.items?.find((item) => item.lastOkAt)?.lastOkAt
            ? new Date(
                led.items.find((item) => item.lastOkAt)!.lastOkAt!,
              ).toLocaleTimeString('vi-VN')
            : '—',
        },
        {
          k: 'PGS / CCU',
          v: pgs?.configured
            ? `${pgs.connected}/${pgs.zcuTotal} ZCU`
            : 'Chưa cấu hình',
          t: !pgs?.configured
            ? 'amber'
            : pgs.listening && pgs.connected > 0
              ? 'green'
              : 'red',
          at: pgs?.lastAt
            ? new Date(pgs.lastAt).toLocaleTimeString('vi-VN')
            : '—',
        },
      ]
    : fallbackPeripherals;
  const chooseRoute = (option: (typeof routeOptions)[number]) => {
    setRoute(option);
    const instruction: DriverInstruction = {
      plate: plate.trim().toUpperCase() || 'CHƯA NHẬN DIỆN',
      vehicleClass: option.vehicleClass,
      block: option.block,
      zone: option.zone,
      route: option.route,
      updatedAt: new Date().toLocaleString('vi-VN'),
    };
    localStorage.setItem(DRIVER_STORAGE_KEY, JSON.stringify(instruction));
    window.dispatchEvent(new Event(DRIVER_EVENT));
  };
  return (
    <>
      <div
        className={`notice ${camera || !live ? 'amber' : 'red'} routing-fallback`}
      >
        <b>
          {live
            ? camera
              ? `Camera AI đã nhận event ${camera.eventId}`
              : 'Chưa nhận sự kiện Camera AI'
            : 'AI-VDS đang hoạt động ở chế độ Fallback (Dự phòng)'}
        </b>
        <span>
          {live
            ? camera
              ? 'Số đo được phân loại theo mm/kg; biển số chỉ hiển thị khi nguồn camera có cung cấp.'
              : 'Gateway đang chờ POST /api/camera/ingest với event_id và số đo xe.'
            : 'Mất tín hiệu heartbeat từ cổng đo quét chính. Dữ liệu kích thước đang được quét thủ công hoặc dùng cảm biến dự phòng ZCU tại cổng vào.'}
        </span>
      </div>
      <div className="two-col">
        <div className="stack">
          <Panel title="Mô phỏng tuyến điều hướng nghiệm thu" pad>
            <label className="field">
              <span>Biển số mô phỏng</span>
              <input
                value={plate}
                onChange={(event) => setPlate(event.target.value.toUpperCase())}
                placeholder="30H-88877"
              />
            </label>
            <div className="route-sim-buttons">
              {routeOptions.map((option) => (
                <button
                  className={option.key === route.key ? 'primary' : 'secondary'}
                  key={option.key}
                  onClick={() => chooseRoute(option)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="route-animation" key={route.key}>
              <span className="route-car">🚗</span>
              <div>
                <b>{route.block}</b>
                <small>{route.route}</small>
              </div>
            </div>
            <p className="hint">
              Chỉ mô phỏng hình ảnh và cập nhật màn hình tài xế; không ghi dữ
              liệu và không gửi lệnh PLC.
            </p>
          </Panel>
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
                  <span>
                    {live
                      ? `${r.free} vị trí khả dụng`
                      : `Khay chứa SUV: ${r.suv} khay`}
                  </span>
                  <span>Mức tải: {r.load}</span>
                </div>
              </div>
            ))}
          </Panel>
          <Panel title="Điều phối tín hiệu & Cân bằng tải" pad>
            <div className="control-line">
              <span>Logic cân bằng tải tự động</span>
              <Badge tone={live ? 'green' : 'blue'}>
                {live ? 'GATEWAY' : 'MÔ PHỎNG'}
              </Badge>
            </div>
            <Rows>
              <Row k="Ngưỡng lệch mật độ kích hoạt" v="> 20%" />
              <Row
                k="Lệch tải hiện tại"
                v={
                  highestZone && lowestZone
                    ? `Zone ${highestZone.id} (${highestZone.pct}%) vs Zone ${lowestZone.id} (${lowestZone.pct}%) = ${balanceGap}%`
                    : 'Chưa có dữ liệu Zone'
                }
              />
              <Row
                k="Đang hướng xe sang"
                v={
                  lowestZone
                    ? `Zone ${lowestZone.id} (${lowestZone.free} vị trí trống)`
                    : 'Chờ dữ liệu'
                }
              />
              <Row k="Màn hình 55'' trạm phân loại" v="Hiển thị chỉ đường" />
              <Row
                k="Hạng tải đề xuất"
                v={camera?.weightClass || 'Chờ dữ liệu Camera AI'}
              />
            </Rows>
            <div className="api-block">
              <div className="api-line">
                <span className="mono">POST /api/camera/ingest</span>
                <Badge tone={camera ? 'green' : 'blue'}>
                  {camera ? 'ĐÃ NHẬN' : 'HỢP ĐỒNG API'}
                </Badge>
              </div>
              <pre>
                {camera
                  ? JSON.stringify(
                      {
                        event_id: camera.eventId,
                        outcome: camera.outcome,
                        weight_class: camera.weightClass,
                        zone: camera.zone,
                        block: camera.block,
                      },
                      null,
                      2,
                    )
                  : `{ "event_id": "camera-event-id", "length_mm": 4800,
  "width_mm": 1800, "height_mm": 1600, "weight_kg": 1900 }`}
              </pre>
            </div>
          </Panel>
          <Panel title="Màn hình 55'' & Bảng LED chỉ dẫn" pad>
            <div className="led-board">
              <div className="led-line">
                <span>LED Matrix ngoài trời</span>
                <b className="led-text">
                  {live
                    ? `ĐANG ĐỖ ${totalOccupied} · TRỐNG ${totalFree}`
                    : `SUV ${totalSuv} · SEDAN ${totalSedan} · TRỐNG ${totalFree}`}
                </b>
              </div>
              <div className="led-line">
                <span>LED chỉ dẫn hầm</span>
                <b className="led-text">
                  {routeZones
                    .map((zone) => `ZONE ${zone.id} ${zone.free}`)
                    .join('  |  ') || 'CHỜ DỮ LIỆU ZONE'}
                </b>
              </div>
            </div>
            <Rows>
              <Row
                k="Màn hình 55'' trạm phân loại"
                v="Hoạt động · Hiển thị chỉ đường"
              />
              <Row
                k="Hạng tải đề xuất"
                v={camera?.weightClass || 'Chưa có dữ liệu Camera AI'}
              />
              <Row
                k="Vị trí khuyên dùng"
                v={
                  camera?.block
                    ? `Zone ${camera.zone} · Block ${camera.block}`
                    : 'Chờ phân tuyến'
                }
              />
            </Rows>
          </Panel>
        </div>
        <div className="stack">
          <Panel title="Phân loại xe đang tiếp nhận (AI-VDS Camera)" pad>
            {camera?.reason && (
              <div className="notice amber">
                <b>Kết quả phân loại:</b> {camera.reason}
              </div>
            )}
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
            {!classified.length && (
              <div className="empty-state">
                Chưa có sự kiện xe từ Camera AI.
              </div>
            )}
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
