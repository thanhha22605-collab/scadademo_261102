'use client';
import { useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { Panel, Rows, Row } from './shared';

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
      <input defaultValue={value} type={type} />
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
      onClick={() => setV(!v)}
    >
      <span>{label}</span>
      <span className={'sw ' + (v ? 'on' : '')} />
    </button>
  );
}
export default function Settings() {
  const [saved, setSaved] = useState('');
  return (
    <>
      {saved && (
        <div className="notice green" role="status">
          {saved}
        </div>
      )}
      <div className="settings-grid">
        <Panel title="Kết nối truyền thông PLC/HMI" pad>
          <Field label="IP SCADA Server (TASECO SCADA)" value="192.169.1.100" />
          <Field label="Port Modbus TCP" value="502" />
          <Field label="Chu kỳ polling (ms)" value="500" />
          <Field label="Timeout kết nối (ms)" value="3000" />
        </Panel>
        <Panel title="Cơ sở dữ liệu SCADA" pad>
          <Field label="DB Host Address" value="192.168.1.200" />
          <Field label="DB Name" value="taseco_scada_tp" />
          <Field label="Lưu trữ cảnh báo & sự kiện (ngày)" value="730" />
          <Field label="Tần suất tự động backup (giờ)" value="12" />
        </Panel>
        <Panel title="Cảnh báo & SMS" pad>
          <Field label="Email nhận cảnh báo Critical" value="admin@totalparking.vn" />
          <Field label="SMS nhận cảnh báo quá nhiệt motor" value="+84981234567" />
          <Field label="Ngưỡng báo động rung lắc (mm/s²)" value="15" />
        </Panel>
        <Panel title="Tích hợp API & Webhook (Third-Party)" pad>
          <Field label="Webhook URL gửi cảnh báo lỗi" value="https://api.totalparking.vn/v1/webhook/alarms" />
          <Field label="Webhook Secret Authorization" value="••••••••••••••••" type="password" />
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
      <div className="settings-actions">
        <button
          className="secondary"
          onClick={() => setSaved('Đã khôi phục cài đặt mặc định (mô phỏng).')}
        >
          <RefreshCw size={15} /> Khôi phục mặc định
        </button>
        <button
          className="primary"
          onClick={() => setSaved('Đã lưu cài đặt hệ thống (mô phỏng).')}
        >
          <Save size={15} /> Lưu cài đặt
        </button>
      </div>
    </>
  );
}
