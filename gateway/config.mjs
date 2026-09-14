/* Cấu hình gateway — chỉnh qua biến môi trường hoặc sửa trực tiếp giá trị mặc định. */
export const config = {
  /* --- FINS (Omron CP2E / CP1 / CJ / CS…): mặc định dùng cho index.omron.multi.mjs.
         Mỗi tháp khai báo host/port riêng ở units.json; các giá trị dưới đây chỉ là
         fallback khi 1 tháp không ghi rõ cổng. --- */
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
