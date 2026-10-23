CREATE SCHEMA IF NOT EXISTS personal_admin;
REVOKE ALL ON SCHEMA personal_admin FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS personal_admin.events (
 id uuid PRIMARY KEY, site text NOT NULL, path text NOT NULL, kind text NOT NULL CHECK(kind IN ('pageview','resume_pdf','resume_image','resume_open')),
 visit_key text NOT NULL, visitor text NOT NULL, device text NOT NULL, browser text NOT NULL, os text NOT NULL, referrer text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_site_time ON personal_admin.events(site, created_at);
CREATE INDEX IF NOT EXISTS events_time ON personal_admin.events(created_at);
CREATE TABLE IF NOT EXISTS personal_admin.limits (key text PRIMARY KEY, bucket bigint NOT NULL, hits integer NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS personal_admin.operations (id bigserial PRIMARY KEY, kind text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE personal_admin.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_admin.limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_admin.operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA personal_admin FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA personal_admin FROM PUBLIC, anon, authenticated;
CREATE UNIQUE INDEX IF NOT EXISTS events_unique_page_visit ON personal_admin.events(site,path,visit_key) WHERE kind='pageview';
