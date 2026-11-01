'use client';
import { useState } from 'react';
import { Panel, Rows, Row } from '@/features/scada/components/shared';

function Field({
  label,
  value,
  type = 'text',
}: {
  label: string;
  value: string;
  type?: string;
}) {
  return (
    <label className="set-field">
      <span>{label}</span>
      <input defaultValue={value} type={type} readOnly />
    </label>
  );
}
function Toggle({ label, on = false }: { label: string; on?: boolean }) {
  const [v, setV] = useState(on);
  return (
    <button
      type="button"
      className="set-toggle"
      aria-pressed={v}
      disabled
      onClick={() => setV(!v)}
    >
      <span>{label}</span>
      <span className={'sw ' + (v ? 'on' : '')} />
    </button>
  );
}
export default function Settings() {
  return (
    <>
      <div className="notice amber">
        Màn hình chỉ đọc phục vụ nghiệm thu. Mật khẩu và secret không được hiển
        thị; thay đổi cấu hình PLC thật được thực hiện tại tab “Cấu hình PLC”.
      </div>
      <div className="settings-grid">
        <Panel title="Kết nối PLC, CCU và chu kỳ quét" pad>
          <Field label="IP SCADA Server (TASECO SCADA)" value="192.168.1.100" />
          <Field label="Giao thức PLC" value="Omron FINS TCP/UDP" />
          <Field label="Port FINS" value="9600" />
          <Field label="CCU / PGS Controller" value="192.168.1.50" />
          <Field label="Chu kỳ polling (ms)" value="500" />
          <Field label="Timeout kết nối (ms)" value="3000" />
        </Panel>
        <Panel title="Cơ sở dữ liệu SCADA" pad>
          <Field label="DB Host Address" value="192.168.1.200" />
          <Field label="DB Engine / Version" value="MySQL 8.x" />
          <Field label="DB Name" value="totalparking_scada" />
          <Field label="Lưu trữ cảnh báo & sự kiện (ngày)" value="730" />
          <Field label="Tần suất tự động backup (giờ)" value="12" />
        </Panel>
        <Panel title="Cảnh báo & SMS" pad>
          <Field
            label="Email nhận cảnh báo Critical"
            value="admin@totalparking.vn"
          />
          <Field
            label="SMS nhận cảnh báo quá nhiệt motor"
            value="+84981234567"
          />
          <Field label="Ngưỡng báo động rung lắc (mm/s²)" value="15" />
        </Panel>
        <Panel title="Tích hợp API & Webhook (Third-Party)" pad>
          <Field
            label="Webhook URL gửi cảnh báo lỗi"
            value="https://api.totalparking.vn/v1/webhook/alarms"
          />
          <Field
            label="Webhook Secret Authorization"
            value="Đã cấu hình · không hiển thị"
            type="password"
          />
          <Toggle label="Chỉ gửi cảnh báo nghiêm trọng" on />
        </Panel>
        <Panel title="Tùy chọn giao diện vận hành" pad>
          <Toggle label="Giao diện tối (Dark Mode)" on />
          <Toggle label="Tự động Ack alarm mức độ Thấp" />
          <Toggle label="Bật thông báo còi / âm thanh" on />
          <Toggle label="Hiển thị timestamp thời gian thực" on />
        </Panel>
        <Panel title="Chẩn đoán Server & Tài nguyên" pad>
          <Rows>
            <Row k="SCADA Software Version" v="v2.4.1" />
            <Row k="Thời gian hoạt động (Uptime)" v="127 ngày 14 giờ 22 phút" />
            <Row k="Tải CPU hiện tại" v="23%" />
            <Row k="Sử dụng RAM vật lý" v="1.8 GB / 8.0 GB" />
            <Row k="Kích thước cơ sở dữ liệu" v="12.4 GB" />
          </Rows>
        </Panel>
      </div>
    </>
  );
}
