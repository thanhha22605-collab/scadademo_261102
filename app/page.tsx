'use client';
import { useEffect, useState } from 'react';
import {
  Activity,
  Bell,
  ChevronRight,
  CircleParking,
  Clock3,
  LogOut,
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
import { isActiveAlarm } from '@/lib/simulation';
import { Badge } from './ui';
import { useSimulation } from './screens/shared';
import { screenRegistry } from './screens';
import { nav, allItems, viewIds, screenAction } from './nav';

export default function Home() {
  const [page, setPage] = useState('overview');
  const [now, setNow] = useState('—');
  const [today, setToday] = useState('—');
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [locked, setLocked] = useState(false);
  const { sim, dispatch } = useSimulation();
  const [selected, setSelected] = useState('A-01');
  // Đèn "Lỗi" phản ánh lỗi CÒN hiệu lực (chưa được khắc phục), độc lập với ACK —
  // xác nhận không được che lỗi chưa xử lý. Bộ đếm chuông = alarm còn active và chưa ACK.
  const activeAlarms = sim.alarms.filter((a) => isActiveAlarm(a) && !a.ack).length;
  const hasFault = sim.alarms.some((a) => isActiveAlarm(a) && a.cat === 'system');
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
    document.documentElement.lang = lang;
  }, [lang]);
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
              'Open a SCADA simulation view. Does not issue equipment commands.',
            inputSchema: {
              type: 'object',
              properties: { view: { type: 'string', enum: viewIds } },
              required: ['view'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute: async (input: unknown) => {
              const value = input as { view?: unknown };
              if (
                !value ||
                typeof value.view !== 'string' ||
                !viewIds.includes(value.view)
              )
                throw new Error('Unknown SCADA view');
              setPage(value.view);
              await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
              );
              return { view: value.view, simulation: true };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  const item = allItems.find((i) => i.id === page);
  const action = screenAction[page];
  const Screen = screenRegistry[page] ?? screenRegistry.overview;
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
              <Badge tone="blue">Môi trường mô phỏng</Badge>
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
              {activeAlarms} Alarm
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
            <button
              className="lang"
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
            >
              {lang === 'vi' ? 'EN' : 'VI'}
            </button>
            <button className="logout" onClick={() => setLocked(true)}>
              <LogOut size={14} /> Đăng xuất
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
            ) : action ? (
              <button className="primary">
                <action.icon size={15} /> {action.label}
              </button>
            ) : null}
          </div>
          <div className="simulation-note">
            <Activity size={15} />
            <span>Chế độ mô phỏng</span>
            <span>Dữ liệu thử nghiệm · Không kết nối thiết bị thực</span>
            <span className="live-dot" />
          </div>
          <Screen
            sim={sim}
            dispatch={dispatch}
            selected={selected}
            setSelected={setSelected}
            setPage={setPage}
          />
          <footer className="page-footer">
            <span>
              <span className="live-dot" /> Hệ thống mô phỏng sẵn sàng
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
              <span>Mật khẩu</span>
              <input type="password" placeholder="Nhập mật khẩu bất kỳ (mô phỏng)" />
            </label>
            <button className="primary" type="submit">
              Đăng nhập
            </button>
            <p className="hint">
              Phiên mô phỏng, không xác thực thật. Nhập mật khẩu bất kỳ để tiếp
              tục.
            </p>
          </form>
        </div>
      )}
    </SidebarProvider>
  );
}
