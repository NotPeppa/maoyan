CREATE TABLE `monitors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`source_url` text NOT NULL,
	`name` text NOT NULL,
	`venue` text,
	`show_time` text,
	`button_text` text NOT NULL,
	`sale_status` integer,
	`ticket_status` integer,
	`available` integer DEFAULT false NOT NULL,
	`last_checked_at` text NOT NULL,
	`created_at` text NOT NULL,
	`last_error` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_monitors_project_id` ON `monitors` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_monitors_last_checked_at` ON `monitors` (`last_checked_at`);--> statement-breakpoint
CREATE TABLE `status_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`monitor_id` integer NOT NULL,
	`button_text` text NOT NULL,
	`available` integer NOT NULL,
	`checked_at` text NOT NULL,
	FOREIGN KEY (`monitor_id`) REFERENCES `monitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_status_history_monitor_checked` ON `status_history` (`monitor_id`,`checked_at`);