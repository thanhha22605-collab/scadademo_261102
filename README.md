# TotalParking SCADA — mô phỏng (v2.4)

Ứng dụng web tham khảo giao diện TotalParking do người dùng cung cấp. Dữ liệu mô phỏng gồm 3 Zone (A/B/C), 9 Block, 184 pallet và 91 xe ban đầu (37 SUV · 54 Sedan).

## Chạy tại máy

- Yêu cầu Node.js theo package.json.
- `npm install`
- `npm run dev` — mở URL được in trên terminal.
- `npm run build` — tạo bản triển khai.
- `node --experimental-strip-types tests/simulation.mjs` — kiểm tra quy trình và liên động.

## Các màn hình

19 màn hình chia theo 5 nhóm, khớp bản tham khảo v2.4:

- **Giám sát vận hành**: Dashboard tổng quan, Mặt bằng hệ thống (sơ đồ 6 Zone), Điều khiển vận hành (OCC), Điều hướng xe (AI-VDS).
- **Điều phối xe**: Hàng đợi xe, Truy vết xe & pallet.
- **Bảo trì & chẩn đoán**: Alarm & Event, Safety Interlock, Bảo trì hệ thống, Asset Tree, Remote Diagnostics, Historian / Trend.
- **Quản lý & báo cáo**: Báo cáo & thống kê, Quản lý thẻ RFID, Camera / CCTV, Energy Monitoring.
- **Cấu hình & bảo mật**: Cấu hình hệ thống, User & Permission, Backup & Health.

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
9. Bấm Đăng xuất ở thanh trên để mở màn hình đăng nhập mô phỏng (nhập mật khẩu bất kỳ để vào lại).

## Phạm vi

Chỉ mô phỏng trong bộ nhớ của mỗi tab; tải lại trang sẽ khởi tạo lại. Không kết nối PLC, camera, RFID hay thiết bị thật. Biểu đồ ca sáng và các màn hình báo cáo/chẩn đoán/bảo trì dùng dữ liệu tham khảo mẫu; các số liệu trạng thái hiện tại (xe đang đỗ, SUV/Sedan, vị trí khả dụng) tính từ pallet. Đồng hồ tiến trình phụ thuộc timer của trình duyệt; tab nền có thể chạy chậm hơn. Nút Đăng nhập không xác thực thật. Đây chưa phải bộ điều khiển chuyển động hoặc triển khai SCADA công nghiệp.

Cấu trúc: lõi mô phỏng ở lib/simulation.ts. Khung + điều hướng ở app/page.tsx; cấu hình menu ở app/nav.tsx. Mỗi tab là một module riêng trong app/screens/<Tên>.tsx, gom qua app/screens/index.ts; thành phần dùng chung ở app/screens/shared.tsx và app/ui.tsx; giao diện ở app/globals.css. Công cụ WebMCP navigate_scada_view chỉ điều hướng giao diện (19 view), không gửi lệnh vận hành.

Đã kiểm tra: build, TypeScript, các tình huống mô phỏng trong tests/simulation.mjs và hợp đồng WebMCP (đầu vào hợp lệ / không hợp lệ). Chưa thực hiện kiểm thử tương tác trình duyệt toàn diện.

## Kết nối PLC thật (Modbus TCP)

Web app mặc định chạy mô phỏng. Để đọc tín hiệu PLC thật:

1. Chạy gateway (Node, cùng mạng với PLC): xem `gateway/README.md`.
   ```bash
   cd gateway && npm install && PLC_HOST=192.168.1.50 npm start
   ```
2. Bật chế độ PLC cho web app bằng file `.env` ở thư mục gốc (mẫu: `.env.example`):
   ```
   VITE_DATA_SOURCE=plc
   VITE_GATEWAY_WS=ws://192.168.1.10:8081
   ```
3. `npm run dev` lại. `useSimulation()` (app/screens/shared.tsx) sẽ đọc snapshot
   thật qua lớp DataSource (app/screens/datasource.ts) thay cho bộ mô phỏng.

Trình duyệt không nói Modbus trực tiếp được nên bắt buộc có gateway; nó phải chạy
on-prem (không chạy trong Cloudflare Worker khi triển khai `npm start`/wrangler).
Bắt đầu chỉ đọc — ghi xuống PLC mặc định bị khóa (`ALLOW_WRITES=false`).
