'use client';
import { useEffect, useState } from 'react';
import {
  Activity,
  Bell,
  Camera,
  Car,
  ChartNoAxesCombined,
  ChevronRight,
  CircleParking,
  Clock3,
  CreditCard,
  FileText,
  Grid2X2,
  Layers,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Play,
  Route,
  Server,
  Settings as SettingsIcon,
  ShieldCheck,
  User,
  Users,
  Waypoints,
  Wrench,
  Zap,
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
import { status, zoneTag } from '@/lib/simulation';
import { Progress } from '@/components/ui/progress';
import { Badge, Panel, Tag } from './ui';
import { screenAction } from './screens';
const nav = [
  {
    group: 'GIÁM SÁT VẬN HÀNH',
    items: [
      {
        id: 'overview',
        label: 'Dashboard tổng quan',
        icon: LayoutDashboard,
        title: 'Dashboard tổng quan',
        sub: 'Giám sát bãi đỗ xe tự động theo thời gian thực.',
      },
      {
        id: 'floorplan',
        label: 'Mặt bằng hệ thống',
        icon: Grid2X2,
        title: 'Mặt bằng hệ thống',
        sub: 'Tổng mặt bằng SCADA · AI-VDS · PLC Block · HMI Block.',
      },
      {
        id: 'control',
        label: 'Điều khiển vận hành',
        icon: Waypoints,
        title: 'Operation Control Center (OCC)',
        sub: 'Trung tâm điều khiển tập trung, giám sát lệnh PLC & điều phối khay đỗ.',
      },
      {
        id: 'routing',
        label: 'Điều hướng xe',
        icon: Route,
        title: 'Điều hướng giao thông & phân loại xe (AI-VDS)',
        sub: 'Giám sát xe vào cổng, đo kích thước AI-VDS và cân bằng tải block.',
      },
    ],
  },
  {
    group: 'ĐIỀU PHỐI XE',
    items: [
      {
        id: 'queue',
        label: 'Hàng đợi xe',
        icon: ListOrdered,
        title: 'Hàng đợi vận hành & điều phối xe',
        sub: 'Giám sát và kiểm soát hàng đợi xe vào / ra trực tuyến.',
      },
      {
        id: 'tracking',
        label: 'Truy vết xe & pallet',
        icon: Car,
        title: 'Truy vết xe & pallet',
        sub: 'Giám sát vị trí thời gian thực và lịch sử dịch chuyển khay đỗ.',
      },
    ],
  },
  {
    group: 'BẢO TRÌ & CHẨN ĐOÁN',
    items: [
      {
        id: 'alarms',
        label: 'Alarm & Event',
        icon: Bell,
        title: 'Nhật ký cảnh báo & sự cố (Alarms & Events)',
        sub: 'Giám sát toàn bộ sự cố thời gian thực và cảnh báo bảo trì.',
      },
      {
        id: 'safety',
        label: 'Safety Interlock',
        icon: ShieldCheck,
        title: 'Ma trận an toàn & quản lý Bypass (Safety Interlock)',
        sub: 'Giám sát các điều kiện Safety Interlock trước khi vận hành.',
      },
      {
        id: 'maintenance',
        label: 'Bảo trì hệ thống',
        icon: Wrench,
        title: 'Bảo trì hệ thống',
        sub: 'Giám sát runtime động cơ, số chu kỳ và lịch bảo dưỡng thiết bị.',
      },
      {
        id: 'assets',
        label: 'Asset Tree / Thiết bị',
        icon: Layers,
        title: 'Cây thiết bị & quản lý tài sản (Asset Tree)',
        sub: 'Cấu trúc phân cấp phần cứng SCADA và vật tư dự phòng.',
      },
      {
        id: 'diagnostics',
        label: 'Remote Diagnostics',
        icon: Activity,
        title: 'Chẩn đoán lỗi & lịch sử sự cố (Remote Diagnostics)',
        sub: 'Giám sát chỉ số MTBF / MTTR và phân tích nguyên nhân gốc.',
      },
      {
        id: 'historian',
        label: 'Historian / Trend',
        icon: ChartNoAxesCombined,
        title: 'Historian / Trend & Nhật ký vận hành',
        sub: 'Xu hướng dòng điện, nhiệt độ motor và nhật ký sự kiện.',
      },
    ],
  },
  {
    group: 'QUẢN LÝ & BÁO CÁO',
    items: [
      {
        id: 'reports',
        label: 'Báo cáo & thống kê',
        icon: FileText,
        title: 'Báo cáo & thống kê hệ thống',
        sub: 'Truy xuất báo cáo hoạt động, mật độ và phân tích Pareto lỗi.',
      },
      {
        id: 'cards',
        label: 'Quản lý thẻ RFID',
        icon: CreditCard,
        title: 'Quản lý thẻ từ bãi đỗ (RFID Card Management)',
        sub: 'Đăng ký thẻ từ, định danh biển số và đồng bộ dữ liệu xuống HMI.',
      },
      {
        id: 'cctv',
        label: 'Camera / CCTV',
        icon: Camera,
        title: 'Giám sát Camera / CCTV',
        sub: 'Liên kết camera giám sát trực tiếp với vị trí an toàn SCADA.',
      },
      {
        id: 'energy',
        label: 'Energy Monitoring',
        icon: Zap,
        title: 'Giám sát điện năng (Energy Monitoring)',
        sub: 'Theo dõi điện năng tiêu thụ, peak load và chi phí vận hành.',
      },
    ],
  },
  {
    group: 'CẤU HÌNH & BẢO MẬT',
    items: [
      {
        id: 'settings',
        label: 'Cấu hình hệ thống',
        icon: SettingsIcon,
        title: 'Cấu hình hệ thống (Settings)',
        sub: 'Quản lý tham số Modbus, cơ sở dữ liệu và tích hợp API ngoài.',
      },
      {
        id: 'users',
        label: 'User & Permission',
        icon: Users,
        title: 'Hỗ trợ từ xa & phân quyền người dùng',
        sub: 'Quản lý ma trận quyền, phiên làm việc và nhật ký Audit Log.',
      },
      {
        id: 'backup',
        label: 'Backup & Health',
        icon: Server,
        title: 'Sao lưu & sức khỏe hệ thống (Backup & Health)',
        sub: 'Giám sát tải CPU, kết nối Database, UPS và lịch sử backup.',
      },
    ],
  },
];
const allItems = nav.flatMap((g) => g.items);
const viewIds = allItems.map((i) => i.id);
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
const connectivity = [
  { name: 'PLC Block', ok: true },
  { name: 'HMI Block', ok: true },
  { name: 'AI-VDS', ok: true },
  { name: 'LED / PGS', ok: true },
  { name: 'SCADA Server', ok: true },
];
const alarmCatName: Record<string, string> = {
  operator: 'Lỗi thao tác',
  system: 'Lỗi thiết bị',
  maintenance: 'Đến hạn bảo trì',
};
function ScadaAlarmsLive({
  sim,
  dispatch,
}: {
  sim: ReturnType<typeof useSimulation>['sim'];
  dispatch: ReturnType<typeof useSimulation>['dispatch'];
}) {
  const active = sim.alarms.filter((a) => !a.ack);
  const cnt = (c: string) => active.filter((a) => a.cat === c).length;
  return (
    <Panel
      title="Hệ thống cảnh báo thời gian thực (SCADA Alarms Live)"
      aside={<span className="muted">Chu kỳ cập nhật: 15s</span>}
    >
      <div className="alarms-live-cats">
        <div className="alive-cat amber">
          <div>
            <span>Lỗi thao tác vận hành</span>
            <small>Operator Errors</small>
          </div>
          <strong>{cnt('operator')}</strong>
        </div>
        <div className="alive-cat red">
          <div>
            <span>Lỗi hệ thống / thiết bị</span>
            <small>System &amp; Device Faults</small>
          </div>
          <strong>{cnt('system')}</strong>
        </div>
        <div className="alive-cat blue">
          <div>
            <span>Thiết bị đến hạn bảo trì</span>
            <small>Maintenance Due</small>
          </div>
          <strong>{cnt('maintenance')}</strong>
        </div>
      </div>
      <div className="table-scroll">
        <table className="grid-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Mã lỗi</th>
              <th>Phân loại cảnh báo</th>
              <th>Nguồn phát</th>
              <th>Nội dung chi tiết</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {active.slice(0, 6).map((a) => (
              <tr key={a.id}>
                <td className="mono">{a.at ?? '—'}</td>
                <td className="mono">{a.code ?? '—'}</td>
                <td>
                  <Badge
                    tone={
                      a.cat === 'system'
                        ? 'red'
                        : a.cat === 'operator'
                          ? 'amber'
                          : 'blue'
                    }
                  >
                    {a.cat ? alarmCatName[a.cat] : '—'}
                  </Badge>
                </td>
                <td>
                  {zoneTag[a.block[0]]} · Block {a.block} · {a.device ?? '—'}
                </td>
                <td>{a.text}</td>
                <td>
                  <button
                    className="secondary"
                    onClick={() =>
                      dispatch({
                        type: 'ack',
                        id: a.id,
                        time: new Date().toLocaleString('vi-VN'),
                      })
                    }
                  >
                    Xác nhận
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!active.length && (
        <div className="empty-state">Không có cảnh báo đang hoạt động.</div>
      )}
    </Panel>
  );
}
export default function Home() {
  const [page, setPage] = useState('overview');
  const [now, setNow] = useState('—');
  const [today, setToday] = useState('—');
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [locked, setLocked] = useState(false);
  const { sim, dispatch } = useSimulation();
  const [selected, setSelected] = useState('A-01');
  const blocks = sim.blocks.map((b) => ({
    ...b,
    count: b.slots.filter(Boolean).length,
    state: status(b, sim),
  }));
  const total = blocks.reduce((n, b) => n + b.count, 0);
  const capacity = blocks.reduce((n, b) => n + b.capacity, 0);
  const suv = sim.blocks.reduce(
    (n, b) => n + b.kinds.filter((k) => k === 'SUV').length,
    0,
  );
  const sedan = total - suv;
  const available = sim.blocks.reduce(
    (n, b) => n + (b.state === 'Bảo trì' ? 0 : b.slots.filter((p) => !p).length),
    0,
  );
  const downCount = sim.blocks.filter(
    (b) => b.state === 'Offline' || b.state === 'Lỗi',
  ).length;
  const activeAlarms = sim.alarms.filter((a) => !a.ack).length;
  const hasFault = sim.alarms.some((a) => !a.ack && a.cat === 'system');
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
              <strong>LUMI Automated Parking SCADA</strong>
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
              <div className="eyebrow">LUMI · AUTOMATED PARKING</div>
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
          {page === 'overview' ? (
            <>
              <div className="metrics metrics-6">
                {[
                  {
                    label: 'Tổng Block',
                    value: '9',
                    sub: '3 phân khu',
                    icon: Layers,
                    tone: 'blue',
                  },
                  {
                    label: 'Tổng Pallet',
                    value: '184',
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
                  {
                    label: 'Xe SUV',
                    value: String(suv),
                    sub: Math.round((suv / total) * 100) + '% tổng số xe',
                    icon: Car,
                    tone: 'amber',
                  },
                  {
                    label: 'Xe Sedan',
                    value: String(sedan),
                    sub: Math.round((sedan / total) * 100) + '% tổng số xe',
                    icon: Car,
                    tone: 'green',
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
                <strong>{activeAlarms} cảnh báo đang hoạt động</strong>
                <span>
                  {sim.alarms.find((a) => !a.ack)
                    ? (sim.alarms.find((a) => !a.ack)!.code
                        ? '[' + sim.alarms.find((a) => !a.ack)!.code + '] '
                        : '') +
                      sim.alarms.find((a) => !a.ack)!.block +
                      ' · ' +
                      sim.alarms.find((a) => !a.ack)!.text
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
                <div className="stack">
                  <Panel title="Mật độ theo Zone">
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
                  <Panel title="Kết nối hệ thống">
                    <div className="conn-list">
                      {connectivity.map((c) => (
                        <div className="conn-row" key={c.name}>
                          <span>{c.name}</span>
                          <Badge tone={c.ok ? 'green' : 'red'}>
                            {c.ok ? 'Kết nối' : 'Mất kết nối'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
              <Panel
                title="Trạng thái các Block"
                aside={
                  <span className="muted">
                    {downCount} block lỗi/offline <ChevronRight size={14} />
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
                          <small>{zoneTag[b.zone]}</small>
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
                      <Tag text={b.state} />
                    </button>
                  ))}
                </div>
              </Panel>
              <ScadaAlarmsLive sim={sim} dispatch={dispatch} />
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
                TotalParking SCADA<small>LUMI Automated Parking · v2.4</small>
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
