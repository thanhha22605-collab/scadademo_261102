/* =============================================================
 * DANH SÁCH CỤM ĐỖ (nhiều PLC CP2E) — dùng cho index.omron.multi.mjs
 * -------------------------------------------------------------
 * Thực địa TASECO gồm nhiều cụm puzzle/comb, mỗi cụm thường là 1 PLC CP2E
 * với IP riêng. Copy file này thành `units.mjs` rồi điền IP + địa chỉ D
 * theo chương trình ladder / bảng địa chỉ HMI của từng cụm.
 *
 * Mỗi cụm cần:
 *   - host/port/protocol : kết nối FINS tới PLC của cụm đó
 *   - capacity           : số chỗ của cụm (6/10/14/16…)
 *   - countAddr          : word D chứa SỐ XE đang đỗ của cụm
 *   - statusAddr         : word D chứa các bit trạng thái
 *   - bits               : vị trí bit trong statusAddr
 *       door=cửa đã đóng, estop=E-Stop, online=đang kết nối, fault=báo lỗi
 * ============================================================= */
export const UNITS = [
  {
    id: 'A-01',
    zone: 'A',
    host: '192.168.250.11',
    port: 9600,
    protocol: 'tcp',
    capacity: 10, // vd cụm "10 (5-5) 穿越前移"
    countAddr: 'D0',
    statusAddr: 'D10',
    bits: { door: 0, estop: 1, online: 2, fault: 3 },
  },
  {
    id: 'A-02',
    zone: 'A',
    host: '192.168.250.12',
    port: 9600,
    protocol: 'tcp',
    capacity: 16, // vd cụm "16 (8-8) F1Z2"
    countAddr: 'D0',
    statusAddr: 'D10',
    bits: { door: 0, estop: 1, online: 2, fault: 3 },
  },
  // … thêm cụm khác: mỗi cụm 1 IP PLC.
];
