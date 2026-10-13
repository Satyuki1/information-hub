CREATE TABLE `daily_reports` (
	`day` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`lead` text DEFAULT '' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lock` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`kind` text NOT NULL,
	`target_id` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_at` integer DEFAULT 0 NOT NULL,
	`lease` text DEFAULT '' NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`sent_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `deliveries_state_idx` ON `deliveries` (`state`,`next_at`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`handle` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`avatar` text DEFAULT '' NOT NULL,
	`x_user_id` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`include_replies` integer DEFAULT 0 NOT NULL,
	`include_retweets` integer DEFAULT 0 NOT NULL,
	`focus` text DEFAULT '' NOT NULL,
	`last_tweet_id` text DEFAULT '' NOT NULL,
	`last_checked_at` text DEFAULT '' NOT NULL,
	`next_check_at` integer DEFAULT 0 NOT NULL,
	`last_error` text DEFAULT '' NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_handle_unique` ON `subscriptions` (`handle`);--> statement-breakpoint
CREATE TABLE `user_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`hash` text NOT NULL,
	`sealed` text NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text DEFAULT '' NOT NULL,
	`expires` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_tokens_hash_unique` ON `user_tokens` (`hash`);--> statement-breakpoint
CREATE INDEX `user_tokens_user_idx` ON `user_tokens` (`user_id`,`kind`);--> statement-breakpoint
ALTER TABLE `shares` ADD `sharer_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `source` text DEFAULT 'share' NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `subscription_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `analysis` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `score` integer DEFAULT -1 NOT NULL;--> statement-breakpoint
CREATE INDEX `shares_source_idx` ON `shares` (`source`,`shared_at`);--> statement-breakpoint
ALTER TABLE `users` ADD `owner` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `login_type` text DEFAULT 'password' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `reading_style` text DEFAULT 'x' NOT NULL;--> statement-breakpoint
UPDATE `users` SET `owner`=1 WHERE `id`=(SELECT `id` FROM `users` WHERE `role`='admin' ORDER BY `created_at` LIMIT 1);