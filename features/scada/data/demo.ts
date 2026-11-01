/* Dữ liệu minh họa dùng chung giữa các màn bảo trì, báo cáo và RFID. */
export const blockFreq = [
  { id: 'B01', z: 'Zone A', cyc: '3,820', rt: '1240h', pct: 38 },
  { id: 'B02', z: 'Zone A', cyc: '2,910', rt: '980h', pct: 29 },
  { id: 'B03', z: 'Zone A', cyc: '4,110', rt: '1540h', pct: 41 },
  { id: 'B04', z: 'Zone A', cyc: '5,640', rt: '2100h', pct: 56 },
  { id: 'B05', z: 'Zone B', cyc: '2,100', rt: '760h', pct: 21 },
  { id: 'B06', z: 'Zone B', cyc: '2,450', rt: '890h', pct: 25 },
  { id: 'B07', z: 'Zone B', cyc: '8,900', rt: '3200h', pct: 89 },
  { id: 'B08', z: 'Zone B', cyc: '1,780', rt: '540h', pct: 18 },
  { id: 'B09', z: 'Zone C', cyc: '1,200', rt: '420h', pct: 12 },
  { id: 'B10', z: 'Zone C', cyc: '1,050', rt: '380h', pct: 11 },
  { id: 'B11', z: 'Zone C', cyc: '0', rt: '0h', pct: 0 },
  { id: 'B12', z: 'Zone C', cyc: '880', rt: '290h', pct: 9 },
];
export const faultLog = [
  [
    '08:42:15',
    'Motor-Lift-01 · A-04',
    'E-0401',
    'Quá tải nhiệt cuộn dây (115°C)',
    'Chờ can thiệp',
    '—',
  ],
  [
    '07:55:10',
    'Sensor-LS-03 · A-04',
    'E-0405',
    'Công tắc giới hạn hành trình dưới không phản hồi',
    'Reset cảm biến',
    'operator02',
  ],
  [
    '08:15:44',
    'AI-VDS · B-03',
    'W-0701',
    'Camera cổng vào mất kết nối - chuyển Fallback',
    'Chuyển cảm biến ZCU',
    'operator01',
  ],
  [
    '07:30:00',
    'Motor-Slide-02 · B-01',
    'M-0501',
    'Số chu kỳ nâng trượt đạt 85% ngưỡng mài mòn',
    'Lên lịch bảo trì',
    'maintenance01',
  ],
];
export type CardRow = {
  id: string;
  uid: string;
  plate: string;
  owner: string;
  type: string;
  zone: string;
  block: string;
  active: boolean;
  synced: boolean;
  last: string;
  batch?: string;
  weight?: 'Dưới 2200' | '2200–2600' | 'Trên 2600';
};
export const seedCards: CardRow[] = [
  {
    id: 'TH-00123',
    uid: '04:1A:2B:3C',
    plate: '51G-12345',
    owner: 'Nguyễn Văn An',
    type: 'SUV',
    zone: 'Zone 1',
    block: 'A-01',
    active: true,
    synced: true,
    last: '08:30:00',
  },
  {
    id: 'TH-00456',
    uid: '04:5D:6E:7F',
    plate: '30H-88877',
    owner: 'Trần Thị Bình',
    type: 'Sedan',
    zone: 'Zone 2',
    block: 'B-02',
    active: true,
    synced: true,
    last: '07:45:20',
  },
  {
    id: 'TH-00789',
    uid: '04:8A:9B:AC',
    plate: '43A-56789',
    owner: 'Lê Quốc Cường',
    type: 'SUV',
    zone: 'Zone 1',
    block: 'A-02',
    active: true,
    synced: true,
    last: '06:55:10',
  },
  {
    id: 'TH-01011',
    uid: '04:11:22:33',
    plate: '92B-11223',
    owner: 'Phạm Minh Dũng',
    type: 'Sedan',
    zone: 'Zone 4',
    block: 'C-02',
    active: false,
    synced: false,
    last: '2026-05-30',
  },
  {
    id: 'TH-01213',
    uid: '04:44:55:66',
    plate: '79C-44556',
    owner: 'Hoàng Thị Lan',
    type: 'SUV',
    zone: 'Zone 2',
    block: 'B-01',
    active: true,
    synced: true,
    last: '2026-06-07',
  },
];

