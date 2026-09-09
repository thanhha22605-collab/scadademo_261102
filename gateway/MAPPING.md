# Lấy bảng địa chỉ PLC để nối SCADA (dự án TASECO)

File `.cxp` (CX-Programmer) và `.emtp` (NB-Designer) là **nhị phân đóng** — không
trích được địa chỉ từ bên ngoài. Cần bạn export **bảng địa chỉ giao tiếp** rồi tôi
điền vào `tagmap`/`units`. Chọn 1 trong 2 cách nhanh nhất:

## Cách A — Từ HMI (NB-Designer) — nhanh nhất
HMI đang đọc/ghi đúng các thanh ghi PLC cần cho SCADA.
1. Mở `.emtp` bằng **NB-Designer**.
2. Vào **Address Tag Library** (Thư viện tag địa chỉ) hoặc xem địa chỉ từng đối tượng
   trên các trang: nút, đèn, ô số.
3. Ghi lại các địa chỉ PLC (vd `D…`, `CIO…`, `W…`) ứng với:
   số xe/số chỗ trống, cửa đóng, E-Stop, đang chạy/lỗi, nút gọi/trả xe…
4. Export/screenshot danh sách đó gửi tôi.

## Cách B — Từ PLC (CX-Programmer)
1. Mở `.cxp` bằng **CX-Programmer**.
2. Cửa sổ **Symbols** (mỗi PLC/section) → chọn hết → chuột phải **Copy** hoặc
   **Export**; hoặc **PLC ▸ Print** phần *I/O Comments*.
3. Gửi tôi bảng: **Tên tín hiệu — Địa chỉ (D/CIO/W) — Ý nghĩa**.

## Tối thiểu tôi cần cho mỗi cụm đỗ

| Tín hiệu                     | Kiểu       | Ví dụ địa chỉ |
| ---------------------------- | ---------- | ------------- |
| Số xe đang đỗ (hoặc số trống)| word (INT) | `D0`          |
| Sức chứa cụm                 | word/hằng  | `D1`          |
| Cửa an toàn đã đóng          | bit        | `W0.00`       |
| E-Stop kích hoạt             | bit        | `W0.01`       |
| Đang kết nối / heartbeat     | bit        | `W0.02`       |
| Báo lỗi thiết bị             | bit        | `W0.03`       |
| (tuỳ chọn) đang chạy nâng/hạ | bit        | `W0.04`       |

Analog cho Historian (nếu có): dòng điện/nhiệt độ motor, tần số VFD → word/DINT.

## Nếu là NHIỀU PLC (mỗi cụm 1 con)
Cho tôi **danh sách IP** từng cụm + cụm đó thuộc Block/Zone nào. Tôi sẽ dùng
`units.example.mjs` để cấu hình gateway đọc song song nhiều PLC rồi gộp thành một
màn hình SCADA.

## Câu hỏi mở
- Ở thực địa có **bao nhiêu cụm đỗ / bao nhiêu PLC**, IP mỗi con?
- Mỗi cụm dùng bản nào: **穿越 (puzzle)** hay **前移 (comb)**, cỡ mấy chỗ?
- Muốn SCADA gộp tất cả cụm thành sơ đồ chung, hay tách theo tầng/zone?
