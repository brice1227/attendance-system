CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_events" ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_events" ON events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_events" ON events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_events" ON events FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_events_school_year ON events(school_year_id);
