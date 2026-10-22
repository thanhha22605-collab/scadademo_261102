'use client';
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { blocked, active, blockLabel } from '@/lib/simulation';
import {
  Box,
  Badge,
  Choice,
  BlockSelector,
  ConnectionBadge,
  EmptyState,
  isReadOnly,
  time,
  type ScreenProps,
} from './shared';

export default function Safety({
  sim,
  dispatch,
  selected,
  setSelected,
}: ScreenProps) {
  const [zone, setZone] = useState('all');
  const [bypDevice, setBypDevice] = useState('Photogate - Cảm biến an toàn');
  const [bypBlock, setBypBlock] = useState('A-01');
  const [bypTimeout, setBypTimeout] = useState('15');
  const [bypReason, setBypReason] = useState('');
  const [bypNote, setBypNote] = useState('');
  const b = sim.blocks.find((x) => x.id === selected) ?? sim.blocks[0];
  if (!b) return <EmptyState sim={sim} />;
  const ro = isReadOnly(sim); // nguồn PLC chỉ đọc → khóa mọi thao tác an toàn
  const bypassTarget = sim.blocks.some((block) => block.id === bypBlock)
    ? bypBlock
    : b.id;
  const toggle = (
    field:
      | 'doorClosed'
      | 'estop'
      | 'paused'
      | 'maintenance'
      | 'online'
      | 'photogateClear'
      | 'limitOk'
      | 'overloadOk',
  ) => {
    if (ro) return;
    dispatch({ type: 'toggle', block: b.id, field, time: time() });
  };
  const conditions = [
    { label: 'Cửa an toàn đóng', ok: b.doorClosed, detail: 'Đóng kín trước khi vận hành' },
    {
      label: 'Không kích hoạt E-Stop',
      ok: b.estop === null ? null : !b.estop,
      detail: 'Nút dừng khẩn cấp phải nhả',
    },
    {
      label: 'Kết nối bộ điều khiển PLC',
      ok: sim.connection === 'online' && b.online && b.quality === 'good',
      detail: 'Kiểm tra gateway và FINS heartbeat',
    },
    {
      label: 'Không ở chế độ bảo trì',
      ok: b.maintenance === null ? null : !b.maintenance,
      detail: 'Maintenance mode phải tắt',
    },
    {
      label: 'Thiết bị không báo lỗi',
      ok: b.fault === null || b.jammed === null ? null : !b.fault && !b.jammed,
      detail: 'Không có fault đang treo',
    },
    {
      label: 'Block không bị khóa',
      ok: b.locked === null ? null : !b.locked,
      detail: 'Lock/Unlock từ Control Panel',
    },
    {
      label: 'Liên động đã được reset',
      ok: b.safetyLatched === null ? null : !b.safetyLatched,
      detail: 'Sau khi khắc phục nguyên nhân, nhấn START/RESUME tại Control Panel',
    },
    {
      label: 'Photogate không có vật cản',
      ok: b.photogateClear,
      bypass: b.bypassed.includes('Photogate - Cảm biến an toàn'),
      detail: 'Kiểm tra vùng quét Photogate',
    },
    {
      label: 'Cảm biến hành trình hợp lệ',
      ok: b.limitOk,
      bypass: b.bypassed.includes('LS-T3 - Cảm biến hành trình'),
      detail: 'Kiểm tra LS-T3 và dây tín hiệu',
    },
    {
      label: 'Motor nâng không quá tải',
      ok: b.overloadOk,
      bypass: b.bypassed.includes('Lift Motor - Quá tải động cơ nâng'),
      detail: 'Kiểm tra tải và dòng motor nâng',
    },
  ];
  const anyBypass = !ro && (sim.bypasses.length > 0 || sim.blocks.some((x) => x.forced));
  return (
    <>
      <div className="occ-badges">
        <ConnectionBadge sim={sim} />
      </div>
      {ro && (
        <output className="notice amber">
          Nguồn dữ liệu là PLC (gateway chỉ đọc) — không thể đổi tín hiệu an toàn
          hay tạo Bypass từ đây; màn hình chỉ để giám sát liên động.
        </output>
      )}
      {anyBypass && (
        <div className="force-banner">
          <ShieldCheck size={16} />
          <b>CẢNH BÁO: ĐANG CÓ THIẾT BỊ BỊ BYPASS / FORCE HOẠT ĐỘNG</b>
          <Badge tone="red">Force Mode Active</Badge>
        </div>
      )}
      <BlockSelector
        sim={sim}
        current={b.id}
        zone={zone}
        setZone={setZone}
        onPick={setSelected}
      />
      <Box
        title={'Ma trận điều kiện an toàn · ' + blockLabel(b)}
        aside={
          <span className="muted">
            {sim.source === 'sim' ? 'Chu kỳ mô phỏng: 1.000ms' : 'Theo chu kỳ gateway'}
          </span>
        }
      >
        <div className="table-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Điều kiện an toàn</th>
                <th>Vị trí</th>
                <th>Trạng thái</th>
                <th>Hành động đề xuất</th>
              </tr>
            </thead>
            <tbody>
              {conditions.map((c, i) => (
                <tr key={c.label}>
                  <td>{String(i + 1).padStart(2, '0')}</td>
                  <td>{c.label}</td>
                  <td>{blockLabel(b)}</td>
                  <td>
                    <Badge
                      tone={
                        c.bypass ? 'amber' : c.ok === null ? 'amber' : c.ok ? 'green' : 'red'
                      }
                    >
                      {c.bypass
                        ? 'BYPASS'
                        : c.ok === null
                          ? 'CHƯA MAP'
                          : c.ok
                            ? 'OK'
                            : 'LỖI'}
                    </Badge>
                  </td>
                  <td>
                    {c.bypass
                      ? 'Đang bypass có thời hạn'
                      : c.ok === null
                        ? 'Gateway chưa cung cấp tín hiệu này'
                        : c.ok
                          ? 'Đạt điều kiện'
                          : c.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={'notice ' + (blocked(b) ? 'amber' : 'green')}>
          {blocked(b)
            ? `Block đang khóa: ${blocked(b)}`
            : 'Tất cả điều kiện đã thỏa mãn. Có thể nhập / xuất xe.'}
        </div>
      </Box>
      <div className="two-col">
        <Box title={'Điều khiển tín hiệu an toàn · ' + blockLabel(b)}>
          <div className="safety-grid one">
            {[
              { field: 'doorClosed' as const, label: 'Cửa an toàn đóng', value: b.doorClosed, known: b.doorClosed !== null },
              { field: 'estop' as const, label: 'Dừng khẩn cấp (E-STOP)', value: b.estop, known: b.estop !== null },
              { field: 'online' as const, label: 'Kết nối bộ điều khiển', value: b.online, known: true },
              { field: 'maintenance' as const, label: 'Chế độ bảo trì', value: b.maintenance, known: b.maintenance !== null },
              { field: 'photogateClear' as const, label: 'Photogate thông thoáng', value: b.photogateClear, known: b.photogateClear !== null },
              { field: 'limitOk' as const, label: 'Cảm biến hành trình OK', value: b.limitOk, known: b.limitOk !== null },
              { field: 'overloadOk' as const, label: 'Motor nâng không quá tải', value: b.overloadOk, known: b.overloadOk !== null },
            ].map((x) => (
              <div className="safety-card" key={x.field}>
                <h3>{x.label}</h3>
                {x.known ? (
                  <Switch
                    aria-label={x.label}
                    checked={x.value === true}
                    disabled={
                      ro ||
                      (x.field === 'maintenance' &&
                        sim.jobs.some((j) => j.block === b.id && active(j)))
                    }
                    onCheckedChange={() => toggle(x.field)}
                  />
                ) : (
                  <Badge tone="amber">CHƯA MAP</Badge>
                )}
              </div>
            ))}
          </div>
        </Box>
        <Box title="Tạo lệnh Bypass Sensor mới">
          <Choice
            label="Thiết bị / cảm biến"
            value={bypDevice}
            onChange={setBypDevice}
            options={[
              'Photogate - Cảm biến an toàn',
              'LS-T3 - Cảm biến hành trình',
              'Lift Motor - Quá tải động cơ nâng',
            ].map((v) => ({ value: v, label: v }))}
          />
          <Choice
            label="Vị trí Block đỗ"
            value={bypassTarget}
            onChange={setBypBlock}
            options={sim.blocks.map((x) => ({ value: x.id, label: blockLabel(x) }))}
          />
          <Choice
            label="Thời gian tự động tắt (Timeout)"
            value={bypTimeout}
            onChange={setBypTimeout}
            options={[
              { value: '5', label: '5 phút' },
              { value: '15', label: '15 phút' },
              { value: '30', label: '30 phút' },
              { value: '60', label: '60 phút (1 giờ)' },
            ]}
          />
          <label className="field">
            <span>Lý do Bypass (bắt buộc)</span>
            <input
              placeholder="Vd: Bảo trì cơ khí định kỳ, sensor báo lỗi giả…"
              value={bypReason}
              disabled={ro}
              onChange={(e) => setBypReason(e.target.value)}
            />
          </label>
          <div className="control-actions">
            <button
              className="primary"
              disabled={ro}
              onClick={() => {
                if (ro) return;
                if (!bypReason.trim()) {
                  setBypNote('Vui lòng nhập lý do bypass.');
                  return;
                }
                dispatch({
                  type: 'bypass',
                  op: 'add',
                  device: bypDevice,
                  block: bypassTarget,
                  timeout: Number(bypTimeout),
                  reason: bypReason.trim(),
                  time: time(),
                });
                setBypReason('');
                setBypNote('Đã kích hoạt bypass. Force Mode được bật.');
              }}
            >
              Kích hoạt Bypass
            </button>
          </div>
          {bypNote && (
            <output className="notice amber">
              {bypNote}
            </output>
          )}
        </Box>
      </div>
      <Box
        title="Danh sách Sensor đang Bypass"
        aside={<span className="muted">{sim.bypasses.length} thiết bị</span>}
      >
        <Table>
          <TableHeader>
            <TableRow>
              {['Thiết bị', 'Block', 'Timeout', 'Lý do', 'Lúc', 'Thao tác'].map(
                (h) => (
                  <TableHead key={h}>{h}</TableHead>
                ),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sim.bypasses.map((bp) => (
              <TableRow key={bp.id}>
                <TableCell>{bp.device}</TableCell>
                <TableCell>{bp.block}</TableCell>
                <TableCell>{bp.timeout} phút</TableCell>
                <TableCell>{bp.reason}</TableCell>
                <TableCell className="mono">{bp.at}</TableCell>
                <TableCell>
                  <button
                    className="secondary"
                    disabled={ro}
                    onClick={() =>
                      dispatch({
                        type: 'bypass',
                        op: 'remove',
                        id: bp.id,
                        time: time(),
                      })
                    }
                  >
                    Gỡ bypass
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!sim.bypasses.length && (
          <div className="empty-state">
            <ShieldCheck />
            {ro
              ? 'Gateway chưa cung cấp trạng thái bypass/force của PLC.'
              : 'Không có sensor nào đang bị bypass.'}
          </div>
        )}
      </Box>
    </>
  );
}
