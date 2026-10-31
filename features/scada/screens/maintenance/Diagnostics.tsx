'use client';
import { Activity, Gauge, RefreshCw, Timer } from 'lucide-react';
import { Panel, Kpi } from '@/features/scada/components/shared';
import { faultLog } from '@/features/scada/data/demo';

export default function Diagnostics() {
  return (
    <>
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
