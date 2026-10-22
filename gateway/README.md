# TotalParking SCADA — Omron FINS Gateway (nhiều tháp)

Dịch vụ Node.js đọc tín hiệu nhiều PLC **Omron CP2E** qua **FINS/TCP** rồi phát
cho web app SCADA qua **WebSocket**. Trình duyệt không mở được TCP thô nên bắt
buộc phải có tầng này; nó phải chạy trên **máy cùng mạng LAN với PLC** (không
chạy trong Cloudflare Worker).

```
[ PLC tháp 1..N ] --FINS/TCP 9600--> [ gateway (máy này) ] --WebSocket 8081--> [ web app SCADA ]
```

> CP2E N-type có Modbus-TCP nhưng chỉ ở vai trò **Master** (đi đọc thiết bị khác),
> KHÔNG chạy Modbus slave — nên phải đọc bằng **FINS**, không dùng Modbus.

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `POLL_MS` | `500` | Nghỉ giữa hai vòng đọc hoàn tất (ms) |
| `WS_PORT` | `8081` | Cổng WebSocket + HTTP cấu hình |
| `GATEWAY_BIND_HOST` | `127.0.0.1` | Interface lắng nghe; chỉ đổi khi đã cấu hình firewall/reverse proxy |
| `GATEWAY_ADMIN_TOKEN` | trống | Token API `/config`, tối thiểu 24 ký tự; để trống thì API bị khóa |
| `GATEWAY_ALLOWED_ORIGINS` | localhost | Danh sách Origin web được phép, phân cách bằng dấu phẩy |
| `MOCK` | `false` | `true` = phát snapshot cố định 50% số ô, không nối PLC |

## Chạy gateway (nhiều tháp)

Thực địa có nhiều tháp puzzle/comb, mỗi tháp là 1 PLC CP2E riêng. Không cần
sửa code: khai báo từng tháp ngay trong SCADA (tab **Cấu hình PLC**) — chọn
loại tháp (đã map sẵn số xe/E‑Stop/lỗi), nhập số Block N và xác nhận IP thực
địa. Giao diện chỉ gợi ý dải private `192.168.1.(100+N)`. Gateway lưu vào
`units.json` và kết nối lại ngay.

```bash
npm install
npm run start:omron-multi     # HTTP API cấu hình + WS snapshot trên cổng 8081
```

API: `GET /config` (trả units + presets), `PUT /config` (mảng units, lưu + áp
dụng). Cả hai yêu cầu `Authorization: Bearer <GATEWAY_ADMIN_TOKEN>`. Endpoint
`GET /health` không yêu cầu token và trả số PLC online/tổng số cùng thời điểm
snapshot cuối.

### Test bằng dữ liệu giả (không cần PLC)

Để thử API/giao diện khi chưa nối được PLC, chạy ở chế độ MOCK — gateway đánh
dấu nửa đầu số ô là có xe cho các tháp đang bật:

```bash
MOCK=true npm run start:omron-multi
```

Sau đó vẫn thêm/sửa tháp ở tab **Cấu hình PLC** như bình thường; Dashboard sẽ
thấy số xe từng tháp thay đổi. Bỏ `MOCK` để đọc PLC thật.

### Kiểm chứng đường đọc FINS thật (không cần PLC)

```bash
npm run test:fins
```

Dựng một **FINS/TCP server giả** (đáp handshake node + trả word, kể cả word có
bit15=1) rồi chạy `Poller` thật đọc qua `omron-fins`, kiểm: gateway kết nối được,
đếm xe / cửa / E‑Stop / lỗi đúng, và cập nhật động khi thanh ghi đổi. Dùng để
xác nhận logic đọc trước khi ra hiện trường.

> **Còn phải xác nhận tại hiện trường** (không kiểm được bằng server giả): cực
> tính bit (`车位` 1=có xe? cửa W1.08 hạ/W1.07 nâng? E‑Stop thường-mở/đóng?),
> danh sách `countBits` và địa chỉ `estop`/`fault` từng loại tháp — đối chiếu
> Symbols export của CX‑Programmer.

## Lấy đúng địa chỉ PLC

File `.cxp`/`.emtp` là nhị phân đóng, không đọc địa chỉ từ ngoài được. Xem
**`MAPPING.md`** để biết cần export gì từ CX-Programmer / NB-Designer.

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

- Gateway này **chỉ đọc** và luôn từ chối mọi message điều khiển. Không có biến
  môi trường nào bật được ghi PLC trong phiên bản hiện tại.
- Muốn điều khiển thật phải xây kênh ghi riêng có whitelist, xác thực, phản hồi
  PLC, liên động và kiểm thử FAT/SAT; không nối nút mô phỏng thẳng vào PLC.
- Tách mạng OT, **không phơi PLC ra Internet**. Dùng tài khoản quyền tối thiểu.
- Trang web chạy HTTPS phải đi qua reverse proxy HTTPS/WSS; trình duyệt sẽ chặn
  `http://`/`ws://` mixed content từ một trang HTTPS.
