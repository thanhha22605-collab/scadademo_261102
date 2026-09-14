'use client';
import { useEffect, useState } from 'react';
import { Plus, RefreshCw, Save, Server, Trash2 } from 'lucide-react';
import { Panel, Badge, type ScreenProps } from './shared';
import { GATEWAY_HTTP, GATEWAY_TOKEN } from './datasource';

type UnitCfg = {
  id: string;
  n: number | string;
  name: string;
  type: string;
  door: string;
  zone: string;
  enabled: boolean;
  host?: string;
  port?: number;
  protocol?: string;
};
type Preset = { key: string; label: string; capacity: number };

/* ID bất biến cho mỗi PLC — KHÔNG suy từ tên/số hàng (tránh trùng khi xóa/chèn). */
const newId = () =>
  'u' +
  (globalThis.crypto?.randomUUID?.().replace(/-/g, '') ?? Math.random().toString(36).slice(2)).slice(0, 12);
const authHeaders: Record<string, string> = GATEWAY_TOKEN
  ? { Authorization: 'Bearer ' + GATEWAY_TOKEN }
  : {};
const nextN = (list: UnitCfg[]) =>
  list.reduce((m, u) => Math.max(m, Number(u.n) || 0), 0) + 1;

/* Preset dự phòng khi chưa nối gateway (để demo dropdown vẫn dùng được). */
const PRESET_FALLBACK: Preset[] = [
  { key: 'loai_6', label: '前移 6 chỗ (3-3)', capacity: 6 },
  { key: 'comb_10', label: '前移 10 chỗ (5-5)', capacity: 10 },
  { key: 'comb_14', label: '前移 14 chỗ (7-7)', capacity: 14 },
  { key: 'loai_10', label: '穿越 +2/-1 · 10 chỗ', capacity: 10 },
  { key: 'loai_16', label: '穿越 +2/-1 · 16 chỗ', capacity: 16 },
];
const ip = (n: number | string) => `192.169.1.${100 + Number(n || 0)}`;
const DRAFT = 'tp_plc_config_draft';

