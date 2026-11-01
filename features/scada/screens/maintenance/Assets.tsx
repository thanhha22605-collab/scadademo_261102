'use client';
import { useState } from 'react';
import {
  Panel,
  Badge,
  Rows,
  Row,
  ConnectionBadge,
  type ScreenProps,
} from '@/features/scada/components/shared';

const assetDevices: Record<
  string,
  {
    icon: string;
    name: string;
    code: string;
    tone: string;
    state: string;
    m: [string, string, string?][];
    specs: [string, string][];
    maint: [string, string][];
  }
> = {
  motor: {
    icon: '⚙',
    name: 'Động cơ Nâng hạ (Block B-04)',
    code: 'MTR-LIFT-B4',
    tone: 'red',
    state: 'Lỗi',
    m: [
      ['Runtime tích lũy', '1,240 giờ'],
      ['Số chu kỳ đỗ xe', '45,120 lần'],
      ['Nhiệt độ cuộn dây', '115°C', 'warn'],
    ],
    specs: [
      ['Hãng sản xuất', 'Mitsubishi Electric'],
      ['Model động cơ', 'SF-JR 7.5kW 4P'],
      ['Số serial', 'S/N: 2026-MTR-881A'],
      ['Ngày lắp đặt', '12/03/2026'],
    ],
    maint: [
      ['Bảo trì gần nhất', '15/06/2026'],
      ['Dự kiến tiếp theo', '15/07/2026'],
      ['Vật tư đi kèm', 'Cuộn hút phanh, bôi trơn xích nâng'],
    ],
  },
  vfd: {
    icon: '🔌',
    name: 'Biến tần VFD Nâng (Block B-04)',
    code: 'VFD-LIFT-B4',
    tone: 'amber',
    state: 'STOP',
    m: [
      ['Runtime tích lũy', '1,180 giờ'],
      ['Tần số hiện tại', '0.0 Hz'],
      ['Nhiệt độ tản nhiệt', '54°C'],
    ],
    specs: [
      ['Hãng sản xuất', 'Schneider Electric'],
      ['Model', 'ATV320 7.5kW'],
      ['Số serial', 'S/N: 2026-VFD-114C'],
      ['Ngày lắp đặt', '12/03/2026'],
    ],
    maint: [
      ['Bảo trì gần nhất', '10/06/2026'],
      ['Dự kiến tiếp theo', '10/09/2026'],
      ['Vật tư đi kèm', 'Quạt tản nhiệt, tụ DC-bus'],
    ],
  },
  sensor: {
    icon: '📡',
    name: 'Cảm biến hành trình LS-T3',
    code: 'SEN-LS-T3',
    tone: 'green',
    state: 'OK',
    m: [
      ['Runtime tích lũy', '2,050 giờ'],
      ['Số lần kích hoạt', '128,400 lần'],
      ['Điện áp tín hiệu', '24 VDC'],
    ],
    specs: [
      ['Hãng sản xuất', 'Omron'],
      ['Model', 'D4N-4132'],
      ['Số serial', 'S/N: 2026-SEN-773A'],
      ['Ngày lắp đặt', '12/03/2026'],
    ],
    maint: [
      ['Bảo trì gần nhất', '01/06/2026'],
      ['Dự kiến tiếp theo', '01/12/2026'],
      ['Vật tư đi kèm', 'Con lăn cữ, gioăng chống bụi'],
    ],
  },
};
export default function Assets({ sim, selected, setSelected }: ScreenProps) {
  const [sel, setSel] = useState('motor');
  const d = assetDevices[sel];
  const plc =
    sim.blocks.find((block) => block.id === selected) ?? sim.blocks[0];
  const leaf = (key: string, label: string, tone: string, st: string) => (
    <button
      className={
        'tree-node l3 tree-btn ' +
        (sel === key ? 'sel ' : '') +
        (tone === 'red' ? 'fault' : '')
      }
      onClick={() => setSel(key)}
    >
      {assetDevices[key].icon} {label} <Badge tone={tone}>{st}</Badge>
    </button>
  );
  return (
    <>
      <div className="occ-badges">
        <ConnectionBadge sim={sim} />
      </div>
      <div className="two-col">
        <Panel title="Cây PLC theo Zone / Block" pad>
          <div className="tree">
            <div className="tree-node root">🏢 SCADA Gateway</div>
            {[...new Set(sim.blocks.map((block) => block.zone))].map((zone) => (
              <div key={zone}>
                <div className="tree-node l1">▾ Zone {zone}</div>
                {sim.blocks
                  .filter((block) => block.zone === zone)
                  .map((block) => (
                    <button
                      className={`tree-node l2 tree-btn ${plc?.id === block.id ? 'sel' : ''}`}
                      key={block.id}
                      onClick={() => setSelected(block.id)}
                    >
                      PLC {block.id}{' '}
                      <Badge
                        tone={
                          !block.online
                            ? 'red'
                            : block.operational === false
                              ? 'amber'
                              : 'green'
                        }
                      >
                        {!block.online
                          ? 'MẤT KẾT NỐI'
                          : block.operational === false
                            ? 'KHÔNG NHẬN XE'
                            : 'ĐANG KẾT NỐI'}
                      </Badge>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title={plc ? `Thông tin PLC · ${plc.id}` : 'Thông tin PLC'}
          aside={
            plc ? (
              <Badge tone={plc.online ? 'green' : 'red'}>
                {plc.online ? 'ĐANG KẾT NỐI' : 'MẤT KẾT NỐI'}
              </Badge>
            ) : null
          }
          pad
        >
          {plc ? (
            <Rows>
              <Row k="Địa chỉ" v="Xem tại tab Cấu hình PLC" />
              <Row k="Giao thức" v="Omron FINS TCP/UDP · cổng 9600" />
              <Row
                k="Cờ giám sát PLC"
                v={plc.monitored === false ? 'Tắt' : 'Bật'}
              />
              <Row
                k="Cờ nhận xe của Block"
                v={
                  plc.operational === false
                    ? 'Tắt — vẫn tiếp tục giám sát PLC'
                    : 'Bật'
                }
              />
              <Row
                k="Năng lực vị trí"
                v={
                  plc.parkingClass === 'ground'
                    ? 'Đỗ nền'
                    : plc.parkingClass === 'mechanical-2200'
                      ? 'Pallet cơ khí ≤ 2200 kg'
                      : plc.parkingClass === 'mechanical-2600'
                        ? 'Pallet cơ khí ≤ 2600 kg'
                        : 'Chưa phân loại / dùng chung'
                }
              />
              <Row
                k="Bố cục thanh ghi ô đỗ"
                v={`${plc.capacity} bit theo preset loại tháp`}
              />
              <Row k="Thanh ghi kết quả tìm xe" v="D1000" />
              <Row k="Thanh ghi dải cân nặng" v="D1004" />
              <Row
                k="Lần quét cuối"
                v={
                  sim.updatedAt
                    ? new Date(sim.updatedAt).toLocaleString('vi-VN')
                    : 'Mô phỏng hiện tại'
                }
              />
              <Row k="Chất lượng dữ liệu" v={plc.quality.toUpperCase()} />
              <Row
                k="Lỗi truyền thông gần nhất"
                v={plc.lastError || 'Không có'}
              />
              <Row
                k="Thử lại FINS"
                v={
                  plc.retryAt && plc.retryAt > sim.clockMs
                    ? new Date(plc.retryAt).toLocaleString('vi-VN')
                    : 'Theo chu kỳ polling'
                }
              />
            </Rows>
          ) : (
            <div className="empty-state">Chưa có PLC nào được cấu hình.</div>
          )}
        </Panel>
      </div>
      <div className="two-col">
        <Panel title="PGS / CCU cảm biến đỗ thường" pad>
          <Rows>
            <Row
              k="Trạng thái listener"
              v={
                sim.integrations?.pgs?.configured
                  ? sim.integrations.pgs.listening
                    ? `Đang nghe cổng ${sim.integrations.pgs.port}`
                    : 'Đã cấu hình nhưng chưa lắng nghe'
                  : 'Chưa cấu hình PGS_CCU_PORT'
              }
            />
            <Row
              k="ZCU kết nối"
              v={`${sim.integrations?.pgs?.connected ?? 0}/${sim.integrations?.pgs?.zcuTotal ?? 0}`}
            />
            <Row
              k="Cảm biến trống"
              v={String(sim.integrations?.pgs?.empty ?? 0)}
            />
            <Row
              k="Cảm biến có xe"
              v={String(sim.integrations?.pgs?.occupied ?? 0)}
            />
            <Row
              k="Cảm biến lỗi"
              v={String(sim.integrations?.pgs?.fault ?? 0)}
            />
          </Rows>
        </Panel>
        <Panel title="Bảng LED chỉ hướng TCP" pad>
          <Rows>
            <Row
              k="Cấu hình"
              v={
                sim.integrations?.led?.configured
                  ? 'Đã cấu hình'
                  : 'Chưa cấu hình'
              }
            />
            <Row
              k="Bảng đang online"
              v={`${sim.integrations?.led?.online ?? 0}/${sim.integrations?.led?.panels ?? 0}`}
            />
            <Row k="Giao thức" v="$PORT,...*CRC# · TCP ACK" />
            <Row k="Refresh an toàn" v="Tối đa 10 giây / lần" />
            <Row
              k="Lỗi gần nhất"
              v={
                sim.integrations?.led?.items?.find((item) => item.lastError)
                  ?.lastError || 'Không có'
              }
            />
          </Rows>
        </Panel>
      </div>
      <div className="two-col">
        <Panel title="Cấu trúc phân cấp thiết bị" pad>
          <div className="tree">
            <div className="tree-node root">🏢 TotalParking SCADA</div>
            <div className="tree-node l1">▸ Zone A (Hầm B1)</div>
            <div className="tree-node l2">▸ Block A-01</div>
            <div className="tree-node l2 open">▾ Block B-04</div>
            {leaf('motor', 'Motor Nâng Hạ', 'red', 'LỖI')}
            {leaf('vfd', 'Biến tần VFD Nâng', 'amber', 'STOP')}
            {leaf('sensor', 'Cảm biến hành trình LS-T3', 'green', 'OK')}
            <div className="tree-node l1">▸ Zone B (Hầm B2)</div>
            <div className="tree-node l1">▸ Zone C (Hầm B3)</div>
          </div>
        </Panel>
        <Panel
          title={d.name}
          aside={<Badge tone={d.tone}>Trạng thái: {d.state}</Badge>}
          pad
        >
          <div className="asset-metrics">
            {d.m.map((x) => (
              <div key={x[0]} className={x[2] === 'warn' ? 'warn' : ''}>
                <small>{x[0].toUpperCase()}</small>
                <b>{x[1]}</b>
              </div>
            ))}
          </div>
          <Rows>
            <Row k="Mã thiết bị" v={d.code} />
          </Rows>
          <h4 className="sub-head">Thông số kỹ thuật</h4>
          <Rows>
            {d.specs.map((s) => (
              <Row key={s[0]} k={s[0]} v={s[1]} />
            ))}
          </Rows>
          <h4 className="sub-head">Lịch trình bảo dưỡng</h4>
          <Rows>
            {d.maint.map((s) => (
              <Row key={s[0]} k={s[0]} v={s[1]} />
            ))}
          </Rows>
        </Panel>
      </div>
    </>
  );
}
