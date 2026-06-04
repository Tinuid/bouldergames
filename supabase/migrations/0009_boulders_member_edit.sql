-- Boulder Challenges – Boulder dürfen von ALLEN Teilnehmern bearbeitet/gelöscht werden
-- Ausführen im Supabase SQL-Editor. Idempotent (drop policy if exists vor create).
--
-- Bisher (0001_init.sql): boulders_update/boulders_delete erlaubten nur den Ersteller
-- (created_by = auth.uid()) oder den Host. Neue Vorgabe: jeder Sitzungs-Teilnehmer darf
-- Grad/Farbe/Foto eines beliebigen Boulders ändern und Boulder löschen.
-- is_session_member(session_id) ist der bestehende security-definer-Helper aus 0001.

drop policy if exists boulders_update on public.boulders;
create policy boulders_update on public.boulders
  for update to authenticated
  using (public.is_session_member(session_id))
  with check (public.is_session_member(session_id));

drop policy if exists boulders_delete on public.boulders;
create policy boulders_delete on public.boulders
  for delete to authenticated
  using (public.is_session_member(session_id));
