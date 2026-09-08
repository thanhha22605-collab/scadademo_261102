# TotalParking SCADA — mô phỏng

Ứng dụng web tham khảo giao diện TotalParking do người dùng cung cấp. Dữ liệu mô phỏng gồm 3 Zone, 8 Block, 164 pallet và 81 xe ban đầu.

## Chạy tại máy

- Yêu cầu Node.js theo package.json.
- `npm install`
- `npm run dev` — mở URL được in trên terminal.
- `npm run build` — tạo bản triển khai.
- `node --experimental-strip-types tests/simulation.mjs` — kiểm tra quy trình và liên động.

## Thử quy trình

1. Mở Điều khiển vận hành, chọn A-01, chọn một pallet trống.
2. Nhập biển số dạng 51H-999.99 và bấm Nhập xe.
3. Quan sát Hàng đợi xe. Lệnh hoàn thành sau khoảng 10 giây khi tab đang hoạt động.
4. Kiểm tra xe ở Mặt bằng, Truy vết và Dashboard.
5. Chọn pallet có xe rồi Xuất xe để giải phóng vị trí.
6. Tại Safety Interlock, mở cửa, kích hoạt E-STOP hoặc ngắt kết nối để kiểm tra giữ lệnh. Khôi phục tín hiệu để tiếp tục.
7. Xác nhận cảnh báo tại Alarm & Event; hành động này không giải trừ nguyên nhân.
8. Tải CSV nhật ký từ Historian / Nhật ký.

## Phạm vi

Chỉ mô phỏng trong bộ nhớ của mỗi tab; tải lại trang sẽ khởi tạo lại. Không kết nối PLC, camera, RFID hay thiết bị thật. Biểu đồ ca sáng dùng dữ liệu lịch sử mẫu, các số liệu trạng thái hiện tại tính từ pallet. Đồng hồ tiến trình phụ thuộc timer của trình duyệt; tab nền có thể chạy chậm hơn. Đây chưa phải bộ điều khiển chuyển động hoặc triển khai SCADA công nghiệp.

Logic và kiểm tra lệnh: lib/simulation.ts. Các màn hình và điều phối trạng thái: app/page.tsx, app/simulator.tsx. Giao diện: app/globals.css. Công cụ WebMCP navigate_scada_view chỉ điều hướng giao diện, không gửi lệnh vận hành.

Đã kiểm tra: build, TypeScript, các tình huống mô phỏng trong tests/simulation.mjs và hợp đồng WebMCP (đầu vào hợp lệ / không hợp lệ). Chưa thực hiện kiểm thử tương tác trình duyệt toàn diện.
