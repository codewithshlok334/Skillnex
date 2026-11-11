-- Existing written notes stay private. Sharing is an explicit per-note choice.
ALTER TABLE peer_notes ADD COLUMN shared BOOLEAN NOT NULL DEFAULT FALSE;
