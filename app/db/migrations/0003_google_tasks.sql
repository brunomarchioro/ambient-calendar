CREATE TABLE `GoogleTaskList` (
  `id` text PRIMARY KEY NOT NULL,
  `googleAccountId` text NOT NULL,
  `taskListId` text NOT NULL,
  `title` text NOT NULL,
  `enabled` integer NOT NULL,
  `updatedAt` text NOT NULL
);
CREATE UNIQUE INDEX `GoogleTaskList_account_list_unique` ON `GoogleTaskList` (`googleAccountId`, `taskListId`);
CREATE TABLE `GoogleTask` (
  `id` text PRIMARY KEY NOT NULL,
  `googleAccountId` text NOT NULL,
  `googleTaskListId` text NOT NULL,
  `externalId` text NOT NULL,
  `title` text NOT NULL,
  `due` text,
  `updatedAt` text NOT NULL
);
CREATE UNIQUE INDEX `GoogleTask_account_list_task_unique` ON `GoogleTask` (`googleAccountId`, `googleTaskListId`, `externalId`);
