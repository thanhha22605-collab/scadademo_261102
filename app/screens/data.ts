/* Dữ liệu tham chiếu dùng chung giữa nhiều màn (Maintenance, Diagnostics, Reports, Cards). */
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
  ['08:42:15', 'Motor-Lift-01 · A-04', 'E-0401', 'Quá tải nhiệt cuộn dây (115°C)', 'Chờ can thiệp', '—'],
  ['07:55:10', 'Sensor-LS-03 · A-04', 'E-0405', 'Công tắc giới hạn hành trình dưới không phản hồi', 'Reset cảm biến', 'operator02'],
  ['08:15:44', 'AI-VDS · B-03', 'W-0701', 'Camera cổng vào mất kết nối - chuyển Fallback', 'Chuyển cảm biến ZCU', 'operator01'],
  ['07:30:00', 'Motor-Slide-02 · B-01', 'M-0501', 'Số chu kỳ nâng trượt đạt 85% ngưỡng mài mòn', 'Lên lịch bảo trì', 'maintenance01'],
];
export type CardRow = {
  id: string;
  plate: string;
  owner: string;
  type: string;
  zone: string;
  block: string;
  active: boolean;
  synced: boolean;
  last: string;
};
export const seedCards: CardRow[] = [
  { id: 'TH-00123', plate: '51G-12345', owner: 'Nguyễn Văn An', type: 'SUV', zone: 'Zone 1', block: 'A-01', active: true, synced: true, last: '08:30:00' },
  { id: 'TH-00456', plate: '30H-88877', owner: 'Trần Thị Bình', type: 'Sedan', zone: 'Zone 2', block: 'B-02', active: true, synced: true, last: '07:45:20' },
  { id: 'TH-00789', plate: '43A-56789', owner: 'Lê Quốc Cường', type: 'SUV', zone: 'Zone 1', block: 'A-02', active: true, synced: true, last: '06:55:10' },
  { id: 'TH-01011', plate: '92B-11223', owner: 'Phạm Minh Dũng', type: 'Sedan', zone: 'Zone 4', block: 'C-02', active: false, synced: false, last: '2026-05-30' },
  { id: 'TH-01213', plate: '79C-44556', owner: 'Hoàng Thị Lan', type: 'SUV', zone: 'Zone 2', block: 'B-01', active: true, synced: true, last: '2026-06-07' },
];
