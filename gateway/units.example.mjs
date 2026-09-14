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

// Danh sách bit 车位 theo TỪNG LOẠI tháp (sinh bằng gen-countbits.mjs):
const COUNTBITS = {
  // loai_10: ['W1.12','W1.13', ...],
  // loai_16: ['W1.12','W1.13', ...],
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
