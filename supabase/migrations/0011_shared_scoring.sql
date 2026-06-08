-- Boulder Challenges – Ergebnisse für andere Teilnehmer eintragen ("shared scoring")
-- Ausführen im Supabase SQL-Editor. Idempotent (add column if not exists,
-- create or replace function, drop policy if exists vor create).
--
-- Bisher (0001_init.sql): results_insert/results_update erlaubten nur das Schreiben
-- eigener Ergebnisse (owns_participant) oder Host-Korrekturen. Neue, pro Session
-- beim Erstellen wählbare Option sessions.shared_scoring erlaubt jedem Teilnehmer,
-- Ergebnisse für JEDEN Teilnehmer dieser Session einzutragen/zu ändern.
-- Bewusst KEINE Gäste: es gibt nur echte Teilnehmer (participants bleibt unverändert).

-- 1. Session-Flag (Default false → bestehende Sessions verhalten sich unverändert).
alter table public.sessions
  add column if not exists shared_scoring boolean not null default false;

-- 2. Hilfsfunktion: ist Mitglied der Session UND die Session erlaubt shared scoring.
--    security definer (wie is_session_member in 0001), um RLS-Rekursion zu vermeiden.
create or replace function public.can_score_others(sess uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_session_member(sess) and exists (
    select 1 from public.sessions s
    where s.id = sess and s.shared_scoring = true
  );
$$;

-- 3. results-Policies um can_score_others erweitern (Basis: 0001_init.sql).
drop policy if exists results_insert on public.results;
create policy results_insert on public.results
  for insert to authenticated
  with check (
    public.owns_participant(participant_id)
    or public.is_session_host(session_id)
    or public.can_score_others(session_id)
  );

drop policy if exists results_update on public.results;
create policy results_update on public.results
  for update to authenticated
  using (
    public.owns_participant(participant_id)
    or public.is_session_host(session_id)
    or public.can_score_others(session_id)
  )
  with check (
    public.owns_participant(participant_id)
    or public.is_session_host(session_id)
    or public.can_score_others(session_id)
  );
