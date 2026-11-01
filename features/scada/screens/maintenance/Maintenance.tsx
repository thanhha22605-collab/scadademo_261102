'use client';
import { useState } from 'react';
import {
  Activity,
  FileText,
  Gauge,
  RefreshCw,
  Settings as SettingsIcon,
  Timer,
  Wrench,
} from 'lucide-react';
import {
  Panel,
  Badge,
  Bar,
  Kpi,
  Choice,
  ConnectionBadge,
  type ScreenProps,
} from '@/features/scada/components/shared';
import { isActiveAlarm } from '@/features/scada/model/simulation';
import { blockFreq, faultLog } from '@/features/scada/data/demo';

const workOrders = [
  [
    'A',
    'Block A-04',
    'Motor Nâng Hạ',
    '5,640',
    '6,000',
    '2100/2400',
    '2026-06-15',
    'Khẩn cấp',
    'red',
  ],
  [
    'B',
    'Block B-01',
    'Motor Trượt Ngang',
    '2,100',
    '2,500',
    '760/1000',
    '2026-06-22',
    'Cao',
    'amber',
  ],
  [
    'A',
    'Block A-03',
    'Xích nâng',
    '4,110',
    '5,000',
    '1540/2000',
    '2026-06-30',
    'Cao',
    'amber',
  ],
  [
    'B',
    'Block B-03',
    'Dầu hộp số',
    '8,900',
    '10,000',
    '3200/4000',
    '2026-07-10',
    'Trung bình',
    'blue',
  ],
  [
    'A',
    'Block A-02',
    'Cảm biến kích thước',
    '2,910',
    '5,000',
    '980/2000',
    '2026-07-20',
    'Thấp',
    'green',
  ],
];
export default function Maintenance({
  sim,
  selected,
  setSelected,
}: ScreenProps) {
  const [tab, setTab] = useState('overview');
  const zones = [...new Set(sim.blocks.map((block) => block.zone))].sort();
  const [zone, setZone] = useState(zones[0] ?? 'A');
  const selectedBlock =
    sim.blocks.find((block) => block.id === selected) ?? sim.blocks[0];
  const zoneBlocks = sim.blocks.filter((block) => block.zone === zone);
  const openFaults = sim.alarms.filter(
    (alarm) =>
      isActiveAlarm(alarm) &&
      (!selectedBlock || alarm.block === selectedBlock.id),
  );
  const history = [
    ...sim.logs
      .filter((log) => !selectedBlock || log.block === selectedBlock.id)
      .map((log) => [
        log.time,
        log.block,
        'EVENT',
        log.text,
        'Đã ghi nhận',
        '—',
      ]),
    ...faultLog,
  ].slice(0, 20);
  const motorCycles = selectedBlock
    ? selectedBlock.capacity * 100 +
      sim.jobs.filter((job) => job.block === selectedBlock.id).length
    : 0;
  return (
    <>
      <div className="occ-badges">
        <ConnectionBadge sim={sim} />
        <Badge tone={sim.source === 'sim' ? 'blue' : 'green'}>
          {sim.source === 'sim'
            ? 'Dữ liệu nghiệm thu mô phỏng'
            : 'Dữ liệu gateway'}
        </Badge>
      </div>
      {selectedBlock && (
        <>
          <div className="toolbar">
            <Choice
              label="Zone"
              value={zone}
              onChange={(value) => {
                setZone(value);
                const first = sim.blocks.find((block) => block.zone === value);
                if (first) setSelected(first.id);
              }}
              options={zones.map((value) => ({
                value,
                label: `Zone ${value}`,
              }))}
            />
            <Choice
              label="Block"
              value={selectedBlock.id}
              onChange={setSelected}
              options={zoneBlocks.map((block) => ({
                value: block.id,
                label: `Block ${block.id}`,
              }))}
            />
          </div>
          <div className="metrics metrics-3">
            <Kpi
              label="Lỗi đang mở"
              value={String(openFaults.length)}
              sub={`Block ${selectedBlock.id}`}
              tone={openFaults.length ? 'red' : 'green'}
              icon={Activity}
            />
            <Kpi
              label="Chu kỳ motor"
              value={motorCycles.toLocaleString('vi-VN')}
              sub="Bộ đếm vận hành"
              tone="blue"
              icon={RefreshCw}
            />
            <Kpi
              label="Lịch sử gần nhất"
              value={String(history.length)}
              sub="Tối đa 20 bản ghi"
              tone="purple"
              icon={FileText}
            />
          </div>
          <Panel title="20 lỗi và sự kiện gần nhất theo Block" pad>
            <div className="table-scroll">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Block</th>
                    <th>Mã</th>
                    <th>Nội dung</th>
                    <th>Trạng thái</th>
                    <th>Người ACK</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, index) => (
                    <tr key={`${row[0]}-${index}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
      <div className="occ-tabs">
        <button
          className={tab === 'overview' ? 'active' : ''}
          onClick={() => setTab('overview')}
        >
          Tổng quan & lịch bảo trì
        </button>
        <button
          className={tab === 'remote' ? 'active' : ''}
          onClick={() => setTab('remote')}
        >
          Chẩn đoán lỗi từ xa (Remote Diagnostics)
        </button>
      </div>
      {tab === 'remote' ? (
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
              value="1"
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
                    <th>Nguyên nhân gốc</th>
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
      ) : (
        <>
          <div className="metrics metrics-4">
            <Kpi
              label="Khẩn cấp"
              value="1"
              sub="thiết bị"
              tone="red"
              icon={Wrench}
            />
            <Kpi
              label="Ưu tiên cao"
              value="2"
              sub="thiết bị"
              tone="amber"
              icon={Activity}
            />
            <Kpi
              label="Tổng work order"
              value="5"
              sub="trong 30 ngày"
              tone="blue"
              icon={FileText}
            />
            <Kpi
              label="Block đang bảo trì"
              value="1"
              sub="block"
              tone="purple"
              icon={SettingsIcon}
            />
          </div>
          <Panel title="Tần suất hoạt động theo Block" pad>
            <div className="freq-grid">
              {blockFreq.map((b) => (
                <div className="freq" key={b.id}>
                  <div className="freq-head">
                    <b>{b.id}</b>
                    <small>{b.z}</small>
                  </div>
                  <div className="freq-meta">
                    <span>Chu kỳ: {b.cyc}</span>
                    <span>Runtime: {b.rt}</span>
                  </div>
                  <Bar value={b.pct} />
                  <span className="freq-pct">{b.pct}%</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel
            title="Danh sách Work Order đề xuất"
            aside={<span className="muted">Sắp xếp theo mức ưu tiên</span>}
            pad
          >
            <div className="table-scroll">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th>Block</th>
                    <th>Thiết bị</th>
                    <th>Chu kỳ</th>
                    <th>Giới hạn</th>
                    <th>Runtime</th>
                    <th>Ngày dự kiến</th>
                    <th>Ưu tiên</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((w) => (
                    <tr key={w[1] as string}>
                      <td>{w[0]}</td>
                      <td>{w[1]}</td>
                      <td>{w[2]}</td>
                      <td className="mono">{w[3]}</td>
                      <td className="mono">{w[4]}</td>
                      <td className="mono">{w[5]}</td>
                      <td>{w[6]}</td>
                      <td>
                        <Badge tone={w[8] as string}>{w[7]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
