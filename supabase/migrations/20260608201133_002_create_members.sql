CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_year_id UUID NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  grade INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_members" ON members FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_members" ON members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_members" ON members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_members" ON members FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_members_school_year ON members(school_year_id);
