'use client';
import { Cpu, HardDrive, Server, Zap } from 'lucide-react';
import { Panel, Badge, Kpi } from '@/features/scada/components/shared';

export default function Backup() {
  return (
    <>
      <div className="metrics metrics-4">
        <Kpi
          label="Tải CPU Server"
          value="12.5%"
          sub="Nhiệt độ CPU: 42°C"
          tone="green"
          icon={Cpu}
        />
        <Kpi
          label="Bộ nhớ RAM tiêu thụ"
          value="4.2 / 16 GB"
          sub="Ổ cứng trống: 180 GB"
          tone="blue"
          icon={HardDrive}
        />
        <Kpi
          label="Trạng thái pin UPS"
          value="100%"
          sub="Thời gian dự phòng: 45 phút"
          tone="amber"
          icon={Zap}
        />
        <Kpi
          label="Sao lưu gần nhất"
          value="02:00 Hôm nay"
          sub="Trạng thái: Thành công"
          tone="purple"
          icon={Server}
        />
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
