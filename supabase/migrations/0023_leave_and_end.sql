-- Boulder Challenges – Verlassen behält Ergebnisse, Spielende, Spielleitung
-- Ausführen im Supabase SQL-Editor, NACH 0022 und VOR dem Deploy der App-Version 1.27.0.
-- Idempotent (add column if not exists, create or replace, drop … if exists).
--
-- 1. participants.left_at: „Verlassen“ löscht die Teilnehmer-Zeile nicht mehr (früher
--    fielen dabei per Cascade alle eigenen Ergebnisse weg), sondern markiert sie. Ein
--    erneuter Beitritt (Upsert über session_id,user_id) setzt left_at wieder auf null.
--    Damit Verlassen weiterhin die Rechte entzieht, zählen is_session_member und
--    owns_participant nur noch AKTIVE Teilnehmer – das hält die bisherige Bedeutung
--    und ist keine Verschärfung. Der Wiederbeitritt bleibt möglich: participants_insert/
--    participants_update hängen nur an user_id = auth.uid().
--
-- 2. sessions.ends_at: Spielende. „Challenge beenden“ setzt now(), „Wieder öffnen“ null.
--    Bewusst ein Zeitpunkt statt eines Flags: ein späteres Zeitlimit (Time Attack) setzt
--    hier eine Zeit in der Zukunft. Offen = ends_at is null or ends_at > now()
--    (is_session_open). sessions.status ('active'/'archived') bleibt ungenutzt.
--
-- 3. sessions.shared_control: „Alle dürfen die Challenge steuern“ (Default an). Steuern =
--    beenden/wieder öffnen (später Runden, Timer). can_control_session = Host ODER
--    (aktives Mitglied UND shared_control).
--
-- 4. Sperre nach Spielende NUR auf results (Trigger, keine Policy – eine Policy verschwände
--    still, wenn jemand 0011 erneut ausführt): Einfügen sowie Änderungen an status/attempts
--    werden abgelehnt (SQLSTATE 'BCEND'); reine Punkte-Updates (Neuberechnung über
--    set_result_points, Rescale-Trigger) gehen durch. Bewusst KEINE Trigger auf boulders:
--    das vermeidet Konflikte mit dem Cascade beim Löschen und dem nächtlichen Cleanup.
--
-- 5. cleanup_stale_sessions (0012) neu: „leer“ zählt nur noch aktive Teilnehmer.

-- ── 1. Spalten ────────────────────────────────────────────────────────────────
alter table public.participants add column if not exists left_at timestamptz;
alter table public.sessions     add column if not exists ends_at timestamptz;
alter table public.sessions     add column if not exists shared_control boolean not null default true;

-- ── 2. Mitgliedschaft nur für aktive Teilnehmer ──────────────────────────────
create or replace function public.is_session_member(sess uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.participants p
    where p.session_id = sess and p.user_id = auth.uid() and p.left_at is null
  );
$$;

create or replace function public.owns_participant(part uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.participants p
    where p.id = part and p.user_id = auth.uid() and p.left_at is null
  );
$$;

-- ── 3. Offen / Steuern ───────────────────────────────────────────────────────
create or replace function public.is_session_open(sess uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.sessions s
    where s.id = sess and s.ends_at is not null and s.ends_at <= now()
  );
$$;

create or replace function public.can_control_session(sess uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_session_host(sess) or (
    public.is_session_member(sess) and exists (
      select 1 from public.sessions s where s.id = sess and s.shared_control
    )
  );
$$;

-- Challenge beenden (p_end = true) bzw. wieder öffnen (false). Serverzeit, nicht Handyzeit.
create or replace function public.set_session_end(p_session_id uuid, p_end boolean)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ends_at timestamptz;
begin
  if not public.can_control_session(p_session_id) then
    raise exception 'Du darfst diese Challenge nicht steuern.' using errcode = '42501';
  end if;
  update public.sessions
     set ends_at = case when p_end then now() else null end
   where id = p_session_id
  returning ends_at into v_ends_at;
  return v_ends_at;
end;
$$;

revoke execute on function public.set_session_end(uuid, boolean) from public, anon;
grant  execute on function public.set_session_end(uuid, boolean) to authenticated;

-- ── 4. Ergebnis-Sperre nach Spielende ────────────────────────────────────────
create or replace function public.enforce_results_session_open()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_session_open(new.session_id) then
    return new;
  end if;
  -- Reine Punkte-Änderungen (Neuberechnung, Rescale bei Grad-Änderung) bleiben erlaubt.
  if tg_op = 'UPDATE'
     and new.status is not distinct from old.status
     and new.attempts is not distinct from old.attempts then
    return new;
  end if;
  raise exception 'Die Challenge ist beendet.' using errcode = 'BCEND';
end;
$$;

drop trigger if exists trg_results_session_open on public.results;
create trigger trg_results_session_open
  before insert or update on public.results
  for each row execute function public.enforce_results_session_open();

-- ── 5. Cleanup: „leer“ = keine AKTIVEN Teilnehmer ────────────────────────────
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
    select max(p.joined_at) as last_at,
           count(*) filter (where p.left_at is null) as cnt
    from public.participants p
    where p.session_id = s.id
  ) lp on true
  where
    -- 3. älter als 6 Wochen
    s.created_at < now() - interval '6 weeks'
    -- 2. leer (keine aktiven Teilnehmer), mit Grace-Period
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

  select array_agg(b.image_path)
    into v_paths
  from public.boulders b
  where b.session_id = any(v_ids)
    and b.image_path is not null;

  delete from public.sessions where id = any(v_ids);

  return coalesce(v_paths, array[]::text[]);
end;
$$;

revoke execute on function public.cleanup_stale_sessions() from public, anon, authenticated;
grant  execute on function public.cleanup_stale_sessions() to service_role;

-- PostgREST kennt neue Funktionen/Spalten erst nach einem Cache-Reload (sonst: PGRST202).
notify pgrst, 'reload schema';
