'use client';
import { useState } from 'react';
import { Activity, Gauge, RefreshCw, Timer } from 'lucide-react';
import {
  Panel,
  Kpi,
  Badge,
  type ScreenProps,
} from '@/features/scada/components/shared';
import { faultLog } from '@/features/scada/data/demo';

export default function Diagnostics({ sim }: ScreenProps) {
  const [refreshedAt, setRefreshedAt] = useState(
    new Date().toLocaleTimeString('vi-VN'),
  );
  const rows = [
    ...sim.alarms.map((alarm) => [
      alarm.at ?? '—',
      `${alarm.device ?? 'Thiết bị'} · ${alarm.block}`,
      alarm.code ?? alarm.id,
      alarm.text,
      alarm.active === false ? 'Đã hết điều kiện' : 'Đang theo dõi',
      alarm.ackBy ?? '—',
    ]),
    ...faultLog,
  ].slice(0, 50);
  return (
    <>
      <div className="occ-badges">
        <Badge tone={sim.source === 'sim' ? 'blue' : 'green'}>
          {sim.source === 'sim' ? 'Dữ liệu mô phỏng' : 'Nguồn gateway/CSDL'}
        </Badge>
        <span className="muted">Làm mới lúc {refreshedAt}</span>
        <button
          className="secondary"
          onClick={() => setRefreshedAt(new Date().toLocaleTimeString('vi-VN'))}
        >
          <RefreshCw size={14} /> Làm mới dữ liệu
        </button>
      </div>
      <div className="metrics metrics-4">
        <Kpi
          label="Độ sẵn sàng (Availability)"
          value="99.85%"
          sub="Chuẩn OEE công nghiệp"
          tone="green"
          icon={Gauge}
        />
        <Kpi
          label="Chỉ số MTBF"
          value="364 giờ"
          sub="Trung bình giữa 2 sự cố"
          tone="blue"
          icon={Timer}
        />
        <Kpi
          label="Chỉ số MTTR"
          value="18.5 phút"
          sub="Thời gian phục hồi trung bình"
          tone="purple"
          icon={RefreshCw}
        />
        <Kpi
          label="Sự cố hoạt động"
          value="1 sự cố"
          sub="Chờ xử lý khẩn cấp"
          tone="red"
          icon={Activity}
        />
      </div>
      <Panel
        title="Nhật ký sự cố thiết bị & Nguyên nhân gốc (Fault History Log)"
        pad
      >
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
              {rows.map((r, i) => (
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
