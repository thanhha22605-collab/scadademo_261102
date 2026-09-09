/* =============================================================
 * BẢNG ÁNH XẠ TAG (TAG MAP)  —  BẠN SỬA PHẦN NÀY THEO PLC THẬT
 * -------------------------------------------------------------
 * Đây là nơi khai báo địa chỉ Modbus của từng tín hiệu, theo từng Block.
 * Quy ước mặc định (bạn thay bằng bản đồ bộ nhớ PLC của mình):
 *   - coilDoor   : coil = true khi CỬA ĐÃ ĐÓNG an toàn
 *   - coilEstop  : coil = true khi E-STOP đang KÍCH HOẠT
 *   - coilOnline : coil = true khi bộ điều khiển ĐANG KẾT NỐI
 *   - coilFault  : coil = true khi thiết bị BÁO LỖI
 *   - regCount   : holding register chứa SỐ XE đang đỗ của block
 *
 * Ví dụ layout liên tục: block i dùng coil i*4..i*4+3, register i.
 * Nếu PLC của bạn dùng địa chỉ khác, chỉ cần sửa các số bên dưới.
 * ============================================================= */
export const BLOCKS = [
  { id: 'A-01', capacity: 20, coilDoor: 0, coilEstop: 1, coilOnline: 2, coilFault: 3, regCount: 0 },
  { id: 'A-02', capacity: 20, coilDoor: 4, coilEstop: 5, coilOnline: 6, coilFault: 7, regCount: 1 },
  { id: 'A-03', capacity: 20, coilDoor: 8, coilEstop: 9, coilOnline: 10, coilFault: 11, regCount: 2 },
  { id: 'A-04', capacity: 20, coilDoor: 12, coilEstop: 13, coilOnline: 14, coilFault: 15, regCount: 3 },
  { id: 'B-01', capacity: 24, coilDoor: 16, coilEstop: 17, coilOnline: 18, coilFault: 19, regCount: 4 },
  { id: 'B-02', capacity: 24, coilDoor: 20, coilEstop: 21, coilOnline: 22, coilFault: 23, regCount: 5 },
  { id: 'B-03', capacity: 24, coilDoor: 24, coilEstop: 25, coilOnline: 26, coilFault: 27, regCount: 6 },
  { id: 'C-01', capacity: 16, coilDoor: 28, coilEstop: 29, coilOnline: 30, coilFault: 31, regCount: 7 },
  { id: 'C-02', capacity: 16, coilDoor: 32, coilEstop: 33, coilOnline: 34, coilFault: 35, regCount: 8 },
];

/* Đọc 1 lần toàn bộ coil + register (gộp thành 2 lệnh Modbus cho nhanh),
 * rồi ánh xạ về danh sách block ở dạng "ngữ nghĩa" cho web app. */
export async function readSnapshot(client) {
  const coilAddrs = BLOCKS.flatMap((b) => [b.coilDoor, b.coilEstop, b.coilOnline, b.coilFault]);
  const regAddrs = BLOCKS.map((b) => b.regCount);
  const cMin = Math.min(...coilAddrs);
  const cMax = Math.max(...coilAddrs);
  const rMin = Math.min(...regAddrs);
  const rMax = Math.max(...regAddrs);

  const coils = (await client.readCoils(cMin, cMax - cMin + 1)).data;
  const regs = (await client.readHoldingRegisters(rMin, rMax - rMin + 1)).data;
  const coil = (a) => Boolean(coils[a - cMin]);
  const reg = (a) => Number(regs[a - rMin] ?? 0);

  return BLOCKS.map((b) => ({
    id: b.id,
    capacity: b.capacity,
    count: reg(b.regCount),
    doorClosed: coil(b.coilDoor),
    estop: coil(b.coilEstop),
    online: coil(b.coilOnline),
    fault: coil(b.coilFault),
  }));
}
