CREATE TABLE demerits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE demerits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_demerits" ON demerits FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_demerits" ON demerits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_demerits" ON demerits FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_demerits" ON demerits FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_demerits_member ON demerits(member_id);
CREATE INDEX idx_demerits_school_year ON demerits(school_year_id);
