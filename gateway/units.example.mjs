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
 *
 * IP PLC (theo sơ đồ mạng): Block N = 192.169.1.(100+N)
 *   Block 1 -> 192.169.1.101, Block 2 -> .102, … Cổng FINS = 9600.
 * Các tháp KHÁC LOẠI (mỗi loại 1 .cxp) sẽ có countBits khác nhau — làm 1
 * countBits cho mỗi LOẠI, rồi các block cùng loại dùng lại, chỉ đổi id + host.
 * ============================================================= */

// Danh sách bit 车位 theo TỪNG LOẠI tháp (đọc từ section TRANG_THAI_PALLET).
const COUNTBITS = {
  // Loại +2/-1, 16 chỗ (đọc trực tiếp từ ladder 16车位 V1.3):
  loai_16: [
    'W8.00', 'W8.01', 'W8.02', 'W8.03', 'W8.04', 'W8.05', // Hầm B1: 001,002,003,011,012,013
    'W2.12', 'W2.13', 'W1.13', 'W1.14', // Tầng 1: 102,103,112,113
    'W4.12', 'W4.13', 'W4.14', 'W3.13', 'W3.14', 'W3.15', // Tầng 2: 201,202,203,211,212,213
  ],
  // loai_10: [...],  // mở TRANG_THAI_PALLET của .cxp 10 chỗ rồi điền tương tự
};
// Tiện dụng: IP theo số block
const plc = (n) => `192.169.1.${100 + n}`;

export const UNITS = [
  {
    id: 'Block 1',
    zone: 'A',
    host: plc(1), // 192.169.1.101
    port: 9600,
    protocol: 'tcp',
    capacity: 10, // = số phần tử countBits của loại này
    estop: 'W0.00',
    fault: 'W15.07',
    // door: 'W1.08',   // 栅栏门下限位 — XÁC NHẬN bằng check.mjs trước khi bật
    countBits: COUNTBITS.loai_10 ?? [],
  },
  {
    id: 'Block 2',
    zone: 'A',
    host: plc(2), // 192.169.1.102
    port: 9600,
    protocol: 'tcp',
    capacity: 16,
    estop: 'W0.00',
    fault: 'W15.07',
    countBits: COUNTBITS.loai_16 ?? [],
  },
  // … thêm mỗi block 1 khối: đổi host: plc(N) + countBits theo LOẠI.
];
