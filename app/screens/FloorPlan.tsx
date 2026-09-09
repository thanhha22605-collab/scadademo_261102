'use client';
import { Badge } from './shared';

type FZone = {
  z: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cols: number;
  occ: number;
  cap: number;
  suv: string;
  sedan: string;
};
const facility: FZone[] = [
  { z: 2, x: 545, y: 55, w: 395, h: 120, cols: 19, occ: 20, cap: 38, suv: '07/16', sedan: '11/22' },
  { z: 3, x: 55, y: 150, w: 250, h: 205, cols: 10, occ: 10, cap: 40, suv: '12/16', sedan: '18/24' },
  { z: 4, x: 340, y: 205, w: 300, h: 265, cols: 11, occ: 10, cap: 44, suv: '14/18', sedan: '20/26' },
  { z: 5, x: 675, y: 205, w: 265, h: 150, cols: 10, occ: 15, cap: 30, suv: '06/12', sedan: '09/18' },
  { z: 1, x: 55, y: 385, w: 250, h: 185, cols: 10, occ: 23, cap: 34, suv: '05/16', sedan: '06/18' },
  { z: 6, x: 675, y: 385, w: 265, h: 185, cols: 10, occ: 10, cap: 35, suv: '04/15', sedan: '06/20' },
];
function FloorZoneSvg({ zn }: { zn: FZone }) {
  const pct = Math.round((zn.occ / zn.cap) * 100);
  const rows = Math.ceil(zn.cap / zn.cols);
  const cs = Math.max(
    6,
    Math.min((zn.w - 20) / zn.cols, (zn.h - 74) / rows) - 3,
  );
  const gx = zn.x + (zn.w - (cs + 3) * zn.cols) / 2;
  const gy = zn.y + 40;
  return (
    <g>
      <rect
        x={zn.x}
        y={zn.y}
        width={zn.w}
        height={zn.h}
        rx="7"
        fill="#0e1c2e"
        stroke="#2f5580"
        strokeDasharray="5 4"
      />
      <text x={zn.x + 14} y={zn.y + 26} fill="#cddcf0" fontSize="17" fontWeight="700">
        ZONE {zn.z}
      </text>
      <text x={zn.x + zn.w - 14} y={zn.y + 26} fill="#7fb0e6" fontSize="14" textAnchor="end">
        {pct}%
      </text>
      {Array.from({ length: zn.cap }, (_, k) => {
        const col = k % zn.cols;
        const row = Math.floor(k / zn.cols);
        return (
          <rect
            key={k}
            x={gx + col * (cs + 3)}
            y={gy + row * (cs + 3)}
            width={cs}
            height={cs}
            rx="1.5"
            fill={k < zn.occ ? '#1c6b56' : '#16283c'}
            stroke={k < zn.occ ? '#2f9d7d' : '#24405b'}
          />
        );
      })}
      <text x={zn.x + 14} y={zn.y + zn.h - 14} fill="#8ca1bd" fontSize="12">
        SUV {zn.suv} · Sedan {zn.sedan} · Mật độ {zn.occ}/{zn.cap}
      </text>
    </g>
  );
}
export default function FloorPlan() {
  return (
    <>
      <div className="blueprint-head">
        <div>
          <div className="eyebrow">SCADA · AI-VDS · PLC BLOCK · HMI BLOCK</div>
          <h2>Tổng hợp hệ thống phần mềm SCADA</h2>
          <p>
            Giám sát tổng mặt bằng, trạng thái đỗ xe cơ khí và điều phối giao
            thông phân khu.
          </p>
        </div>
        <div className="blueprint-meta">
          <div>
            <small>PROJECT</small>
            <b>SORA GARDENS II</b>
          </div>
          <div>
            <small>SYSTEM BY</small>
            <b>TOTAL PARKING</b>
          </div>
        </div>
      </div>
      <div className="remarks">
        <span>REMARKS:</span>
        <Badge tone="blue">PSH-7 (7 SPACES)</Badge>
        <Badge tone="purple">PSH-5 (5 SPACES)</Badge>
        <Badge tone="amber">PSH-3 (3 SPACES)</Badge>
        <span className="remarks-conn">
          Trạng thái kết nối ZCU/PGS: <Badge tone="green">ONLINE</Badge>
        </span>
      </div>
      <div className="floor-svg-wrap">
        <svg viewBox="0 0 1000 620" role="img" aria-label="Sơ đồ mặt bằng SCADA 6 phân khu">
          <defs>
            <pattern id="fgrid" width="26" height="26" patternUnits="userSpaceOnUse">
              <path d="M26 0 L0 0 0 26" fill="none" stroke="#16273a" strokeWidth="1" />
            </pattern>
          </defs>
          <path
            d="M40 60 L720 30 L965 150 L965 585 L120 590 L35 380 Z"
            fill="#0a1524"
            stroke="#37546f"
            strokeWidth="2"
          />
          <path
            d="M40 60 L720 30 L965 150 L965 585 L120 590 L35 380 Z"
            fill="url(#fgrid)"
            opacity="0.6"
          />
          <text x="330" y="200" fill="#3f5f7d" fontSize="13" letterSpacing="3">
            SORA GARDENS II — TOTAL PARKING
          </text>
          <line x1="320" y1="470" x2="660" y2="470" stroke="#2a405a" strokeWidth="14" strokeDasharray="10 8" />
          <text x="330" y="497" fill="#5c7796" fontSize="12">
            ← LÀN LƯU THÔNG · VÀO / RA →
          </text>
          {facility.map((zn) => (
            <FloorZoneSvg key={zn.z} zn={zn} />
          ))}
        </svg>
      </div>
      <div className="chart-legend">
        <span>
          <i className="green-dot" />
          Đã đỗ xe
        </span>
        <span>
          <i className="blue-dot" />
          Vị trí trống
        </span>
        <span className="muted">Sơ đồ mô phỏng · Puzzle Parking System</span>
      </div>
    </>
  );
}
