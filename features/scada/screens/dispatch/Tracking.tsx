'use client';
import { useState } from 'react';
import { Search } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { countOf, blockLabel } from '@/features/scada/model/simulation';
import {
  Box,
  Badge,
  Tag,
  ConnectionBadge,
  isReadOnly,
  type ScreenProps,
} from '@/features/scada/components/shared';

export default function Tracking({ sim }: ScreenProps) {
  const [query, setQuery] = useState('');
  const allCars = sim.blocks.flatMap((b) =>
    b.slots.flatMap((plate, i) =>
      plate
        ? [
            {
              plate,
              block: b.id,
              blockName: blockLabel(b),
              zone: b.zone,
              slot: i,
              kind: b.kinds[i],
            },
          ]
        : [],
    ),
  );
  const cars = allCars.filter((c) =>
    `${c.plate} ${c.block}`.toLowerCase().includes(query.toLowerCase()),
  );
  const readOnly = isReadOnly(sim);
  const untracked = Math.max(
    0,
    sim.blocks.reduce((total, block) => total + (countOf(block) ?? 0), 0) -
      allCars.length,
  );
  return (
    <>
      <div className="two-col">
        <Box title="Tìm kiếm xe & định vị nhanh">
          <div className="occ-badges">
            <ConnectionBadge sim={sim} />
          </div>
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Tìm biển số hoặc Block"
              placeholder="Biển số hoặc mã thẻ xe…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="control-line">
            <span>Đầu đọc cổng vào (In-Gate)</span>
            <Badge tone={readOnly ? 'amber' : 'blue'}>
              {readOnly ? 'CHƯA TÍCH HỢP' : 'MÔ PHỎNG'}
            </Badge>
          </div>
          <div className="control-line">
            <span>Đầu đọc cổng ra (Out-Gate)</span>
            <Badge tone={readOnly ? 'amber' : 'blue'}>
              {readOnly ? 'CHƯA TÍCH HỢP' : 'MÔ PHỎNG'}
            </Badge>
          </div>
        </Box>
        <Box title="Hành trình Pallet di chuyển">
          <ol className="journey">
            <li>
              <b>STEP 1 · Quét RFID & phân loại cổng vào</b>
              <span>
                Phát hiện xe tại Cổng 1, chụp ảnh LPR biển số và gán khay đỗ.
              </span>
            </li>
            <li>
              <b>STEP 2 · Bàn nâng nhận khay đỗ</b>
              <span>
                Xác nhận cảm biến tải trọng, motor phanh nhả và bàn nâng di
                chuyển.
              </span>
            </li>
            <li>
              <b>STEP 3 · Xếp khay vào ô đỗ chỉ định</b>
              <span>Di chuyển ngang pallet bằng cơ cấu Slide Runner.</span>
            </li>
          </ol>
        </Box>
      </div>
      <Box
        title="Truy vết xe & pallet"
        aside={<span className="muted">{cars.length} xe</span>}
      >
        {readOnly && untracked > 0 && (
          <div className="notice amber">
            PLC báo có {untracked} xe nhưng gateway chưa nhận biển số/RFID. Các
            xe này không được đưa vào bảng để tránh tạo dữ liệu giả.
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              {[
                'Biển số',
                'Loại xe',
                'Phân khu',
                'Block',
                'Pallet',
                'Trạng thái',
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cars.map((c) => (
              <TableRow key={`${c.block}-${c.slot}`}>
                <TableCell className="mono">{c.plate}</TableCell>
                <TableCell>{c.kind ?? '—'}</TableCell>
                <TableCell>Zone {c.zone}</TableCell>
                <TableCell>{c.blockName}</TableCell>
                <TableCell>P{String(c.slot + 1).padStart(2, '0')}</TableCell>
                <TableCell>
                  <Tag text="Đang đỗ" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!cars.length && (
          <div className="empty-state">Không tìm thấy xe phù hợp.</div>
        )}
      </Box>
    </>
  );
}
