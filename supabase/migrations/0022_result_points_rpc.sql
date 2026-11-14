-- Boulder Challenges – Punkte-Neuberechnung als ein atomarer Aufruf
-- Ausführen im Supabase SQL-Editor. Idempotent (create or replace).
--
-- Hintergrund: Ändert der Host die Punkteregeln, rechnete recomputeSessionResults bisher
-- jedes Ergebnis einzeln per Upsert neu – mit status/attempts aus dem React-State des
-- Hosts. Folgen: (1) ein Eintrag, den jemand zeitgleich speicherte, wurde mit dem alten
-- Stand überschrieben; (2) brach das Netz mitten in der Schleife ab, war nur ein Teil
-- umgerechnet; (3) eine spätere Spielende-Sperre (before insert auf results) hätte das
-- Upsert blockiert.
--
-- Jetzt: Der Client rechnet weiter mit computePoints (einzige Punkte-Quelle) und schickt
-- alle neuen Punkte in EINEM Aufruf. Die Funktion schreibt in einer Anweisung NUR
-- `points` – und nur dort, wo status, attempts und der Grad des Boulders noch dem
-- mitgeschickten Stand entsprechen. Alles andere wird nicht angefasst und als
-- „übersprungen/fehlend“ zurückgegeben; der Client lädt dann neu und versucht es einmal.
--
-- Erwartetes Format von p_points (jsonb-Array):
--   [{"id": "<result uuid>", "points": 25, "status": "top", "attempts": 2, "difficulty": 4}, …]
--   (difficulty = Code des Boulders zum Zeitpunkt der Berechnung, null = ohne Grad)
--
-- Rückgabe: IDs der Ergebnisse dieser Session, deren Punkte NICHT gesetzt wurden – weil
-- sich ihr Stand inzwischen geändert hat oder weil sie im Aufruf fehlten (neu entstanden).

create or replace function public.set_result_points(p_session_id uuid, p_points jsonb)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_not_updated uuid[];
begin
  if not public.is_session_host(p_session_id) then
    raise exception 'Nur der Host darf die Punkte neu berechnen.' using errcode = '42501';
  end if;

  with input as (
    select (e->>'id')::uuid         as id,
           (e->>'points')::int      as points,
           e->>'status'             as status,
           (e->>'attempts')::int    as attempts,
           (e->>'difficulty')::int  as difficulty
    from jsonb_array_elements(coalesce(p_points, '[]'::jsonb)) as e
  ),
  matched as (
    -- security definer umgeht RLS: die Session-Bindung ist darum Pflicht.
    select i.id, i.points
    from input i
    join public.results  r on r.id = i.id and r.session_id = p_session_id
    join public.boulders b on b.id = r.boulder_id
    where r.status = i.status
      and r.attempts = i.attempts
      and b.difficulty is not distinct from i.difficulty
  ),
  upd as (
    -- Nur echte Änderungen schreiben: sonst setzt trg_results_touch updated_at neu und
    -- jede Zeile löst ein Realtime-Ereignis aus (und zählt als „Aktivität“ fürs Cleanup).
    update public.results r
       set points = m.points
      from matched m
     where r.id = m.id
       and r.points is distinct from m.points
    returning r.id
  )
  select coalesce(array_agg(r.id), '{}')
    into v_not_updated
    from public.results r
   where r.session_id = p_session_id
     and r.id not in (select id from matched);

  return v_not_updated;
end;
$$;

revoke execute on function public.set_result_points(uuid, jsonb) from public, anon;
grant  execute on function public.set_result_points(uuid, jsonb) to authenticated;

-- PostgREST kennt neue Funktionen erst nach einem Cache-Reload (sonst: PGRST202).
notify pgrst, 'reload schema';
