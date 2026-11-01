function port(value, fallback) {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n < 1 || n > 65535)
    throw new Error('Port không hợp lệ.');
  return n;
}
function optionalPort(value, fallback = 0) {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n < 0 || n > 65535)
    throw new Error('Port tùy chọn không hợp lệ.');
  return n;
}
function number(value, fallback, min, max, name) {
  const result = Number(value ?? fallback);
  if (!Number.isFinite(result) || result < min || result > max)
    throw new Error(`${name} phải từ ${min} đến ${max}.`);
  return result;
}
function ledPanels(value) {
  if (!value) return [];
  let items;
  try {
    items = JSON.parse(value);
  } catch {
    throw new Error('LED_PANELS_JSON không phải JSON hợp lệ.');
  }
  if (!Array.isArray(items) || items.length > 64)
    throw new Error('LED_PANELS_JSON phải là mảng tối đa 64 bảng.');
  const ids = new Set();
  return items.map((item, index) => {
    const id = String(item?.id || `led-${index + 1}`).trim();
    const host = String(item?.host || '').trim();
    const boardPort = port(item?.port, 2022);
    const displayPort = Number(item?.displayPort ?? 0);
    const direction = Number(item?.direction ?? 0);
    if (!id || ids.has(id)) throw new Error('ID bảng LED bị trống hoặc trùng.');
    if (!/^[a-zA-Z0-9.-]+$/.test(host))
      throw new Error(`Host bảng LED ${id} không hợp lệ.`);
    if (!Number.isInteger(displayPort) || displayPort < 0 || displayPort > 255)
      throw new Error(`Cổng hiển thị LED ${id} không hợp lệ.`);
    if (!Number.isInteger(direction) || direction < 0 || direction > 3)
      throw new Error(`Hướng mũi tên LED ${id} không hợp lệ.`);
    ids.add(id);
    return { id, host, port: boardPort, displayPort, direction };
  });
}
const interval = Number(process.env.POLL_MS ?? 500);
if (!Number.isFinite(interval) || interval < 100 || interval > 60000)
  throw new Error('POLL_MS phải từ 100 đến 60000.');
const adminToken = process.env.GATEWAY_ADMIN_TOKEN || '';
if (adminToken && adminToken.length < 24)
  throw new Error('GATEWAY_ADMIN_TOKEN phải có ít nhất 24 ký tự.');
export const config = {
  pollMs: interval,
  wsPort: port(process.env.WS_PORT, 8081),
  bindHost: process.env.GATEWAY_BIND_HOST || '127.0.0.1',
  adminToken,
  allowedOrigins: (
    process.env.GATEWAY_ALLOWED_ORIGINS ||
    'http://localhost:3000,http://127.0.0.1:3000'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  mock: process.env.MOCK === 'true',
  allowWrites: process.env.ENABLE_PLC_WRITES === 'true',
  cameraToken: process.env.CAMERA_INGEST_TOKEN || '',
  ledControllerUrl: process.env.LED_CONTROLLER_URL || '',
  ledPanels: ledPanels(process.env.LED_PANELS_JSON),
  ledRefreshMs: number(
    process.env.LED_REFRESH_MS,
    5000,
    1000,
    10000,
    'LED_REFRESH_MS',
  ),
  pgsHost: process.env.PGS_CCU_HOST || '127.0.0.1',
  pgsPort: optionalPort(process.env.PGS_CCU_PORT, 0),
  finsBusyRetryMs: number(
    process.env.FINS_BUSY_RETRY_MS,
    300000,
    10000,
    3600000,
    'FINS_BUSY_RETRY_MS',
  ),
  classifier: {
    mechanicalMaxLengthShortMm: number(
      process.env.CLASSIFIER_SHORT_MM,
      4800,
      1000,
      10000,
      'CLASSIFIER_SHORT_MM',
    ),
    mechanicalMaxLengthLongMm: number(
      process.env.CLASSIFIER_LONG_MM,
      5000,
      1000,
      10000,
      'CLASSIFIER_LONG_MM',
    ),
    palletMaxWidthMm: number(
      process.env.CLASSIFIER_PALLET_WIDTH_MM,
      2000,
      1000,
      5000,
      'CLASSIFIER_PALLET_WIDTH_MM',
    ),
    palletMaxHeightMm: number(
      process.env.CLASSIFIER_PALLET_HEIGHT_MM,
      1900,
      1000,
      5000,
      'CLASSIFIER_PALLET_HEIGHT_MM',
    ),
    palletRatingLowKg: number(
      process.env.CLASSIFIER_LOW_KG,
      2200,
      500,
      10000,
      'CLASSIFIER_LOW_KG',
    ),
    palletRatingHighKg: number(
      process.env.CLASSIFIER_HIGH_KG,
      2600,
      500,
      10000,
      'CLASSIFIER_HIGH_KG',
    ),
    mirrorMarginMm: number(
      process.env.CLASSIFIER_MIRROR_MARGIN_MM,
      200,
      0,
      1000,
      'CLASSIFIER_MIRROR_MARGIN_MM',
    ),
    loadMarginKg: number(
      process.env.CLASSIFIER_LOAD_MARGIN_KG,
      400,
      0,
      2000,
      'CLASSIFIER_LOAD_MARGIN_KG',
    ),
    garageMaxLengthMm: number(
      process.env.CLASSIFIER_GARAGE_LENGTH_MM,
      6000,
      1000,
      20000,
      'CLASSIFIER_GARAGE_LENGTH_MM',
    ),
    garageMaxWidthMm: number(
      process.env.CLASSIFIER_GARAGE_WIDTH_MM,
      2200,
      1000,
      10000,
      'CLASSIFIER_GARAGE_WIDTH_MM',
    ),
    garageMaxHeightMm: number(
      process.env.CLASSIFIER_GARAGE_HEIGHT_MM,
      2200,
      1000,
      10000,
      'CLASSIFIER_GARAGE_HEIGHT_MM',
    ),
    garageMaxWeightKg: number(
      process.env.CLASSIFIER_GARAGE_WEIGHT_KG,
      3500,
      500,
      30000,
      'CLASSIFIER_GARAGE_WEIGHT_KG',
    ),
  },
};

if (
  config.classifier.mechanicalMaxLengthShortMm >
  config.classifier.mechanicalMaxLengthLongMm
)
  throw new Error('Ngưỡng chiều dài ngắn không được lớn hơn ngưỡng dài.');
if (config.classifier.palletRatingLowKg > config.classifier.palletRatingHighKg)
  throw new Error('Ngưỡng tải thấp không được lớn hơn ngưỡng tải cao.');
