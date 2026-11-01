'use client';

import { useMemo, useState } from 'react';
import { Building2, CarFront, CircleParking, RadioTower } from 'lucide-react';
import {
  Badge,
  ConnectionBadge,
  Kpi,
  Panel,
  Row,
  Rows,
  type ScreenProps,
} from '@/features/scada/components/shared';
import {
  blockLabel,
  countOf,
  occupancyOf,
  zoneLabel,
} from '@/features/scada/model/simulation';

export default function ZoneMonitoring({
  sim,
  selected,
  setSelected,
  setPage,
}: ScreenProps) {
  const zones = useMemo(
    () => [...new Set(sim.blocks.map((block) => block.zone))].sort(),
    [sim.blocks],
  );
  const current = sim.blocks.find((block) => block.id === selected);
  const [pickedZone, setPickedZone] = useState('');
  const activeZone = pickedZone || current?.zone || zones[0] || '';
  const blocks = sim.blocks.filter((block) => block.zone === activeZone);
  const block =
    blocks.find((item) => item.id === selected) ?? blocks[0] ?? sim.blocks[0];
  const capacity = blocks.reduce((sum, item) => sum + item.capacity, 0);
  const occupied = blocks.reduce((sum, item) => sum + (countOf(item) ?? 0), 0);
  const online = blocks.filter((item) => item.online).length;
  const accepting = blocks.filter(
    (item) => item.online && item.operational !== false,
  ).length;

  const pickZone = (zone: string) => {
    setPickedZone(zone);
    const first = sim.blocks.find((item) => item.zone === zone);
    if (first) setSelected(first.id);
  };

  return (
    <div className="stack">
      <div className="occ-badges">
        <ConnectionBadge sim={sim} />
        <Badge tone="blue">{zones.length} ZONE</Badge>
        <span className="muted">
          Phân biệt trạng thái giám sát PLC và trạng thái cho phép nhận xe.
        </span>
      </div>

      <div className="zone-tabs" role="tablist" aria-label="Chọn phân khu">
        {zones.map((zone) => (
          <button
            key={zone}
            role="tab"
            aria-selected={zone === activeZone}
            className={zone === activeZone ? 'active' : ''}
            onClick={() => pickZone(zone)}
          >
            Zone {zone}
          </button>
        ))}
      </div>

      <div className="metrics metrics-4">
        <Kpi
          label="Sức chứa Zone"
          value={String(capacity)}
          sub={zoneLabel[activeZone] ?? `Zone ${activeZone}`}
          tone="blue"
          icon={Building2}
        />
        <Kpi
          label="Xe đang đỗ"
          value={String(occupied)}
          sub={
            capacity
              ? `${Math.round((occupied / capacity) * 100)}% công suất`
              : '—'
          }
          tone="purple"
          icon={CarFront}
        />
        <Kpi
          label="Vị trí còn trống"
          value={String(Math.max(0, capacity - occupied))}
          sub="Theo dữ liệu ô đỗ hiện có"
          tone="green"
          icon={CircleParking}
        />
        <Kpi
          label="Block nhận xe"
          value={`${accepting}/${blocks.length}`}
          sub={`${online} PLC đang online`}
          tone={accepting === blocks.length ? 'green' : 'amber'}
          icon={RadioTower}
        />
      </div>

      <div className="zone-monitor-layout">
        <Panel title={`Danh sách Block · Zone ${activeZone}`} pad>
          <div className="zone-block-grid">
            {blocks.map((item) => {
              const count = countOf(item);
              const selectedBlock = item.id === block?.id;
              const tone = !item.online
                ? 'red'
                : item.operational === false
                  ? 'amber'
                  : item.fault
                    ? 'red'
                    : 'green';
              return (
                <button
                  key={item.id}
                  className={selectedBlock ? 'selected' : ''}
                  onClick={() => setSelected(item.id)}
                >
                  <span>
                    <b>{blockLabel(item)}</b>
                    <Badge tone={tone}>
                      {!item.online
                        ? 'MẤT KẾT NỐI'
                        : item.operational === false
                          ? 'KHÔNG NHẬN XE'
                          : item.fault
                            ? 'CÓ LỖI'
                            : 'NHẬN XE'}
                    </Badge>
                  </span>
                  <strong>
                    {count == null ? '—' : `${count}/${item.capacity}`}
                  </strong>
                  <small>
                    {item.parkingClass === 'ground'
                      ? 'Đỗ nền'
                      : item.parkingClass === 'mechanical-2200'
                        ? 'Pallet ≤ 2200 kg'
                        : item.parkingClass === 'mechanical-2600'
                          ? 'Pallet ≤ 2600 kg'
                          : 'Mọi cấu hình phù hợp'}
                  </small>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel
          title={block ? `Chi tiết ${blockLabel(block)}` : 'Chi tiết Block'}
          aside={
            block ? (
              <Badge tone={block.online ? 'green' : 'red'}>
                {block.online ? 'PLC ONLINE' : 'PLC OFFLINE'}
              </Badge>
            ) : null
          }
          pad
        >
          {block ? (
            <>
              <Rows>
                <Row k="Zone / Block" v={`Zone ${block.zone} · ${block.id}`} />
                <Row
                  k="Giám sát PLC"
                  v={
                    block.monitored === false
                      ? 'Đã tắt giám sát'
                      : 'Đang giám sát'
                  }
                />
                <Row
                  k="Công vận hành"
                  v={
                    block.operational === false
                      ? 'Không nhận xe mới'
                      : 'Đang nhận xe'
                  }
                />
                <Row k="Chất lượng dữ liệu" v={block.quality.toUpperCase()} />
                <Row
                  k="Lần đọc tốt gần nhất"
                  v={
                    block.lastGoodAt
                      ? new Date(block.lastGoodAt).toLocaleString('vi-VN')
                      : sim.source === 'sim'
                        ? 'Dữ liệu mô phỏng'
                        : 'Chưa có'
                  }
                />
                <Row k="Lỗi truyền thông" v={block.lastError || 'Không có'} />
              </Rows>
              <div className="slot-monitor-grid">
                {occupancyOf(block).map((occupiedSlot, index) => (
                  <span
                    className={
                      occupiedSlot == null
                        ? 'unknown'
                        : occupiedSlot
                          ? 'occupied'
                          : 'free'
                    }
                    key={index}
                    title={`P${String(index + 1).padStart(2, '0')}`}
                  >
                    P{String(index + 1).padStart(2, '0')}
                  </span>
                ))}
              </div>
              <div className="control-actions">
                <button
                  className="secondary"
                  onClick={() => setPage('control')}
                >
                  Mở điều khiển Block
                </button>
                <button
                  className="secondary"
                  onClick={() => setPage('maintenance')}
                >
                  Xem bảo trì / lỗi
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">Chưa có Block trong phân khu này.</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
