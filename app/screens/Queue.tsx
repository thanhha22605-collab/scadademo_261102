'use client';
import { Ban, Car, Crown, Hand, Play } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { active, blocked, blockLabel } from '@/lib/simulation';
import { Box, Badge, Rows3, ConnectionBadge, isReadOnly, time, type ScreenProps } from './shared';

export default function Queue({ sim, dispatch }: ScreenProps) {
  const ro = isReadOnly(sim); // nguồn PLC chỉ đọc → khóa điều phối hàng đợi
  const eta = (p: number) => Math.max(0, Math.round((100 - p) / 10)) + 's';
  const blockOf = (j: (typeof sim.jobs)[number]) =>
    sim.blocks.find((block) => block.id === j.block);
  const pauseReason = (j: (typeof sim.jobs)[number]) => {
    const block = blockOf(j);
    return j.status === 'Đang chạy' && block ? blocked(block) : '';
  };
  const jobState = (j: (typeof sim.jobs)[number]) =>
    j.hold
      ? 'BỊ HOLD'
      : pauseReason(j)
        ? `TẠM DỪNG · ${pauseReason(j)}`
      : j.status === 'Đang chạy'
        ? 'ĐANG CHẠY'
        : j.status === 'Chờ xử lý'
          ? 'CHỜ CHẠY'
          : j.status.toUpperCase();
  const kindOf = (blk: string, i: number) =>
    sim.blocks.find((x) => x.id === blk)?.kinds[i] ?? '—';
  const rejected = sim.jobs.filter((j) => j.status === 'Đã hủy');
  const queueRow = (j: (typeof sim.jobs)[number], exit: boolean) => (
    <TableRow key={j.id}>
      <TableCell className="mono">{j.plate}</TableCell>
      <TableCell>{kindOf(j.block, j.slot)}</TableCell>
      <TableCell>
        {j.priority === 'VIP' ? (
          <Badge tone="amber">VIP</Badge>
        ) : (
          <span className="muted">NORMAL</span>
        )}
      </TableCell>
      <TableCell>
        {exit
          ? `P${String(j.slot + 1).padStart(2, '0')} (${blockOf(j) ? blockLabel(blockOf(j)!) : `Block ${j.block}`})`
          : blockOf(j)
            ? blockLabel(blockOf(j)!)
            : `Block ${j.block}`}
      </TableCell>
      <TableCell>
        <Badge
          tone={
            j.hold || pauseReason(j)
              ? 'amber'
              : j.status === 'Đang chạy'
                ? 'blue'
                : j.status === 'Chờ xử lý'
                  ? 'purple'
                  : 'green'
          }
        >
          {jobState(j)}
        </Badge>
      </TableCell>
      <TableCell className="mono">
        {j.status === 'Đang chạy' && !j.hold && !pauseReason(j)
          ? eta(j.progress)
          : '—'}
      </TableCell>
      <TableCell>
        <div className="row-actions">
          {j.priority !== 'VIP' && (
            <button
              className="mini"
              disabled={ro}
              onClick={() =>
                dispatch({ type: 'queue', op: 'vip', id: j.id, time: time() })
              }
            >
              <Crown size={13} /> VIP
            </button>
          )}
          {j.hold ? (
            <button
              className="mini"
              disabled={ro}
              onClick={() =>
                dispatch({ type: 'queue', op: 'resume', id: j.id, time: time() })
              }
            >
              <Play size={13} /> Resume
            </button>
          ) : (
            <button
              className="mini"
              disabled={ro}
              onClick={() =>
                dispatch({ type: 'queue', op: 'hold', id: j.id, time: time() })
              }
            >
              <Hand size={13} /> Hold
            </button>
          )}
          <button
            className="mini danger"
            disabled={ro || j.status !== 'Chờ xử lý'}
            onClick={() =>
              dispatch({ type: 'queue', op: 'reject', id: j.id, time: time() })
            }
          >
            <Ban size={13} /> Reject
          </button>
        </div>
      </TableCell>
    </TableRow>
  );
  const entry = sim.jobs.filter((j) => j.kind === 'in' && active(j));
  const exit = sim.jobs.filter((j) => j.kind === 'out' && active(j));
  return (
    <>
      <div className="occ-badges">
        <ConnectionBadge sim={sim} />
        {ro && <span className="muted">Chỉ đọc — không điều phối được hàng đợi từ nguồn PLC.</span>}
      </div>
      <Box
        title="Hàng đợi xe gửi vào bãi (Entry Queue)"
        aside={<span className="muted">{entry.length} xe đang chờ</span>}
      >
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                {['Biển số', 'Loại xe', 'Ưu tiên', 'Block chỉ định', 'Trạng thái', 'ETA', 'Hành động'].map(
                  (h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>{entry.map((j) => queueRow(j, false))}</TableBody>
          </Table>
        </div>
        {!entry.length && (
          <div className="empty-state">
            <Car />
            {ro
              ? 'Gateway chưa cung cấp dữ liệu hàng đợi xe vào.'
              : 'Chưa có xe chờ vào. Tạo lệnh tại Điều khiển vận hành.'}
          </div>
        )}
      </Box>
      <Box
        title="Hàng đợi xe lấy ra bãi (Exit Queue)"
        aside={<span className="muted">{exit.length} xe đang chờ</span>}
      >
        <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                {['Biển số', 'Loại xe', 'Ưu tiên', 'Vị trí đỗ', 'Trạng thái', 'ETA', 'Hành động'].map(
                  (h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>{exit.map((j) => queueRow(j, true))}</TableBody>
          </Table>
        </div>
        {!exit.length && (
          <div className="empty-state">
            {ro
              ? 'Gateway chưa cung cấp dữ liệu hàng đợi xe ra.'
              : 'Chưa có xe chờ lấy ra.'}
          </div>
        )}
      </Box>
      <div className="two-col">
        <Box
          title="Hiệu suất điều phối hàng đợi"
          aside={<span className="muted">{ro ? 'Chưa tích hợp' : 'Dữ liệu mẫu'}</span>}
        >
          {ro ? (
            <div className="empty-state">
              Gateway chưa cung cấp thống kê thời gian xử lý hàng đợi.
            </div>
          ) : (
            <Rows3
              rows={[
                ['Thời gian trung bình xử lý', '12.5s'],
                ['Tỷ lệ điều phối đúng hạn', '98.4%'],
                ['Tỷ lệ xe bị từ chối đỗ', '1.2%'],
              ]}
            />
          )}
        </Box>
        <Box title="Danh sách xe bị từ chối / hủy (Rejected)">
          {rejected.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Biển số</TableHead>
                  <TableHead>Loại lệnh</TableHead>
                  <TableHead>Block</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejected.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="mono">{j.plate}</TableCell>
                    <TableCell>{j.kind === 'in' ? 'Nhập' : 'Xuất'}</TableCell>
                    <TableCell>{j.block}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="empty-state">
              {ro
                ? 'Gateway chưa cung cấp lịch sử lệnh bị từ chối.'
                : 'Chưa có lệnh bị từ chối.'}
            </div>
          )}
        </Box>
      </div>
    </>
  );
}
