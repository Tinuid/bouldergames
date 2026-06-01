-- Boulder Challenges – Initiales Schema
-- Ausführen im Supabase SQL-Editor (oder via Supabase CLI).
-- Voraussetzung: Anonymous Sign-in in Authentication > Providers aktiviert.

-- ────────────────────────────────────────────────────────────────────────────
-- Tabellen
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  join_code    text not null unique,
  name         text not null default 'Boulder-Challenge',
  host_id      uuid not null references auth.users (id),
  flash_points int  not null default 30,
  top_points   int  not null default 25,
  attempt_cost int  not null default 5,
  status       text not null default 'active' check (status in ('active', 'archived')),
  created_at   timestamptz not null default now()
);

create table if not exists public.participants (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions (id) on delete cascade,
  user_id      uuid not null references auth.users (id),
  display_name text not null default 'Anonym',
  color        text,
  joined_at    timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists public.boulders (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions (id) on delete cascade,
  seq         int  not null,
  difficulty  int,
  color       text,
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now(),
  unique (session_id, seq)
);

create table if not exists public.results (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.sessions (id) on delete cascade,
  boulder_id     uuid not null references public.boulders (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  status         text not null default 'open' check (status in ('open', 'flash', 'top', 'fail')),
  attempts       int  not null default 0,
  points         int  not null default 0,
  updated_at     timestamptz not null default now(),
  unique (boulder_id, participant_id)
);

create index if not exists idx_participants_session on public.participants (session_id);
create index if not exists idx_boulders_session on public.boulders (session_id);
create index if not exists idx_results_session on public.results (session_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Fortlaufende Boulder-Nummer pro Session (race-sicher via Advisory-Lock)
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.set_boulder_seq()
returns trigger
language plpgsql
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.session_id::text));
  select coalesce(max(seq), 0) + 1 into new.seq
  from public.boulders
  where session_id = new.session_id;
  return new;
end;
$$;

drop trigger if exists trg_boulder_seq on public.boulders;
create trigger trg_boulder_seq
  before insert on public.boulders
  for each row execute function public.set_boulder_seq();

-- updated_at bei Result-Änderungen pflegen
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_results_touch on public.results;
create trigger trg_results_touch
  before update on public.results
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Hilfsfunktionen (security definer, um RLS-Rekursion zu vermeiden)
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.is_session_host(sess uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.sessions s
    where s.id = sess and s.host_id = auth.uid()
  );
$$;

create or replace function public.is_session_member(sess uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.participants p
    where p.session_id = sess and p.user_id = auth.uid()
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
    where p.id = part and p.user_id = auth.uid()
  );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ────────────────────────────────────────────────────────────────────────────

alter table public.sessions     enable row level security;
alter table public.participants enable row level security;
alter table public.boulders     enable row level security;
alter table public.results      enable row level security;

-- sessions: lesen für alle Angemeldeten (Zugang faktisch über Kenntnis des Codes);
-- erstellen nur als eigener Host; ändern nur durch den Host.
create policy sessions_select on public.sessions
  for select to authenticated using (true);
create policy sessions_insert on public.sessions
  for insert to authenticated with check (host_id = auth.uid());
create policy sessions_update on public.sessions
  for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());

-- participants: lesen für alle; sich selbst eintragen; eigene Zeile (oder Host) ändern/löschen.
create policy participants_select on public.participants
  for select to authenticated using (true);
create policy participants_insert on public.participants
  for insert to authenticated with check (user_id = auth.uid());
create policy participants_update on public.participants
  for update to authenticated
  using (user_id = auth.uid() or public.is_session_host(session_id))
  with check (user_id = auth.uid() or public.is_session_host(session_id));
create policy participants_delete on public.participants
  for delete to authenticated
  using (user_id = auth.uid() or public.is_session_host(session_id));

-- boulders: lesen für alle; hinzufügen durch Mitglieder; ändern/löschen durch Ersteller oder Host.
create policy boulders_select on public.boulders
  for select to authenticated using (true);
create policy boulders_insert on public.boulders
  for insert to authenticated
  with check (created_by = auth.uid() and public.is_session_member(session_id));
create policy boulders_update on public.boulders
  for update to authenticated
  using (created_by = auth.uid() or public.is_session_host(session_id))
  with check (created_by = auth.uid() or public.is_session_host(session_id));
create policy boulders_delete on public.boulders
  for delete to authenticated
  using (created_by = auth.uid() or public.is_session_host(session_id));

-- results: lesen für alle; eigene Ergebnisse schreiben (oder Host korrigiert).
create policy results_select on public.results
  for select to authenticated using (true);
create policy results_insert on public.results
  for insert to authenticated
  with check (public.owns_participant(participant_id) or public.is_session_host(session_id));
create policy results_update on public.results
  for update to authenticated
  using (public.owns_participant(participant_id) or public.is_session_host(session_id))
  with check (public.owns_participant(participant_id) or public.is_session_host(session_id));

-- ────────────────────────────────────────────────────────────────────────────
-- Realtime aktivieren (Supabase publiziert Änderungen dieser Tabellen)
-- ────────────────────────────────────────────────────────────────────────────

alter table public.participants replica identity full;
alter table public.boulders     replica identity full;
alter table public.results      replica identity full;
alter table public.sessions     replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.participants;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.boulders;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.results;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.sessions;
exception when duplicate_object then null;
end $$;
