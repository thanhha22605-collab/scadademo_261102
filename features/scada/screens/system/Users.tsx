'use client';
import { Panel, Badge } from '@/features/scada/components/shared';

const roles = [
  {
    r: 'Administrator',
    t: 'red',
    p: [
      'Toàn quyền hệ thống',
      'Forced Mode (Admin)',
      'Quản lý người dùng',
      'Cấu hình cổng API',
    ],
  },
  {
    r: 'Supervisor',
    t: 'blue',
    p: [
      'Reset / Ack Alarm',
      'Xem tất cả phân khu',
      'Tạo & Xuất báo cáo',
      'Xác nhận điều khiển nguy hiểm',
    ],
  },
  {
    r: 'Maintenance',
    t: 'amber',
    p: [
      'Maintenance Mode',
      'Kiểm tra cảm biến / VFD',
      'Xem chi tiết Block',
      'Xử lý Work Order',
    ],
  },
  {
    r: 'Operator',
    t: 'green',
    p: [
      'Dashboard giám sát',
      'Đọc thông tin cảnh báo',
      'Điều hướng giao thông',
      'Quản lý quẹt thẻ',
    ],
  },
  {
    r: 'Remote Support',
    t: 'purple',
    p: [
      'Chỉ đọc (Read-Only)',
      'Không được điều khiển',
      'Đọc logs chẩn đoán',
      'Giới hạn phiên 1 giờ',
    ],
  },
];
const online = [
  ['Supervisor', 'supervisor01', '07:00:00', '192.168.1.10'],
  ['Operator', 'operator01', '07:30:00', '192.168.1.11'],
  ['Maintenance', 'maintenance01', '08:00:00', '192.168.1.15'],
  ['Remote Support', 'remote_eng01', '07:55:00', '203.162.x.x'],
];
const audit = [
  [
    '08:40:22',
    'supervisor01',
    'Supervisor',
    'Block A-04',
    'Reset Alarm E-0401',
    true,
    'Đã xử lý quá nhiệt motor, reset biến tần VFD.',
  ],
  [
    '08:35:10',
    'maintenance01',
    'Maintenance',
    'Block B-03',
    'Chuyển Maintenance Mode',
    true,
    'Bảo trì định kỳ vòng xích truyền động.',
  ],
  [
    '08:28:05',
    'operator01',
    'Operator',
    'Block A-03',
    'Ack Alarm W-0302',
    true,
    'Đã đóng kín cửa tủ điện điều khiển.',
  ],
  [
    '07:30:00',
    'admin01',
    'Admin',
    'Block A-04',
    'Kích hoạt Forced Mode',
    false,
    'Mật khẩu xác thực cấp 2 sai - Hủy yêu cầu.',
  ],
];
export default function Users() {
  return (
    <>
      <Panel title="Ma trận phân quyền hệ thống (User Permission Matrix)" pad>
        <div className="role-grid">
          {roles.map((r) => (
            <div className="role-card" key={r.r}>
              <Badge tone={r.t}>{r.r}</Badge>
              <ul>
                {r.p.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
      <div className="two-col">
        <Panel title="Tài khoản đang kết nối trực tuyến" pad>
          <div className="online-grid">
            {online.map((o) => (
              <div className="online" key={o[1]}>
                <div>
                  <b>{o[1]}</b>
                  <small>{o[0]}</small>
                </div>
                <div className="online-meta">
                  <span>Đăng nhập: {o[2]}</span>
                  <span>IP: {o[3]}</span>
                </div>
                <Badge tone="green">Online</Badge>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Nhật ký Audit Log vận hành" pad>
          <div className="table-scroll">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Người dùng</th>
                  <th>Lệnh gửi</th>
                  <th>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a, i) => (
                  <tr key={i}>
                    <td className="mono">{a[0]}</td>
                    <td>{a[1]}</td>
                    <td>{a[4]}</td>
                    <td>
                      <Badge tone={a[5] ? 'green' : 'red'}>
                        {a[5] ? 'Thành công' : 'Bị từ chối'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
