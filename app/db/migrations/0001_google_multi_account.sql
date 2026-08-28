DELETE FROM `Event` WHERE `source` = 'google';
--> statement-breakpoint
DROP INDEX IF EXISTS `Event_externalId_unique`;
--> statement-breakpoint
ALTER TABLE `Event` ADD `googleAccountId` text;
--> statement-breakpoint
ALTER TABLE `Event` ADD `googleCalendarId` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `Event_google_mirror_unique` ON `Event` (`googleAccountId`,`googleCalendarId`,`externalId`);
--> statement-breakpoint
CREATE INDEX `Event_googleAccountId_idx` ON `Event` (`googleAccountId`);
--> statement-breakpoint
CREATE TABLE `GoogleAccount` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`refreshTokenEnc` text NOT NULL,
	`status` text NOT NULL,
	`connectedAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `GoogleCalendar` (
	`id` text PRIMARY KEY NOT NULL,
	`googleAccountId` text NOT NULL,
	`calendarId` text NOT NULL,
	`summary` text NOT NULL,
	`enabled` integer NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `GoogleCalendar_account_calendar_unique` ON `GoogleCalendar` (`googleAccountId`,`calendarId`);
--> statement-breakpoint
CREATE TABLE `OAuthState` (
	`nonce` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`googleAccountId` text,
	`createdAt` text NOT NULL
);
