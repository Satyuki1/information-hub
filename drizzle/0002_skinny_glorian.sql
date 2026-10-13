ALTER TABLE `shares` ADD `notify_status` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `notify_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `notify_next_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `notify_error` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `notify_lease` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `notified_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `shares_notify_idx` ON `shares` (`notify_status`,`notify_next_at`);