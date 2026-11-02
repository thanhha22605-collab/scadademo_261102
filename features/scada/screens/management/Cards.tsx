'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CreditCard,
  Download,
  FileUp,
  Lock,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  Panel,
  Badge,
  Kpi,
  csv,
  type ScreenProps,
} from '@/features/scada/components/shared';
import {
  accessEvents,
  seedCards,
  type CardRow,
} from '@/features/scada/data/demo';
import { downloadXlsx, readXlsx } from '@/features/scada/lib/xlsx';
import { GATEWAY_HTTP } from '@/features/scada/data/plc-source';

const STORAGE = 'totalparking.rfid-cards';
const HEADERS = [
  'Mã thẻ',
  'UID',
  'Biển số',
  'Chủ xe',
  'Loại xe',
  'Zone',
  'Block',
  'Lô nhập',
  'Hạng cân',
  'Hoạt động',
];
type ImportRow = { card?: CardRow; row: string[]; error?: string };

const normalizeCards = (cards: CardRow[]) =>
  cards.map((card, index) => ({
    ...card,
    batch: card.batch ?? `LO-2026-${String((index % 3) + 1).padStart(2, '0')}`,
    weight: card.weight ?? (card.type === 'SUV' ? '2200–2600' : 'Dưới 2200'),
  }));

const parked = (card: CardRow) => {
  const events = accessEvents
    .filter((event) => event.uid === card.uid && event.result === 'Cho phép')
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  return events[0]?.dir === 'IN';
};

const scannedWithin24Hours = (card: CardRow) => {
  const latest = accessEvents
    .filter((event) => event.uid === card.uid)
    .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  if (!latest) return false;
  const elapsed = Date.now() - new Date(latest.at.replace(' ', 'T')).getTime();
  return elapsed >= 0 && elapsed <= 24 * 60 * 60 * 1000;
};

