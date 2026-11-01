'use client';
import { Video } from 'lucide-react';
import {
  Badge,
  Panel,
  Row,
  Rows,
  type ScreenProps,
} from '@/features/scada/components/shared';

const cams = [
  { id: 'CAM-IN', name: 'Cổng Vào 1', sub: 'Cổng đo quét AI-VDS' },
  { id: 'CAM-ZONE-A', name: 'Hầm B1', sub: 'Khu vực Block B-01 → B-04' },
  { id: 'CAM-OUT', name: 'Cổng Ra 1', sub: 'Trả xe / nhận dạng người nhận' },
  { id: 'CAM-ZONE-B', name: 'Hầm B2', sub: 'Khu vực Block B-05 → B-08' },
];
export default function Cctv({ sim }: ScreenProps) {
  const camera = sim.integrations?.camera;
  if (sim.source !== 'sim')
    return (
      <div className="stack">
        <div className="notice amber">
          Gateway đang nhận sự kiện Camera AI, không nhận luồng video. SCADA
          không gắn nhãn LIVE khi chưa có RTSP/WebRTC gateway thực tế.
        </div>
        <Panel
          title="Sự kiện Camera AI gần nhất"
          aside={
            <Badge tone={camera ? 'green' : 'amber'}>
              {camera ? 'ĐÃ NHẬN' : 'CHỜ DỮ LIỆU'}
            </Badge>
          }
          pad
        >
          {camera ? (
            <Rows>
              <Row k="Event ID" v={camera.eventId} />
              <Row
                k="Thời gian nhận"
                v={new Date(camera.receivedAt).toLocaleString('vi-VN')}
              />
              <Row
                k="Xe nhận diện"
                v={
                  [camera.make, camera.model, camera.year]
                    .filter(Boolean)
                    .join(' ') || 'Không xác định'
                }
              />
              <Row
                k="Kích thước"
                v={`${camera.lengthMm ?? '—'} × ${camera.widthMm ?? '—'} × ${camera.heightMm ?? '—'} mm`}
              />
              <Row
                k="Khối lượng không tải"
                v={camera.weightKg ? `${camera.weightKg} kg` : '—'}
              />
              <Row k="Kết quả" v={camera.outcome || '—'} />
              <Row
                k="Ảnh nguồn"
                v={
                  camera.imagePath
                    ? 'Có đường dẫn ảnh trên máy Camera (không công khai trực tiếp)'
                    : 'Không có'
                }
              />
            </Rows>
          ) : (
            <div className="empty-state">
              Chưa nhận POST /api/camera/ingest.
            </div>
          )}
        </Panel>
      </div>
    );
  return (
    <div className="cctv-grid">
      {cams.map((c) => (
        <div className="cctv" key={c.id}>
          <div className="cctv-bar">
            <span className="mono">
              {c.id}: {c.name}
            </span>
            <Badge tone="amber">MÔ PHỎNG</Badge>
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
