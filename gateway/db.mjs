import mysql from 'mysql2/promise';

const url = process.env.MYSQL_URL || '';
let pool = null;
let ready = false;
let databaseName = '';

export function databaseConfigured() {
  return Boolean(url);
}

export async function initDatabase() {
  if (!url) return false;
  pool = mysql.createPool(url);
  const [databaseRows] = await pool.query('SELECT DATABASE() AS name');
  databaseName = String(databaseRows[0]?.name || '');
  if (!databaseName) throw new Error('MYSQL_URL chưa chọn database.');
  await pool.query(`CREATE TABLE IF NOT EXISTS scada_alarm_ack (
    alarm_id VARCHAR(128) PRIMARY KEY,
    acknowledged_by VARCHAR(128) NOT NULL,
    acknowledged_at DATETIME(3) NOT NULL
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS scada_cards (
    card_id VARCHAR(64) PRIMARY KEY,
    uid VARCHAR(128) NOT NULL UNIQUE,
    plate VARCHAR(32) NOT NULL,
    owner_name VARCHAR(255) NOT NULL DEFAULT '',
    vehicle_type VARCHAR(64) NOT NULL DEFAULT '',
    zone_name VARCHAR(64) NOT NULL DEFAULT '',
    block_id VARCHAR(64) NOT NULL DEFAULT '',
    import_batch VARCHAR(64) NOT NULL DEFAULT '',
    weight_class VARCHAR(64) NOT NULL DEFAULT '',
    active TINYINT(1) NOT NULL DEFAULT 1,
    updated_by VARCHAR(128) NOT NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS scada_access_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(128) NOT NULL,
    direction ENUM('IN','OUT') NOT NULL,
    gate_name VARCHAR(128) NOT NULL,
    plate VARCHAR(32) NOT NULL,
    block_id VARCHAR(64) NOT NULL DEFAULT '',
    slot_no INT NOT NULL DEFAULT -1,
    result_text VARCHAR(64) NOT NULL,
    reason_text VARCHAR(255) NOT NULL DEFAULT '',
    occurred_at DATETIME(3) NOT NULL,
    INDEX idx_access_uid_time (uid, occurred_at)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS scada_camera_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(128) NOT NULL UNIQUE,
    plate VARCHAR(32) NULL,
    make_name VARCHAR(128) NULL,
    model_name VARCHAR(128) NULL,
    year_range VARCHAR(64) NULL,
    length_mm INT NULL,
    width_mm INT NULL,
    height_mm INT NULL,
    weight_kg INT NULL,
    category_name VARCHAR(128) NULL,
    vehicle_type VARCHAR(64) NOT NULL,
    weight_class VARCHAR(32) NOT NULL DEFAULT '',
    zone_name VARCHAR(64) NOT NULL DEFAULT '',
    block_id VARCHAR(64) NOT NULL DEFAULT '',
    outcome VARCHAR(32) NOT NULL DEFAULT '',
    reason_text VARCHAR(512) NOT NULL DEFAULT '',
    occurred_at DATETIME(3) NOT NULL
  )`);
  await ensureColumn('scada_camera_events', 'event_id', 'VARCHAR(128) NULL');
  await ensureColumn('scada_camera_events', 'make_name', 'VARCHAR(128) NULL');
  await ensureColumn('scada_camera_events', 'model_name', 'VARCHAR(128) NULL');
  await ensureColumn('scada_camera_events', 'year_range', 'VARCHAR(64) NULL');
  await ensureColumn('scada_camera_events', 'length_mm', 'INT NULL');
  await ensureColumn('scada_camera_events', 'width_mm', 'INT NULL');
  await ensureColumn('scada_camera_events', 'height_mm', 'INT NULL');
  await ensureColumn('scada_camera_events', 'weight_kg', 'INT NULL');
  await ensureColumn(
    'scada_camera_events',
    'category_name',
    'VARCHAR(128) NULL',
  );
  await ensureColumn(
    'scada_camera_events',
    'outcome',
    "VARCHAR(32) NOT NULL DEFAULT ''",
  );
  await ensureColumn(
    'scada_camera_events',
    'reason_text',
    "VARCHAR(512) NOT NULL DEFAULT ''",
  );
  await pool.query(
    `UPDATE scada_camera_events SET event_id=CONCAT('legacy-', id) WHERE event_id IS NULL OR event_id=''`,
  );
  await pool.query(
    `ALTER TABLE scada_camera_events MODIFY COLUMN event_id VARCHAR(128) NOT NULL, MODIFY COLUMN plate VARCHAR(32) NULL, MODIFY COLUMN weight_class VARCHAR(32) NOT NULL DEFAULT ''`,
  );
  await ensureUniqueIndex(
    'scada_camera_events',
    'uq_camera_event_id',
    'event_id',
  );
  await pool.query(`CREATE TABLE IF NOT EXISTS scada_audit_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    action_name VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    operator_name VARCHAR(128) NOT NULL,
    detail_text VARCHAR(1024) NOT NULL DEFAULT '',
    occurred_at DATETIME(3) NOT NULL,
    INDEX idx_audit_time (occurred_at)
  )`);
  ready = true;
  return true;
}

async function ensureColumn(table, column, definition) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?`,
    [databaseName, table, column],
  );
  if (Number(rows[0]?.count) === 0)
    await pool.query(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`,
    );
}

async function ensureUniqueIndex(table, index, column) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME=?`,
    [databaseName, table, index],
  );
  if (Number(rows[0]?.count) === 0)
    await pool.query(
      `ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`${index}\` (\`${column}\`)`,
    );
}

export function databaseReady() {
  return ready;
}

function requirePool() {
  if (!pool || !ready)
    throw new Error('MySQL chưa được cấu hình hoặc chưa sẵn sàng.');
  return pool;
}

