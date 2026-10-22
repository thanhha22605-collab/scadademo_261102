/* =============================================================
 * Preset các LOẠI tháp TASECO (đọc từ ladder, section 车位汇总/TRANG_THAI_PALLET).
 * Dùng chung cho gateway + API cấu hình. Thêm PLC ở giao diện chỉ cần chọn key.
 * ============================================================= */
export const PRESETS = {
  loai_6: {
    label: '前移 6 chỗ (3-3)',
    capacity: 6,
    bits: ['W2.12', 'W1.13', 'W4.12', 'W4.13', 'W3.13', 'W3.14'],
  },
  comb_10: {
    label: '前移 10 chỗ (5-5)',
    capacity: 10,
    bits: ['W2.12', 'W2.13', 'W1.13', 'W1.14', 'W4.12', 'W4.13', 'W4.14', 'W3.13', 'W3.14', 'W3.15'],
  },
  comb_14: {
    label: '前移 14 chỗ (7-7)',
    capacity: 14,
    bits: ['W2.12', 'W2.13', 'W2.14', 'W1.13', 'W1.14', 'W1.15', 'W4.12', 'W4.13', 'W4.14', 'W4.15', 'W3.13', 'W3.14', 'W3.15', 'W3.12'],
  },
  loai_10: {
    label: '穿越 +2/-1 · 10 chỗ',
    capacity: 10,
    bits: ['W8.00', 'W8.01', 'W8.03', 'W8.04', 'W2.12', 'W1.13', 'W4.12', 'W4.13', 'W3.13', 'W3.14'],
  },
  loai_16: {
    label: '穿越 +2/-1 · 16 chỗ',
    capacity: 16,
    bits: ['W8.00', 'W8.01', 'W8.02', 'W8.03', 'W8.04', 'W8.05', 'W2.12', 'W2.13', 'W1.13', 'W1.14', 'W4.12', 'W4.13', 'W4.14', 'W3.13', 'W3.14', 'W3.15'],
  },
};

/* Tín hiệu dùng chung cả họ TASECO */
export const DEFAULTS = {
  estop: 'W0.00', // 急停
  fault: 'W15.07', // 有故障
  port: 9600, // FINS
  protocol: 'tcp',
};

/* IP gợi ý theo số block trong dải private: 192.168.1.(100 + N) */
export const plc = (n) => `192.168.1.${100 + Number(n)}`;

/* Đổi 1 cấu hình UI { n, name, type, door, zone, enabled } -> unit gateway đọc. */
export function resolveUnit(c) {
  const p = PRESETS[c.type];
  if (!p) return null;
  return {
    id: c.id || `plc-${c.n}`,
    name: c.name || `Block ${c.n}`,
    zone: c.zone || 'A',
    host: c.host || plc(c.n),
    port: c.port || DEFAULTS.port,
    protocol: c.protocol || DEFAULTS.protocol,
    capacity: p.capacity,
    estop: DEFAULTS.estop,
    fault: DEFAULTS.fault,
    door: c.door || 'W1.08',
    countBits: p.bits,
  };
}
