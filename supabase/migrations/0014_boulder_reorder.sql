-- Boulder Challenges – Boulder-Reihenfolge nachträglich ändern
-- Ausführen im Supabase SQL-Editor, NACH den vorherigen Migrationen.
-- Idempotent (create or replace + grants/revokes).
--
-- Legt die security-definer-RPC reorder_boulders(p_session_id, p_boulder_ids) an,
-- die die fortlaufende Nummer (boulders.seq) einer Session in EINER Transaktion
-- neu vergibt. Einzelne Client-Updates würden an unique (session_id, seq)
-- scheitern (die Unique-Prüfung erfolgt pro Zeile, nicht pro Statement) – darum
-- das Zwei-Phasen-Muster: erst alle seq in einen kollisionsfreien Bereich
-- schieben, dann die Zielreihenfolge 1..n schreiben.
--
-- Umsortieren darf NUR der Host (bewusst strenger als das "jeder Teilnehmer darf
-- Boulder bearbeiten" aus 0009 – im UI hängt der Einstieg am Host-only-Dialog
-- "Einstellungen bearbeiten"). Da die Funktion security definer ist (umgeht RLS),
-- ist der is_session_host-Check hier die eigentliche Sicherheitsgrenze.

create or replace function public.reorder_boulders(p_session_id uuid, p_boulder_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total   int;
  v_matched int;
begin
  if not public.is_session_host(p_session_id) then
    raise exception 'Nur der Host darf die Reihenfolge ändern.';
  end if;

  -- Gleicher Advisory-Lock wie set_boulder_seq (0001): serialisiert das
  -- Umsortieren mit gleichzeitigen Inserts, die max(seq)+1 berechnen.
  perform pg_advisory_xact_lock(hashtext(p_session_id::text));

  -- Defensive Validierung: p_boulder_ids muss EXAKT die Boulder der Session
  -- enthalten (jede ID genau einmal, keine fremden/fehlenden). Schützt vor
  -- veralteten Client-Listen (z.B. parallel gelöschter/ergänzter Boulder).
  select count(*) into v_total
  from public.boulders
  where session_id = p_session_id;

  select count(distinct b.id) into v_matched
  from unnest(p_boulder_ids) as u(id)
  join public.boulders b on b.id = u.id and b.session_id = p_session_id;

  if v_total <> coalesce(array_length(p_boulder_ids, 1), 0) or v_total <> v_matched then
    raise exception 'Reihenfolge veraltet – bitte die Liste neu laden und erneut versuchen.';
  end if;

  -- Phase 1: alle seq temporär verschieben (kollisionsfrei, da seq klein bleibt).
  update public.boulders
     set seq = seq + 1000000
   where session_id = p_session_id;

  -- Phase 2: Zielreihenfolge 1..n gemäß Array-Position schreiben. Der Rescale-
  -- Trigger (after update of difficulty, 0008) feuert dabei nicht – Punkte
  -- bleiben unberührt.
  update public.boulders b
     set seq = x.ord
    from (
      select u.id, u.ord::int as ord
      from unnest(p_boulder_ids) with ordinality as u(id, ord)
    ) x
   where b.id = x.id
     and b.session_id = p_session_id;
end;
$$;

-- Aufrufbar nur für Angemeldete (anonyme Nutzer haben die Rolle authenticated);
-- den Host-Check erzwingt die Funktion selbst.
revoke execute on function public.reorder_boulders(uuid, uuid[]) from public, anon;
grant  execute on function public.reorder_boulders(uuid, uuid[]) to authenticated;
