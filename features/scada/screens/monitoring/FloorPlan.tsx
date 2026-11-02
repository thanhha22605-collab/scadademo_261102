'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Badge,
  ConnectionBadge,
  Panel,
  type ScreenProps,
} from '@/features/scada/components/shared';
import {
  blockLabel,
  countOf,
  percent,
  type Block,
} from '@/features/scada/model/simulation';

type MapZone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
type MapLevel = 'normal' | 'warning' | 'fault' | 'unmapped';

type MapBlock = {
  number: number;
  zone: MapZone;
  capacity: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

type LiveMapBlock = MapBlock & {
  live?: Block;
  level: MapLevel;
  occupied: number | null;
};

/* Tọa độ theo ảnh nền 1.850 × 2.400 px, quy đổi sang phần trăm để responsive.
 * Sức chứa lấy từ bảng tổng hợp của bản vẽ: 30 block / 349 chỗ cơ khí. */
const MAP_BLOCKS: MapBlock[] = [
  { number: 1, zone: 'A', capacity: 6, x: 16.1, y: 14.2, w: 6.5, h: 9.2 },
  { number: 2, zone: 'A', capacity: 6, x: 22.7, y: 14.2, w: 6.7, h: 9.2 },
  { number: 3, zone: 'A', capacity: 10, x: 29.6, y: 14.2, w: 8.2, h: 9.2 },
  { number: 4, zone: 'A', capacity: 10, x: 43.7, y: 14.2, w: 9.1, h: 9.2 },
  { number: 5, zone: 'B', capacity: 10, x: 47.3, y: 40.9, w: 7.3, h: 9.3 },
  { number: 6, zone: 'B', capacity: 10, x: 54.7, y: 40.9, w: 7.2, h: 9.3 },
  { number: 7, zone: 'B', capacity: 6, x: 62.1, y: 40.9, w: 5.3, h: 9.3 },
  { number: 8, zone: 'B', capacity: 10, x: 67.7, y: 40.9, w: 8.0, h: 9.3 },
  { number: 9, zone: 'C', capacity: 16, x: 33.5, y: 54.0, w: 8.3, h: 8.5 },
  { number: 10, zone: 'C', capacity: 16, x: 41.9, y: 54.0, w: 8.4, h: 8.5 },
  { number: 11, zone: 'C', capacity: 16, x: 50.4, y: 54.0, w: 8.4, h: 8.5 },
  { number: 12, zone: 'C', capacity: 16, x: 58.9, y: 54.0, w: 8.4, h: 8.5 },
  { number: 13, zone: 'C', capacity: 10, x: 67.5, y: 54.0, w: 7.2, h: 8.5 },
  { number: 14, zone: 'C', capacity: 14, x: 76.3, y: 53.7, w: 5.2, h: 7.1 },
  { number: 15, zone: 'C', capacity: 14, x: 76.3, y: 60.9, w: 5.2, h: 7.1 },
  { number: 16, zone: 'C', capacity: 20, x: 76.3, y: 68.2, w: 5.2, h: 8.0 },
  { number: 17, zone: 'C', capacity: 10, x: 67.5, y: 62.7, w: 7.2, h: 9.0 },
  { number: 18, zone: 'C', capacity: 16, x: 58.9, y: 62.7, w: 8.4, h: 9.0 },
  { number: 19, zone: 'C', capacity: 16, x: 50.4, y: 62.7, w: 8.4, h: 9.0 },
  { number: 20, zone: 'C', capacity: 16, x: 41.9, y: 62.7, w: 8.4, h: 9.0 },
  { number: 21, zone: 'C', capacity: 16, x: 33.5, y: 62.7, w: 8.3, h: 9.0 },
  { number: 22, zone: 'D', capacity: 5, x: 15.2, y: 64.0, w: 11.9, h: 7.8 },
  { number: 23, zone: 'E', capacity: 6, x: 27.7, y: 77.2, w: 7.1, h: 11.3 },
  { number: 24, zone: 'E', capacity: 10, x: 34.9, y: 77.2, w: 8.1, h: 11.3 },
  { number: 25, zone: 'E', capacity: 10, x: 43.1, y: 77.2, w: 9.3, h: 11.3 },
  { number: 26, zone: 'E', capacity: 10, x: 62.4, y: 77.2, w: 8.8, h: 11.3 },
  { number: 27, zone: 'F', capacity: 14, x: 62.4, y: 86.0, w: 8.8, h: 8.0 },
  { number: 28, zone: 'F', capacity: 10, x: 52.3, y: 86.3, w: 9.8, h: 8.0 },
  { number: 29, zone: 'F', capacity: 10, x: 43.9, y: 86.3, w: 8.2, h: 8.0 },
  { number: 30, zone: 'F', capacity: 10, x: 35.5, y: 86.3, w: 8.2, h: 8.0 },
];

const MAP_CAPACITY = MAP_BLOCKS.reduce(
  (total, block) => total + block.capacity,
  0,
);

function levelOf(block?: Block): MapLevel {
  if (!block) return 'unmapped';
  if (
    !block.online ||
    block.fault ||
    block.estop ||
    block.safetyLatched ||
    block.quality === 'unknown' ||
    block.state === 'Lỗi' ||
    block.state === 'Offline'
  ) {
    return 'fault';
  }
  if (
    block.maintenance ||
    block.jammed ||
    block.paused ||
    block.quality === 'stale' ||
    block.state === 'Cảnh báo' ||
    block.state === 'Bảo trì'
  ) {
    return 'warning';
  }
  return 'normal';
}

const levelText: Record<MapLevel, string> = {
  normal: 'Bình thường',
  warning: 'Cảnh báo / bảo trì',
  fault: 'Lỗi / mất kết nối',
  unmapped: 'Chưa ánh xạ PLC',
};

const levelTone: Record<MapLevel, string> = {
  normal: 'green',
  warning: 'amber',
  fault: 'red',
  unmapped: 'blue',
};

export default function FloorPlan({ sim, setSelected, setPage }: ScreenProps) {
  const [selectedNumber, setSelectedNumber] = useState(1);
  const [zoom, setZoom] = useState(1);

  const blocks = useMemo<LiveMapBlock[]>(() => {
    const zoneOffsets: Partial<Record<MapZone, number>> = {};
    const byZone = new Map<MapZone, Block[]>();
    for (const zone of ['A', 'B', 'C', 'D', 'E', 'F'] as MapZone[]) {
      byZone.set(
        zone,
        sim.blocks
          .filter((block) => block.zone === zone)
          .sort((a, b) => a.id.localeCompare(b.id)),
      );
    }
    return MAP_BLOCKS.map((mapBlock) => {
      const index = zoneOffsets[mapBlock.zone] ?? 0;
      zoneOffsets[mapBlock.zone] = index + 1;
      const live = byZone.get(mapBlock.zone)?.[index];
      return {
        ...mapBlock,
        live,
        level: levelOf(live),
        occupied: live ? (countOf(live) ?? null) : null,
      };
    });
  }, [sim.blocks]);

  const current =
    blocks.find((block) => block.number === selectedNumber) ?? blocks[0];
  const mapped = blocks.filter((block) => block.live);
  const mappedOccupied = mapped.reduce(
    (total, block) => total + (block.occupied ?? 0),
    0,
  );
  const mappedCapacity = mapped.reduce(
    (total, block) => total + (block.live?.capacity ?? 0),
    0,
  );
  const recentCars = current.live
    ? sim.jobs.filter((job) => job.block === current.live?.id).slice(0, 5)
    : [];
  const displayCapacity = current.live?.capacity ?? current.capacity;
  const displayOccupied = current.occupied;

  const openBlock = () => {
    if (!current.live) return;
    setSelected(current.live.id);
    setPage('zones');
  };

  return (
    <>
      <div className="blueprint-head floor-plan-heading">
        <div>
          <div className="eyebrow">TASECO LONG BIÊN CENTRAL · B1 PARKING</div>
          <h2>Mặt bằng giao thông &amp; giám sát Block</h2>
          <p>
            Bản vẽ vector thực tế kết hợp trạng thái SCADA, popup chi tiết và
            điều hướng tới từng Block.
          </p>
        </div>
        <div className="blueprint-meta">
          <div>
            <small>PHẠM VI BẢN VẼ</small>
            <b>
              {MAP_BLOCKS.length} BLOCK · {MAP_CAPACITY} CHỖ
            </b>
          </div>
          <div>
            <small>DỮ LIỆU HIỆN TẠI</small>
            <b>{mapped.length}/30 BLOCK ĐÃ ÁNH XẠ</b>
          </div>
        </div>
      </div>

      <div className="remarks floor-plan-statusbar">
        <span>TRẠNG THÁI:</span>
        <ConnectionBadge sim={sim} />
        <Badge tone="green">
          {mappedOccupied}/{mappedCapacity} vị trí đã đỗ
        </Badge>
        <Badge tone="blue">6 phân khu A–F</Badge>
        <span className="remarks-conn">
          Chọn một Block trên bản đồ để xem chi tiết.
        </span>
      </div>

      <div className="floor-map-shell">
        <div className="floor-map-toolbar" aria-label="Điều khiển bản đồ">
          <div>
            <strong>Mặt bằng tầng hầm B1</strong>
            <span>Bản vẽ giao thông · Block cơ khí</span>
          </div>
          <div className="floor-map-zoom">
            <button
              type="button"
              aria-label="Thu nhỏ bản đồ"
              onClick={() => setZoom((value) => Math.max(1, value - 0.25))}
              disabled={zoom <= 1}
            >
              −
            </button>
            <output aria-live="polite">{Math.round(zoom * 100)}%</output>
            <button
              type="button"
              aria-label="Phóng to bản đồ"
              onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))}
              disabled={zoom >= 2.5}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              disabled={zoom === 1}
            >
              Vừa màn hình
            </button>
          </div>
        </div>

        <div className="floor-map-viewport">
          <div className="floor-map-canvas" style={{ width: `${zoom * 100}%` }}>
            <Image
              src="/taseco-b1-floorplan.png"
              alt="Mặt bằng giao thông tầng hầm B1 dự án TASECO Long Biên Central"
              width={1850}
              height={2400}
              sizes="(max-width: 900px) 760px, 100vw"
              priority
              draggable={false}
            />
            <div
              className="floor-map-hotspots"
              aria-label="30 Block trên mặt bằng"
            >
              {blocks.map((block) => (
                <button
                  key={block.number}
                  type="button"
                  className={`floor-block-hotspot ${block.level} ${
                    block.number === current.number ? 'selected' : ''
                  }`}
                  style={{
                    left: `${block.x}%`,
                    top: `${block.y}%`,
                    width: `${block.w}%`,
                    height: `${block.h}%`,
                  }}
                  aria-label={`Block ${String(block.number).padStart(2, '0')}, Zone ${block.zone}, ${levelText[block.level]}`}
                  aria-pressed={block.number === current.number}
                  onClick={() => setSelectedNumber(block.number)}
                >
                  <span>{String(block.number).padStart(2, '0')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <aside
          className={`floor-map-popover ${current.level}`}
          aria-live="polite"
        >
          <div className="floor-map-popover-head">
            <div>
              <small>ZONE {current.zone}</small>
              <strong>BLOCK {String(current.number).padStart(2, '0')}</strong>
            </div>
            <Badge tone={levelTone[current.level]}>
              {levelText[current.level]}
            </Badge>
          </div>
          <dl>
            <div>
              <dt>Sức chứa</dt>
              <dd>{displayCapacity}</dd>
            </div>
            <div>
              <dt>Đang đỗ</dt>
              <dd>{displayOccupied ?? '—'}</dd>
            </div>
            <div>
              <dt>Còn trống</dt>
              <dd>
                {displayOccupied === null
                  ? '—'
                  : Math.max(0, displayCapacity - displayOccupied)}
              </dd>
            </div>
          </dl>
          <p>
            {current.live
              ? `Ánh xạ ${blockLabel(current.live)} · PLC ${current.live.online ? 'online' : 'offline'}`
              : 'Đã có vị trí trên bản vẽ; cần khai báo Block tương ứng trong cấu hình PLC.'}
          </p>
          <button
            type="button"
            className="mini"
            disabled={!current.live}
            onClick={openBlock}
          >
            {current.live ? 'Mở giám sát Block' : 'Chưa thể mở Block'}
          </button>
        </aside>
      </div>

      <div className="chart-legend floor-map-legend">
        <span>
          <i className="map-legend-dot normal" />
          Bình thường
        </span>
        <span>
          <i className="map-legend-dot warning" />
          Cảnh báo / bảo trì
        </span>
        <span>
          <i className="map-legend-dot fault" />
          Lỗi / mất kết nối
        </span>
        <span>
          <i className="map-legend-dot unmapped" />
          Chưa ánh xạ PLC
        </span>
        <span className="muted">
          Màu phủ chỉ phục vụ giám sát, không thay thế bản vẽ kỹ thuật.
        </span>
      </div>

      <Panel
        title={`Chi tiết Block ${String(current.number).padStart(2, '0')} · Zone ${current.zone}`}
        aside={
          <Badge tone={levelTone[current.level]}>
            {displayOccupied === null
              ? levelText[current.level]
              : `Mật độ ${percent(displayOccupied, displayCapacity)}%`}
          </Badge>
        }
        pad
      >
        <div className="zone-popup-grid floor-block-stats">
          <div>
            <span>Sức chứa thiết kế</span>
            <strong>{current.capacity}</strong>
            <small>vị trí cơ khí theo bản vẽ</small>
          </div>
          <div>
            <span>Ánh xạ SCADA</span>
            <strong>{current.live ? current.live.id : '—'}</strong>
            <small>
              {current.live ? blockLabel(current.live) : 'Chưa cấu hình PLC'}
            </small>
          </div>
          <div>
            <span>Trạng thái vận hành</span>
            <strong>{current.live?.state ?? 'Chưa có dữ liệu'}</strong>
            <small>
              {current.live
                ? `Mode ${current.live.mode ?? 'N/A'}`
                : 'Chỉ hiển thị vị trí mặt bằng'}
            </small>
          </div>
        </div>
        <div className="zone-recent">
          <b>Xe / lệnh gần đây</b>
          {recentCars.length ? (
            recentCars.map((job) => (
              <button
                className="mini"
                key={job.id}
                onClick={() => {
                  setSelected(job.block);
                  setPage('control');
                }}
              >
                {job.plate} · {job.block} · P
                {String(job.slot + 1).padStart(2, '0')}
              </button>
            ))
          ) : (
            <span className="muted">
              {current.live
                ? 'Chưa có xe hoặc lệnh mới trong Block này.'
                : 'Block chưa ánh xạ nên chưa có dữ liệu vận hành.'}
            </span>
          )}
        </div>
      </Panel>
    </>
  );
}
