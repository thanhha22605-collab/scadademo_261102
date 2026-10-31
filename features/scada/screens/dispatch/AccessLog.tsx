'use client';
import { useMemo, useState } from 'react';
import {
  Search,
  LogIn,
  LogOut,
  CreditCard,
  Download,
  ShieldAlert,
} from 'lucide-react';
import {
  Box,
  Badge,
  Tag,
  Kpi,
  Rows3,
  ConnectionBadge,
  csv,
  type ScreenProps,
} from '@/features/scada/components/shared';
import {
  seedCards,
  accessEvents,
  type CardRow,
  type AccessEvent,
} from '@/features/scada/data/demo';

/* Chuẩn hóa UID để so khớp bất kể dấu ':', khoảng trắng hay hoa/thường. */
const norm = (s: string) => s.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();

function findCard(term: string): CardRow | null {
  const q = term.trim();
  if (!q) return null;
  const nq = norm(q);
  return (
    seedCards.find((c) => norm(c.uid) === nq) ??
    seedCards.find(
      (c) =>
        norm(c.uid).includes(nq) ||
        c.plate.toUpperCase().includes(q.toUpperCase()) ||
        c.id.toUpperCase().includes(q.toUpperCase()),
    ) ??
    null
  );
}

export default function AccessLog({ sim }: ScreenProps) {
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState('');

  const card = useMemo(() => findCard(term), [term]);
  const events = useMemo<AccessEvent[]>(() => {
    if (!card) return [];
    return accessEvents
      .filter((e) => norm(e.uid) === norm(card.uid))
      .sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [card]);

  const granted = events.filter((e) => e.result === 'Cho phép');
  const latest = granted[0];
  const inParking = latest?.dir === 'IN';
  const statusText = !latest
    ? 'Chưa vào bãi'
    : inParking
      ? 'Đang trong bãi'
      : 'Đã rời bãi';
  const inCount = granted.filter((e) => e.dir === 'IN').length;
  const deniedCount = events.filter((e) => e.result === 'Từ chối').length;

  const lookup = (value: string) => {
    setQuery(value);
    setTerm(value);
  };
  const exportCsv = () =>
    card &&
    csv(
      [
        [
          'Thời gian',
          'Chiều',
          'Cổng',
          'Biển số',
          'Block',
          'Khay',
          'Kết quả',
          'Ghi chú',
        ],
        ...events.map((e) => [
          e.at,
          e.dir === 'IN' ? 'VÀO' : 'RA',
          e.gate,
          e.plate,
          e.block,
          e.slot >= 0 ? 'P' + String(e.slot + 1).padStart(2, '0') : '—',
          e.result,
          e.reason ?? '',
        ]),
      ],
      `access-${norm(card.uid)}.csv`,
    );

  return (
    <>
      <div className="occ-badges">
        <ConnectionBadge sim={sim} />
        <span className="muted">
          Nguồn RFID/LPR: dữ liệu mẫu (chưa tích hợp đầu đọc thật)
        </span>
      </div>

      <Box title="Tra cứu thẻ ra / vào theo UID">
        <form
          className="search-field"
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(query);
          }}
        >
          <Search size={17} />
          <input
            aria-label="Nhập UID thẻ (hoặc biển số)"
            placeholder="Quét / nhập UID thẻ, ví dụ 04:1A:2B:3C — hoặc biển số"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="primary" type="submit">
            Tra cứu
          </button>
        </form>
        <div
          className="row-actions"
          style={{ marginTop: 10, flexWrap: 'wrap' }}
        >
          <span className="muted">UID mẫu:</span>
          {seedCards.map((c) => (
            <button key={c.uid} className="mini" onClick={() => lookup(c.uid)}>
              <CreditCard size={13} /> {c.uid}
            </button>
          ))}
        </div>
        <p className="hint">
          Nhập UID thẻ ra/vào để truy vết lịch sử xe đã vào / rời hệ thống. Khi
          tích hợp đầu đọc RFID và camera LPR thật, nguồn sự kiện ra/vào sẽ thay
          thế dữ liệu mẫu này.
        </p>
      </Box>

      {!term ? (
        <div className="empty-state">
          Nhập UID thẻ ở trên (hoặc chọn một UID mẫu) để bắt đầu tra cứu.
        </div>
      ) : !card ? (
        <div className="empty-state">
          Không tìm thấy thẻ khớp với “{term}”. Kiểm tra lại UID thẻ ra/vào.
        </div>
      ) : (
        <>
          <div className="metrics metrics-3">
            <Kpi
              label="Trạng thái hiện tại"
              value={statusText}
              sub={
                inParking && latest
                  ? `Block ${latest.block} · P${String(latest.slot + 1).padStart(2, '0')}`
                  : '—'
              }
              tone={inParking ? 'green' : latest ? 'blue' : 'amber'}
              icon={inParking ? LogIn : LogOut}
            />
            <Kpi
              label="Tổng lượt vào"
              value={String(inCount)}
              sub={
                deniedCount
                  ? `${deniedCount} lượt bị từ chối`
                  : 'Không có lượt bị từ chối'
              }
              tone="blue"
              icon={LogIn}
            />
            <Kpi
              label="Lần quét gần nhất"
              value={events[0] ? events[0].at.slice(11) : '—'}
              sub={events[0]?.at.slice(0, 10) ?? '—'}
              tone="purple"
              icon={Search}
            />
          </div>

          {!card.active && (
            <output className="notice amber">
              <ShieldAlert size={15} /> Thẻ {card.id} đang{' '}
              <b>bị khóa / hết hạn</b> — các lượt quét sẽ bị từ chối tại cổng.
            </output>
          )}

          <Box title={'Thông tin thẻ · ' + card.uid}>
            <Rows3
              rows={[
                ['UID thẻ', card.uid],
                ['Mã thẻ', card.id],
                ['Chủ xe', card.owner],
                ['Biển số', card.plate],
                ['Loại xe', card.type],
                ['Phân khu / Block', `${card.zone} · ${card.block}`],
                ['Trạng thái thẻ', card.active ? 'Hoạt động' : 'Đã khóa'],
              ]}
            />
          </Box>

          <Box
            title="Lịch sử ra / vào hệ thống"
            aside={
              <button
                className="secondary"
                onClick={exportCsv}
                disabled={!events.length}
              >
                <Download size={15} /> Xuất CSV
              </button>
            }
          >
            <div className="table-scroll">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Chiều</th>
                    <th>Cổng</th>
                    <th>Biển số</th>
                    <th>Vị trí</th>
                    <th>Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={`${e.at}-${i}`}>
                      <td className="mono">{e.at}</td>
                      <td>
                        <Badge tone={e.dir === 'IN' ? 'green' : 'amber'}>
                          {e.dir === 'IN' ? 'VÀO' : 'RA'}
                        </Badge>
                      </td>
                      <td>{e.gate}</td>
                      <td className="mono">{e.plate}</td>
                      <td>
                        {e.slot >= 0
                          ? `Block ${e.block} · P${String(e.slot + 1).padStart(2, '0')}`
                          : '—'}
                      </td>
                      <td>
                        {e.result === 'Cho phép' ? (
                          <Tag text="Cho phép" />
                        ) : (
                          <Badge tone="red">
                            Từ chối{e.reason ? ` · ${e.reason}` : ''}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!events.length && (
              <div className="empty-state">
                Thẻ này chưa có lượt ra / vào nào được ghi nhận.
              </div>
            )}
          </Box>
        </>
      )}
    </>
  );
}
