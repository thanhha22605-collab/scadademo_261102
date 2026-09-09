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
  Choice,
  MotorTrend,
  csv,
  type ScreenProps,
} from './shared';

export default function Historian({ sim, selected, setSelected }: ScreenProps) {
  const [histMetric, setHistMetric] = useState('current');
  const b = sim.blocks.find((x) => x.id === selected) ?? sim.blocks[0];
  const download = () =>
    csv(
      [
        ['Thời gian', 'Block', 'Nội dung'],
        ...sim.logs.map((l) => [l.time, l.block, l.text]),
      ],
      'totalparking-nhat-ky.csv',
    );
  return (
    <div className="stack">
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
        <div className="hist-metrics">
          {[
            { k: 'current', label: 'Dòng điện Motor nâng (A)' },
            { k: 'temp', label: 'Nhiệt độ động cơ (°C)' },
            { k: 'vfd', label: 'Tần số biến tần VFD (Hz)' },
          ].map((m) => (
            <button
              key={m.k}
              className={'metric-pill ' + (histMetric === m.k ? 'active' : '')}
              onClick={() => setHistMetric(m.k)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <MotorTrend metric={histMetric} />
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
          500 sự kiện gần nhất trong phiên mô phỏng. Tải lại trang sẽ khởi tạo
          lại dữ liệu.
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
