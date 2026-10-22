'use client';
import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Car,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Square,
  Unlock,
  Zap,
} from 'lucide-react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  blocked,
  active,
  status,
  validateDispatch,
  zoneLabel,
  occupancyOf,
  countOf,
  blockLabel,
  type Block,
  type Mode,
} from '@/lib/simulation';
import {
  Box,
  Badge,
  Tag,
  BlockSelector,
  PlcCommander,
  ConnectionBadge,
  EmptyState,
  isReadOnly,
  modeButtons,
  time,
  type ScreenProps,
} from './shared';

export default function OperationControl({
  sim,
  dispatch,
  selected,
  setSelected,
  setPage,
}: ScreenProps) {
  const [zone, setZone] = useState('all');
  const [slot, setSlot] = useState(0);
  const [plate, setPlate] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('map');
  const b = sim.blocks.find((x) => x.id === selected) ?? sim.blocks[0];
  if (!b) return <EmptyState sim={sim} />;
  /* Nguồn PLC là CHỈ ĐỌC: khóa toàn bộ nút điều khiển, chỉ giám sát. */
  const ro = isReadOnly(sim);
  const job =
    sim.jobs.find((j) => j.block === b.id && j.status === 'Đang chạy') ??
    sim.jobs.find((j) => j.block === b.id && active(j));
  const pick = (id: string) => {
    setSelected(id);
    setSlot(0);
    setNotice('');
  };
  const setMode = (m: Mode) => {
    if (ro) return;
    if (m === 'Maint' && sim.jobs.some((j) => j.block === b.id && active(j))) {
      setNotice('Không thể vào bảo trì khi Block còn lệnh đang chờ / chạy.');
      return;
    }
    dispatch({ type: 'mode', block: b.id, mode: m, time: time() });
  };
  const cmd = (c: string) => {
    if (ro) return;
    dispatch({ type: 'command', block: b.id, cmd: c, time: time() });
  };
  const send = (kind: 'in' | 'out') => {
    if (ro) return;
    const action = {
      type: 'dispatch' as const,
      block: b.id,
      slot,
      plate,
      kind,
      time: time(),
    };
    const error = validateDispatch(sim, action);
    if (error) {
      setNotice(error);
      return;
    }
    dispatch(action);
    setNotice(`Đã thêm lệnh ${kind === 'in' ? 'nhập' : 'xuất'} xe vào hàng đợi.`);
    if (kind === 'in') setPlate('');
  };
  const zoneBlocks = sim.blocks.filter((x) => zone === 'all' || x.zone === zone);
  // Gọi/Trả xe được phép khi block vận hành được (khớp reducer: không bắt buộc mode Manual);
  // chỉ khóa khi nguồn PLC chỉ-đọc hoặc block đang bị liên động chặn.
  const canManual = !ro && !blocked(b);
  const selectedPresence = occupancyOf(b)[slot];
  const linkOk =
    sim.connection === 'online' && b.online && b.quality === 'good';
  function palletGrid(block: Block) {
    const occupancy = occupancyOf(block);
    return (
      <div className="pallet-grid">
        {Array.from({ length: block.capacity }, (_, i) => {
          const plateAtSlot = block.slots[i];
          const presence = occupancy[i];
          const reserved = sim.jobs.some(
            (j) => j.block === block.id && j.slot === i && active(j),
          );
          return (
            <button
              key={i}
              aria-pressed={selected === block.id && slot === i}
              className={
                'pallet ' +
                (presence === true ? 'occupied ' : '') +
                (reserved ? 'reserved ' : '') +
                (selected === block.id && slot === i ? 'selected' : '')
              }
              onClick={() => {
                setSelected(block.id);
                setSlot(i);
                setNotice('');
              }}
            >
              <span className="pallet-number">
                P{String(i + 1).padStart(2, '0')}
              </span>
              <Car size={27} />
              <strong>
                {plateAtSlot ??
                  (presence === true
                    ? 'CÓ XE'
                    : presence === null
                      ? 'CHƯA RÕ'
                      : 'TRỐNG')}
              </strong>
              <small>
                {reserved
                  ? 'Đang điều phối'
                  : presence === true
                    ? plateAtSlot
                      ? 'Có xe'
                      : 'Chưa có biển số'
                    : presence === null
                      ? 'Dữ liệu chưa xác nhận'
                      : 'Sẵn sàng'}
              </small>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <>
      <div className="occ-badges">
        <ConnectionBadge sim={sim} />
        {sim.source === 'sim' ? (
          <Badge tone="blue">Tín hiệu PLC được mô phỏng</Badge>
        ) : (
          <Badge tone={linkOk ? 'green' : b.quality === 'stale' ? 'amber' : 'red'}>
            PLC Link: {linkOk ? 'OK' : b.quality === 'stale' ? 'STALE' : 'MẤT'}
          </Badge>
        )}
        <Badge tone="blue">Người dùng mẫu · supervisor01</Badge>
        {b.forced && <Badge tone="red">Force Mode Active</Badge>}
      </div>
      {ro && (
        <output className="notice amber">
          Nguồn dữ liệu là PLC (gateway chỉ đọc) — mọi lệnh điều khiển đã bị khóa,
          màn hình chỉ dùng để giám sát.
        </output>
      )}
      <BlockSelector
        sim={sim}
        current={b.id}
        zone={zone}
        setZone={setZone}
        onPick={pick}
      />
      <div className="occ-tabs">
        <button
          className={tab === 'map' ? 'active' : ''}
          onClick={() => setTab('map')}
        >
          Bản đồ vận hành
        </button>
        <button
          className={tab === 'seq' ? 'active' : ''}
          onClick={() => setTab('seq')}
        >
          Sequence View
        </button>
      </div>
      <div className="operation-layout">
        <div className="stack">
          <Box
            title={'Danh sách Block · ' + (zone === 'all' ? 'Tất cả Zone' : zoneLabel[zone])}
            aside={
              <Badge tone={sim.source === 'sim' ? 'blue' : 'green'}>
                {sim.source === 'sim' ? 'Mô phỏng thời gian thực' : 'Giám sát chỉ đọc'}
              </Badge>
            }
          >
            <div className="block-list">
              {zoneBlocks.map((x) => (
                <button
                  key={x.id}
                  className={'block-list-card ' + (x.id === b.id ? 'selected' : '')}
                  onClick={() => pick(x.id)}
                >
                  <div className="block-list-top">
                    <b>{blockLabel(x)}</b>
                    <Tag text={status(x, sim)} />
                  </div>
                  <div className="block-list-meta">
                    <span>Chế độ: {x.mode ?? 'Chưa ánh xạ'}</span>
                    <span>
                      Đã đỗ: {countOf(x) ?? '—'}/{x.capacity} khay
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Box>
          {tab === 'map' ? (
            <Box
              title={'Sơ đồ khay đỗ cơ khí (Pallet Grid) · ' + blockLabel(b)}
              aside={<span className="muted">Tổng số: {b.capacity} khay</span>}
            >
              <div className="floor-caption">
                <span>
                  {zoneLabel[b.zone] ?? `Zone ${b.zone}`} / {blockLabel(b)}
                </span>
                <span>↑ HƯỚNG DI CHUYỂN</span>
              </div>
              {palletGrid(b)}
              <div className="driveway">
                ← LÀN LƯU THÔNG <span>VÀO / RA →</span>
              </div>
              <div className="pallet-legend">
                <span>
                  <i className="lg-empty" />
                  Khay trống
                </span>
                <span>
                  <i className="lg-occ" />
                  Đã đăng ký đỗ
                </span>
                <span>
                  <i className="lg-res" />
                  Đang vận hành điều phối
                </span>
                <span>
                  <i className="lg-fault" />
                  Lỗi vị trí
                </span>
              </div>
            </Box>
          ) : (
            <Box title={'Sequence View · ' + blockLabel(b)}>
              <Table>
                <TableHeader>
                  <TableRow>
                    {['Lệnh', 'Biển số', 'Khay', 'Loại', 'Tiến trình', 'Trạng thái'].map(
                      (h) => (
                        <TableHead key={h}>{h}</TableHead>
                      ),
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sim.jobs
                    .filter((j) => j.block === b.id)
                    .map((j) => (
                      <TableRow key={j.id}>
                        <TableCell>#{j.id}</TableCell>
                        <TableCell className="mono">{j.plate}</TableCell>
                        <TableCell>P{String(j.slot + 1).padStart(2, '0')}</TableCell>
                        <TableCell>{j.kind === 'in' ? 'Gọi vào' : 'Trả ra'}</TableCell>
                        <TableCell>
                          <div className="queue-progress">
                            <Progress value={j.progress} />
                            <span>{j.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            tone={
                              j.hold
                                ? 'amber'
                                : j.status === 'Đang chạy'
                                  ? 'blue'
                                  : j.status === 'Hoàn tất'
                                    ? 'green'
                                    : 'purple'
                            }
                          >
                            {j.hold ? 'Hold' : j.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              {!sim.jobs.some((j) => j.block === b.id) && (
                <div className="empty-state">
                  {ro
                    ? 'Gateway chưa cung cấp dữ liệu hàng đợi/sequence của PLC.'
                    : 'Block chưa có lệnh nào.'}
                </div>
              )}
            </Box>
          )}
        </div>
        <div className="stack">
          <Box
            title={'Control Panel · ' + blockLabel(b)}
            aside={<Tag text={status(b, sim)} />}
          >
            <div className="control-line">
              <span>Chế độ hoạt động</span>
              <strong>{(b.mode ?? '—').toUpperCase()}</strong>
            </div>
            <div className="control-line">
              <span>Liên động an toàn</span>
              <Tag text={blocked(b) || 'Bình thường'} />
            </div>
            <div className="control-line">
              <span>Trạng thái khóa</span>
              <strong>
                {b.locked === null ? '— Chưa ánh xạ' : b.locked ? 'Đã khóa' : 'Mở'}
              </strong>
            </div>
            <div className="ctrl-section">Chế độ hoạt động (Mode Selector)</div>
            <div className="mode-selector">
              {modeButtons.map((m) => (
                <button
                  key={m.m}
                  disabled={ro}
                  className={
                    'mode-btn ' +
                    (m.m === 'EStop' ? 'estop ' : '') +
                    (!ro && b.mode === m.m ? 'active' : '')
                  }
                  onClick={() => setMode(m.m)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="ctrl-section">Hành động khởi chạy (Block Commands)</div>
            <div className="cmd-grid">
              <button className="cmd-btn go" disabled={ro} onClick={() => cmd('START')}>
                <Play size={14} /> START
              </button>
              <button className="cmd-btn stop" disabled={ro} onClick={() => cmd('STOP')}>
                <Square size={14} /> STOP
              </button>
              <button className="cmd-btn" disabled={ro} onClick={() => cmd('PAUSE')}>
                <Pause size={14} /> PAUSE
              </button>
              <button className="cmd-btn" disabled={ro} onClick={() => cmd('RESUME')}>
                <RotateCcw size={14} /> RESUME
              </button>
              <button
                className={'cmd-btn ' + (b.locked ? 'active' : '')}
                disabled={ro}
                onClick={() => cmd('LOCK')}
              >
                <Lock size={14} /> KHÓA
              </button>
              <button className="cmd-btn" disabled={ro} onClick={() => cmd('UNLOCK')}>
                <Unlock size={14} /> MỞ KHÓA
              </button>
              <button className="cmd-btn" disabled={ro} onClick={() => cmd('DISABLE_MAINT')}>
                Kết thúc bảo trì
              </button>
              <button
                className={'cmd-btn ' + (b.forced ? 'active' : '')}
                onClick={() => setPage('safety')}
              >
                <Zap size={14} /> Mở trang Bypass
              </button>
              <button className="cmd-btn warn" disabled={ro} onClick={() => cmd('SIM_FAULT')}>
                Giả lập lỗi
              </button>
              <button className="cmd-btn warn" disabled={ro} onClick={() => cmd('SIM_JAM')}>
                Giả lập kẹt
              </button>
            </div>
            {notice && (
              <output className="notice">
                {notice}
              </output>
            )}
            {job && (
              <div className="job-progress">
                <div>
                  <span>{blocked(b) ? 'Lệnh đang bị giữ' : job.status}</span>
                  <strong>{job.progress}%</strong>
                </div>
                <Progress value={job.progress} />
                <small>
                  {job.plate} ·{' '}
                  {job.progress < 30
                    ? 'Kiểm tra và tiếp nhận'
                    : job.progress < 70
                      ? 'Di chuyển pallet'
                      : 'Đưa xe về vị trí'}
                </small>
              </div>
            )}
          </Box>
          <Box title="Gọi / Trả xe (thủ công)">
            {!canManual && (
              <div className="notice amber">
                {ro
                  ? 'Nguồn PLC chỉ đọc — không gửi lệnh điều phối được.'
                  : `Không thể điều phối: ${blocked(b)}.`}
              </div>
            )}
            <div className="control-line">
              <span>Khay đang chọn</span>
              <strong>P{String(slot + 1).padStart(2, '0')}</strong>
            </div>
            <div className="control-line">
              <span>Biển số tại khay</span>
              <strong>
                {b.slots[slot] ??
                  (selectedPresence === true
                    ? 'Có xe · chưa có biển số'
                    : selectedPresence === null
                      ? 'Chưa xác nhận'
                      : 'Không có xe')}
              </strong>
            </div>
            <label className="field">
              <span>Biển số xe gọi vào</span>
              <input
                placeholder="51H-123.45"
                value={plate}
                disabled={!canManual}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
              />
            </label>
            <div className="control-actions">
              <button
                className="primary"
                disabled={!canManual || selectedPresence !== false}
                onClick={() => send('in')}
              >
                <ArrowDownLeft size={16} /> Gửi lệnh Gọi xe
              </button>
              <button
                className="secondary"
                disabled={!canManual || selectedPresence !== true}
                onClick={() => send('out')}
              >
                <ArrowUpRight size={16} /> Gửi lệnh Trả xe
              </button>
            </div>
          </Box>
          <Box title="Gửi lệnh trực tiếp PLC (Direct PLC)">
            <p className="hint">
              {ro
                ? 'Gateway hiện chỉ đọc — chưa có kênh ghi/điều khiển xuống PLC.'
                : 'Mô phỏng chu trình lệnh xuống PLC: Send → Sent → Accepted → Running → Done.'}
            </p>
            <PlcCommander block={b.id} dispatch={dispatch} readOnly={ro} />
          </Box>
        </div>
      </div>
    </>
  );
}
