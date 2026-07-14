-- Boulder Challenges – öffentliche Sessions ("laufende Sessions" auf der Startseite)
-- Ausführen im Supabase SQL-Editor. Idempotent (add column if not exists).
--
-- Pro Session beim Erstellen (und nachträglich in den Einstellungen) wählbares Flag:
-- öffentliche Sessions erscheinen auf der Startseite in der Liste laufender Sessions
-- und sind dort ohne Code beitretbar. Default false → bestehende Sessions bleiben
-- nur über ihren join_code erreichbar.
--
-- Bewusst KEINE RLS-Änderung: sessions_select ist seit 0001 `using (true)` – jeder
-- Angemeldete kann ohnehin alle Sessions lesen. Das Flag ist ein reiner UI-Filter
-- für die Startseiten-Liste (listPublicSessions in src/lib/api.ts).

alter table public.sessions
  add column if not exists is_public boolean not null default false;
