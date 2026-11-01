import type { ScreenProps } from '@/features/scada/components/shared';
import type { ViewId } from '@/features/scada/config/navigation';
import Dashboard from '@/features/scada/screens/monitoring/Dashboard';
import FloorPlan from '@/features/scada/screens/monitoring/FloorPlan';
import ZoneMonitoring from '@/features/scada/screens/monitoring/ZoneMonitoring';
import OperationControl from '@/features/scada/screens/monitoring/OperationControl';
import Routing from '@/features/scada/screens/monitoring/Routing';
import DriverDisplay from '@/features/scada/screens/monitoring/DriverDisplay';
import Queue from '@/features/scada/screens/dispatch/Queue';
import Tracking from '@/features/scada/screens/dispatch/Tracking';
import AccessLog from '@/features/scada/screens/dispatch/AccessLog';
import Alarms from '@/features/scada/screens/maintenance/Alarms';
import Safety from '@/features/scada/screens/maintenance/Safety';
import Maintenance from '@/features/scada/screens/maintenance/Maintenance';
import Assets from '@/features/scada/screens/maintenance/Assets';
import Diagnostics from '@/features/scada/screens/maintenance/Diagnostics';
import Historian from '@/features/scada/screens/maintenance/Historian';
import Reports from '@/features/scada/screens/management/Reports';
import Cards from '@/features/scada/screens/management/Cards';
import Cctv from '@/features/scada/screens/management/Cctv';
import Energy from '@/features/scada/screens/management/Energy';
import Settings from '@/features/scada/screens/system/Settings';
import Users from '@/features/scada/screens/system/Users';
import Backup from '@/features/scada/screens/system/Backup';
import PlcConfig from '@/features/scada/screens/system/PlcConfig';

/* Bảng ánh xạ id tab -> module màn hình (mỗi tab một file riêng). */
export const screenRegistry: Record<
  ViewId,
  React.ComponentType<ScreenProps>
> = {
  overview: Dashboard,
  floorplan: FloorPlan,
  zones: ZoneMonitoring,
  control: OperationControl,
  routing: Routing,
  driver: DriverDisplay,
  queue: Queue,
  tracking: Tracking,
  access: AccessLog,
  alarms: Alarms,
  safety: Safety,
  maintenance: Maintenance,
  assets: Assets,
  diagnostics: Diagnostics,
  historian: Historian,
  reports: Reports,
  cards: Cards,
  cctv: Cctv,
  energy: Energy,
  plcconfig: PlcConfig,
  settings: Settings,
  users: Users,
  backup: Backup,
};
export type { ScreenProps };
