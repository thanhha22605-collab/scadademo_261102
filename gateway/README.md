# TotalParking SCADA — Omron FINS Gateway (nhiều tháp)

Dịch vụ Node.js đọc tín hiệu nhiều PLC **Omron CP2E** qua **FINS/UDP hoặc FINS/TCP** rồi phát
cho web app SCADA qua **WebSocket**. Trình duyệt không mở được TCP thô nên bắt
buộc phải có tầng này; nó phải chạy trên **máy cùng mạng LAN với PLC** (không
chạy trong Cloudflare Worker).

```
[ PLC tháp 1..N ] --FINS UDP/TCP 9600--> [ gateway (máy này) ] --WebSocket 8081--> [ web app SCADA ]
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
| `ENABLE_PLC_WRITES` | `false` | Chỉ bật sau FAT/SAT để cho phép ghi whitelist D1000/D1004 |
| `CAMERA_INGEST_TOKEN` | trống | Bearer token riêng cho API nhận dữ liệu Camera AI |
| `LED_CONTROLLER_URL` | trống | HTTP endpoint nhận tổng số chỗ trống và số liệu theo Zone |
| `LED_PANELS_JSON` | trống | Danh sách bảng LED TCP gốc (`host`, cổng 2022, port hiển thị, hướng mũi tên) |
| `LED_REFRESH_MS` | `5000` | Nhịp gửi lại frame LED; bị chặn tối đa 10 giây |
| `PGS_CCU_PORT` | `0` | Cổng TCP nhận frame CCU; `0` = chưa bật |
| `FINS_BUSY_RETRY_MS` | `300000` | Giãn retry khi FINS/TCP trả `0x20` (hết khe kết nối) |
| `MYSQL_URL` | trống | Chuỗi kết nối MySQL; gateway tự tạo bảng ACK, RFID, access và Camera |

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

API tích hợp nghiệm thu:

- `POST /api/plc/search-result`: ghi số Block vào `D1000`, tự trả về `0` sau 30 giây.
- `POST /api/plc/weight-class`: ghi `1/2/3` vào `D1004`.
- `POST /api/plc/card-decision`: hợp đồng source tham chiếu, ghi hạng tải vào `D402` và cờ cho phép vào `W75.0` (địa chỉ đổi được bằng biến môi trường).
- `POST /api/camera/ingest`: nhận `event_id`, make/model/year, kích thước mm, khối lượng kg và `image_path`. Biển số là tùy chọn; gateway không bịa biển số khi camera không gửi.
- `GET/PUT /api/cards`: đọc và lưu thẻ RFID trong MySQL.
- `GET/POST /api/alarms/ack`: đọc và lưu người xác nhận alarm trong MySQL.
- `GET/POST /api/access-events`: đọc/ghi sự kiện RFID vào/ra.
- `GET /api/audit`: nhật ký thao tác ACK và cập nhật thẻ trong MySQL.
- LED có hai adapter: HTTP tương thích cũ qua `LED_CONTROLLER_URL`, hoặc TCP thật qua `LED_PANELS_JSON` với frame `$PORT,...*CRC#`, kiểm ACK và refresh định kỳ.
- PGS/CCU có listener TCP tùy chọn, kiểm checksum XOR và giữ trạng thái từng ZCU/cảm biến trong snapshot WebSocket.

Ba API ghi PLC yêu cầu token quản trị và `ENABLE_PLC_WRITES=true`; mặc định
luôn khóa để tránh ghi nhầm thiết bị khi chưa kiểm thử hiện trường.

Mỗi Block có hai cờ độc lập: `enabled` quyết định gateway có giám sát PLC hay
không; `operational` quyết định Block có được dùng để phân tuyến xe mới hay
không. Hạ `operational` vẫn giữ việc đọc PLC để đội bảo trì quan sát thiết bị.

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

- WebSocket điều khiển vẫn **chỉ đọc** và luôn từ chối mọi message điều khiển.
- Kênh ghi nghiệm thu chỉ whitelist các endpoint và địa chỉ nêu trên, yêu cầu token quản trị,
  khóa mặc định và phải hoàn tất FAT/SAT trước khi bật.
- Tách mạng OT, **không phơi PLC ra Internet**. Dùng tài khoản quyền tối thiểu.
- Trang web chạy HTTPS phải đi qua reverse proxy HTTPS/WSS; trình duyệt sẽ chặn
  `http://`/`ws://` mixed content từ một trang HTTPS.
