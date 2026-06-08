CREATE TABLE school_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_school_years" ON school_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_school_years" ON school_years FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_school_years" ON school_years FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_school_years" ON school_years FOR DELETE TO authenticated USING (true);
