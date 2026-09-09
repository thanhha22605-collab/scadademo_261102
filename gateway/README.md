# TotalParking SCADA — Modbus TCP Gateway

Dịch vụ Node.js đọc tín hiệu PLC qua **Modbus TCP** rồi phát cho web app SCADA
qua **WebSocket**. Trình duyệt không mở được TCP thô nên bắt buộc phải có tầng
này; nó phải chạy trên **máy cùng mạng LAN với PLC** (không chạy trong Cloudflare
Worker).

```
[ PLC ] --Modbus TCP 502--> [ gateway (máy này) ] --WebSocket 8081--> [ web app SCADA ]
```

## Chọn giao thức theo PLC

- **Omron CP2E / CP1 / CJ / CS…** → dùng **FINS** (`index.omron.mjs`).
  CP2E N-type có Modbus-TCP nhưng ở vai trò **Master** (đi đọc thiết bị khác),
  KHÔNG chạy Modbus slave, nên không đọc trực tiếp bằng bản Modbus được.
- **PLC chạy được Modbus-TCP slave/server** (Delta, Wecon, Inovance, một số
  Schneider…) → dùng bản **Modbus** (`index.mjs`).

## 1A. Omron CP2E (FINS) — khuyến nghị cho máy của bạn

Chuẩn bị trên PLC (CX-Programmer / CX-One):
- Bật cổng Ethernet, đặt IP (mặc định `192.168.250.1`), bật **FINS/TCP cổng 9600**.
- Trong ladder, ghi **số xe** mỗi block vào `D0..D8` và **word trạng thái** (bit
  cửa/E-Stop/kết nối/lỗi) vào `D100..D108` — xem `tagmap.omron.mjs`.

```bash
cd gateway
npm install
FINS_HOST=192.168.250.1 FINS_PORT=9600 npm run start:omron
```

| Biến            | Mặc định          | Ý nghĩa                       |
| --------------- | ----------------- | ----------------------------- |
| `FINS_HOST`     | `192.168.250.1`   | IP Ethernet của CP2E          |
| `FINS_PORT`     | `9600`            | Cổng FINS                     |
| `FINS_PROTOCOL` | `tcp`             | `tcp` hoặc `udp`              |
| `POLL_MS`       | `500`             | Chu kỳ đọc (ms)               |
| `WS_PORT`       | `8081`            | Cổng WebSocket cho web app    |
| `ALLOW_WRITES`  | `false`           | Cho phép GHI (nguy hiểm)      |

Sửa **`tagmap.omron.mjs`** nếu PLC bạn đặt số xe/trạng thái ở vùng địa chỉ khác.

## 1B. Modbus TCP (PLC hỗ trợ slave)

```bash
cd gateway
npm install
PLC_HOST=192.168.1.50 PLC_PORT=502 PLC_ID=1 npm start
```

| Biến           | Mặc định        | Ý nghĩa                                  |
| -------------- | --------------- | ---------------------------------------- |
| `PLC_HOST`     | `192.168.1.50`  | IP của PLC                               |
| `PLC_PORT`     | `502`           | Cổng Modbus TCP                          |
| `PLC_ID`       | `1`             | Unit/Slave ID                            |
| `POLL_MS`      | `500`           | Chu kỳ đọc PLC (ms)                      |
| `WS_PORT`      | `8081`          | Cổng WebSocket phát cho web app          |
| `ALLOW_WRITES` | `false`         | Cho phép GHI xuống PLC (nguy hiểm)       |

Sửa **`tagmap.mjs`**: mỗi Block khai báo coil cửa/E-Stop/kết nối/lỗi và 1 holding
register cho số xe.

> Cả hai bản đều phát cùng một định dạng snapshot nên web app không phải sửa gì.

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