/* ---- Nhật ký ra/vào theo thẻ RFID (DỮ LIỆU MẪU) ----
 * Chưa tích hợp đầu đọc RFID/LPR thật; khi có nguồn sự kiện ra/vào, thay mảng này
 * bằng dữ liệu thật (hoặc truy vấn API) với cùng cấu trúc AccessEvent. */
export type AccessEvent = {
  at: string; // 'YYYY-MM-DD HH:MM:SS'
  uid: string;
  dir: 'IN' | 'OUT';
  gate: string;
  plate: string;
  block: string;
  slot: number;
  result: 'Cho phép' | 'Từ chối';
  reason?: string;
};
export const accessEvents: AccessEvent[] = [
  // Nguyễn Văn An — đang trong bãi (lượt cuối là IN)
  {
    at: '2026-10-31 07:12:05',
    uid: '04:1A:2B:3C',
    dir: 'IN',
    gate: 'Cổng 1',
    plate: '51G-12345',
    block: 'A-01',
    slot: 2,
    result: 'Cho phép',
  },
  {
    at: '2026-10-31 09:40:11',
    uid: '04:1A:2B:3C',
    dir: 'OUT',
    gate: 'Cổng 1',
    plate: '51G-12345',
    block: 'A-01',
    slot: 2,
    result: 'Cho phép',
  },
  {
    at: '2026-10-31 14:05:33',
    uid: '04:1A:2B:3C',
    dir: 'IN',
    gate: 'Cổng 2',
    plate: '51G-12345',
    block: 'A-01',
    slot: 5,
    result: 'Cho phép',
  },
  // Trần Thị Bình — đã rời bãi
  {
    at: '2026-10-31 06:50:20',
    uid: '04:5D:6E:7F',
    dir: 'IN',
    gate: 'Cổng 2',
    plate: '30H-88877',
    block: 'B-02',
    slot: 7,
    result: 'Cho phép',
  },
  {
    at: '2026-10-31 08:15:40',
    uid: '04:5D:6E:7F',
    dir: 'OUT',
    gate: 'Cổng 2',
    plate: '30H-88877',
    block: 'B-02',
    slot: 7,
    result: 'Cho phép',
  },
  // Lê Quốc Cường — đang trong bãi
  {
    at: '2026-10-31 06:30:02',
    uid: '04:8A:9B:AC',
    dir: 'IN',
    gate: 'Cổng 1',
    plate: '43A-56789',
    block: 'A-02',
    slot: 12,
    result: 'Cho phép',
  },
  // Phạm Minh Dũng — thẻ bị khóa, bị từ chối
  {
    at: '2026-10-31 08:01:10',
    uid: '04:11:22:33',
    dir: 'IN',
    gate: 'Cổng 1',
    plate: '92B-11223',
    block: '—',
    slot: -1,
    result: 'Từ chối',
    reason: 'Thẻ đã bị khóa / hết hạn',
  },
  // Hoàng Thị Lan — 2 lượt ra/vào, đã rời bãi
  {
    at: '2026-10-31 07:45:00',
    uid: '04:44:55:66',
    dir: 'IN',
    gate: 'Cổng 1',
    plate: '79C-44556',
    block: 'B-01',
    slot: 5,
    result: 'Cho phép',
  },
  {
    at: '2026-10-31 12:30:15',
    uid: '04:44:55:66',
    dir: 'OUT',
    gate: 'Cổng 1',
    plate: '79C-44556',
    block: 'B-01',
    slot: 5,
    result: 'Cho phép',
  },
  {
    at: '2026-10-31 13:10:44',
    uid: '04:44:55:66',
    dir: 'IN',
    gate: 'Cổng 2',
    plate: '79C-44556',
    block: 'B-01',
    slot: 9,
    result: 'Cho phép',
  },
  {
    at: '2026-10-31 17:22:09',
    uid: '04:44:55:66',
    dir: 'OUT',
    gate: 'Cổng 2',
    plate: '79C-44556',
    block: 'B-01',
    slot: 9,
    result: 'Cho phép',
  },
];
