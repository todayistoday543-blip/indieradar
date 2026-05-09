-- Agent operations logging table
CREATE TABLE IF NOT EXISTS agent_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'running',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER,
  items_processed INTEGER DEFAULT 0,
  items_failed    INTEGER DEFAULT 0,
  output          JSONB,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_name ON agent_logs(agent_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_status ON agent_logs(status, started_at DESC);

-- Add last_notified_at to alerts for notification tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alerts' AND column_name = 'last_notified_at'
  ) THEN
    ALTER TABLE alerts ADD COLUMN last_notified_at TIMESTAMPTZ;
  END IF;
END $$;
