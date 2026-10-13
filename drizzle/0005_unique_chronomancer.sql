CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_flows` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_hash` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`expires` integer NOT NULL,
	`next_poll` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `feishu_connections` (
	`user_id` text PRIMARY KEY NOT NULL,
	`open_id` text NOT NULL,
	`name` text NOT NULL,
	`tokens` text NOT NULL,
	`expires` integer NOT NULL,
	`refresh_lock` integer DEFAULT 0 NOT NULL,
	`space_id` text DEFAULT '' NOT NULL,
	`space_name` text DEFAULT '' NOT NULL,
	`connected_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`version` integer NOT NULL,
	`expires` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`share_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`must_change` integer DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `wiki_days` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`space_id` text NOT NULL,
	`day` text NOT NULL,
	`document_id` text DEFAULT '' NOT NULL,
	`node_token` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`lock` integer DEFAULT 0 NOT NULL,
	`error` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wiki_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`share_id` text NOT NULL,
	`day_id` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`finished_at` text DEFAULT '' NOT NULL
);
