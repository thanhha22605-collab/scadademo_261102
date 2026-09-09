/* Cấu hình gateway — chỉnh qua biến môi trường hoặc sửa trực tiếp giá trị mặc định. */
export const config = {
  plc: {
    host: process.env.PLC_HOST || '192.168.1.50', // IP của PLC
    port: Number(process.env.PLC_PORT || 502), // cổng Modbus TCP (mặc định 502)
    unitId: Number(process.env.PLC_ID || 1), // Unit/Slave ID
  },
  pollMs: Number(process.env.POLL_MS || 500), // chu kỳ đọc PLC (ms)
  wsPort: Number(process.env.WS_PORT || 8081), // cổng WebSocket phát cho web app
  // GHI XUỐNG PLC rất nguy hiểm — mặc định TẮT. Chỉ bật khi đã hiểu rõ hậu quả.
  allowWrites: process.env.ALLOW_WRITES === 'true',
};
