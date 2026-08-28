CREATE TABLE `Event` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`externalId` text,
	`title` text NOT NULL,
	`startAt` text NOT NULL,
	`endAt` text,
	`allDay` integer NOT NULL,
	`timezone` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Event_externalId_unique` ON `Event` (`externalId`);--> statement-breakpoint
CREATE TABLE `Settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`timezone` text NOT NULL,
	`reminderMinutes` integer NOT NULL,
	`lookaheadDays` integer NOT NULL,
	`showNextEvents` integer NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO Settings (id, timezone, reminderMinutes, lookaheadDays, showNextEvents)
VALUES (1, 'America/Sao_Paulo', 30, 7, 2);
