'use client';
import { Activity, FileText, Gauge, Zap } from 'lucide-react';
import { Panel, Bar, Kpi } from '@/features/scada/components/shared';

const energyBlocks = [
  ['Block A-01 (Zone A – Hầm B1)', 420, 29.5],
  ['Block B-01 (Zone B – Hầm B2)', 380, 26.7],
  ['Block B-03 (Zone B – Hầm B2)', 310, 21.8],
  ['Block A-04 (Zone A – Hầm B1)', 190, 13.4],
  ['Block C-02 (Zone C – Hầm B3)', 120, 8.5],
] as const;
export default function Energy() {
  return (
    <>
      <div className="metrics metrics-4">
        <Kpi
          label="Điện năng tiêu thụ tháng"
          value="1,420 kWh"
          sub="↓ 4.2% so với tháng trước"
          tone="blue"
          icon={Zap}
        />
        <Kpi
          label="Công suất đỉnh (Peak Load)"
          value="32.4 kW"
          sub="Ghi nhận lúc 17:35 hôm qua"
          tone="amber"
          icon={Activity}
        />
        <Kpi
          label="Hệ số công suất"
          value="0.94"
          sub="Đạt chuẩn bù công suất phản kháng"
          tone="green"
          icon={Gauge}
        />
        <Kpi
          label="Chi phí điện ước tính"
          value="4.260.000 đ"
          sub="Tạm tính theo biểu giá kinh doanh"
          tone="purple"
          icon={FileText}
        />
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
