CREATE TABLE `usage_windows` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `shares` ADD `content_kind` text DEFAULT 'provided' NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `original_author` text DEFAULT '' NOT NULL;