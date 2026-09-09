/* =============================================================
 * TAG MAP cho Omron CP2E (đọc qua FINS)  —  BẠN SỬA THEO CHƯƠNG TRÌNH PLC
 * -------------------------------------------------------------
 * CP2E không chạy Modbus slave, nên ta đọc trực tiếp Data Memory (D) qua FINS.
 * Trong chương trình ladder, bạn ghi dữ liệu trạng thái vào các word D:
 *
 *   - SỐ XE mỗi block  -> 1 word đếm, đặt liên tiếp từ COUNT_BASE.
 *       vd D0=A-01, D1=A-02, ... D8=C-02
 *   - TRẠNG THÁI mỗi block -> 1 word bit-flags, liên tiếp từ STATUS_BASE.
 *       bit0 = cửa ĐÃ ĐÓNG, bit1 = E-STOP kích hoạt,
 *       bit2 = ĐANG kết nối, bit3 = thiết bị BÁO LỖI.
 *       vd D100=A-01, D101=A-02, ... D108=C-02
 *
 * Nếu bạn dùng vùng/địa chỉ khác (W, H, hay D khác), chỉ cần đổi 2 hằng dưới
 * và bảng BLOCKS. Thứ tự BLOCKS = thứ tự word (offset 0,1,2,…).
 * ============================================================= */
export const COUNT_BASE = 'D0';
export const STATUS_BASE = 'D100';
export const BITS = { door: 0, estop: 1, online: 2, fault: 3 };

export const BLOCKS = [
  { id: 'A-01', capacity: 20 },
  { id: 'A-02', capacity: 20 },
  { id: 'A-03', capacity: 20 },
  { id: 'A-04', capacity: 20 },
  { id: 'B-01', capacity: 24 },
  { id: 'B-02', capacity: 24 },
  { id: 'B-03', capacity: 24 },
  { id: 'C-01', capacity: 16 },
  { id: 'C-02', capacity: 16 },
];

/* Ghép 2 mảng word (count + status) thành danh sách block ngữ nghĩa cho web app. */
export function buildBlocks(countWords, statusWords) {
  const bit = (w, n) => Boolean((Number(w || 0) >> n) & 1);
  return BLOCKS.map((b, i) => {
    const s = Number(statusWords[i] ?? 0);
    return {
      id: b.id,
      capacity: b.capacity,
      count: Number(countWords[i] ?? 0),
      doorClosed: bit(s, BITS.door),
      estop: bit(s, BITS.estop),
      online: bit(s, BITS.online),
      fault: bit(s, BITS.fault),
    };
  });
}
