'use client';
import { useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import { Panel, Badge, Kpi } from './shared';
import { seedCards, type CardRow } from './data';

export default function Cards() {
  const [rows, setRows] = useState<CardRow[]>(seedCards);
  const [note, setNote] = useState('');
  const addCard = () => {
    const id = 'TH-0' + (rows.length + 14).toString().padStart(3, '0');
    setRows([
      {
        id,
        plate: '30K-' + (100 + rows.length).toString() + '.45',
        owner: 'Khách vãng lai',
        type: rows.length % 2 ? 'Sedan' : 'SUV',
        zone: 'Zone 1',
        block: 'A-01',
        active: true,
        synced: false,
        last: new Date().toLocaleTimeString('vi-VN'),
      },
      ...rows,
    ]);
    setNote('Đã tạo thẻ mới, chờ đồng bộ xuống HMI.');
  };
  return (
    <>
      <div className="metrics metrics-3">
        <Kpi label="Tổng số thẻ đang quản lý" value={String(rows.length)} tone="blue" icon={CreditCard} />
        <Kpi label="Thẻ đang hoạt động" value={String(rows.filter((c) => c.active).length)} tone="green" icon={CreditCard} />
        <Kpi label="Thẻ bị khóa / hết hạn" value={String(rows.filter((c) => !c.active).length)} tone="red" icon={Lock} />
      </div>
      <Panel
        title="Danh sách thẻ từ bãi đỗ (RFID Card Management)"
        aside={
          <button className="secondary" onClick={addCard}>
            <CreditCard size={15} /> Cài đặt thẻ mới
          </button>
        }
        pad
      >
        {note && (
          <output className="notice green">
            {note}
          </output>
        )}
        <div className="table-scroll">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Mã thẻ</th>
                <th>Biển số</th>
                <th>Chủ xe</th>
                <th>Loại xe</th>
                <th>Zone</th>
                <th>Block</th>
                <th>Trạng thái</th>
                <th>Đồng bộ HMI</th>
                <th>Dùng cuối</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="mono">{c.id}</td>
                  <td className="mono">{c.plate}</td>
                  <td>{c.owner}</td>
                  <td>{c.type}</td>
                  <td>{c.zone}</td>
                  <td>Block {c.block}</td>
                  <td>
                    <Badge tone={c.active ? 'green' : 'red'}>
                      {c.active ? 'Hoạt động' : 'Đã khóa'}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={c.synced ? 'green' : 'amber'}>
                      {c.synced ? 'Đã đồng bộ' : 'Chưa đồng bộ'}
                    </Badge>
                  </td>
                  <td>{c.last}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="mini"
                        aria-label={c.active ? 'Khóa thẻ' : 'Mở khóa thẻ'}
                        onClick={() => {
                          setRows(
                            rows.map((r) =>
                              r.id === c.id ? { ...r, active: !r.active } : r,
                            ),
                          );
                          setNote(
                            (c.active ? 'Đã khóa thẻ ' : 'Đã mở khóa thẻ ') +
                              c.id,
                          );
                        }}
                      >
                        <Lock size={13} /> {c.active ? 'Khóa' : 'Mở khóa'}
                      </button>
                      <button
                        className="mini danger"
                        aria-label="Xóa thẻ"
                        onClick={() => {
                          setRows(rows.filter((r) => r.id !== c.id));
                          setNote('Đã xóa thẻ ' + c.id);
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="empty-state">Chưa có thẻ nào trong hệ thống.</div>
        )}
      </Panel>
    </>
  );
}
