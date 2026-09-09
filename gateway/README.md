# TotalParking SCADA — Modbus TCP Gateway

Dịch vụ Node.js đọc tín hiệu PLC qua **Modbus TCP** rồi phát cho web app SCADA
qua **WebSocket**. Trình duyệt không mở được TCP thô nên bắt buộc phải có tầng
này; nó phải chạy trên **máy cùng mạng LAN với PLC** (không chạy trong Cloudflare
Worker).

```
[ PLC ] --Modbus TCP 502--> [ gateway (máy này) ] --WebSocket 8081--> [ web app SCADA ]
```

## 1. Cài đặt & chạy

```bash
cd gateway
npm install
PLC_HOST=192.168.1.50 PLC_PORT=502 PLC_ID=1 npm start
```

Biến môi trường (xem `config.mjs`):

| Biến           | Mặc định        | Ý nghĩa                                  |
| -------------- | --------------- | ---------------------------------------- |
| `PLC_HOST`     | `192.168.1.50`  | IP của PLC                               |
| `PLC_PORT`     | `502`           | Cổng Modbus TCP                          |
| `PLC_ID`       | `1`             | Unit/Slave ID                            |
| `POLL_MS`      | `500`           | Chu kỳ đọc PLC (ms)                      |
| `WS_PORT`      | `8081`          | Cổng WebSocket phát cho web app          |
| `ALLOW_WRITES` | `false`         | Cho phép GHI xuống PLC (nguy hiểm)       |

## 2. Ánh xạ tag

Sửa **`tagmap.mjs`** cho khớp bản đồ bộ nhớ PLC của bạn: mỗi Block khai báo
coil cho cửa/E-Stop/kết nối/lỗi và 1 holding register cho số xe. Đọc-only.

## 3. Nối web app vào gateway

Ở thư mục gốc dự án, đặt biến môi trường build cho web app:

```bash
# .env (Vite) ở thư mục gốc
VITE_DATA_SOURCE=plc
VITE_GATEWAY_WS=ws://192.168.1.10:8081   # IP máy chạy gateway
```

Chạy lại `npm run dev`. Khi đó `useSimulation()` sẽ đọc snapshot thật từ gateway
thay vì mô phỏng. Để quay lại mô phỏng: bỏ `VITE_DATA_SOURCE` hoặc đặt `=sim`.

## 4. An toàn (bắt buộc đọc)

- Bắt đầu **chỉ đọc**. `ALLOW_WRITES=false` cho tới khi bạn thực sự cần điều khiển.
- Lệnh ghi (START/STOP/E-Stop…) phải được **whitelist**, xác thực và xác nhận —
  xem `handleWrite()` trong `index.mjs` (đang để trống có chủ đích).
- Tách mạng OT, **không phơi PLC ra Internet**. Dùng tài khoản Modbus quyền tối thiểu.
