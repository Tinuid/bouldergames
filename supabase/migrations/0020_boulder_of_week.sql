-- Boulder Challenges – Boulder der Woche
-- Ausführen im Supabase SQL-Editor. Idempotent. VOR dem Deploy der App-Version 1.25.0.
--
-- Hallenweit kann genau ein Karten-Boulder "Boulder der Woche" sein (gym_boulders.featured_at).
-- Markiert wird im normalen Bearbeitungsmodus der Karte (Lageplan-Passwort, RPC unten); wer
-- einen neuen markiert, nimmt dem alten die Markierung. Es gibt keine Laufzeit – er bleibt
-- es, bis ein anderer markiert wird.
--
-- In Challenges wirkt er als SCHNAPPSCHUSS: Wird er übernommen, solange er markiert ist,
-- bekommt der Session-Boulder week_bonus = true und zählt dort dauerhaft doppelt
-- (computePoints in src/lib/scoring.ts). Ein späterer Wechsel auf der Karte ändert
-- bestehende Challenges nicht – gleiche Regel wie bei Grad/Farbe ("Provenienz, kein
-- Spiegel", siehe 0017). Den Wert setzt ausschließlich der Trigger unten, nie der Client.
--
-- Der Rescale-Trigger (0019) bleibt unverändert: er skaliert über old_f/new_f, der
-- Bonus-Faktor 2 kürzt sich dabei heraus.

-- ─── Katalog: Markierung ───────────────────────────────────────────────────

alter table public.gym_boulders add column if not exists featured_at timestamptz;

-- Höchstens ein markierter Boulder pro Halle. Liegt bewusst auf gym_boulders (nicht als
-- Verweis in gyms): nur gym_boulders ist in der Realtime-Publication, so aktualisiert sich
-- die Karte ohne Zusatzarbeit.
create unique index if not exists uq_gym_boulders_featured
  on public.gym_boulders (gym_id) where featured_at is not null;

-- Markieren / Markierung entfernen. Sperrt die Halle, damit zwei gleichzeitige Markierungen
-- sich nicht am Unique-Index verhaken, und räumt die alte Markierung vor dem Setzen ab.
create or replace function public.set_gym_boulder_featured(
  p_key      text,
  p_id       uuid,
  p_featured boolean
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_gym uuid;
begin
  if not public.is_gym_admin_key(p_key) then
    raise exception 'Falsches Passwort' using errcode = '28000';
  end if;

  select gym_id into v_gym from public.gym_boulders where id = p_id;
  if not found then
    raise exception 'Boulder nicht gefunden.' using errcode = 'P0002';
  end if;

  perform 1 from public.gyms where id = v_gym for update;

  if p_featured then
    update public.gym_boulders
       set featured_at = null
     where gym_id = v_gym and featured_at is not null and id <> p_id;
    -- coalesce: erneutes Markieren des schon markierten frischt den Zeitstempel nicht auf.
    update public.gym_boulders
       set featured_at = coalesce(featured_at, now())
     where id = p_id;
  else
    update public.gym_boulders set featured_at = null where id = p_id;
  end if;
end;
$$;

revoke execute on function public.set_gym_boulder_featured(text, uuid, boolean) from public, anon;
grant  execute on function public.set_gym_boulder_featured(text, uuid, boolean) to authenticated;

-- ─── Challenge: Schnappschuss ──────────────────────────────────────────────

alter table public.boulders add column if not exists week_bonus boolean not null default false;

-- Insert: Bonus genau dann, wenn der Boulder aus einem gerade markierten, nicht
-- abgeschraubten Karten-Boulder übernommen wird – was der Client mitschickt, zählt nicht.
-- Update: unveränderlich (Schnappschuss), auch nicht per Direkt-Update vom Client.
create or replace function public.set_boulder_week_bonus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.week_bonus := new.gym_boulder_id is not null and exists (
      select 1 from public.gym_boulders g
       where g.id = new.gym_boulder_id
         and g.featured_at is not null
         and g.removed_at is null
    );
  else
    new.week_bonus := old.week_bonus;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_boulder_week_bonus on public.boulders;
create trigger trg_boulder_week_bonus
  before insert or update on public.boulders
  for each row execute function public.set_boulder_week_bonus();

-- PostgREST kennt neue Funktionen/Spalten erst nach einem Cache-Reload (sonst: PGRST202).
notify pgrst, 'reload schema';
