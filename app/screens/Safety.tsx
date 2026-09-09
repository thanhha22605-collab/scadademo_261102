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
import { blocked, active } from '@/lib/simulation';
import {
  Box,
  Badge,
  Choice,
  BlockSelector,
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
  const toggle = (
    field: 'doorClosed' | 'estop' | 'paused' | 'maintenance' | 'online',
  ) => dispatch({ type: 'toggle', block: b.id, field, time: time() });
  const conditions = [
    { label: 'Cửa an toàn đóng', ok: b.doorClosed, detail: 'Đóng kín trước khi vận hành' },
    { label: 'Không kích hoạt E-Stop', ok: !b.estop, detail: 'Nút dừng khẩn cấp phải nhả' },
    { label: 'Kết nối bộ điều khiển PLC', ok: b.state !== 'Offline', detail: 'Modbus TCP heartbeat' },
    { label: 'Không ở chế độ bảo trì', ok: b.state !== 'Bảo trì', detail: 'Maintenance mode phải tắt' },
    { label: 'Thiết bị không báo lỗi', ok: b.state !== 'Lỗi', detail: 'Không có fault đang treo' },
    { label: 'Block không bị khóa', ok: !b.locked, detail: 'Lock/Unlock từ Control Panel' },
  ];
  const anyBypass = sim.bypasses.length > 0 || sim.blocks.some((x) => x.forced);
  return (
    <>
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
        title={'Ma trận điều kiện an toàn · Block ' + b.id}
        aside={<span className="muted">Quét chu kỳ: 500ms</span>}
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
                  <td>Block {b.id}</td>
                  <td>
                    <Badge tone={c.ok ? 'green' : 'red'}>
                      {c.ok ? 'OK' : 'LỖI'}
                    </Badge>
                  </td>
                  <td>{c.ok ? 'Đạt điều kiện' : c.detail}</td>
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
        <Box title={'Điều khiển tín hiệu an toàn · Block ' + b.id}>
          <div className="safety-grid one">
            {[
              { field: 'doorClosed' as const, label: 'Cửa an toàn đóng', value: b.doorClosed },
              { field: 'estop' as const, label: 'Dừng khẩn cấp (E-STOP)', value: b.estop },
              { field: 'online' as const, label: 'Kết nối bộ điều khiển', value: b.state !== 'Offline' },
              { field: 'maintenance' as const, label: 'Chế độ bảo trì', value: b.state === 'Bảo trì' },
            ].map((x) => (
              <div className="safety-card" key={x.field}>
                <h3>{x.label}</h3>
                <Switch
                  aria-label={x.label}
                  checked={x.value}
                  disabled={
                    x.field === 'maintenance' &&
                    sim.jobs.some((j) => j.block === b.id && active(j))
                  }
                  onCheckedChange={() => toggle(x.field)}
                />
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
            value={bypBlock}
            onChange={setBypBlock}
            options={sim.blocks.map((x) => ({ value: x.id, label: 'Block ' + x.id }))}
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
              onChange={(e) => setBypReason(e.target.value)}
            />
          </label>
          <div className="control-actions">
            <button
              className="primary"
              onClick={() => {
                if (!bypReason.trim()) {
                  setBypNote('Vui lòng nhập lý do bypass.');
                  return;
                }
                dispatch({
                  type: 'bypass',
                  op: 'add',
                  device: bypDevice,
                  block: bypBlock,
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
            <div className="notice amber" role="status">
              {bypNote}
            </div>
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
            Không có sensor nào đang bị bypass.
          </div>
        )}
      </Box>
    </>
  );
}
