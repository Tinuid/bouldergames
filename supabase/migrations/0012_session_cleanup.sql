-- Boulder Challenges – Automatisches Aufräumen verwaister Sessions
-- Ausführen im Supabase SQL-Editor, NACH den vorherigen Migrationen.
-- Idempotent (create or replace + bedingte grants/revokes).
--
-- Legt die security-definer-Funktion cleanup_stale_sessions() an, die verwaiste
-- Sessions samt abhängiger Zeilen (per on-delete-cascade: participants/boulders/
-- results) löscht und die image_path's der gelöschten Boulder zurückgibt, damit
-- der Aufrufer (Edge Function cleanup-stale-sessions) die zugehörigen Fotos aus
-- dem Storage-Bucket 'boulder-images' entfernen kann. Das Sammeln der Pfade und
-- das Löschen laufen in EINER Transaktion → kein Race zwischen beidem.
--
-- Verwaist = EINES dieser Kriterien (ODER):
--   1. inaktiv > 14 Tage (jüngste Aktivität über results/boulders/participants/created_at)
--   2. leer (keine Teilnehmer mehr), mit 1h Grace-Period gegen frisch erstellte Sessions
--   3. älter als 6 Wochen (created_at) – Wände werden ~6-wöchentlich neu geschraubt
--
-- Geplant wird der Aufruf via Supabase Cron / pg_cron + pg_net auf die Edge Function
-- (siehe CLAUDE.md). Die Funktion ist NUR für service_role ausführbar.

create or replace function public.cleanup_stale_sessions()
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids   uuid[];
  v_paths text[];
begin
  -- 1. Verwaiste Session-IDs ermitteln.
  select array_agg(s.id)
    into v_ids
  from public.sessions s
  left join lateral (
    select max(r.updated_at) as last_at
    from public.results r
    where r.session_id = s.id
  ) lr on true
  left join lateral (
    select max(b.created_at) as last_at
    from public.boulders b
    where b.session_id = s.id
  ) lb on true
  left join lateral (
    select max(p.joined_at) as last_at, count(*) as cnt
    from public.participants p
    where p.session_id = s.id
  ) lp on true
  where
    -- 3. älter als 6 Wochen
    s.created_at < now() - interval '6 weeks'
    -- 2. leer (keine Teilnehmer), mit Grace-Period
    or (coalesce(lp.cnt, 0) = 0 and s.created_at < now() - interval '1 hour')
    -- 1. inaktiv > 14 Tage
    or greatest(
         s.created_at,
         coalesce(lr.last_at, s.created_at),
         coalesce(lb.last_at, s.created_at),
         coalesce(lp.last_at, s.created_at)
       ) < now() - interval '14 days';

  if v_ids is null then
    return array[]::text[];
  end if;

  -- 2. Bildpfade der betroffenen Boulder einsammeln, BEVOR die Zeilen gelöscht werden.
  select array_agg(b.image_path)
    into v_paths
  from public.boulders b
  where b.session_id = any(v_ids)
    and b.image_path is not null;

  -- 3. Sessions löschen – Cascade räumt participants/boulders/results mit.
  delete from public.sessions where id = any(v_ids);

  return coalesce(v_paths, array[]::text[]);
end;
$$;

-- Nur der serverseitige Cron-Aufruf (service_role) darf aufräumen.
revoke execute on function public.cleanup_stale_sessions() from public, anon, authenticated;
grant  execute on function public.cleanup_stale_sessions() to service_role;