export default function Cards({ sim }: ScreenProps) {
  const [rows, setRows] = useState<CardRow[]>(() => normalizeCards(seedCards));
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [batch, setBatch] = useState('all');
  const [weight, setWeight] = useState('all');
  const [operator, setOperator] = useState('supervisor01');
  const [adminToken, setAdminToken] = useState('');
  const [editing, setEditing] = useState<CardRow | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const storageReady = useRef(false);
  const live = sim.source !== 'sim';

  useEffect(() => {
    if (live) {
      const controller = new AbortController();
      const load = async () => {
        try {
          const response = await fetch(`${GATEWAY_HTTP}/api/cards`, {
            signal: controller.signal,
          });
          if (!response.ok)
            throw new Error(
              'Gateway/MySQL chưa sẵn sàng để đọc danh sách thẻ.',
            );
          const payload = (await response.json()) as {
            cards?: (CardRow & { active: boolean | number })[];
          };
          setRows(
            normalizeCards(
              (payload.cards ?? []).map((item) => ({
                ...item,
                active: Boolean(item.active),
              })),
            ),
          );
          setNote('Đang hiển thị dữ liệu thẻ từ MySQL qua gateway.');
        } catch (error) {
          if (!controller.signal.aborted)
            setNote(String(error instanceof Error ? error.message : error));
        }
      };
      void load();
      return () => controller.abort();
    }
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null');
        if (Array.isArray(saved)) setRows(normalizeCards(saved));
      } catch {
        /* bỏ qua bản lưu cục bộ bị hỏng */
      } finally {
        storageReady.current = true;
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [live]);
  useEffect(() => {
    if (live || !storageReady.current) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(rows));
    } catch {
      /* giao diện vẫn dùng được khi localStorage bị khóa */
    }
  }, [live, rows]);

  const batches = [
    ...new Set(rows.map((card) => card.batch ?? 'Chưa phân lô')),
  ];
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('vi-VN');
    return rows.filter(
      (card) =>
        (!term ||
          [card.id, card.uid, card.plate, card.owner].some((value) =>
            value.toLocaleLowerCase('vi-VN').includes(term),
          )) &&
        (batch === 'all' || card.batch === batch) &&
        (weight === 'all' || card.weight === weight),
    );
  }, [rows, query, batch, weight]);

  const liveRequest = async (
    method: 'PUT' | 'DELETE',
    payload: { card: CardRow; by: string } | { id: string; by: string },
  ) => {
    if (adminToken.length < 24)
      throw new Error('Token quản trị gateway phải có ít nhất 24 ký tự.');
    const response = await fetch(`${GATEWAY_HTTP}/api/cards`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok)
      throw new Error(result.error || `Gateway trả về HTTP ${response.status}.`);
  };

  const saveCard = async (card: CardRow) => {
    if (!operator.trim()) {
      setNote('Phải nhập tên người thao tác.');
      return;
    }
    if (live) {
      try {
        await liveRequest('PUT', { card, by: operator.trim() });
      } catch (error) {
        setNote(
          'Không lưu được thẻ: ' +
            (error instanceof Error ? error.message : String(error)),
        );
        return;
      }
    }
    if (!card.id.trim() || !card.uid.trim() || !card.plate.trim()) {
      setNote('Mã thẻ, UID và biển số là bắt buộc.');
      return;
    }
    setRows((current) => {
      const exists = current.some((item) => item.id === card.id);
      return exists
        ? current.map((item) => (item.id === card.id ? card : item))
        : [card, ...current];
    });
    setEditing(null);
    setNote(`Đã lưu thẻ ${card.id} · người thao tác ${operator.trim()}.`);
  };

  const toggleCard = async (card: CardRow) => {
    if (!operator.trim()) return setNote('Phải nhập người thao tác.');
    if (!live && card.active && (parked(card) || scannedWithin24Hours(card)))
      return setNote(
        `Từ chối khóa ${card.id}: thẻ đang ở ô đỗ hoặc vừa quẹt trong 24 giờ.`,
      );
    const next = { ...card, active: !card.active };
    if (live) {
      try {
        await liveRequest('PUT', { card: next, by: operator.trim() });
      } catch (error) {
        return setNote(
          'Từ chối thao tác: ' +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    }
    setRows((current) =>
      current.map((item) => (item.id === card.id ? next : item)),
    );
    setNote(
      `${card.active ? 'Đã khóa' : 'Đã mở khóa'} ${card.id} · ${operator.trim()}.`,
    );
  };

  const removeCard = async (card: CardRow) => {
    if (!operator.trim()) return setNote('Phải nhập người thao tác.');
    if (card.active) return setNote('Chỉ được xóa thẻ đã khóa.');
    if (live) {
      try {
        await liveRequest('DELETE', { id: card.id, by: operator.trim() });
      } catch (error) {
        return setNote(
          'Không xóa được thẻ: ' +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    }
    setRows((current) => current.filter((item) => item.id !== card.id));
    setNote(`Đã xóa ${card.id} · ${operator.trim()}.`);
  };

  const exportAll = () =>
    downloadXlsx(
      [
        HEADERS,
        ...rows.map((card) => [
          card.id,
          card.uid,
          card.plate,
          card.owner,
          card.type,
          card.zone,
          card.block,
          card.batch ?? '',
          card.weight ?? '',
          card.active ? '1' : '0',
        ]),
      ],
      'totalparking-rfid.xlsx',
      'RFID',
    );

  const downloadTemplate = () =>
    downloadXlsx(
      [
        HEADERS,
        [
          'TH-02001',
          '04:AA:BB:CC',
          '51H-123.45',
          'Nguyễn Văn A',
          'Sedan',
          'Zone 1',
          'A-01',
          'LO-2026-04',
          'Dưới 2200',
          '1',
        ],
      ],
      'mau-nhap-rfid.xlsx',
      'MauNhap',
    );

  const inspectFile = async (file: File) => {
    try {
      const data = await readXlsx(file);
      const header = data[0] ?? [];
      const missing = HEADERS.filter((name) => !header.includes(name));
      if (missing.length) throw new Error(`Thiếu cột: ${missing.join(', ')}`);
      const index = Object.fromEntries(
        HEADERS.map((name) => [name, header.indexOf(name)]),
      );
      const preview = data.slice(1).map<ImportRow>((row) => {
        const value = (name: string) => row[index[name]]?.trim() ?? '';
        const id = value('Mã thẻ');
        const uid = value('UID');
        const plate = value('Biển số').toUpperCase();
        if (!id || !uid || !plate)
          return { row, error: 'Thiếu mã thẻ, UID hoặc biển số.' };
        if (!/^[0-9]{2}[A-Z]{1,2}-[0-9]{3}(?:\.[0-9]{2})?$/.test(plate))
          return { row, error: 'Biển số không đúng định dạng.' };
        const weightValue = value('Hạng cân');
        if (!['Dưới 2200', '2200–2600', 'Trên 2600'].includes(weightValue))
          return { row, error: 'Hạng cân không hợp lệ.' };
        return {
          row,
          card: {
            id,
            uid,
            plate,
            owner: value('Chủ xe'),
            type: value('Loại xe') || 'Sedan',
            zone: value('Zone') || 'Zone 1',
            block: value('Block') || 'A-01',
            batch: value('Lô nhập') || 'Chưa phân lô',
            weight: weightValue as CardRow['weight'],
            active: value('Hoạt động') !== '0',
            synced: false,
            last: 'Chưa sử dụng',
          },
        };
      });
      setImportRows(preview);
      setNote(
        `Đã kiểm tra ${preview.length} dòng: ${preview.filter((item) => item.card).length} hợp lệ, ${preview.filter((item) => item.error).length} lỗi.`,
      );
    } catch (error) {
      setImportRows([]);
      setNote('Không đọc được file: ' + (error as Error).message);
    }
  };

  const applyImport = async () => {
    const valid = importRows.flatMap((item) => (item.card ? [item.card] : []));
    if (live) {
      try {
        for (const card of valid)
          await liveRequest('PUT', { card, by: operator.trim() });
      } catch (error) {
        setNote(
          'Dừng nhập dữ liệu: ' +
            (error instanceof Error ? error.message : String(error)),
        );
        return;
      }
    }
    setRows((current) => {
      const next = [...current];
      for (const card of valid) {
        const found = next.findIndex(
          (item) => item.id === card.id || item.uid === card.uid,
        );
        if (found >= 0) next[found] = card;
        else next.unshift(card);
      }
      return next;
    });
    setNote(
      `Đã nhập/cập nhật ${valid.length} thẻ · người thao tác ${operator}.`,
    );
    setImportRows([]);
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <>
      {live && (
        <output className="notice amber">
          Chế độ PLC thật: danh sách đọc/ghi MySQL qua gateway. Sửa, khóa, xóa
          và nhập Excel chỉ được thực hiện khi có token quản trị; token chỉ nằm
          trong bộ nhớ của tab hiện tại.
        </output>
      )}
      <div className="metrics metrics-3">
        <Kpi
          label="Tổng số thẻ đang quản lý"
          value={String(rows.length)}
          tone="blue"
          icon={CreditCard}
        />
        <Kpi
          label="Thẻ đang hoạt động"
          value={String(rows.filter((card) => card.active).length)}
          tone="green"
          icon={CreditCard}
        />
        <Kpi
          label="Thẻ bị khóa / hết hạn"
          value={String(rows.filter((card) => !card.active).length)}
          tone="red"
          icon={Lock}
        />
      </div>

      <Panel title="Tra cứu và thao tác thẻ RFID" pad>
        <div className="toolbar">
          <label className="field">
            <span>Tìm kiếm</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Mã thẻ, UID, biển số, tên chủ xe"
            />
          </label>
          <label className="field">
            <span>Lô nhập</span>
            <select
              value={batch}
              onChange={(event) => setBatch(event.target.value)}
            >
              <option value="all">Tất cả lô</option>
              {batches.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Hạng cân</span>
            <select
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
            >
              <option value="all">Tất cả hạng cân</option>
              {['Dưới 2200', '2200–2600', 'Trên 2600'].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Người thao tác</span>
            <input
              value={operator}
              onChange={(event) => setOperator(event.target.value)}
            />
          </label>
          {live && (
            <label className="field">
              <span>Token quản trị gateway</span>
              <input
                type="password"
                autoComplete="off"
                value={adminToken}
                onChange={(event) => setAdminToken(event.target.value)}
                placeholder="Tối thiểu 24 ký tự"
              />
            </label>
          )}
        </div>
        <div className="row-actions">
          <button
            className="secondary"
            disabled={live && adminToken.length < 24}
            onClick={() =>
              setEditing({
                id: `TH-${String(rows.length + 1000).padStart(5, '0')}`,
                uid: '',
                plate: '',
                owner: '',
                type: 'Sedan',
                zone: 'Zone 1',
                block: 'A-01',
                batch: 'LO-2026-NEW',
                weight: 'Dưới 2200',
                active: true,
                synced: false,
                last: 'Chưa sử dụng',
              })
            }
          >
            <CreditCard size={14} /> Thêm thẻ
          </button>
          <button className="secondary" onClick={exportAll}>
            <Download size={14} /> Xuất Excel
          </button>
          <button className="secondary" onClick={downloadTemplate}>
            <Download size={14} /> Tải mẫu nhập
          </button>
          <label className="secondary file-button">
            <FileUp size={14} /> Kiểm tra file
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void inspectFile(file);
              }}
            />
          </label>
          <button
            className="primary"
            disabled={
              !importRows.some((item) => item.card) ||
              !operator.trim() ||
              (live && adminToken.length < 24)
            }
            onClick={() => void applyImport()}
          >
            Nhập dữ liệu
          </button>
          {importRows.some((item) => item.error) && (
            <button
              className="secondary"
              onClick={() =>
                csv(
                  [
                    HEADERS.concat('Lý do lỗi'),
                    ...importRows
                      .filter((item) => item.error)
                      .map((item) => item.row.concat(item.error ?? '')),
                  ],
                  'rfid-dong-loi.csv',
                )
              }
            >
              Tải CSV dòng lỗi
            </button>
          )}
        </div>
        {note && <output className="notice amber">{note}</output>}
      </Panel>

      <Panel
        title={`Danh sách thẻ RFID · ${filtered.length}/${rows.length}`}
        pad
      >
        <div className="table-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Mã thẻ / UID</th>
                <th>Biển số</th>
                <th>Chủ xe</th>
                <th>Loại / Hạng cân</th>
                <th>Lô nhập</th>
                <th>Zone / Block</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((card) => (
                <tr key={card.id}>
                  <td>
                    <b>{card.id}</b>
                    <small className="table-sub">{card.uid}</small>
                  </td>
                  <td className="mono">{card.plate}</td>
                  <td>{card.owner}</td>
                  <td>
                    {card.type}
                    <small className="table-sub">{card.weight}</small>
                  </td>
                  <td>{card.batch}</td>
                  <td>
                    {card.zone}
                    <small className="table-sub">Block {card.block}</small>
                  </td>
                  <td>
                    <Badge tone={card.active ? 'green' : 'red'}>
                      {card.active ? 'Hoạt động' : 'Đã khóa'}
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="mini"
                        aria-label={`Sửa thẻ ${card.id}`}
                        disabled={live && adminToken.length < 24}
                        onClick={() => setEditing({ ...card })}
                      >
                        <Pencil size={13} /> Sửa
                      </button>
                      <button
                        className="mini"
                        aria-label={`${card.active ? 'Khóa' : 'Mở khóa'} thẻ ${card.id}`}
                        disabled={live && adminToken.length < 24}
                        onClick={() => void toggleCard(card)}
                      >
                        <Lock size={13} /> {card.active ? 'Khóa' : 'Mở'}
                      </button>
                      <button
                        className="mini danger"
                        aria-label={`Xóa thẻ ${card.id}`}
                        disabled={
                          card.active || (live && adminToken.length < 24)
                        }
                        onClick={() => void removeCard(card)}
                      >
                        <Trash2 size={13} /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {editing && (
        <div className="dialog-backdrop" role="presentation">
          <form
            className="dialog-card wide"
            onSubmit={(event) => {
              event.preventDefault();
              void saveCard(editing);
            }}
          >
            <h2>Thông tin thẻ RFID</h2>
            <div className="settings-grid two">
              {(
                [
                  ['Mã thẻ', 'id'],
                  ['UID', 'uid'],
                  ['Biển số', 'plate'],
                  ['Chủ xe', 'owner'],
                  ['Loại xe', 'type'],
                  ['Zone', 'zone'],
                  ['Block', 'block'],
                  ['Lô nhập', 'batch'],
                ] as const
              ).map(([label, key]) => (
                <label className="field" key={key}>
                  <span>{label}</span>
                  <input
                    value={String(editing[key] ?? '')}
                    readOnly={
                      key === 'id' &&
                      rows.some((item) => item.id === editing.id)
                    }
                    onChange={(event) =>
                      setEditing({ ...editing, [key]: event.target.value })
                    }
                  />
                </label>
              ))}
              <label className="field">
                <span>Hạng cân</span>
                <select
                  value={editing.weight}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      weight: event.target.value as CardRow['weight'],
                    })
                  }
                >
                  {['Dưới 2200', '2200–2600', 'Trên 2600'].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="control-actions">
              <button className="primary" type="submit">
                Lưu thay đổi
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => setEditing(null)}
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
