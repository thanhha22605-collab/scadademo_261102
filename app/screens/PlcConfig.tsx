'use client';
import { useEffect, useState } from 'react';
import { KeyRound, Plus, Save, Server, Trash2 } from 'lucide-react';
import { Panel, Badge, type ScreenProps } from './shared';
import { GATEWAY_HTTP } from './datasource';

type UnitCfg = {
  id: string;
  n: number | string;
  name: string;
  type: string;
  door: string;
  zone: string;
  enabled: boolean;
  host?: string;
  port?: number | string;
  protocol?: string;
};
type Preset = { key: string; label: string; capacity: number };
type GatewayStatus =
  | 'checking'
  | 'reachable'
  | 'online'
  | 'offline'
  | 'invalid'
  | 'unauthorized';
type Notice = { text: string; tone: 'green' | 'amber' | 'red' };
type GatewayHealth = {
  configured: boolean;
  connected: boolean;
  online: number;
  total: number;
};

const newId = () =>
  'u' +
  (
    globalThis.crypto?.randomUUID?.().replace(/-/g, '') ??
    Math.random().toString(36).slice(2)
  ).slice(0, 12);
const authHeaders = (token: string): Record<string, string> => ({
  Authorization: 'Bearer ' + token,
});
const nextN = (list: UnitCfg[]) => {
  const used = new Set(list.map((unit) => Number(unit.n)));
  for (let value = 1; value <= 154; value++) if (!used.has(value)) return value;
  return null;
};
const PRESET_FALLBACK: Preset[] = [
  { key: 'loai_6', label: '前移 6 chỗ (3-3)', capacity: 6 },
  { key: 'comb_10', label: '前移 10 chỗ (5-5)', capacity: 10 },
  { key: 'comb_14', label: '前移 14 chỗ (7-7)', capacity: 14 },
  { key: 'loai_10', label: '穿越 +2/-1 · 10 chỗ', capacity: 10 },
  { key: 'loai_16', label: '穿越 +2/-1 · 16 chỗ', capacity: 16 },
];
const ip = (n: number | string) => `192.168.1.${100 + Number(n || 0)}`;
const DRAFT = 'tp_plc_config_draft';

function readDraft(): UnitCfg[] {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFT) || '[]');
    if (Array.isArray(value))
      return value.map((unit) => ({
        ...unit,
        id: unit.id || newId(),
        protocol: 'tcp',
      }));
  } catch {
    /* bản nháp hỏng được bỏ qua */
  }
  return [];
}

