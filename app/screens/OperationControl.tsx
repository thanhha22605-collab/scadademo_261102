'use client';
import { useCallback, useState } from 'react';
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
  type Block,
  type Mode,
} from '@/lib/simulation';
import {
  Box,
  Badge,
  Tag,
  BlockSelector,
  PlcCommander,
  modeButtons,
  time,
  type ScreenProps,
} from './shared';

export default function OperationControl({
  sim,
  dispatch,
  selected,
  setSelected,
}: ScreenProps) {
  const [zone, setZone] = useState('all');
  const [slot, setSlot] = useState(0);
  const [plate, setPlate] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('map');
  const b = sim.blocks.find((x) => x.id === selected) ?? sim.blocks[0];
  const job = sim.jobs.find((j) => j.block === b.id && active(j));
  const pick = (id: string) => {
    setSelected(id);
    setSlot(0);
    setNotice('');
  };
  const setMode = (m: Mode) => {
    if (m === 'Maint' && sim.jobs.some((j) => j.block === b.id && active(j))) {
      setNotice('Không thể vào bảo trì khi Block còn lệnh đang chờ / chạy.');
      return;
    }
    dispatch({ type: 'mode', block: b.id, mode: m, time: time() });
  };
  const cmd = (c: string) =>
    dispatch({ type: 'command', block: b.id, cmd: c, time: time() });
  const send = useCallback(
    (kind: 'in' | 'out') => {
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
      setNotice(
        `Đã thêm lệnh ${kind === 'in' ? 'nhập' : 'xuất'} xe vào hàng đợi.`,
      );
      if (kind === 'in') setPlate('');
    },
    [b.id, slot, plate, sim, dispatch],
  );
  const zoneBlocks = sim.blocks.filter((x) => zone === 'all' || x.zone === zone);
  const manual = b.mode === 'Manual';
  function palletGrid(block: Block) {
    return (
      <div className="pallet-grid">
        {block.slots.map((p, i) => {
          const reserved = sim.jobs.some(
            (j) => j.block === block.id && j.slot === i && active(j),
          );
          const fault = block.state === 'Lỗi' && i === 4;
          return (
            <button
              key={i}
              aria-pressed={selected === block.id && slot === i}
              className={
                'pallet ' +
                (fault ? 'fault ' : p ? 'occupied ' : '') +
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
              <strong>{p ?? (fault ? 'LỖI' : 'TRỐNG')}</strong>
              <small>
                {reserved
                  ? 'Đang điều phối'
                  : fault
                    ? 'Lỗi vị trí'
                    : p
                      ? 'Có xe'
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
        <Badge tone={b.state === 'Offline' ? 'red' : 'green'}>
          PLC Link: {b.state === 'Offline' ? 'MẤT' : 'OK'}
        </Badge>
        <Badge tone="blue">Operator Session · supervisor01</Badge>
        {b.forced && <Badge tone="red">Force Mode Active</Badge>}
      </div>
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
            aside={<Badge tone="blue">Mô phỏng thời gian thực</Badge>}
          >
            <div className="block-list">
              {zoneBlocks.map((x) => (
                <button
                  key={x.id}
                  className={'block-list-card ' + (x.id === b.id ? 'selected' : '')}
                  onClick={() => pick(x.id)}
                >
                  <div className="block-list-top">
                    <b>Block {x.id}</b>
                    <Tag text={status(x, sim)} />
                  </div>
                  <div className="block-list-meta">
                    <span>Chế độ: {x.mode}</span>
                    <span>
                      Đã đỗ: {x.slots.filter(Boolean).length}/{x.capacity} khay
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Box>
          {tab === 'map' ? (
            <Box
              title={'Sơ đồ khay đỗ cơ khí (Pallet Grid) · Block ' + b.id}
              aside={<span className="muted">Tổng số: {b.capacity} khay</span>}
            >
              <div className="floor-caption">
                <span>
                  {zoneLabel[b.zone]} / BLOCK {b.id}
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
            <Box title={'Sequence View · Block ' + b.id}>
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
                <div className="empty-state">Block chưa có lệnh nào.</div>
              )}
            </Box>
          )}
        </div>
        <div className="stack">
          <Box
            title={'Control Panel · Block ' + b.id}
            aside={<Tag text={status(b, sim)} />}
          >
            <div className="control-line">
              <span>Chế độ hoạt động</span>
              <strong>{b.mode.toUpperCase()}</strong>
            </div>
            <div className="control-line">
              <span>Liên động an toàn</span>
              <Tag text={blocked(b) || 'Bình thường'} />
            </div>
            <div className="control-line">
              <span>Trạng thái khóa</span>
              <strong>{b.locked ? 'Đã khóa' : 'Mở'}</strong>
            </div>
            <div className="ctrl-section">Chế độ hoạt động (Mode Selector)</div>
            <div className="mode-selector">
              {modeButtons.map((m) => (
                <button
                  key={m.m}
                  className={
                    'mode-btn ' +
                    (m.m === 'EStop' ? 'estop ' : '') +
                    (b.mode === m.m ? 'active' : '')
                  }
                  onClick={() => setMode(m.m)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="ctrl-section">Hành động khởi chạy (Block Commands)</div>
            <div className="cmd-grid">
              <button className="cmd-btn go" onClick={() => cmd('START')}>
                <Play size={14} /> START
              </button>
              <button className="cmd-btn stop" onClick={() => cmd('STOP')}>
                <Square size={14} /> STOP
              </button>
              <button className="cmd-btn" onClick={() => cmd('PAUSE')}>
                <Pause size={14} /> PAUSE
              </button>
              <button className="cmd-btn" onClick={() => cmd('RESUME')}>
                <RotateCcw size={14} /> RESUME
              </button>
              <button
                className={'cmd-btn ' + (b.locked ? 'active' : '')}
                onClick={() => cmd('LOCK')}
              >
                <Lock size={14} /> KHÓA
              </button>
              <button className="cmd-btn" onClick={() => cmd('UNLOCK')}>
                <Unlock size={14} /> MỞ KHÓA
              </button>
              <button className="cmd-btn" onClick={() => cmd('DISABLE_MAINT')}>
                Kết thúc bảo trì
              </button>
              <button
                className={'cmd-btn ' + (b.forced ? 'active' : '')}
                onClick={() => cmd('FORCE')}
              >
                <Zap size={14} /> Cưỡng bức
              </button>
              <button className="cmd-btn warn" onClick={() => cmd('SIM_FAULT')}>
                Giả lập lỗi
              </button>
              <button className="cmd-btn warn" onClick={() => cmd('SIM_JAM')}>
                Giả lập kẹt
              </button>
            </div>
            {notice && (
              <div className="notice" role="status">
                {notice}
              </div>
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
          <Box title="Gọi / Trả xe thủ công (Manual only)">
            {!manual && (
              <div className="notice amber">
                Chỉ thao tác được khi Block ở chế độ MANUAL. Chọn MANUAL ở Mode
                Selector.
              </div>
            )}
            <div className="control-line">
              <span>Khay đang chọn</span>
              <strong>P{String(slot + 1).padStart(2, '0')}</strong>
            </div>
            <div className="control-line">
              <span>Biển số tại khay</span>
              <strong>{b.slots[slot] ?? 'Không có xe'}</strong>
            </div>
            <label className="field">
              <span>Biển số xe gọi vào</span>
              <input
                placeholder="51H-123.45"
                value={plate}
                disabled={!manual}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
              />
            </label>
            <div className="control-actions">
              <button
                className="primary"
                disabled={!manual || !!blocked(b) || !!b.slots[slot]}
                onClick={() => send('in')}
              >
                <ArrowDownLeft size={16} /> Gửi lệnh Gọi xe
              </button>
              <button
                className="secondary"
                disabled={!manual || !!blocked(b) || !b.slots[slot]}
                onClick={() => send('out')}
              >
                <ArrowUpRight size={16} /> Gửi lệnh Trả xe
              </button>
            </div>
          </Box>
          <Box title="Gửi lệnh trực tiếp PLC (Direct PLC)">
            <p className="hint">
              Mô phỏng chu trình lệnh xuống PLC: Send → Sent → Accepted →
              Running → Done.
            </p>
            <PlcCommander block={b.id} dispatch={dispatch} />
          </Box>
        </div>
      </div>
    </>
  );
}
