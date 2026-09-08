'use client';
import { useEffect, useState } from 'react';
import {
  Activity,
  Bell,
  Car,
  ChartNoAxesCombined,
  ChevronRight,
  CircleParking,
  Clock3,
  Grid2X2,
  Layers,
  LayoutDashboard,
  ListOrdered,
  Play,
  ShieldCheck,
  Waypoints,
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
import { useSimulation, SimulatorViews } from './simulator';
import { blocked, status } from '@/lib/simulation';
import { Progress } from '@/components/ui/progress';
const nav = [
  {
    group: 'GIÁM SÁT VẬN HÀNH',
    items: [
      { id: 'overview', label: 'Dashboard tổng quan', icon: LayoutDashboard },
      { id: 'map', label: 'Mặt bằng hệ thống', icon: Grid2X2 },
      { id: 'control', label: 'Điều khiển vận hành', icon: Waypoints },
    ],
  },
  {
    group: 'ĐIỀU PHỐI XE',
    items: [
      { id: 'queue', label: 'Hàng đợi xe', icon: ListOrdered },
      { id: 'tracking', label: 'Truy vết xe & pallet', icon: Car },
    ],
  },
  {
    group: 'BẢO TRÌ & CHẨN ĐOÁN',
    items: [
      { id: 'alarms', label: 'Alarm & Event', icon: Bell },
      { id: 'safety', label: 'Safety Interlock', icon: ShieldCheck },
      {
        id: 'history',
        label: 'Historian / Nhật ký',
        icon: ChartNoAxesCombined,
      },
    ],
  },
];
export function Badge({
  children,
  tone = 'green',
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span className={'status ' + tone}>
      <i />
      {children}
    </span>
  );
}
export function Panel({
  title,
  aside,
  children,
  className = '',
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={'panel ' + className}>
      <div className="panel-heading">
        <h2>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
function Trend() {
  return (
    <div className="trend">
      <div className="chart-label">TỶ LỆ LẤP ĐẦY (%)</div>
      <svg
        viewBox="0 0 760 205"
        role="img"
        aria-label="Biểu đồ dữ liệu mẫu mật độ đỗ xe các Zone từ 06 giờ đến 12 giờ"
      >
        <defs>
          <linearGradient id="fade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity=".2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((n, i) => (
          <g key={n}>
            <line
              x1="38"
              x2="740"
              y1={175 - i * 37}
              y2={175 - i * 37}
              stroke="#283548"
              strokeDasharray="3 5"
            />
            <text x="5" y={179 - i * 37} fill="#8293ac" fontSize="12">
              {n}
            </text>
          </g>
        ))}
        <path
          d="M38 135 L155 113 L272 98 L389 75 L506 67 L623 55 L740 50 L740 175 L38 175Z"
          fill="url(#fade)"
        />
        <path
          d="M38 135 L155 113 L272 98 L389 75 L506 67 L623 55 L740 50"
          fill="none"
          stroke="#4095ff"
          strokeWidth="2.5"
        />
        <path
          d="M38 150 L155 140 L272 115 L389 105 L506 101 L623 88 L740 93"
          fill="none"
          stroke="#31cba4"
          strokeWidth="2.5"
        />
        <path
          d="M38 166 L155 161 L272 151 L389 143 L506 136 L623 126 L740 132"
          fill="none"
          stroke="#a487ff"
          strokeWidth="2.5"
        />
        {['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00'].map(
          (t, i) => (
            <text
              key={t}
              x={38 + i * 117}
              y="202"
              textAnchor="middle"
              fill="#8293ac"
              fontSize="12"
            >
              {t}
            </text>
          ),
        )}
      </svg>
      <div className="chart-legend">
        <span>
          <i className="blue-dot" />
          Zone A
        </span>
        <span>
          <i className="green-dot" />
          Zone B
        </span>
        <span>
          <i className="purple-dot" />
          Zone C
        </span>
        <span className="muted">Lịch sử mẫu</span>
      </div>
    </div>
  );
}
export default function Home() {
  const [page, setPage] = useState('overview');
  const [now, setNow] = useState('—');
  const { sim, dispatch } = useSimulation();
  const [selected, setSelected] = useState('A-01');
  const blocks = sim.blocks.map((b) => ({
    ...b,
    count: b.slots.filter(Boolean).length,
    state: status(b, sim),
  }));
  const total = blocks.reduce((n, b) => n + b.count, 0);
  const capacity = blocks.reduce((n, b) => n + b.capacity, 0);
  const available = sim.blocks
    .filter((b) => !blocked(b))
    .reduce((n, b) => n + b.slots.filter((p) => !p).length, 0);
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString('vi-VN'));
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
              'Open a SCADA simulation view. Does not issue equipment commands.',
            inputSchema: {
              type: 'object',
              properties: {
                view: {
                  type: 'string',
                  enum: [
                    'overview',
                    'map',
                    'control',
                    'queue',
                    'tracking',
                    'alarms',
                    'safety',
                    'history',
                  ],
                },
              },
              required: ['view'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute: async (input: unknown) => {
              const value = input as { view?: unknown };
              if (
                !value ||
                typeof value.view !== 'string' ||
                ![
                  'overview',
                  'map',
                  'control',
                  'queue',
                  'tracking',
                  'alarms',
                  'safety',
                  'history',
                ].includes(value.view)
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
  const title = nav.flatMap((g) => g.items).find((i) => i.id === page)?.label;
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '238px' } as React.CSSProperties}
    >
      <Sidebar className="scada-sidebar">
        <SidebarHeader>
          <div className="brand">
            <span className="brand-mark">TP</span>
            <div>
              TotalParking<small>SCADA WORKSPACE</small>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {nav.map((group) => (
            <SidebarGroup key={group.group}>
              <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={page === item.id}
                      onClick={() => setPage(item.id)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                      {page === item.id && (
                        <ChevronRight className="nav-arrow" />
                      )}
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
            TOTALPARKING <span>DEMO 1.0</span>
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger />
            <span>Trung tâm điều hành</span>
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </div>
          <div className="header-right">
            <Badge tone="blue">SIMULATION</Badge>
            <span className="clock">
              <Clock3 size={14} />
              {now}
            </span>
            <span className="avatar">OP</span>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">LUMI · AUTOMATED PARKING</div>
              <h1>{title}</h1>
              <p>Giám sát bãi đỗ xe tự động theo thời gian thực.</p>
            </div>
            <button className="primary" onClick={() => setPage('control')}>
              <Play size={15} /> Điều khiển vận hành
            </button>
          </div>
          <div className="simulation-note">
            <Activity size={15} />
            <span>Chế độ mô phỏng</span>
            <span>Dữ liệu thử nghiệm · Không kết nối thiết bị thực</span>
            <span className="live-dot" />
          </div>
          {page === 'overview' ? (
            <>
              <div className="metrics">
                {[
                  {
                    label: 'Tổng Block',
                    value: '8',
                    sub: '3 phân khu',
                    icon: Layers,
                    tone: 'blue',
                  },
                  {
                    label: 'Tổng Pallet',
                    value: '164',
                    sub: 'Sức chứa toàn hệ thống',
                    icon: CircleParking,
                    tone: 'purple',
                  },
                  {
                    label: 'Xe đang đỗ',
                    value: String(total),
                    sub: Math.round((total / capacity) * 100) + '% công suất',
                    icon: Car,
                    tone: 'green',
                  },
                  {
                    label: 'Vị trí khả dụng',
                    value: String(available),
                    sub: capacity - total - available + ' vị trí trống bị khóa',
                    icon: Grid2X2,
                    tone: 'blue',
                  },
                ].map((m) => (
                  <div className="metric" key={m.label}>
                    <div>
                      <span>{m.label}</span>
                      <strong>{m.value}</strong>
                      <small>{m.sub}</small>
                    </div>
                    <div className={'metric-icon ' + m.tone}>
                      <m.icon size={22} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="alarm-strip">
                <Bell size={17} />
                <strong>{sim.alarms.length} cảnh báo đang hoạt động</strong>
                <span>
                  {sim.alarms[0]
                    ? sim.alarms[0].block + ' · ' + sim.alarms[0].text
                    : 'Tất cả tín hiệu an toàn bình thường'}
                </span>
                <button onClick={() => setPage('alarms')}>
                  Xem chi tiết <ChevronRight size={15} />
                </button>
              </div>
              <div className="dashboard-grid">
                <Panel
                  title="Mật độ khai thác theo thời gian"
                  aside={<span className="muted">Ca sáng · Dữ liệu mẫu</span>}
                >
                  <Trend />
                </Panel>
                <Panel title="Mật độ theo phân khu">
                  <div className="zone-list">
                    {['A', 'B', 'C'].map((z, i) => {
                      const list = blocks.filter((b) => b.zone === z);
                      const count = list.reduce((s, b) => s + b.count, 0);
                      const cap = list.reduce((s, b) => s + b.capacity, 0);
                      return (
                        <div className={'zone-row zone-' + i} key={z}>
                          <div>
                            <span>
                              <b>Zone {z}</b>
                              <small>
                                {count} / {cap} pallet
                              </small>
                            </span>
                            <strong>
                              {Math.round((count / cap) * 100)}
                              <small>%</small>
                            </strong>
                          </div>
                          <Progress value={(count / cap) * 100} />
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              </div>
              <Panel
                title="Trạng thái các Block"
                aside={
                  <span className="muted">
                    Chọn Block để vận hành <ChevronRight size={14} />
                  </span>
                }
              >
                <div className="block-grid">
                  {blocks.map((b) => (
                    <button
                      className="block-card"
                      key={b.id}
                      onClick={() => {
                        setSelected(b.id);
                        setPage('control');
                      }}
                    >
                      <div className="block-card-top">
                        <span className="block-icon">
                          <Layers size={19} />
                        </span>
                        <span>
                          Block {b.id}
                          <small>ZONE {b.zone}</small>
                        </span>
                        <ChevronRight size={15} />
                      </div>
                      <div className="block-numbers">
                        <strong>
                          {b.count}
                          <small> / {b.capacity}</small>
                        </strong>
                        <span>{Math.round((b.count / b.capacity) * 100)}%</span>
                      </div>
                      <Progress value={(b.count / b.capacity) * 100} />
                      <Badge
                        tone={
                          b.state === 'Bình thường'
                            ? 'green'
                            : b.state === 'Cảnh báo'
                              ? 'amber'
                              : b.state === 'Offline'
                                ? 'red'
                                : 'purple'
                        }
                      >
                        {b.state}
                      </Badge>
                    </button>
                  ))}
                </div>
              </Panel>
            </>
          ) : (
            <SimulatorViews
              page={page}
              sim={sim}
              dispatch={dispatch}
              selected={selected}
              setSelected={setSelected}
            />
          )}
          <footer className="page-footer">
            <span>
              <span className="live-dot" /> Hệ thống mô phỏng sẵn sàng
            </span>
            <span>TotalParking SCADA · Bản thử nghiệm</span>
          </footer>
        </div>
      </main>
    </SidebarProvider>
  );
}
