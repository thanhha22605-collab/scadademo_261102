# TotalParking SCADA — mô phỏng (v2.4)

Ứng dụng web tham khảo giao diện TotalParking do người dùng cung cấp. Dữ liệu mô phỏng gồm 3 Zone (A/B/C), 9 Block, 184 pallet và 91 xe ban đầu (37 SUV · 54 Sedan).

## Chạy tại máy

- Yêu cầu Node.js theo package.json.
- `npm install`
- `npm run dev` — mở URL được in trên terminal.
- `npm run build` — tạo bản triển khai.
- `npm test` — kiểm tra quy trình và liên động mô phỏng.
- `npm run test:gateway` — kiểm tra gateway và FINS/TCP giả lập.
- `npm run check` — chạy toàn bộ lint, TypeScript và test.

## Các màn hình

21 màn hình chia theo 5 nhóm:

- **Giám sát vận hành**: Dashboard tổng quan, Mặt bằng hệ thống (sơ đồ 6 Zone), Điều khiển vận hành (OCC), Điều hướng xe (AI-VDS).
- **Điều phối xe**: Hàng đợi xe, Truy vết xe & pallet, Tra cứu thẻ ra/vào.
- **Bảo trì & chẩn đoán**: Alarm & Event, Safety Interlock, Bảo trì hệ thống, Asset Tree, Remote Diagnostics, Historian / Trend.
- **Quản lý & báo cáo**: Báo cáo & thống kê, Quản lý thẻ RFID, Camera / CCTV, Energy Monitoring.
- **Cấu hình & bảo mật**: Cấu hình PLC, Cấu hình hệ thống, User & Permission, Backup & Health.

Chỉ các màn hình **Điều khiển vận hành, Hàng đợi xe, Truy vết, Alarm & Event, Safety Interlock, Historian** là tương tác trực tiếp với bộ mô phỏng trong bộ nhớ (nhập/xuất xe, liên động an toàn, xác nhận cảnh báo, xuất CSV). Các màn hình còn lại hiển thị dữ liệu tham khảo tĩnh theo bản v2.4.

## Thử quy trình

1. Mở Điều khiển vận hành, chọn A-01, chọn một pallet trống.
2. Nhập biển số dạng 51H-999.99 và bấm Nhập xe.
3. Quan sát Hàng đợi xe. Lệnh hoàn thành sau khoảng 10 giây khi tab đang hoạt động.
4. Kiểm tra xe ở Mặt bằng, Truy vết và Dashboard.
5. Chọn pallet có xe rồi Xuất xe để giải phóng vị trí.
6. Tại Safety Interlock, mở cửa, kích hoạt E-STOP hoặc ngắt kết nối để kiểm tra giữ lệnh. Khôi phục tín hiệu để tiếp tục.
7. Xác nhận cảnh báo tại Alarm & Event; hành động này không giải trừ nguyên nhân.
8. Tải CSV nhật ký từ Historian / Trend.
9. Bấm Khóa ở thanh trên để khóa giao diện mô phỏng (nhập giá trị bất kỳ để mở lại).

## Phạm vi

Chế độ mặc định mô phỏng trong bộ nhớ của mỗi tab; tải lại trang sẽ khởi tạo lại. Gateway FINS/TCP có thể đọc PLC Omron khi bật chế độ PLC, nhưng camera, RFID/LPR và các màn báo cáo tĩnh vẫn là dữ liệu minh họa. Đồng hồ tiến trình phụ thuộc timer của trình duyệt; tab nền có thể chạy chậm hơn. Màn khóa cục bộ không phải hệ thống xác thực thật. Đây chưa phải bộ điều khiển chuyển động hoặc triển khai SCADA công nghiệp đã nghiệm thu hiện trường.

Cấu trúc: `app/` chỉ chứa route/layout; toàn bộ tính năng nằm trong `features/scada/`, chia thành `config`, `components`, `data`, `model` và năm nhóm `screens`. Xem [hướng dẫn cấu trúc](features/scada/README.md). Công cụ WebMCP `navigate_scada_view` chỉ điều hướng giao diện, không gửi lệnh vận hành.

Đã kiểm tra: build, TypeScript, các tình huống mô phỏng trong tests/simulation.mjs và hợp đồng WebMCP (đầu vào hợp lệ / không hợp lệ). Chưa thực hiện kiểm thử tương tác trình duyệt toàn diện.

## Kết nối PLC thật (Omron FINS/TCP)

Web app mặc định chạy mô phỏng. Để đọc tín hiệu PLC thật:

1. Chạy gateway (Node, cùng mạng với PLC): xem `gateway/README.md`.
   ```bash
   cd gateway && npm install
   FINS_HOST=192.168.250.1 npm run start:omron-multi
   ```
2. Bật chế độ PLC cho web app bằng file `.env` ở thư mục gốc (mẫu: `.env.example`):
   ```
   VITE_DATA_SOURCE=plc
   VITE_GATEWAY_WS=ws://192.168.1.10:8081
   ```
3. `npm run dev` lại. `useSimulation()` trong `features/scada/components/shared.tsx`
   sẽ đọc snapshot thật qua `features/scada/data/plc-source.ts` thay cho bộ mô phỏng.

Trình duyệt không nói FINS/TCP trực tiếp được nên bắt buộc có gateway; nó phải chạy
on-prem (không chạy trong Cloudflare Worker khi triển khai `npm start`/wrangler).
Bắt đầu chỉ đọc — ghi xuống PLC mặc định bị khóa (`ALLOW_WRITES=false`).
