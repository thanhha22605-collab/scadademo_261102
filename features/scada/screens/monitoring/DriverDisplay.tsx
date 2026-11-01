'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CarFront, MapPin } from 'lucide-react';
import {
  Badge,
  Panel,
  type ScreenProps,
} from '@/features/scada/components/shared';

export type DriverInstruction = {
  plate: string;
  vehicleClass: string;
  block: string;
  zone: string;
  route: string;
  updatedAt: string;
};

export const DRIVER_STORAGE_KEY = 'totalparking.driver-instruction';
export const DRIVER_EVENT = 'totalparking:driver-instruction';

const fallback: DriverInstruction = {
  plate: '30H-88877',
  vehicleClass: 'Sedan · Đỗ thường',
  block: 'Block B-01',
  zone: 'Zone B',
  route: 'Cổng vào → Làn trung tâm → Rẽ trái → Block B-01',
  updatedAt: 'Dữ liệu mô phỏng',
};

function readInstruction() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(DRIVER_STORAGE_KEY) || 'null',
    ) as DriverInstruction | null;
    return parsed?.plate ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export default function DriverDisplay(_: ScreenProps) {
  const [instruction, setInstruction] = useState<DriverInstruction>(fallback);
  useEffect(() => {
    const refresh = () => setInstruction(readInstruction());
    refresh();
    window.addEventListener(DRIVER_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(DRIVER_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return (
    <div className="driver-display">
      <Panel
        title="Màn hình hướng dẫn tài xế 55 inch"
        aside={<Badge tone="green">ĐANG HIỂN THỊ</Badge>}
        pad
      >
        <div className="driver-hero">
          <div className="driver-plate">
            <CarFront size={38} />
            <span>BIỂN SỐ</span>
            <strong>{instruction.plate}</strong>
            <small>{instruction.vehicleClass}</small>
          </div>
          <ArrowRight className="driver-arrow" size={54} />
          <div className="driver-destination">
            <MapPin size={38} />
            <span>VỊ TRÍ ĐƯỢC CHỌN</span>
            <strong>{instruction.block}</strong>
            <small>{instruction.zone}</small>
          </div>
        </div>
        <div className="driver-route">{instruction.route}</div>
        <p className="hint">
          Giữ nguyên chỉ dẫn này cho tới khi hệ thống tiếp nhận xe tiếp theo.
          Cập nhật cuối: {instruction.updatedAt}.
        </p>
      </Panel>
    </div>
  );
}
