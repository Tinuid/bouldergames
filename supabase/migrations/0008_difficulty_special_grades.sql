-- Boulder Challenges – Sonderstufen "?" und "!" in der Punkte-Neuberechnung
-- Ausführen im Supabase SQL-Editor. Idempotent (create or replace).
--
-- Hintergrund: boulders.difficulty (int) speichert ab jetzt nicht nur die Grade 1–7,
-- sondern auch zwei Sonderstufen als kollisionsfreie Codes: 8 = "?", 9 = "!". Ihr
-- Wertungs-Faktor im Multiplikator-Modus ist davon entkoppelt: "?" zählt 4, "!" zählt 6
-- (Code→Faktor-Mapping clientseitig in src/lib/difficulty.ts).
--
-- Der Rescale-Trigger aus 0004 reskaliert results.points bei nachträglicher Grad-Änderung
-- über das Verhältnis alter/neuer Faktor. Er multiplizierte bisher mit dem rohen
-- difficulty-Wert – für die Codes 8/9 wäre das falsch (Faktor 8 statt 4 usw.). Diese
-- Migration ersetzt die Trigger-Funktion, sodass sie dasselbe Code→Faktor-Mapping
-- anwendet. Die Faktoren bleiben ganzzahlig, daher bleibt die Ganzzahl-Division verlustfrei.
--
-- Keine Schema-Änderung an der Spalte nötig (Codes 8/9 passen in int).

create or replace function public.rescale_boulder_results()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mode  text;
  old_f int;
  new_f int;
begin
  if new.difficulty is distinct from old.difficulty then
    select scoring_mode into mode from public.sessions where id = new.session_id;
    if mode = 'multiplier' then
      -- Code→Faktor (muss src/lib/difficulty.ts spiegeln): 8 = "?" → 4, 9 = "!" → 6;
      -- Grade 1–7 sind ihr eigener Faktor; fehlend/sonstiges → 1.
      old_f := case
        when old.difficulty = 8 then 4
        when old.difficulty = 9 then 6
        when old.difficulty is not null and old.difficulty > 0 then old.difficulty
        else 1 end;
      new_f := case
        when new.difficulty = 8 then 4
        when new.difficulty = 9 then 6
        when new.difficulty is not null and new.difficulty > 0 then new.difficulty
        else 1 end;
      if old_f <> new_f then
        update public.results
          set points = points / old_f * new_f
          where boulder_id = new.id;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_boulder_rescale on public.boulders;
create trigger trg_boulder_rescale
  after update of difficulty on public.boulders
  for each row execute function public.rescale_boulder_results();
