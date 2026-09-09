import {
  Activity,
  Bell,
  Camera,
  Car,
  ChartNoAxesCombined,
  CreditCard,
  Download,
  FileText,
  Grid2X2,
  Layers,
  LayoutDashboard,
  ListOrdered,
  RefreshCw,
  Route,
  Server,
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
  Waypoints,
  Wrench,
  Zap,
} from 'lucide-react';

export type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  sub: string;
};
export const nav: { group: string; items: NavItem[] }[] = [
  {
    group: 'GIÁM SÁT VẬN HÀNH',
    items: [
      { id: 'overview', label: 'Dashboard tổng quan', icon: LayoutDashboard, title: 'Dashboard tổng quan', sub: 'Giám sát bãi đỗ xe tự động theo thời gian thực.' },
      { id: 'floorplan', label: 'Mặt bằng hệ thống', icon: Grid2X2, title: 'Mặt bằng hệ thống', sub: 'Tổng mặt bằng SCADA · AI-VDS · PLC Block · HMI Block.' },
      { id: 'control', label: 'Điều khiển vận hành', icon: Waypoints, title: 'Operation Control Center (OCC)', sub: 'Trung tâm điều khiển tập trung, giám sát lệnh PLC & điều phối khay đỗ.' },
      { id: 'routing', label: 'Điều hướng xe', icon: Route, title: 'Điều hướng giao thông & phân loại xe (AI-VDS)', sub: 'Giám sát xe vào cổng, đo kích thước AI-VDS và cân bằng tải block.' },
    ],
  },
  {
    group: 'ĐIỀU PHỐI XE',
    items: [
      { id: 'queue', label: 'Hàng đợi xe', icon: ListOrdered, title: 'Hàng đợi vận hành & điều phối xe', sub: 'Giám sát và kiểm soát hàng đợi xe vào / ra trực tuyến.' },
      { id: 'tracking', label: 'Truy vết xe & pallet', icon: Car, title: 'Truy vết xe & pallet', sub: 'Giám sát vị trí thời gian thực và lịch sử dịch chuyển khay đỗ.' },
    ],
  },
  {
    group: 'BẢO TRÌ & CHẨN ĐOÁN',
    items: [
      { id: 'alarms', label: 'Alarm & Event', icon: Bell, title: 'Nhật ký cảnh báo & sự cố (Alarms & Events)', sub: 'Giám sát toàn bộ sự cố thời gian thực và cảnh báo bảo trì.' },
      { id: 'safety', label: 'Safety Interlock', icon: ShieldCheck, title: 'Ma trận an toàn & quản lý Bypass (Safety Interlock)', sub: 'Giám sát các điều kiện Safety Interlock trước khi vận hành.' },
      { id: 'maintenance', label: 'Bảo trì hệ thống', icon: Wrench, title: 'Bảo trì hệ thống', sub: 'Giám sát runtime động cơ, số chu kỳ và lịch bảo dưỡng thiết bị.' },
      { id: 'assets', label: 'Asset Tree / Thiết bị', icon: Layers, title: 'Cây thiết bị & quản lý tài sản (Asset Tree)', sub: 'Cấu trúc phân cấp phần cứng SCADA và vật tư dự phòng.' },
      { id: 'diagnostics', label: 'Remote Diagnostics', icon: Activity, title: 'Chẩn đoán lỗi & lịch sử sự cố (Remote Diagnostics)', sub: 'Giám sát chỉ số MTBF / MTTR và phân tích nguyên nhân gốc.' },
      { id: 'historian', label: 'Historian / Trend', icon: ChartNoAxesCombined, title: 'Historian / Trend & Nhật ký vận hành', sub: 'Xu hướng dòng điện, nhiệt độ motor và nhật ký sự kiện.' },
    ],
  },
  {
    group: 'QUẢN LÝ & BÁO CÁO',
    items: [
      { id: 'reports', label: 'Báo cáo & thống kê', icon: FileText, title: 'Báo cáo & thống kê hệ thống', sub: 'Truy xuất báo cáo hoạt động, mật độ và phân tích Pareto lỗi.' },
      { id: 'cards', label: 'Quản lý thẻ RFID', icon: CreditCard, title: 'Quản lý thẻ từ bãi đỗ (RFID Card Management)', sub: 'Đăng ký thẻ từ, định danh biển số và đồng bộ dữ liệu xuống HMI.' },
      { id: 'cctv', label: 'Camera / CCTV', icon: Camera, title: 'Giám sát Camera / CCTV', sub: 'Liên kết camera giám sát trực tiếp với vị trí an toàn SCADA.' },
      { id: 'energy', label: 'Energy Monitoring', icon: Zap, title: 'Giám sát điện năng (Energy Monitoring)', sub: 'Theo dõi điện năng tiêu thụ, peak load và chi phí vận hành.' },
    ],
  },
  {
    group: 'CẤU HÌNH & BẢO MẬT',
    items: [
      { id: 'settings', label: 'Cấu hình hệ thống', icon: SettingsIcon, title: 'Cấu hình hệ thống (Settings)', sub: 'Quản lý tham số Modbus, cơ sở dữ liệu và tích hợp API ngoài.' },
      { id: 'users', label: 'User & Permission', icon: Users, title: 'Hỗ trợ từ xa & phân quyền người dùng', sub: 'Quản lý ma trận quyền, phiên làm việc và nhật ký Audit Log.' },
      { id: 'backup', label: 'Backup & Health', icon: Server, title: 'Sao lưu & sức khỏe hệ thống (Backup & Health)', sub: 'Giám sát tải CPU, kết nối Database, UPS và lịch sử backup.' },
    ],
  },
];
export const allItems = nav.flatMap((g) => g.items);
export const viewIds = allItems.map((i) => i.id);

/* nút hành động ở góc phải tiêu đề, theo từng tab */
export const screenAction: Record<
  string,
  { label: string; icon: React.ComponentType<{ size?: number }> } | undefined
> = {
  maintenance: { label: 'Xuất Work Order', icon: Download },
  cards: { label: 'Cài đặt thẻ mới', icon: CreditCard },
  diagnostics: { label: 'Làm mới dữ liệu', icon: RefreshCw },
  backup: { label: 'Backup ngay', icon: Server },
  cctv: { label: 'Xem tất cả (Grid)', icon: Camera },
  routing: { label: 'AI-VDS Fallback', icon: Route },
  users: { label: 'Audit Log', icon: Users },
};
