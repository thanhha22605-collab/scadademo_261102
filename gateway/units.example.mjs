/* =============================================================
 * DANH SÁCH THÁP ĐỖ (nhiều PLC CP2E) — dùng cho index.omron.multi.mjs
 * -------------------------------------------------------------
 * Mỗi tháp là 1 PLC CP2E riêng (IP riêng). Copy file này thành `units.mjs`
 * rồi điền IP + địa chỉ theo bảng Symbols của từng tháp.
 *
 * Địa chỉ chung đã đọc từ chương trình TASECO (dùng lại cho mọi tháp cùng
 * chương trình):
 *   estop = 'W0.00'   (急停)
 *   fault = 'W15.07'  (有故障)
 *   online: bỏ trống  -> gateway tự coi là online khi đọc PLC thành công.
 *   door  : cần XÁC NHẬN bằng check.mjs (đóng cửa xem bit nào lên).
 *
 * SỐ XE: PLC không có word đếm — mỗi chỗ là 1 bit 车位. Dùng `countBits`
 * (đếm số bit ON = số xe). Sinh danh sách bằng:
 *   node gen-countbits.mjs symbols.txt
 * rồi dán mảng vào `countBits` của tháp đó. Nhớ đối chiếu tổng với số HMI.
 * ============================================================= */
export const UNITS = [
  {
    id: 'Tháp 1', // tên hiển thị trên SCADA
    zone: 'A',
    host: '192.168.250.11', // IP PLC tháp 1
    port: 9600,
    protocol: 'tcp',
    capacity: 40, // tổng số chỗ của tháp (bằng số phần tử countBits)
    estop: 'W0.00',
    fault: 'W15.07',
    // door: 'W1.08',   // ứng viên: 栅栏门下限位 — xác nhận trước khi bật
    countBits: [
      // dán từ gen-countbits.mjs, ví dụ:
      'W1.12', 'W1.13', 'W1.14', 'W1.15',
      'W2.12', 'W2.13', 'W2.14', 'W2.15',
      // … đầy đủ các bit 车位 của tháp này …
    ],
  },
  {
    id: 'Tháp 2',
    zone: 'A',
    host: '192.168.250.12',
    port: 9600,
    protocol: 'tcp',
    capacity: 40,
    estop: 'W0.00',
    fault: 'W15.07',
    countBits: [
      // … bit 车位 của tháp 2 …
    ],
  },
  // … thêm mỗi tháp 1 khối, chủ yếu đổi id + host (+ countBits nếu khác).
];
