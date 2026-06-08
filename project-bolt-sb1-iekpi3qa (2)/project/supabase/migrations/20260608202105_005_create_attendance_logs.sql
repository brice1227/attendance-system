CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_attendance_logs" ON attendance_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_attendance_logs" ON attendance_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_attendance_logs" ON attendance_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_attendance_logs" ON attendance_logs FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_attendance_member ON attendance_logs(member_id);
CREATE INDEX idx_attendance_event ON attendance_logs(event_id);
CREATE INDEX idx_attendance_school_year ON attendance_logs(school_year_id);