export default function PlcConfig(_: ScreenProps) {
  const [presets, setPresets] = useState<Preset[]>(PRESET_FALLBACK);
  const [units, setUnits] = useState<UnitCfg[]>([]);
  const [status, setStatus] = useState<'loading' | 'online' | 'offline' | 'unauthorized'>('loading');
  const [note, setNote] = useState('');

  useEffect(() => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 2500);
    fetch(GATEWAY_HTTP + '/config', { signal: ac.signal, headers: authHeaders })
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          setStatus('unauthorized');
          return;
        }
        const d = (await r.json()) as { presets?: Preset[]; units?: UnitCfg[] };
        if (Array.isArray(d.presets) && d.presets.length) setPresets(d.presets);
        setUnits((Array.isArray(d.units) ? d.units : []).map((u) => ({ ...u, id: u.id || newId() })));
        setStatus('online');
      })
      .catch(() => {
        setStatus('offline');
        try {
          const draft = JSON.parse(localStorage.getItem(DRAFT) || '[]');
          if (Array.isArray(draft)) setUnits(draft.map((u) => ({ ...u, id: u.id || newId() })));
        } catch {
          /* ignore */
        }
      })
      .finally(() => clearTimeout(t));
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, []);

  const patch = (i: number, k: keyof UnitCfg, v: unknown) =>
    setUnits((list) => list.map((u, j) => (j === i ? { ...u, [k]: v } : u)));
  const add = () =>
    setUnits((list) => {
      const n = nextN(list);
      return [
        ...list,
        { id: newId(), n, name: `Block ${n}`, type: presets[0]?.key ?? 'loai_16', door: 'W1.08', zone: 'A', enabled: true },
      ];
    });
  const remove = (i: number) => setUnits((list) => list.filter((_, j) => j !== i));

  const save = async () => {
    try {
      localStorage.setItem(DRAFT, JSON.stringify(units));
    } catch {
      /* ignore */
    }
    if (status === 'unauthorized') {
      setNote('Gateway yêu cầu token quản trị. Đặt VITE_GATEWAY_TOKEN (khớp GATEWAY_ADMIN_TOKEN) rồi tải lại.');
      return;
    }
    if (status !== 'online') {
      setNote('Chưa nối gateway — đã lưu nháp trong trình duyệt. Sẽ áp dụng khi có gateway.');
      return;
    }
    try {
      const r = await fetch(GATEWAY_HTTP + '/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(units),
      });
      if (r.status === 401 || r.status === 403) {
        setStatus('unauthorized');
        setNote('Token quản trị không hợp lệ hoặc thiếu — gateway từ chối lưu cấu hình.');
        return;
      }
      const d = (await r.json()) as { ok?: boolean; count?: number; error?: string };
      setNote(d.ok ? `Đã lưu xuống gateway: ${d.count} PLC đang bật.` : 'Lỗi: ' + d.error);
    } catch (e) {
      setNote('Không gửi được xuống gateway: ' + (e as Error).message);
    }
  };

  return (
    <>
      <div className="occ-badges">
        <Badge
          tone={
            status === 'online'
              ? 'green'
              : status === 'offline'
                ? 'red'
                : status === 'unauthorized'
                  ? 'red'
                  : 'amber'
          }
        >
          <Server size={12} /> Gateway:{' '}
          {status === 'online'
            ? 'Đã kết nối'
            : status === 'offline'
              ? 'Chưa kết nối'
              : status === 'unauthorized'
                ? 'Cần token'
                : 'Đang kiểm tra…'}
        </Badge>
        <span className="muted">{GATEWAY_HTTP}</span>
      </div>
      {note && (
        <div className="notice green" role="status">
          {note}
        </div>
      )}
      {status === 'unauthorized' && (
        <div className="notice amber">
          Gateway yêu cầu <b>token quản trị</b>. Chạy gateway với{' '}
          <span className="mono">GATEWAY_ADMIN_TOKEN</span> (≥ 24 ký tự) và đặt cùng
          giá trị vào <span className="mono">VITE_GATEWAY_TOKEN</span> khi build web
          app, rồi tải lại trang. Không có token thì API cấu hình bị khóa.
        </div>
      )}
      {status === 'offline' && (
        <div className="notice amber">
          Chưa thấy gateway. Bạn vẫn thêm/sửa được (lưu nháp trong trình duyệt);
          khi chạy gateway (`npm start`) và đặt{' '}
          <span className="mono">VITE_DATA_SOURCE=plc</span> thì bấm Lưu để áp dụng.
        </div>
      )}
      <Panel
        title="Danh sách PLC (từng tháp)"
        aside={
          <div className="row-actions">
            <button className="mini" onClick={add}>
              <Plus size={14} /> Thêm PLC
            </button>
            <button className="mini" onClick={save}>
              <Save size={14} /> Lưu
            </button>
          </div>
        }
        pad
      >
        <div className="table-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Bật</th>
                <th>Block (N)</th>
                <th>Tên hiển thị</th>
                <th>Loại tháp</th>
                <th>IP (tự suy)</th>
                <th>Cửa đóng</th>
                <th>Zone</th>
                <th>Sức chứa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {units.map((u, i) => {
                const cap = presets.find((p) => p.key === u.type)?.capacity ?? '—';
                return (
                  <tr key={i}>
                    <td>
                      <input
                        type="checkbox"
                        checked={u.enabled !== false}
                        aria-label="Bật PLC"
                        onChange={(e) => patch(i, 'enabled', e.target.checked)}
                      />
                    </td>
                    <td>
                      <input
                        className="cfg-in sm"
                        type="number"
                        value={String(u.n)}
                        onChange={(e) => patch(i, 'n', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="cfg-in"
                        value={u.name}
                        onChange={(e) => patch(i, 'name', e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className="cfg-in"
                        value={u.type}
                        onChange={(e) => patch(i, 'type', e.target.value)}
                      >
                        {presets.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="mono">{ip(u.n)}</td>
                    <td>
                      <select
                        className="cfg-in sm"
                        value={u.door}
                        onChange={(e) => patch(i, 'door', e.target.value)}
                      >
                        <option value="W1.08">W1.08 (hạ)</option>
                        <option value="W1.07">W1.07 (nâng)</option>
                      </select>
                    </td>
                    <td>
                      <input
                        className="cfg-in sm"
                        value={u.zone}
                        onChange={(e) => patch(i, 'zone', e.target.value)}
                      />
                    </td>
                    <td className="mono">{cap}</td>
                    <td>
                      <button className="mini danger" aria-label="Xóa" onClick={() => remove(i)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!units.length && (
          <div className="empty-state">
            Chưa có PLC nào. Bấm <b>Thêm PLC</b> để khai báo từng tháp.
          </div>
        )}
      </Panel>
      <Panel title="Ghi chú" pad>
        <p className="hint">
          Mỗi tháp = 1 PLC CP2E. Chọn <b>Loại tháp</b> (đã map sẵn số xe / E‑Stop /
          lỗi theo ladder), nhập <b>số Block N</b> → IP tự suy{' '}
          <span className="mono">192.169.1.(100+N)</span>, cổng FINS 9600. Bấm{' '}
          <b>Lưu</b> để gateway kết nối lại ngay — không cần sửa code, không cần
          khởi động lại. Chốt hướng <b>cửa đóng</b> (W1.08 hạ / W1.07 nâng) khi ra
          hiện trường.
        </p>
      </Panel>
    </>
  );
}
