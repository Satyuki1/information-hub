CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`title` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`original` text DEFAULT '' NOT NULL,
	`translation` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`sharer` text DEFAULT '曾总' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`favorite` integer DEFAULT 0 NOT NULL,
	`shared_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shares_fingerprint_unique` ON `shares` (`fingerprint`);--> statement-breakpoint
CREATE INDEX `shares_date_idx` ON `shares` (`shared_at`);