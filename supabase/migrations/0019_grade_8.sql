-- Boulder Challenges – Schwierigkeitsgrad 8
-- Ausführen im Supabase SQL-Editor. Idempotent (create or replace / drop … if exists).
--
-- Hintergrund: Die Codes in boulders.difficulty / gym_boulders.difficulty sind 1–7 = Grad,
-- 8 = "?", 9 = "!". Grad 8 bekommt darum den kollisionsfreien Code 10 mit Faktor 8
-- (Client: src/lib/difficulty.ts). Zwei Stellen auf dem Server kennen die Codes:
--
--  1. Der Rescale-Trigger (zuletzt 0008) fällt bei unbekannten Codes auf "Code = Faktor"
--     zurück – Code 10 würde mit Faktor 10 statt 8 reskaliert. Diese Migration ersetzt die
--     Funktion um das Mapping 10 → 8 und ist ab jetzt ihre maßgebliche Fassung.
--  2. Der CHECK auf gym_boulders.difficulty (0015) erlaubt nur 1–9 und wird auf 1–10 erweitert.
--
-- 0008 und 0015 danach NICHT erneut ausführen: sie setzen Funktion bzw. CHECK auf den
-- alten Stand ohne Grad 8 zurück.

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
      -- Code→Faktor (muss src/lib/difficulty.ts spiegeln): 8 = "?" → 4, 9 = "!" → 6,
      -- 10 = Grad 8 → 8; Grade 1–7 sind ihr eigener Faktor; fehlend/sonstiges → 1.
      old_f := case
        when old.difficulty = 8 then 4
        when old.difficulty = 9 then 6
        when old.difficulty = 10 then 8
        when old.difficulty is not null and old.difficulty > 0 then old.difficulty
        else 1 end;
      new_f := case
        when new.difficulty = 8 then 4
        when new.difficulty = 9 then 6
        when new.difficulty = 10 then 8
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

alter table public.gym_boulders drop constraint if exists gym_boulders_difficulty_check;
alter table public.gym_boulders add  constraint gym_boulders_difficulty_check
  check (difficulty between 1 and 10);
