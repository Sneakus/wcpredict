CREATE TABLE IF NOT EXISTS automation_log (
  id SERIAL PRIMARY KEY,
  script_name TEXT NOT NULL,
  run_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL,
  message TEXT,
  records_processed INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_automation_log_script_run 
  ON automation_log(script_name, run_at DESC);
