'use client';
import { Video } from 'lucide-react';
import { Badge } from '@/features/scada/components/shared';

const cams = [
  { id: 'CAM-IN', name: 'Cổng Vào 1', sub: 'Cổng đo quét AI-VDS' },
  { id: 'CAM-ZONE-A', name: 'Hầm B1', sub: 'Khu vực Block B-01 → B-04' },
  { id: 'CAM-OUT', name: 'Cổng Ra 1', sub: 'Trả xe / nhận dạng người nhận' },
  { id: 'CAM-ZONE-B', name: 'Hầm B2', sub: 'Khu vực Block B-05 → B-08' },
];
export default function Cctv() {
  return (
    <div className="cctv-grid">
      {cams.map((c) => (
        <div className="cctv" key={c.id}>
          <div className="cctv-bar">
            <span className="mono">
              {c.id}: {c.name}
            </span>
            <Badge tone="red">LIVE</Badge>
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
