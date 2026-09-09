'use client';
import { useState } from 'react';
import { Panel, Badge, Rows, Row } from './shared';

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
export default function Assets() {
  const [sel, setSel] = useState('motor');
  const d = assetDevices[sel];
  const leaf = (key: string, label: string, tone: string, st: string) => (
    <button
      className={'tree-node l3 tree-btn ' + (sel === key ? 'sel ' : '') + (tone === 'red' ? 'fault' : '')}
      onClick={() => setSel(key)}
    >
      {assetDevices[key].icon} {label} <Badge tone={tone}>{st}</Badge>
    </button>
  );
  return (
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
  );
}
