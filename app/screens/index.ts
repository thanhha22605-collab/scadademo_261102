import type { ScreenProps } from './shared';
import Dashboard from './Dashboard';
import FloorPlan from './FloorPlan';
import OperationControl from './OperationControl';
import Routing from './Routing';
import Queue from './Queue';
import Tracking from './Tracking';
import Alarms from './Alarms';
import Safety from './Safety';
import Maintenance from './Maintenance';
import Assets from './Assets';
import Diagnostics from './Diagnostics';
import Historian from './Historian';
import Reports from './Reports';
import Cards from './Cards';
import Cctv from './Cctv';
import Energy from './Energy';
import Settings from './Settings';
import Users from './Users';
import Backup from './Backup';

/* Bảng ánh xạ id tab -> module màn hình (mỗi tab một file riêng). */
export const screenRegistry: Record<
  string,
  React.ComponentType<ScreenProps>
> = {
  overview: Dashboard,
  floorplan: FloorPlan,
  control: OperationControl,
  routing: Routing,
  queue: Queue,
  tracking: Tracking,
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
  settings: Settings,
  users: Users,
  backup: Backup,
};
export type { ScreenProps };