export async function saveAlarmAck(id, by, at = new Date()) {
  await requirePool().execute(
    `INSERT INTO scada_alarm_ack (alarm_id, acknowledged_by, acknowledged_at)
     VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE acknowledged_by=VALUES(acknowledged_by), acknowledged_at=VALUES(acknowledged_at)`,
    [id, by, at],
  );
  await appendAudit('ACK_ALARM', id, by, 'Xác nhận cảnh báo', at);
}

export async function listAlarmAcks() {
  const [rows] = await requirePool().query(
    'SELECT alarm_id, acknowledged_by, acknowledged_at FROM scada_alarm_ack ORDER BY acknowledged_at DESC LIMIT 500',
  );
  return rows;
}

export async function upsertCard(card, by) {
  await requirePool().execute(
    `INSERT INTO scada_cards
      (card_id,uid,plate,owner_name,vehicle_type,zone_name,block_id,import_batch,weight_class,active,updated_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE uid=VALUES(uid),plate=VALUES(plate),owner_name=VALUES(owner_name),vehicle_type=VALUES(vehicle_type),zone_name=VALUES(zone_name),block_id=VALUES(block_id),import_batch=VALUES(import_batch),weight_class=VALUES(weight_class),active=VALUES(active),updated_by=VALUES(updated_by)`,
    [
      card.id,
      card.uid,
      card.plate,
      card.owner ?? '',
      card.type ?? '',
      card.zone ?? '',
      card.block ?? '',
      card.batch ?? '',
      card.weight ?? '',
      card.active === false ? 0 : 1,
      by,
    ],
  );
  await appendAudit(
    'UPSERT_CARD',
    card.id,
    by,
    `active=${card.active === false ? 0 : 1}; uid=${card.uid}`,
  );
}

export async function listCards(query = '') {
  const term = `%${query}%`;
  const [rows] = await requirePool().execute(
    `SELECT card_id AS id,uid,plate,owner_name AS owner,vehicle_type AS type,zone_name AS zone,block_id AS block,import_batch AS batch,weight_class AS weight,active,updated_at
     FROM scada_cards WHERE ?='' OR card_id LIKE ? OR uid LIKE ? OR plate LIKE ? OR owner_name LIKE ? ORDER BY updated_at DESC LIMIT 5000`,
    [query, term, term, term, term],
  );
  return rows;
}

export async function saveCameraEvent(vehicle) {
  await requirePool().execute(
    `INSERT INTO scada_camera_events
      (event_id,plate,make_name,model_name,year_range,length_mm,width_mm,height_mm,weight_kg,category_name,vehicle_type,weight_class,zone_name,block_id,outcome,reason_text,occurred_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE plate=VALUES(plate),make_name=VALUES(make_name),model_name=VALUES(model_name),year_range=VALUES(year_range),length_mm=VALUES(length_mm),width_mm=VALUES(width_mm),height_mm=VALUES(height_mm),weight_kg=VALUES(weight_kg),category_name=VALUES(category_name),vehicle_type=VALUES(vehicle_type),weight_class=VALUES(weight_class),zone_name=VALUES(zone_name),block_id=VALUES(block_id),outcome=VALUES(outcome),reason_text=VALUES(reason_text)`,
    [
      vehicle.eventId,
      vehicle.plate ?? null,
      vehicle.make ?? null,
      vehicle.model ?? null,
      vehicle.year ?? null,
      vehicle.lengthMm ?? null,
      vehicle.widthMm ?? null,
      vehicle.heightMm ?? null,
      vehicle.weightKg ?? null,
      vehicle.category ?? null,
      vehicle.lane ?? 'unknown',
      vehicle.weightClass ?? '',
      vehicle.zone ?? '',
      vehicle.block ?? '',
      vehicle.outcome ?? '',
      vehicle.reason ?? '',
      new Date(vehicle.receivedAt ?? Date.now()),
    ],
  );
}

export async function saveAccessEvent(event) {
  await requirePool().execute(
    `INSERT INTO scada_access_events (uid,direction,gate_name,plate,block_id,slot_no,result_text,reason_text,occurred_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      event.uid,
      event.direction,
      event.gate ?? '',
      event.plate ?? '',
      event.block ?? '',
      Number.isInteger(event.slot) ? event.slot : -1,
      event.result ?? '',
      event.reason ?? '',
      new Date(event.at ?? Date.now()),
    ],
  );
}

export async function listAccessEvents(query = '', limit = 500) {
  const term = `%${query}%`;
  const capped = Math.max(1, Math.min(5000, Number(limit) || 500));
  const [rows] = await requirePool().execute(
    `SELECT id,uid,direction AS dir,gate_name AS gate,plate,block_id AS block,slot_no AS slot,result_text AS result,reason_text AS reason,occurred_at AS at
     FROM scada_access_events WHERE ?='' OR uid LIKE ? OR plate LIKE ? ORDER BY occurred_at DESC LIMIT ?`,
    [query, term, term, capped],
  );
  return rows;
}

async function appendAudit(action, entity, operator, detail, at = new Date()) {
  await requirePool().execute(
    `INSERT INTO scada_audit_log (action_name,entity_id,operator_name,detail_text,occurred_at) VALUES (?,?,?,?,?)`,
    [action, entity, operator, detail, at],
  );
}

export async function listAudit(limit = 500) {
  const capped = Math.max(1, Math.min(5000, Number(limit) || 500));
  const [rows] = await requirePool().execute(
    `SELECT id,action_name AS action,entity_id AS entity,operator_name AS operator,detail_text AS detail,occurred_at AS at
     FROM scada_audit_log ORDER BY occurred_at DESC LIMIT ?`,
    [capped],
  );
  return rows;
}
