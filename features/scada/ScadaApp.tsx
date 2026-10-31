'use client';
import { useEffect, useState } from 'react';
import {
  Activity,
  Bell,
  ChevronRight,
  CircleParking,
  Clock3,
  LockKeyhole,
  Play,
  User,
} from 'lucide-react';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { isActiveAlarm } from '@/features/scada/model/simulation';
import { Badge } from '@/features/scada/components/primitives';
import { useSimulation } from '@/features/scada/components/shared';
import { screenRegistry } from '@/features/scada/config/screen-registry';
import {
  allItems,
  isViewId,
  nav,
  viewIds,
  type ViewId,
} from '@/features/scada/config/navigation';

const liveDataViews = new Set([
  'overview',
  'control',
  'queue',
  'tracking',
  'alarms',
  'safety',
  'historian',
  'plcconfig',
]);

export default function ScadaApp() {
  const [page, setPage] = useState<ViewId>('overview');
  const [now, setNow] = useState('—');
  const [today, setToday] = useState('—');
  const [locked, setLocked] = useState(false);
  const { sim, dispatch } = useSimulation();
  const [selected, setSelected] = useState('A-01');
  // ACK chỉ xác nhận người vận hành đã thấy; alarm vẫn còn cho tới khi điều kiện hết.
  const activeAlarms = sim.alarms.filter((a) => isActiveAlarm(a)).length;
  const unacknowledged = sim.alarms.filter(
    (a) => isActiveAlarm(a) && !a.ack,
  ).length;
  const hasFault = sim.alarms.some(
    (a) => isActiveAlarm(a) && a.cat === 'system',
  );
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d.toLocaleTimeString('vi-VN'));
      setToday(d.toLocaleDateString('vi-VN'));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'navigate_scada_view',
            description:
              'Open a SCADA monitoring view. Does not issue equipment commands.',
            inputSchema: {
              type: 'object',
              properties: { view: { type: 'string', enum: viewIds } },
              required: ['view'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true },
            execute: async (input: unknown) => {
              const value = input as { view?: unknown };
              if (
                !value ||
                typeof value.view !== 'string' ||
                !isViewId(value.view)
              )
                throw new Error('Unknown SCADA view');
              setPage(value.view);
              await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
              );
              return { view: value.view, source: sim.source, readOnly: true };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [sim.source]);
  const item = allItems.find((i) => i.id === page);
  const Screen = screenRegistry[page] ?? screenRegistry.overview;
  const mode =
    sim.source === 'sim'
      ? {
          label: 'Chế độ mô phỏng',
          detail: 'Dữ liệu thử nghiệm · Không kết nối thiết bị thực',
          footer: 'Hệ thống mô phỏng sẵn sàng',
          badge: 'Môi trường mô phỏng',
          tone: 'blue',
        }
      : sim.source === 'mock'
        ? {
            label: 'Gateway giả lập',
            detail: `Luồng gateway thử nghiệm · ${sim.connection}`,
            footer: 'Giám sát gateway giả lập · chỉ đọc',
            badge: 'Gateway Mock',
            tone: 'amber',
          }
        : {
            label: 'Giám sát PLC',
            detail: `Gateway ${sim.connection} · Chỉ đọc, khóa mọi lệnh điều khiển`,
            footer: `Gateway ${sim.connection} · giám sát chỉ đọc`,
            badge: 'Nguồn PLC',
            tone: sim.connection === 'online' ? 'green' : 'red',
          };
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '208px' } as React.CSSProperties}
    >
      <Sidebar className="scada-sidebar">
        <SidebarHeader>
          <div className="brand">
            <span className="brand-mark">TP</span>
            <div>
              TotalParking<small>SCADA v2.4</small>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {nav.map((group) => (
            <SidebarGroup key={group.group}>
              <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((it) => (
                  <SidebarMenuItem key={it.id}>
                    <SidebarMenuButton
                      isActive={page === it.id}
                      onClick={() => setPage(it.id)}
                    >
                      <it.icon />
                      <span>{it.label}</span>
                      {page === it.id && <ChevronRight className="nav-arrow" />}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <div className="sidebar-site">
            <CircleParking size={28} />
            <div>
              Puzzle Parking<small>Trung tâm vận hành</small>
              <Badge tone={mode.tone}>{mode.badge}</Badge>
            </div>
          </div>
          <div className="version">
            TOTALPARKING <span>v2.4.1 · 08/06/2026</span>
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="workspace">
        <header className="topbar">
          <div className="topbar-brand">
            <SidebarTrigger />
            <div>
              <strong>TASECO Automated Parking SCADA</strong>
              <small>Hệ thống đỗ xe tự động – Puzzle Parking System</small>
            </div>
          </div>
          <div className="header-right">
            {hasFault && <Badge tone="red">Lỗi</Badge>}
            <span className="alarm-count">
              <Bell size={13} />
              {activeAlarms} Alarm · {unacknowledged} chưa ACK
            </span>
            <span className="clock">
              <Clock3 size={14} />
              {now}
              <small>{today}</small>
            </span>
            <span className="user">
              <User size={14} />
              supervisor01
            </span>
            <button className="logout" onClick={() => setLocked(true)}>
              <LockKeyhole size={14} /> Khóa
            </button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">TASECO · AUTOMATED PARKING</div>
              <h1>{item?.title}</h1>
              <p>{item?.sub}</p>
            </div>
            {page === 'overview' ? (
              <button className="primary" onClick={() => setPage('control')}>
                <Play size={15} /> Điều khiển vận hành
              </button>
            ) : null}
          </div>
          <div className="simulation-note">
            <Activity size={15} />
            <span>{mode.label}</span>
            <span>{mode.detail}</span>
            <span className="live-dot" />
          </div>
          {sim.source !== 'sim' && !liveDataViews.has(page) && (
            <div className="notice amber">
              Module này hiện dùng dữ liệu minh họa và chưa được ánh xạ từ
              gateway PLC. Không dùng các trạng thái bên dưới để ra quyết định
              vận hành thực tế.
            </div>
          )}
          <Screen
            sim={sim}
            dispatch={dispatch}
            selected={selected}
            setSelected={setSelected}
            setPage={setPage}
          />
          <footer className="page-footer">
            <span>
              <span className="live-dot" /> {mode.footer}
            </span>
            <span>TotalParking SCADA v2.4 · Bản thử nghiệm</span>
          </footer>
        </div>
      </main>
      {locked && (
        <div className="lock-overlay">
          <form
            className="lock-card"
            onSubmit={(e) => {
              e.preventDefault();
              setLocked(false);
            }}
          >
            <div className="lock-brand">
              <span className="brand-mark">TP</span>
              <div>
                TotalParking SCADA<small>TASECO Automated Parking · v2.4</small>
              </div>
            </div>
            <label className="set-field">
              <span>Tài khoản vận hành</span>
              <input defaultValue="supervisor01" readOnly />
            </label>
            <label className="set-field">
              <span>Mã mở khóa cục bộ</span>
              <input type="password" placeholder="Nhập giá trị bất kỳ" />
            </label>
            <button className="primary" type="submit">
              Mở khóa
            </button>
            <p className="hint">
              Khóa giao diện của bản thử nghiệm; không thay thế xác thực gateway
              hoặc phân quyền hệ thống thật.
            </p>
          </form>
        </div>
      )}
    </SidebarProvider>
  );
}
