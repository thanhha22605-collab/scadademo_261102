/* Cấu hình gateway — chỉnh qua biến môi trường hoặc sửa trực tiếp giá trị mặc định. */
export const config = {
  /* --- Modbus TCP (bản chung; CP2E N-type chỉ làm Modbus MASTER nên thường
         KHÔNG đọc trực tiếp được bằng cách này — xem phần FINS bên dưới) --- */
  plc: {
    host: process.env.PLC_HOST || '192.168.1.50',
    port: Number(process.env.PLC_PORT || 502),
    unitId: Number(process.env.PLC_ID || 1),
  },
  /* --- FINS (Omron CP2E / CP1 / CJ / CS…): dùng cho index.omron.mjs --- */
  fins: {
    host: process.env.FINS_HOST || '192.168.250.1', // IP mặc định Ethernet CP2E
    port: Number(process.env.FINS_PORT || 9600), // cổng FINS/TCP
    protocol: process.env.FINS_PROTOCOL || 'tcp', // 'tcp' hoặc 'udp'
  },
  pollMs: Number(process.env.POLL_MS || 500), // chu kỳ đọc PLC (ms)
  wsPort: Number(process.env.WS_PORT || 8081), // cổng WebSocket phát cho web app
  mock: process.env.MOCK === 'true', // MOCK=true: sinh số giả để test, KHÔNG nối PLC
  // GHI XUỐNG PLC rất nguy hiểm — mặc định TẮT.
  allowWrites: process.env.ALLOW_WRITES === 'true',
};