export default function PlcConfig(_: ScreenProps) {
  const [presets, setPresets] = useState<Preset[]>(PRESET_FALLBACK);
  const [units, setUnits] = useState<UnitCfg[]>([]);
  const [status, setStatus] = useState<GatewayStatus>('checking');
  const [token, setToken] = useState('');
  const [verifiedToken, setVerifiedToken] = useState('');
  const [dirty, setDirty] = useState(false);
  const [health, setHealth] = useState<GatewayHealth | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 3000);
    fetch(GATEWAY_HTTP + '/health', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Gateway không sẵn sàng.');
        const data = (await response.json()) as GatewayHealth & { ok?: boolean };
        if (active) {
          setHealth({
            configured: Boolean(data.configured),
            connected: Boolean(data.connected),
            online: Number(data.online) || 0,
            total: Number(data.total) || 0,
          });
          setStatus(data.ok === false ? 'invalid' : 'reachable');
          setUnits(readDraft());
          if (data.ok === false)
            setNotice({
              text:
                'Gateway đang chạy nhưng file cấu hình PLC không hợp lệ. Đọc cấu hình rồi lưu lại một cấu hình hợp lệ.',
              tone: 'red',
            });
        }
      })
      .catch(() => {
        if (active) {
          setStatus('offline');
          setUnits(readDraft());
        }
      })
      .finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const patch = (index: number, key: keyof UnitCfg, value: unknown) => {
    setDirty(true);
    setUnits((list) =>
      list.map((unit, position) =>
        position === index ? { ...unit, [key]: value } : unit,
      ),
    );
  };
  const patchNumber = (index: number, value: string) => {
    setDirty(true);
    setUnits((list) =>
      list.map((unit, position) => {
        if (position !== index) return unit;
        const oldAutomatic = ip(unit.n);
        return {
          ...unit,
          n: value,
          host:
            !unit.host || unit.host === oldAutomatic ? ip(value) : unit.host,
        };
      }),
    );
  };
  const add = () => {
    const n = nextN(units);
    if (n == null) {
      setNotice({ text: 'Đã dùng đủ 154 số Block.', tone: 'red' });
      return;
    }
    setDirty(true);
    setUnits((list) => [
      ...list,
      {
        id: newId(),
        n,
        name: `Block ${n}`,
        type: presets[0]?.key ?? 'loai_16',
        door: 'W1.08',
        zone: 'A',
        enabled: true,
        host: ip(n),
        port: 9600,
        protocol: 'tcp',
      },
    ]);
  };
  const remove = (index: number) => {
    setDirty(true);
    setUnits((list) => list.filter((_, position) => position !== index));
  };

  const loadConfig = async () => {
    if (token.length < 24) {
      setNotice({
        text: 'Token quản trị phải có ít nhất 24 ký tự.',
        tone: 'amber',
      });
      return;
    }
    setVerifiedToken('');
    setStatus('checking');
    try {
      const response = await fetch(GATEWAY_HTTP + '/config', {
        headers: authHeaders(token),
        signal: AbortSignal.timeout(5000),
      });
      if (response.status === 401 || response.status === 403) {
        setStatus('unauthorized');
        setVerifiedToken('');
        setNotice({ text: 'Gateway từ chối token quản trị.', tone: 'red' });
        return;
      }
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = (await response.json()) as {
        presets?: Preset[];
        units?: UnitCfg[];
      };
      if (Array.isArray(data.presets) && data.presets.length)
        setPresets(data.presets);
      setUnits(
        (Array.isArray(data.units) ? data.units : []).map((unit) => ({
          ...unit,
          id: unit.id || newId(),
          protocol: 'tcp',
        })),
      );
      setStatus('online');
      setVerifiedToken(token);
      setDirty(false);
      setNotice({ text: 'Đã đọc cấu hình từ gateway.', tone: 'green' });
    } catch (error) {
      setStatus('offline');
      setVerifiedToken('');
      setNotice({
        text: 'Không đọc được gateway: ' + (error as Error).message,
        tone: 'red',
      });
    }
  };

  const save = async () => {
    try {
      localStorage.setItem(DRAFT, JSON.stringify(units));
    } catch {
      /* gateway vẫn có thể lưu dù trình duyệt chặn localStorage */
    }
    if (token.length < 24 || verifiedToken !== token) {
      setNotice({
        text:
          'Đã lưu nháp cục bộ. Phải bấm “Đọc cấu hình” bằng token hiện tại trước khi được áp dụng xuống gateway.',
        tone: 'amber',
      });
      return;
    }
    try {
      const response = await fetch(GATEWAY_HTTP + '/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify(units),
      });
      if (response.status === 401 || response.status === 403) {
        setStatus('unauthorized');
        setVerifiedToken('');
        setNotice({
          text: 'Token không hợp lệ; gateway không thay đổi cấu hình.',
          tone: 'red',
        });
        return;
      }
      const data = (await response.json()) as {
        ok?: boolean;
        count?: number;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        setNotice({
          text:
            'Gateway từ chối cấu hình: ' +
            (data.error ?? `HTTP ${response.status}`),
          tone: 'red',
        });
        return;
      }
      setStatus('online');
      setDirty(false);
      setNotice({
        text: `Đã lưu và áp dụng: ${data.count} PLC đang bật.`,
        tone: 'green',
      });
    } catch (error) {
      setStatus('offline');
      setNotice({
        text: 'Không gửi được xuống gateway: ' + (error as Error).message,
        tone: 'red',
      });
    }
  };

  const statusLabel: Record<GatewayStatus, string> = {
    checking: 'Đang kiểm tra…',
    reachable: 'Đã kết nối · chưa xác thực',
    online: 'Đã xác thực',
    offline: 'Chưa kết nối',
    invalid: 'Cấu hình gateway bị lỗi',
    unauthorized: 'Token bị từ chối',
  };
  const canApply = token.length >= 24 && verifiedToken === token;

  return (
    <>
      <div className="occ-badges">
        <Badge
          tone={
            status === 'online'
              ? 'green'
              : status === 'reachable' || status === 'checking'
                ? 'amber'
                : 'red'
          }
        >
          <Server size={12} /> Gateway: {statusLabel[status]}
        </Badge>
        {dirty && <Badge tone="amber">Có thay đổi chưa áp dụng</Badge>}
        {health && (
          <span className="muted">
            {health.configured
              ? `${health.online}/${health.total} PLC online${health.connected ? '' : ' · chưa có PLC kết nối'}`
              : 'Chưa cấu hình PLC'}
          </span>
        )}
        <span className="muted">{GATEWAY_HTTP}</span>
      </div>
      <Panel title="Xác thực API cấu hình gateway" pad>
        <div className="toolbar">
          <label className="field">
            <span>Token quản trị (không lưu trong trình duyệt)</span>
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(event) => {
                const value = event.target.value;
                setToken(value);
                if (value !== verifiedToken) {
                  setVerifiedToken('');
                  if (status === 'online') setStatus('reachable');
                }
              }}
              placeholder="GATEWAY_ADMIN_TOKEN · tối thiểu 24 ký tự"
            />
          </label>
          <button className="secondary" type="button" onClick={loadConfig}>
            <KeyRound size={14} /> Đọc cấu hình
          </button>
        </div>
        <p className="hint">
          Token chỉ nằm trong bộ nhớ của tab hiện tại và sẽ mất khi tải lại trang;
          không đưa token vào biến <span className="mono">VITE_*</span> vì các biến
          đó xuất hiện trong JavaScript phía trình duyệt.
        </p>
      </Panel>
      {notice && (
        <output className={'notice ' + notice.tone}>{notice.text}</output>
      )}
      {status === 'offline' && (
        <div className="notice amber">
          Chưa thấy gateway. Các thay đổi chỉ được lưu nháp cục bộ cho đến khi
          gateway hoạt động.
        </div>
      )}
      <Panel
        title="Danh sách PLC (từng tháp)"
        aside={
          <div className="row-actions">
            <button className="mini" type="button" onClick={add}>
              <Plus size={14} /> Thêm PLC
            </button>
            <button className="mini" type="button" onClick={save}>
              <Save size={14} /> {canApply ? 'Lưu & áp dụng' : 'Lưu nháp'}
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
                <th>IP PLC</th>
                <th>Port</th>
                <th>Protocol</th>
                <th>Cửa đóng</th>
                <th>Zone</th>
                <th>Sức chứa</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit, index) => {
                const capacity =
                  presets.find((preset) => preset.key === unit.type)?.capacity ??
                  '—';
                return (
                  <tr key={unit.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={unit.enabled !== false}
                        aria-label={`Bật PLC ${unit.name}`}
                        onChange={(event) =>
                          patch(index, 'enabled', event.target.checked)
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Số Block ${unit.name}`}
                        className="cfg-in sm"
                        type="number"
                        min="1"
                        max="154"
                        value={String(unit.n)}
                        onChange={(event) => patchNumber(index, event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Tên hiển thị PLC ${index + 1}`}
                        className="cfg-in"
                        value={unit.name}
                        onChange={(event) => patch(index, 'name', event.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        aria-label={`Loại tháp ${unit.name}`}
                        className="cfg-in"
                        value={unit.type}
                        onChange={(event) => patch(index, 'type', event.target.value)}
                      >
                        {presets.map((preset) => (
                          <option key={preset.key} value={preset.key}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        aria-label={`Địa chỉ IP ${unit.name}`}
                        className="cfg-in"
                        value={unit.host ?? ip(unit.n)}
                        onChange={(event) => patch(index, 'host', event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Cổng FINS ${unit.name}`}
                        className="cfg-in sm"
                        type="number"
                        min="1"
                        max="65535"
                        value={String(unit.port ?? 9600)}
                        onChange={(event) => patch(index, 'port', event.target.value)}
                      />
                    </td>
                    <td>
                      <span className="mono">TCP</span>
                    </td>
                    <td>
                      <select
                        aria-label={`Bit cửa đóng ${unit.name}`}
                        className="cfg-in sm"
                        value={unit.door}
                        onChange={(event) => patch(index, 'door', event.target.value)}
                      >
                        <option value="W1.08">W1.08 (hạ)</option>
                        <option value="W1.07">W1.07 (nâng)</option>
                      </select>
                    </td>
                    <td>
                      <input
                        aria-label={`Zone ${unit.name}`}
                        className="cfg-in sm"
                        value={unit.zone}
                        onChange={(event) => patch(index, 'zone', event.target.value)}
                      />
                    </td>
                    <td className="mono">{capacity}</td>
                    <td>
                      <button
                        className="mini danger"
                        type="button"
                        aria-label={`Xóa ${unit.name}`}
                        onClick={() => remove(index)}
                      >
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
      <Panel title="Ghi chú vận hành" pad>
        <p className="hint">
          Mỗi tháp dùng một ID bất biến và một endpoint IP/port riêng. Địa chỉ mới
          được gợi ý theo dải private <span className="mono">192.168.1.x</span>;
          hãy nhập đúng IP thực địa trước khi lưu. Gateway kiểm tra trùng ID, số
          Block, tên và endpoint rồi mới ghi file và kết nối lại.
        </p>
      </Panel>
    </>
  );
}
