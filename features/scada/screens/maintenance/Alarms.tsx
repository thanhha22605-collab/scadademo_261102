'use client';
import { useEffect, useState } from 'react';
import { CheckCheck, Download, ShieldCheck } from 'lucide-react';
import {
  blockLabel,
  isActiveAlarm,
  type Alarm,
} from '@/features/scada/model/simulation';
import {
  Box,
  Badge,
  Tag,
  Choice,
  csv,
  time,
  type ScreenProps,
} from '@/features/scada/components/shared';
import { downloadXlsx } from '@/features/scada/lib/xlsx';

const catName: Record<string, string> = {
  operator: 'Lỗi thao tác',
  system: 'Lỗi thiết bị',
  maintenance: 'Đến hạn bảo trì',
};
/* Trạng thái 1 alarm: resolved (đã hết) / active-acked (còn nhưng đã xác nhận) / active-new. */
const alarmState = (a: Alarm) =>
  !isActiveAlarm(a) ? 'Đã xử lý' : a.ack ? 'Đã xác nhận' : 'Đang hoạt động';
export default function Alarms({ sim, dispatch }: ScreenProps) {
  const [alarmCat, setAlarmCat] = useState('all');
  const [alarmSev, setAlarmSev] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [ackTarget, setAckTarget] = useState<Alarm | null>(null);
  const [ackBy, setAckBy] = useState('supervisor01');
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('totalparking.alarm-ack') || '{}',
      ) as Record<string, string>;
      for (const alarm of sim.alarms)
        if (!alarm.ack && saved[alarm.id])
          dispatch({
            type: 'ack',
            id: alarm.id,
            time: time(),
            by: saved[alarm.id],
          });
    } catch {
      /* bỏ qua dữ liệu ACK cục bộ bị hỏng */
    }
    // Snapshot tiếp theo tự giữ ACK theo ID nên nhánh này chỉ dispatch các ACK còn thiếu.
  }, [dispatch, sim.alarms]);
  const count = (c: string) =>
    sim.alarms.filter((a) => isActiveAlarm(a) && a.cat === c).length;
  const severity = { 'Nghiêm trọng': 4, Cao: 3, 'Trung bình': 2, Thấp: 1 };
  const normalizedKeyword = keyword.trim().toLocaleLowerCase('vi-VN');
  const rows = sim.alarms
    .filter(
      (a) =>
        (alarmCat === 'all' || a.cat === alarmCat) &&
        (alarmSev === 'all' || a.sev === alarmSev) &&
        (!normalizedKeyword ||
          [a.text, a.code, a.device, a.block, a.zone, a.ackBy].some((value) =>
            String(value ?? '')
              .toLocaleLowerCase('vi-VN')
              .includes(normalizedKeyword),
          )),
    )
    .sort(
      (a, b) =>
        Number(isActiveAlarm(b)) - Number(isActiveAlarm(a)) ||
        Number(a.ack) - Number(b.ack) ||
        (severity[b.sev ?? 'Thấp'] ?? 0) - (severity[a.sev ?? 'Thấp'] ?? 0),
    );
  const blockOf = (id: string) => sim.blocks.find((block) => block.id === id);
  const zoneOf = (alarm: Alarm) =>
    alarm.zone ??
    blockOf(alarm.block)?.zone ??
    (/^[A-Z]-/.test(alarm.block) ? alarm.block[0] : '—');
  const blockName = (id: string) => {
    const block = blockOf(id);
    return block ? blockLabel(block) : id;
  };
  const exportRows = [
    [
      'Thời gian',
      'Phân loại',
      'Mức độ',
      'Zone',
      'Block',
      'Thiết bị',
      'Mã lỗi',
      'Mô tả',
      'Trạng thái',
      'Người ACK',
    ],
    ...rows.map((a) => [
      a.at ?? '',
      a.cat ? catName[a.cat] : '',
      a.sev ?? '',
      zoneOf(a),
      blockName(a.block),
      a.device ?? '',
      a.code ?? '',
      a.text,
      alarmState(a),
      a.ackBy ?? '',
    ]),
  ];
  return (
    <>
      {sim.source !== 'sim' && (
        <div className="notice amber">
          ACK hiện chỉ được lưu trong phiên trình duyệt và không ghi về PLC.
          Trạng thái alarm vẫn “đang hoạt động” cho tới khi tín hiệu thực tế trở
          lại bình thường.
        </div>
      )}
      <div className="metrics metrics-4">
        <div className="kpi kpi-red">
          <div className="kpi-top">
            <span>Lỗi thiết bị / hệ thống</span>
          </div>
          <strong>{count('system')}</strong>
          <small>Yêu cầu can thiệp kỹ thuật</small>
        </div>
        <div className="kpi kpi-amber">
          <div className="kpi-top">
            <span>Lỗi thao tác vận hành</span>
          </div>
          <strong>{count('operator')}</strong>
          <small>Nhấn E-Stop hoặc mở cửa tủ</small>
        </div>
        <div className="kpi kpi-blue">
          <div className="kpi-top">
            <span>Thiết bị đến hạn bảo trì</span>
          </div>
          <strong>{count('maintenance')}</strong>
          <small>Dựa trên chu kỳ và giờ chạy</small>
        </div>
        <div className="kpi kpi-green">
          <div className="kpi-top">
            <span>Đã xác nhận (ACK)</span>
          </div>
          <strong>
            {sim.alarms.filter((a) => isActiveAlarm(a) && a.ack).length}
          </strong>
          <small>Alarm còn hiệu lực đã được ACK</small>
        </div>
      </div>
      <Box
        title="Nhật ký cảnh báo & sự cố"
        aside={
          <div className="row-actions">
            <button
              className="secondary"
              onClick={() => csv(exportRows, 'totalparking-alarms.csv')}
            >
              <Download size={16} /> CSV
            </button>
            <button
              className="secondary"
              onClick={() =>
                downloadXlsx(exportRows, 'totalparking-alarms.xlsx', 'Alarms')
              }
            >
              <Download size={16} /> Excel
            </button>
          </div>
        }
      >
        <div className="toolbar">
          <Choice
            label="Phân loại lỗi"
            value={alarmCat}
            onChange={setAlarmCat}
            options={[
              { value: 'all', label: 'Tất cả phân loại' },
              { value: 'system', label: 'Lỗi thiết bị / hệ thống' },
              { value: 'operator', label: 'Lỗi thao tác vận hành' },
              { value: 'maintenance', label: 'Đến hạn bảo trì' },
            ]}
          />
          <label className="search-field alarm-search">
            <input
              aria-label="Từ khóa cảnh báo"
              placeholder="Tìm mã lỗi, block, thiết bị, nội dung…"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <Choice
            label="Mức độ"
            value={alarmSev}
            onChange={setAlarmSev}
            options={[
              { value: 'all', label: 'Tất cả mức độ' },
              ...['Nghiêm trọng', 'Cao', 'Trung bình', 'Thấp'].map((s) => ({
                value: s,
                label: s,
              })),
            ]}
          />
        </div>
        <div className="table-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Phân loại</th>
                <th>Mức độ</th>
                <th>Zone</th>
                <th>Block</th>
                <th>Thiết bị</th>
                <th>Mã lỗi</th>
                <th>Mô tả sự cố</th>
                <th>Trạng thái</th>
                <th>Người ACK</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.at ?? '—'}</td>
                  <td>{a.cat ? catName[a.cat] : '—'}</td>
                  <td>
                    <Badge
                      tone={
                        a.sev === 'Nghiêm trọng'
                          ? 'red'
                          : a.sev === 'Cao'
                            ? 'amber'
                            : a.sev === 'Trung bình'
                              ? 'blue'
                              : 'green'
                      }
                    >
                      {a.sev}
                    </Badge>
                  </td>
                  <td>{zoneOf(a)}</td>
                  <td>{blockName(a.block)}</td>
                  <td>{a.device ?? '—'}</td>
                  <td className="mono">{a.code ?? '—'}</td>
                  <td>{a.text}</td>
                  <td>
                    <Tag
                      text={
                        !isActiveAlarm(a)
                          ? 'Đã xử lý'
                          : a.ack
                            ? 'Đã xác nhận'
                            : 'Cảnh báo'
                      }
                    />
                  </td>
                  <td>{a.ackBy ?? '—'}</td>
                  <td>
                    <button
                      className="secondary"
                      disabled={a.ack || !isActiveAlarm(a)}
                      onClick={() => {
                        setAckTarget(a);
                        setAckBy('supervisor01');
                      }}
                    >
                      <CheckCheck size={15} /> ACK
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="empty-state">
            <ShieldCheck />
            Không có cảnh báo phù hợp bộ lọc.
          </div>
        )}
      </Box>
      {ackTarget && (
        <div className="dialog-backdrop" role="presentation">
          <form
            className="dialog-card"
            onSubmit={(event) => {
              event.preventDefault();
              const operator = ackBy.trim();
              if (!operator) return;
              dispatch({
                type: 'ack',
                id: ackTarget.id,
                time: time(),
                by: operator,
              });
              try {
                const saved = JSON.parse(
                  localStorage.getItem('totalparking.alarm-ack') || '{}',
                ) as Record<string, string>;
                saved[ackTarget.id] = operator;
                localStorage.setItem(
                  'totalparking.alarm-ack',
                  JSON.stringify(saved),
                );
              } catch {
                /* ACK vẫn có hiệu lực trong phiên hiện tại */
              }
              setAckTarget(null);
            }}
          >
            <h2>Xác nhận cảnh báo</h2>
            <p>
              {ackTarget.code ?? ackTarget.id} · {ackTarget.text}
            </p>
            <label className="field">
              <span>Người xác nhận</span>
              <input
                value={ackBy}
                onChange={(event) => setAckBy(event.target.value)}
              />
            </label>
            <div className="control-actions">
              <button
                className="primary"
                type="submit"
                disabled={!ackBy.trim()}
              >
                Ghi nhận ACK
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => setAckTarget(null)}
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
