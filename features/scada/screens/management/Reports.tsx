'use client';
import { useState } from 'react';
import {
  Panel,
  Badge,
  Bar,
  type ScreenProps,
} from '@/features/scada/components/shared';
import { blockFreq, seedCards } from '@/features/scada/data/demo';
import { countOf } from '@/features/scada/model/simulation';

const weekFactors = [
  ['Thứ Hai (T2)', 0.86],
  ['Thứ Ba (T3)', 1.02],
  ['Thứ Tư (T4)', 0.94],
  ['Thứ Năm (T5)', 1.08],
  ['Thứ Sáu (T6)', 1.16],
  ['Thứ Bảy (T7)', 0.76],
  ['Chủ Nhật (CN)', 0.58],
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
function ReportBody({
  cat,
  sim,
  from,
  to,
  zone,
}: {
  cat: number;
  sim: ScreenProps['sim'];
  from: string;
  to: string;
  zone: string;
}) {
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
  const blocks = sim.blocks.filter(
    (block) => zone === 'all' || block.zone === zone,
  );
  const capacity = blocks.reduce((sum, block) => sum + block.capacity, 0);
  const occupied = blocks.reduce(
    (sum, block) => sum + (countOf(block) ?? 0),
    0,
  );
  const suv = blocks.reduce(
    (sum, block) =>
      sum + block.kinds.filter((kind) => kind === 'SUV').length,
    0,
  );
  const sedan = blocks.reduce(
    (sum, block) =>
      sum + block.kinds.filter((kind) => kind === 'Sedan').length,
    0,
  );
  const rejected =
    sim.integrations?.camera?.outcome === 'rejected' ||
    sim.integrations?.camera?.outcome === 'no-capacity'
      ? 1
      : sim.source === 'sim'
        ? 3
        : 0;
  const vehicleTotal = Math.max(1, suv + sedan + rejected);
  const pct = (value: number) => Math.round((value / vehicleTotal) * 100);
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const elapsedDays = Math.floor((Number(end) - Number(start)) / 86400000) + 1;
  const days = Math.max(1, Math.min(366, elapsedDays));
  const baseDensity = capacity ? Math.round((occupied / capacity) * 100) : 0;
  const weekDensity = weekFactors.map(([label, factor], index) => {
    const adjusted = Math.round(
      baseDensity * factor + ((days + index) % 5) - 2,
    );
    return [label, Math.min(100, Math.max(0, adjusted))] as const;
  });
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
          <b className="amber-t">{pct(suv)}% ({suv} xe)</b>
        </div>
        <Bar value={pct(suv)} tone="#f1bc5b" />
        <div className="vtype-row">
          <span>Xe Sedan / Hatchback</span>
          <b className="blue-t">{pct(sedan)}% ({sedan} xe)</b>
        </div>
        <Bar value={pct(sedan)} tone="#4095ff" />
        <div className="vtype-row">
          <span>Xe quá khổ (Từ chối)</span>
          <b className="red-t">{pct(rejected)}% ({rejected} xe)</b>
        </div>
        <Bar value={pct(rejected)} tone="#ff8996" />
        <p className="hint">
          {sim.source === 'sim'
            ? 'Số liệu mô phỏng được tính lại theo trạng thái bãi hiện tại.'
            : 'Số liệu đang tính từ snapshot gateway; lịch sử đầy đủ phụ thuộc dữ liệu CSDL tại hiện trường.'}
        </p>
      </Panel>
    </div>
  );
}
export default function Reports({ sim }: ScreenProps) {
  const [cat, setCat] = useState(0);
  const [from, setFrom] = useState('2026-10-01');
  const [to, setTo] = useState('2026-11-01');
  const [zone, setZone] = useState('all');
  return (
    <div className="stack">
      <Panel title="Bộ lọc báo cáo nghiệm thu" pad>
        <div className="toolbar">
          <label className="field">
            <span>Từ ngày</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Đến ngày</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Zone</span>
            <select
              value={zone}
              onChange={(event) => setZone(event.target.value)}
            >
              <option value="all">Tất cả Zone</option>
              {[...new Set(sim.blocks.map((block) => block.zone))]
                .sort()
                .map((value) => (
                  <option key={value} value={value}>
                    Zone {value}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <p className="hint">
          Đang xem dữ liệu từ {from} đến {to} ·{' '}
          {zone === 'all' ? 'Tất cả Zone' : `Zone ${zone}`}.
        </p>
      </Panel>
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
          <ReportBody cat={cat} sim={sim} from={from} to={to} zone={zone} />
        </div>
      </div>
    </div>
  );
}
