import { getDb } from '@/db';
import { fetchMaoyanStatus } from '@/lib/maoyan';
import { sendStatusChangeNotification } from '@/lib/wxpusher';

export type MonitorRow = {
  id: number;
  projectId: string;
  sourceUrl: string;
  name: string;
  venue: string | null;
  showTime: string | null;
  buttonText: string;
  saleStatus: number | null;
  ticketStatus: number | null;
  available: number;
  lastCheckedAt: string;
  createdAt: string;
  lastError: string | null;
};

const monitorSelect = `SELECT id, project_id AS projectId, source_url AS sourceUrl, name, venue,
  show_time AS showTime, button_text AS buttonText, sale_status AS saleStatus,
  ticket_status AS ticketStatus, available, last_checked_at AS lastCheckedAt,
  created_at AS createdAt, last_error AS lastError FROM monitors`;

function getMonitor(id: number) {
  return getDb().prepare(`${monitorSelect} WHERE id = ?`).get(id) as
    | MonitorRow
    | undefined;
}

export async function listMonitors(): Promise<MonitorRow[]> {
  return getDb()
    .prepare(`${monitorSelect} ORDER BY available DESC, created_at DESC`)
    .all() as MonitorRow[];
}

export async function createMonitor(projectId: string, sourceUrl: string) {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM monitors WHERE project_id = ?')
    .get(projectId) as { id: number } | undefined;
  if (existing) return checkMonitor(existing.id);

  const status = await fetchMaoyanStatus(projectId);
  const now = new Date().toISOString();
  const id = db.transaction(() => {
    const duplicate = db
      .prepare('SELECT id FROM monitors WHERE project_id = ?')
      .get(projectId) as { id: number } | undefined;
    if (duplicate) return duplicate.id;

    const insert = db
      .prepare(`INSERT INTO monitors
      (project_id, source_url, name, venue, show_time, button_text, sale_status, ticket_status,
       available, last_checked_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        projectId,
        sourceUrl,
        status.name,
        status.venue,
        status.showTime,
        status.buttonText,
        status.saleStatus,
        status.ticketStatus,
        status.available ? 1 : 0,
        now,
        now,
      );
    const monitorId = Number(insert.lastInsertRowid);
    db.prepare(`INSERT INTO status_history
      (monitor_id, button_text, available, sale_status, ticket_status, checked_at)
      VALUES (?, ?, ?, ?, ?, ?)`).run(
      monitorId,
      status.buttonText,
      status.available ? 1 : 0,
      status.saleStatus,
      status.ticketStatus,
      now,
    );
    return monitorId;
  })();
  return getMonitor(id);
}

export async function checkMonitor(id: number) {
  const db = getDb();
  const target = db
    .prepare('SELECT project_id AS projectId FROM monitors WHERE id = ?')
    .get(id) as { projectId: string } | undefined;
  if (!target) throw new Error('监控项目不存在');

  const now = new Date().toISOString();
  try {
    const status = await fetchMaoyanStatus(target.projectId);
    const change = db.transaction(() => {
      const current = getMonitor(id);
      if (!current) throw new Error('监控项目不存在');
      const changed =
        status.buttonText !== current.buttonText ||
        Number(status.available) !== current.available ||
        status.saleStatus !== current.saleStatus ||
        status.ticketStatus !== current.ticketStatus;

      db.prepare(`UPDATE monitors SET name = ?, venue = ?, show_time = ?, button_text = ?,
        sale_status = ?, ticket_status = ?, available = ?, last_checked_at = ?, last_error = NULL
        WHERE id = ?`).run(
        status.name,
        status.venue,
        status.showTime,
        status.buttonText,
        status.saleStatus,
        status.ticketStatus,
        status.available ? 1 : 0,
        now,
        id,
      );
      if (!changed) return null;

      const history = db
        .prepare(`INSERT INTO status_history
        (monitor_id, button_text, available, sale_status, ticket_status, checked_at)
        VALUES (?, ?, ?, ?, ?, ?)`)
        .run(
          id,
          status.buttonText,
          status.available ? 1 : 0,
          status.saleStatus,
          status.ticketStatus,
          now,
        );
      return {
        historyId: Number(history.lastInsertRowid),
        previousButtonText: current.buttonText,
        sourceUrl: current.sourceUrl,
      };
    })();

    if (change) {
      try {
        const result = await sendStatusChangeNotification({
          ...status,
          sourceUrl: change.sourceUrl,
          previousButtonText: change.previousButtonText,
        });
        db.prepare(
          'UPDATE status_history SET notification_status = ? WHERE id = ?',
        ).run(result.sent ? 'sent' : 'skipped', change.historyId);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'WxPusher 推送失败';
        db.prepare(`UPDATE status_history SET notification_status = 'failed', notification_error = ?
          WHERE id = ?`).run(message, change.historyId);
        console.error(`[WxPusher] ${message}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '检查失败';
    db.prepare(
      'UPDATE monitors SET last_checked_at = ?, last_error = ? WHERE id = ?',
    ).run(now, message, id);
    throw error;
  }
  return getMonitor(id);
}

export async function checkAllMonitors() {
  const rows = getDb()
    .prepare('SELECT id FROM monitors ORDER BY id')
    .all() as Array<{ id: number }>;
  return Promise.allSettled(rows.map((row) => checkMonitor(row.id)));
}

export async function deleteMonitor(id: number) {
  getDb().prepare('DELETE FROM monitors WHERE id = ?').run(id);
}
