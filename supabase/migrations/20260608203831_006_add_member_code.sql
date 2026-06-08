ALTER TABLE members ADD COLUMN member_code TEXT;

CREATE OR REPLACE FUNCTION generate_member_code()
RETURNS TRIGGER AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT;
  attempts INT := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * 36 + 1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM members WHERE member_code = code);
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique member code';
    END IF;
  END LOOP;
  NEW.member_code := code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_member_code
  BEFORE INSERT ON members
  FOR EACH ROW
  WHEN (NEW.member_code IS NULL)
  EXECUTE FUNCTION generate_member_code();

UPDATE members SET member_code = (
  SELECT code FROM (
    SELECT UPPER(substring(md5(id::text || random()::text) FROM 1 FOR 6)) AS code
  ) sub
) WHERE member_code IS NULL;

ALTER TABLE members ALTER COLUMN member_code SET NOT NULL;
CREATE UNIQUE INDEX idx_members_member_code ON members(member_code);
