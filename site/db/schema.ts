import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const monitors = sqliteTable(
  'monitors',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: text('project_id').notNull(),
    sourceUrl: text('source_url').notNull(),
    name: text('name').notNull(),
    venue: text('venue'),
    showTime: text('show_time'),
    buttonText: text('button_text').notNull(),
    saleStatus: integer('sale_status'),
    ticketStatus: integer('ticket_status'),
    available: integer('available', { mode: 'boolean' })
      .notNull()
      .default(false),
    lastCheckedAt: text('last_checked_at').notNull(),
    createdAt: text('created_at').notNull(),
    lastError: text('last_error'),
  },
  (table) => [
    uniqueIndex('idx_monitors_project_id').on(table.projectId),
    index('idx_monitors_last_checked_at').on(table.lastCheckedAt),
  ],
);

export const statusHistory = sqliteTable(
  'status_history',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    monitorId: integer('monitor_id')
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    buttonText: text('button_text').notNull(),
    available: integer('available', { mode: 'boolean' }).notNull(),
    saleStatus: integer('sale_status'),
    ticketStatus: integer('ticket_status'),
    checkedAt: text('checked_at').notNull(),
    notificationStatus: text('notification_status')
      .notNull()
      .default('skipped'),
    notificationError: text('notification_error'),
  },
  (table) => [
    index('idx_status_history_monitor_checked').on(
      table.monitorId,
      table.checkedAt,
    ),
  ],
);
