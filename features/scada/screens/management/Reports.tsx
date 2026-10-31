'use client';
import { useState } from 'react';
import { Panel, Badge, Bar } from '@/features/scada/components/shared';
import { blockFreq, seedCards } from '@/features/scada/data/demo';

const weekDensity = [
  ['Thứ Hai (T2)', 64],
  ['Thứ Ba (T3)', 78],
  ['Thứ Tư (T4)', 70],
  ['Thứ Năm (T5)', 85],
  ['Thứ Sáu (T6)', 92],
  ['Thứ Bảy (T7)', 55],
  ['Chủ Nhật (CN)', 40],
] as const;
const reportCats = [
  'Mật độ & Lưu lượng',
  'Phân tích lỗi & Pareto',
  'Lịch sử bảo trì',
  'Lịch sử thẻ xe',
  'Báo cáo doanh thu từ xa',
  'Tần suất hoạt động Pallet',
];
const paretoFaults: [string, number][] = [
  ['Quá tải nhiệt motor nâng', 42],
  ['Cảm biến hành trình lỗi', 27],
  ['Mất kết nối AI-VDS', 15],
  ['Kẹt cơ cấu trượt', 9],
  ['Khác', 7],
];
const revenueBars: [string, number][] = [
  ['Zone A – Hầm B1', 82],
  ['Zone B – Hầm B2', 64],
  ['Zone C – Hầm B3', 38],
  ['Zone D – Tầng 1', 29],
];
const maintHistory = [
  ['15/06/2026', 'Block A-04', 'Motor Nâng Hạ', 'Thay cuộn hút phanh'],
  ['10/06/2026', 'Block B-03', 'Hộp số', 'Thay dầu bôi trơn'],
  ['02/06/2026', 'Block A-02', 'Cảm biến', 'Hiệu chuẩn AI-VDS'],
  ['28/05/2026', 'Block B-01', 'Xích nâng', 'Căng lại xích, tra mỡ'],
];
function ReportBody({ cat }: { cat: number }) {
  if (cat === 1)
    return (
      <Panel title="Phân tích Pareto lỗi thiết bị (%)" pad>
        {paretoFaults.map(([d, v]) => (
          <div className="week-row" key={d}>
            <span>{d}</span>
            <Bar value={v} tone="#ff8996" />
            <b>{v}%</b>
          </div>
        ))}
      </Panel>
    );
  if (cat === 2)
    return (
      <Panel title="Lịch sử bảo trì đã thực hiện" pad>
        <div className="table-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Block</th>
                <th>Thiết bị</th>
                <th>Nội dung</th>
              </tr>
            </thead>
            <tbody>
              {maintHistory.map((r, i) => (
                <tr key={i}>
                  <td className="mono">{r[0]}</td>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                  <td>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    );
  if (cat === 3)
    return (
      <Panel title="Lịch sử quẹt thẻ xe (RFID)" pad>
        <div className="table-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Mã thẻ</th>
                <th>Biển số</th>
                <th>Lần dùng cuối</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {seedCards.map((c) => (
                <tr key={c.id}>
                  <td className="mono">{c.id}</td>
                  <td className="mono">{c.plate}</td>
                  <td>{c.last}</td>
                  <td>
                    <Badge tone={c.synced ? 'green' : 'amber'}>
                      {c.active ? 'Hoạt động' : 'Đã khóa'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    );
  if (cat === 4)
    return (
      <Panel title="Doanh thu bãi đỗ theo Zone (triệu đồng)" pad>
        {revenueBars.map(([d, v]) => (
          <div className="week-row" key={d}>
            <span>{d}</span>
            <Bar value={v} tone="#31cba4" />
            <b>{v} tr</b>
          </div>
        ))}
      </Panel>
    );
  if (cat === 5)
    return (
      <Panel title="Tần suất hoạt động Pallet (chu kỳ/tháng)" pad>
        {blockFreq.slice(0, 8).map((b) => (
          <div className="week-row" key={b.id}>
            <span>
              {b.id} · {b.z}
            </span>
            <Bar value={b.pct} />
            <b>{b.cyc}</b>
          </div>
        ))}
      </Panel>
    );
  return (
    <div className="two-col">
      <Panel title="Mật độ đỗ xe theo ngày trong tuần (%)" pad>
        {weekDensity.map(([d, v]) => (
          <div className="week-row" key={d}>
            <span>{d}</span>
            <Bar value={v} />
            <b>{v}%</b>
          </div>
        ))}
      </Panel>
      <Panel title="Phân loại phương tiện đỗ thực tế" pad>
        <div className="vtype-row">
          <span>Xe SUV (Gầm cao)</span>
          <b className="amber-t">47% (37 xe)</b>
        </div>
        <Bar value={47} tone="#f1bc5b" />
        <div className="vtype-row">
          <span>Xe Sedan / Hatchback</span>
          <b className="blue-t">49% (54 xe)</b>
        </div>
        <Bar value={49} tone="#4095ff" />
        <div className="vtype-row">
          <span>Xe quá khổ (Từ chối)</span>
          <b className="red-t">4% (3 xe)</b>
        </div>
        <Bar value={4} tone="#ff8996" />
      </Panel>
    </div>
  );
}
export default function Reports() {
  const [cat, setCat] = useState(0);
  return (
    <div className="two-col reports-col">
      <Panel title="Danh mục báo cáo" pad>
        <div className="report-cats">
          {reportCats.map((c, i) => (
            <button
              key={c}
              className={i === cat ? 'active' : ''}
              onClick={() => setCat(i)}
            >
              {c}
            </button>
          ))}
        </div>
      </Panel>
      <div className="stack">
        <ReportBody cat={cat} />
      </div>
    </div>
  );
}
