-- Drop all existing policies and recreate them for both anon and authenticated roles
-- school_years
DROP POLICY IF EXISTS "select_school_years" ON school_years;
DROP POLICY IF EXISTS "insert_school_years" ON school_years;
DROP POLICY IF EXISTS "update_school_years" ON school_years;
DROP POLICY IF EXISTS "delete_school_years" ON school_years;

CREATE POLICY "select_school_years" ON school_years FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_school_years" ON school_years FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_school_years" ON school_years FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_school_years" ON school_years FOR DELETE TO anon, authenticated USING (true);

-- members
DROP POLICY IF EXISTS "select_members" ON members;
DROP POLICY IF EXISTS "insert_members" ON members;
DROP POLICY IF EXISTS "update_members" ON members;
DROP POLICY IF EXISTS "delete_members" ON members;

CREATE POLICY "select_members" ON members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_members" ON members FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_members" ON members FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_members" ON members FOR DELETE TO anon, authenticated USING (true);

-- events
DROP POLICY IF EXISTS "select_events" ON events;
DROP POLICY IF EXISTS "insert_events" ON events;
DROP POLICY IF EXISTS "update_events" ON events;
DROP POLICY IF EXISTS "delete_events" ON events;

CREATE POLICY "select_events" ON events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_events" ON events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_events" ON events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_events" ON events FOR DELETE TO anon, authenticated USING (true);

-- demerits
DROP POLICY IF EXISTS "select_demerits" ON demerits;
DROP POLICY IF EXISTS "insert_demerits" ON demerits;
DROP POLICY IF EXISTS "update_demerits" ON demerits;
DROP POLICY IF EXISTS "delete_demerits" ON demerits;

CREATE POLICY "select_demerits" ON demerits FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_demerits" ON demerits FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_demerits" ON demerits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_demerits" ON demerits FOR DELETE TO anon, authenticated USING (true);

-- attendance_logs
DROP POLICY IF EXISTS "select_attendance_logs" ON attendance_logs;
DROP POLICY IF EXISTS "insert_attendance_logs" ON attendance_logs;
DROP POLICY IF EXISTS "update_attendance_logs" ON attendance_logs;
DROP POLICY IF EXISTS "delete_attendance_logs" ON attendance_logs;

CREATE POLICY "select_attendance_logs" ON attendance_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_attendance_logs" ON attendance_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_attendance_logs" ON attendance_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_attendance_logs" ON attendance_logs FOR DELETE TO anon, authenticated USING (true);
