-- ============================================================
-- Stock Agent web app — Supabase setup (run ONCE in SQL editor).
-- Two parts:
--   1. is_adhoc column (for off-universe searches)
--   2. RLS read-only policies (so the anon key can READ but not write)
-- ============================================================

-- ---- 1. is_adhoc column ------------------------------------
-- Off-universe searches get stored with is_adhoc = true, is_active = false.
-- That keeps them searchable/cacheable but OUT of the daily ranking scan
-- (which filters is_active = true).
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_adhoc boolean NOT NULL DEFAULT false;

-- ---- 2. Row Level Security: public READ, no public WRITE ----
-- The app uses the ANON key in the browser. We allow SELECT only.
-- All writes continue to come from n8n using the service_role key,
-- which BYPASSES RLS — so n8n is unaffected by these policies.

-- companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read companies" ON companies;
CREATE POLICY "public read companies"
  ON companies FOR SELECT
  USING (true);

-- analyses
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read analyses" ON analyses;
CREATE POLICY "public read analyses"
  ON analyses FOR SELECT
  USING (true);

-- NOTE: We deliberately create NO insert/update/delete policies for the
-- anon role. With RLS enabled and no write policy, the anon key CANNOT
-- write — but the service_role key (n8n) still can, because service_role
-- bypasses RLS entirely. Verify after running:
--   - App can read dashboard/search  -> yes
--   - n8n daily/quarterly writes      -> still work (service_role)
--   - Anyone with anon key can write  -> no (blocked by RLS)

-- ---- optional sanity checks (read-only) --------------------
-- SELECT count(*) FROM companies;   -- should still work
-- SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE tablename IN ('companies','analyses');
