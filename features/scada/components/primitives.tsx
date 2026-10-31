'use client';
import type { ReactNode } from 'react';
export function statusTone(text: string): string {
  if (text === 'Bình thường' || text === 'Hoàn tất' || text === 'Kết nối')
    return 'green';
  if (text === 'Đang chạy') return 'blue';
  if (text === 'Bảo trì' || text === 'Đã hủy') return 'purple';
  if (
    text === 'Lỗi' ||
    text === 'Offline' ||
    text.includes('Dừng khẩn cấp') ||
    text.includes('Mất kết nối') ||
    text.includes('Sự cố thiết bị') ||
    text.includes('Kẹt cơ cấu')
  )
    return 'red';
  return 'amber';
}
export function Badge({
  children,
  tone = 'green',
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={'status ' + tone}>
      <i />
      {children}
    </span>
  );
}
export function Tag({ text }: { text: string }) {
  return <Badge tone={statusTone(text)}>{text}</Badge>;
}
export function Panel({
  title,
  aside,
  children,
  className = '',
  pad = false,
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={'panel ' + className}>
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {aside}
        </div>
      )}
      {pad ? <div className="panel-body">{children}</div> : children}
    </section>
  );
}
export function Bar({ value, tone }: { value: number; tone?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color =
    tone ??
    (v >= 85
      ? '#f1bc5b'
      : v >= 60
        ? '#4095ff'
        : v >= 30
          ? '#31cba4'
          : '#5c7fa8');
  return (
    <div className="bar">
      <span style={{ width: v + '%', background: color }} />
    </div>
  );
}
