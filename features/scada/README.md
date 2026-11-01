# Cấu trúc tính năng SCADA

Thư mục này chứa toàn bộ mã nghiệp vụ của giao diện SCADA. Thư mục `app/` chỉ
giữ route, layout và CSS toàn cục của Vinext.

```text
features/scada/
├── ScadaApp.tsx                 Khung ứng dụng, sidebar, header và màn khóa
├── components/
│   ├── primitives.tsx          Panel, Badge, Tag và progress bar của SCADA
│   └── shared.tsx              Component/hook dùng chung giữa các màn hình
├── config/
│   ├── navigation.tsx          Nhóm menu, tiêu đề và kiểu ViewId
│   └── screen-registry.ts      Ánh xạ ViewId sang component màn hình
├── data/
│   ├── demo.ts                 Dữ liệu minh họa, không dùng để kết luận vận hành
│   └── plc-source.ts           WebSocket gateway và chuyển snapshot PLC sang Sim
├── model/
│   └── simulation.ts           State, action, reducer và liên động mô phỏng
└── screens/
    ├── monitoring/             Tổng quan, mặt bằng, Zone/Block, OCC, điều hướng và màn tài xế
    ├── dispatch/               Hàng đợi, truy vết và lịch sử RFID
    ├── maintenance/            Alarm, safety, bảo trì và chẩn đoán
    ├── management/             Báo cáo, thẻ, CCTV và điện năng
    └── system/                 PLC, thiết lập, người dùng và backup
```

## Sửa ở đâu

| Nhu cầu                      | File/thư mục                    |
| ---------------------------- | ------------------------------- |
| Đổi tên hoặc thứ tự menu     | `config/navigation.tsx`         |
| Gắn một màn hình vào menu    | `config/screen-registry.ts`     |
| Sửa khung sidebar/header     | `ScadaApp.tsx`                  |
| Sửa logic mô phỏng/liên động | `model/simulation.ts`           |
| Sửa kết nối gateway PLC      | `data/plc-source.ts`            |
| Sửa dữ liệu minh họa         | `data/demo.ts`                  |
| Sửa component dùng chung     | `components/shared.tsx`         |
| Sửa riêng một màn hình       | Nhóm tương ứng trong `screens/` |
| Sửa bố cục tổng thể          | `app/globals.css`               |
| Sửa tone màu warm glass      | `styles/warm-glass.css`         |
| Sửa FINS/Camera/LED/PGS/API  | `gateway/`                      |

## Thêm màn hình mới

1. Thêm `id` vào `viewIds` và một mục menu trong `config/navigation.tsx`.
2. Tạo component trong nhóm phù hợp dưới `screens/` và nhận `ScreenProps` nếu
   cần dữ liệu mô phỏng.
3. Import component rồi thêm ánh xạ vào `config/screen-registry.ts`.
4. Chạy `npm run check` và `npm run build`.

`screenRegistry` dùng `Record<ViewId, ...>`, vì vậy TypeScript sẽ báo lỗi nếu
menu có màn hình nhưng registry chưa khai báo component tương ứng.

## Luồng dữ liệu

```text
Simulation: createSim() ─┐
                         ├─ useSimulation() ─ Sim ─ các màn hình
PLC/Camera/PGS: gateway ──┘
MySQL: gateway HTTP API ──────── thẻ, access, audit
```

Ở chế độ PLC, `plc-source.ts` chỉ đọc snapshot gateway. Các trường chưa được
gateway ánh xạ phải giữ trạng thái chưa biết; không được tự gán thành trạng thái
an toàn. Mọi dữ liệu trong `demo.ts` phải được ghi rõ là dữ liệu minh họa.
