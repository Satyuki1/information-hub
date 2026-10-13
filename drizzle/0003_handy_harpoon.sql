ALTER TABLE `shares` ADD `category` text DEFAULT '新资讯' NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `category_source` text DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `cover_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `collected_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `processing_started_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `shares` ADD `translated_at` text DEFAULT '' NOT NULL;