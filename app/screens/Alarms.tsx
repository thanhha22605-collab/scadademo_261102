'use client';
import { useState } from 'react';
import { CheckCheck, Download, ShieldCheck } from 'lucide-react';
import { Box, Badge, Tag, Choice, csv, time, type ScreenProps } from './shared';

const catName: Record<string, string> = {
  operator: 'Lỗi thao tác',
  system: 'Lỗi thiết bị',
  maintenance: 'Đến hạn bảo trì',
};
export default function Alarms({ sim, dispatch }: ScreenProps) {
  const [alarmCat, setAlarmCat] = useState('all');
  const [alarmSev, setAlarmSev] = useState('all');
  const count = (c: string) =>
    sim.alarms.filter((a) => !a.ack && a.cat === c).length;
  const rows = sim.alarms.filter(
    (a) =>
      (alarmCat === 'all' || a.cat === alarmCat) &&
      (alarmSev === 'all' || a.sev === alarmSev),
  );
  const zoneOf = (blk: string) => blk[0];
  return (
    <>
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
          <strong>{sim.alarms.filter((a) => a.ack).length}</strong>
          <small>Nhân viên đang xử lý</small>
        </div>
      </div>
      <Box
        title="Nhật ký cảnh báo & sự cố"
        aside={
          <button
            className="secondary"
            onClick={() =>
              csv(
                [
                  ['Thời gian', 'Phân loại', 'Mức độ', 'Zone', 'Block', 'Thiết bị', 'Mã lỗi', 'Mô tả', 'Trạng thái', 'Người ACK'],
                  ...sim.alarms.map((a) => [
                    a.at ?? '',
                    a.cat ? catName[a.cat] : '',
                    a.sev ?? '',
                    zoneOf(a.block),
                    a.block,
                    a.device ?? '',
                    a.code ?? '',
                    a.text,
                    a.ack ? 'Đã xác nhận' : 'Đang hoạt động',
                    a.ackBy ?? '',
                  ]),
                ],
                'totalparking-alarms.csv',
              )
            }
          >
            <Download size={16} /> Xuất Excel
          </button>
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
                  <td>{zoneOf(a.block)}</td>
                  <td>{a.block}</td>
                  <td>{a.device ?? '—'}</td>
                  <td className="mono">{a.code ?? '—'}</td>
                  <td>{a.text}</td>
                  <td>
                    <Tag text={a.ack ? 'Hoàn tất' : 'Cảnh báo'} />
                  </td>
                  <td>{a.ackBy ?? '—'}</td>
                  <td>
                    <button
                      className="secondary"
                      disabled={a.ack}
                      onClick={() =>
                        dispatch({ type: 'ack', id: a.id, time: time() })
                      }
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
    </>
  );
}
