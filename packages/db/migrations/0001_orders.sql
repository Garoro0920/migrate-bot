CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`installation_id` text NOT NULL,
	`repo_full_name` text NOT NULL,
	`plan` text NOT NULL,
	`amount_usd_cents` integer NOT NULL,
	`state` text NOT NULL,
	`stripe_session_id` text NOT NULL,
	`stripe_payment_intent_id` text,
	`job_id` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`paid_at` integer,
	`refunded_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`installation_id`) REFERENCES `installations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_stripe_session_id_unique` ON `orders` (`stripe_session_id`);--> statement-breakpoint
ALTER TABLE `refunds` ADD `stripe_refund_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `refunds_stripe_refund_id_unique` ON `refunds` (`stripe_refund_id`);