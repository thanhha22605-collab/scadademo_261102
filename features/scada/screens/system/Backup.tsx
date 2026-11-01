'use client';
import { useEffect, useState } from 'react';
import { Cpu, HardDrive, Server, Zap } from 'lucide-react';
import {
  Panel,
  Badge,
  Kpi,
  type ScreenProps,
} from '@/features/scada/components/shared';
import { GATEWAY_HTTP } from '@/features/scada/data/plc-source';

type Health = {
  ok: boolean;
  configured: boolean;
  connected: boolean;
  online: number;
  total: number;
  at: number;
  databaseConfigured: boolean;
  databaseReady: boolean;
  cameraIngestConfigured: boolean;
  cameraLastAt?: number | null;
  ledTcp?: { configured: boolean; online: number; panels: number };
  pgs?: {
    configured: boolean;
    listening: boolean;
    connected: number;
    zcuTotal: number;
  };
};

export default function Backup({ sim }: ScreenProps) {
  const live = sim.source !== 'sim';
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!live) return;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch(`${GATEWAY_HTTP}/health`, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(`Gateway trả HTTP ${response.status}.`);
        setHealth((await response.json()) as Health);
        setError('');
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(String(reason instanceof Error ? reason.message : reason));
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [live]);
  return (
    <>
      <div className="metrics metrics-4">
        <Kpi
          label={live ? 'Gateway SCADA' : 'Tải CPU Server'}
          value={live ? (health?.ok ? 'ONLINE' : 'OFFLINE') : '12.5%'}
          sub={
            live ? error || 'Health endpoint 5 giây/lần' : 'Nhiệt độ CPU: 42°C'
          }
          tone="green"
          icon={Cpu}
        />
        <Kpi
          label={live ? 'PLC online' : 'Bộ nhớ RAM tiêu thụ'}
          value={
            live
              ? `${health?.online ?? 0}/${health?.total ?? 0}`
              : '4.2 / 16 GB'
          }
          sub={live ? 'Theo vòng polling gateway' : 'Ổ cứng trống: 180 GB'}
          tone="blue"
          icon={HardDrive}
        />
        <Kpi
          label={live ? 'MySQL' : 'Trạng thái pin UPS'}
          value={
            live ? (health?.databaseReady ? 'READY' : 'NOT READY') : '100%'
          }
          sub={
            live
              ? health?.databaseConfigured
                ? 'Đã cấu hình'
                : 'Chưa cấu hình'
              : 'Thời gian dự phòng: 45 phút'
          }
          tone="amber"
          icon={Zap}
        />
        <Kpi
          label={live ? 'Camera AI' : 'Sao lưu gần nhất'}
          value={
            live
              ? health?.cameraIngestConfigured
                ? 'READY'
                : 'LOCKED'
              : '02:00 Hôm nay'
          }
          sub={
            live
              ? health?.cameraLastAt
                ? `Sự kiện cuối ${new Date(health.cameraLastAt).toLocaleString('vi-VN')}`
                : 'Chưa nhận sự kiện'
              : 'Trạng thái: Thành công'
          }
          tone="purple"
          icon={Server}
        />
      </div>
      <div className="two-col">
        <Panel title="Cấu hình kết nối hệ thống" pad>
          <div className="control-line">
            <span>Database Server connection</span>
            <Badge
              tone={live ? (health?.databaseReady ? 'green' : 'red') : 'green'}
            >
              {live
                ? health?.databaseReady
                  ? 'Connected'
                  : 'Not ready'
                : 'Connected'}
            </Badge>
          </div>
          <div className="control-line">
            <span>Omron FINS TCP/UDP</span>
            <Badge
              tone={live ? (health?.connected ? 'green' : 'red') : 'green'}
            >
              {live ? (health?.connected ? 'Online' : 'Offline') : 'Online'}
            </Badge>
          </div>
          <div className="control-line">
            <span>LED TCP / PGS CCU</span>
            <Badge
              tone={
                live &&
                ((health?.ledTcp?.configured &&
                  health.ledTcp.online < health.ledTcp.panels) ||
                  (health?.pgs?.configured && !health.pgs.listening))
                  ? 'red'
                  : 'green'
              }
            >
              {live
                ? `LED ${health?.ledTcp?.online ?? 0}/${health?.ledTcp?.panels ?? 0} · ZCU ${health?.pgs?.connected ?? 0}/${health?.pgs?.zcuTotal ?? 0}`
                : 'Synchronized'}
            </Badge>
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
                {(live
                  ? []
                  : [
                      ['05/07/2026 02:00:05', 'Tự động (Daily)', '142 MB'],
                      ['04/07/2026 02:00:03', 'Tự động (Daily)', '141 MB'],
                      ['03/07/2026 02:00:04', 'Tự động (Daily)', '140 MB'],
                    ]
                ).map((b, i) => (
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
          {live && (
            <div className="empty-state">
              Chưa cấu hình dịch vụ backup database và giám sát UPS/CPU. Giao
              diện không hiển thị số liệu giả trong chế độ PLC thật.
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
