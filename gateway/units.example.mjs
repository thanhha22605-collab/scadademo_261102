/* =============================================================
 * DANH SÁCH CỤM ĐỖ (nhiều PLC CP2E) — dùng cho index.omron.multi.mjs
 * -------------------------------------------------------------
 * Mỗi cụm puzzle/comb là 1 PLC CP2E riêng (IP riêng). Copy file này thành
 * `units.mjs` rồi ĐIỀN đúng địa chỉ đọc được trên HMI (NB-Designer) vào từng ô.
 *
 * Ý nghĩa các ô ("MAPPING" = ghép mỗi tín hiệu với 1 địa chỉ PLC):
 *   host      : IP Ethernet của PLC cụm đó
 *   capacity  : số chỗ của cụm (6/10/14/16…)
 *   count     : ĐỊA CHỈ WORD chứa "số xe đang đỗ"     (vd 'D0')
 *   door      : ĐỊA CHỈ BIT  "cửa an toàn đã đóng"    (vd 'W0.00')
 *   estop     : ĐỊA CHỈ BIT  "E-Stop đang kích hoạt"  (vd 'W0.01')
 *   fault     : ĐỊA CHỈ BIT  "thiết bị báo lỗi"        (vd 'W0.03')
 *   online    : (tuỳ chọn) BIT heartbeat; BỎ TRỐNG thì gateway tự coi là
 *               "online" khi đọc PLC thành công.
 *
 * Cú pháp địa chỉ (giống trên HMI / CX-Programmer):
 *   Word:  D0, D100, W5, H10, CIO20
 *   Bit:   W0.00 … W0.15  (word W0, bit 0..15) — cũng dùng cho D/H/CIO/A
 * Không dùng tín hiệu nào thì cứ bỏ trống ô đó.
 * ============================================================= */
export const UNITS = [
  {
    id: 'A-01', // tên hiển thị trên SCADA
    zone: 'A',
    host: '192.168.250.11', // IP PLC cụm A-01
    port: 9600,
    protocol: 'tcp',
    capacity: 10,
    count: 'D0',
    door: 'W0.00',
    estop: 'W0.01',
    online: 'W0.02', // bỏ trống nếu PLC không có bit này
    fault: 'W0.03',
  },
  {
    id: 'A-02',
    zone: 'A',
    host: '192.168.250.12',
    port: 9600,
    protocol: 'tcp',
    capacity: 16,
    count: 'D0',
    door: 'W0.00',
    estop: 'W0.01',
    online: 'W0.02',
    fault: 'W0.03',
  },
  // … thêm mỗi cụm 1 khối như trên (đổi id, host, và địa chỉ nếu khác).
];
