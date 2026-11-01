'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Box,
  Panel,
  Bar,
  Kpi,
  Choice,
  MotorTrend,
  ConnectionBadge,
  EmptyState,
  isReadOnly,
  csv,
  type ScreenProps,
} from '@/features/scada/components/shared';

export default function Historian({ sim, selected, setSelected }: ScreenProps) {
  const [histMetric, setHistMetric] = useState('current');
  const [days, setDays] = useState('7');
  const b = sim.blocks.find((x) => x.id === selected) ?? sim.blocks[0];
  if (!b) return <EmptyState sim={sim} />;
  const readOnly = isReadOnly(sim);
  const download = () =>
    csv(
      [
        ['Thời gian', 'Block', 'Nội dung'],
        ...sim.logs.map((l) => [l.time, l.block, l.text]),
      ],
      'totalparking-nhat-ky.csv',
    );
  const range = Number(days);
  const daily = Array.from({ length: range }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (range - index - 1));
    const lookups = 28 + ((index * 17 + range) % 53);
    const routed = 18 + ((index * 11 + range) % 39);
    return {
      label: date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      }),
      lookups,
      routed,
    };
  });
  return (
    <div className="stack">
      <Panel
        title="Lịch sử tra cứu thẻ và xe vào bãi"
        aside={
          <Choice
            label="Khoảng thời gian"
            value={days}
            onChange={setDays}
            options={['7', '14', '30'].map((value) => ({
              value,
              label: `${value} ngày`,
            }))}
          />
        }
        pad
      >
        <div className="metrics metrics-2">
          <Kpi
            label="Tra cứu thẻ từ PLC"
            value={String(daily.reduce((sum, item) => sum + item.lookups, 0))}
            sub={`${days} ngày gần nhất`}
            tone="blue"
          />
          <Kpi
            label="Xe vào đã điều hướng"
            value={String(daily.reduce((sum, item) => sum + item.routed, 0))}
            sub={`${days} ngày gần nhất`}
            tone="green"
          />
        </div>
        <div className="daily-history">
          {daily.map((item) => (
            <div className="daily-history-row" key={item.label}>
              <span>{item.label}</span>
              <div>
                <Bar value={Math.min(100, item.lookups)} />
                <small>Tra cứu {item.lookups}</small>
              </div>
              <div>
                <Bar value={Math.min(100, item.routed)} tone="#31cba4" />
                <small>Xe vào {item.routed}</small>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Box
        title="Biểu đồ xu hướng kỹ thuật (Historian & Trend)"
        aside={
          <div className="hist-select">
            <Choice
              label=""
              value={b.id}
              onChange={setSelected}
              options={sim.blocks.map((x) => ({
                value: x.id,
                label: 'Block ' + x.id,
              }))}
            />
          </div>
        }
      >
        {readOnly ? (
          <>
            <div className="occ-badges">
              <ConnectionBadge sim={sim} />
            </div>
            <div className="empty-state">
              Gateway hiện chưa cung cấp dữ liệu historian dòng điện, nhiệt độ
              và VFD. Không hiển thị đường xu hướng mẫu dưới nhãn PLC thật.
            </div>
          </>
        ) : (
          <>
            <div className="hist-metrics">
              {[
                { k: 'current', label: 'Dòng điện Motor nâng (A)' },
                { k: 'temp', label: 'Nhiệt độ động cơ (°C)' },
                { k: 'vfd', label: 'Tần số biến tần VFD (Hz)' },
              ].map((m) => (
                <button
                  key={m.k}
                  className={
                    'metric-pill ' + (histMetric === m.k ? 'active' : '')
                  }
                  onClick={() => setHistMetric(m.k)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <MotorTrend metric={histMetric} />
          </>
        )}
      </Box>
      <Box
        title="Nhật ký vận hành"
        aside={
          <button
            className="secondary"
            disabled={!sim.logs.length}
            onClick={download}
          >
            <Download size={16} /> Xuất CSV
          </button>
        }
      >
        <p className="hint">
          {sim.source === 'sim'
            ? '500 sự kiện gần nhất trong phiên mô phỏng. Tải lại trang sẽ khởi tạo lại dữ liệu.'
            : 'Nhật ký cục bộ của phiên giám sát hiện tại; gateway chưa lưu historian tập trung.'}
        </p>
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Block</TableHead>
                <TableHead>Sự kiện</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sim.logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.time}</TableCell>
                  <TableCell>{l.block}</TableCell>
                  <TableCell>{l.text}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!sim.logs.length && (
          <div className="empty-state">
            Chưa có sự kiện. Nhật ký sẽ xuất hiện khi bạn thao tác.
          </div>
        )}
      </Box>
    </div>
  );
}
