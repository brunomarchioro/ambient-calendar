CREATE TABLE Event (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('google', 'manual')),
  externalId TEXT UNIQUE,
  title TEXT NOT NULL,
  startAt TEXT NOT NULL,
  endAt TEXT,
  allDay INTEGER NOT NULL CHECK (allDay IN (0, 1)),
  timezone TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE Settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  timezone TEXT NOT NULL,
  reminderMinutes INTEGER NOT NULL CHECK (reminderMinutes BETWEEN 1 AND 180),
  lookaheadDays INTEGER NOT NULL CHECK (lookaheadDays BETWEEN 1 AND 30),
  showNextEvents INTEGER NOT NULL CHECK (showNextEvents BETWEEN 1 AND 5)
);

INSERT OR IGNORE INTO Settings (id, timezone, reminderMinutes, lookaheadDays, showNextEvents)
VALUES (1, 'America/Sao_Paulo', 30, 7, 2);
