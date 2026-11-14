-- Boulder Challenges – Grad-Codes = Grad
-- Ausführen im Supabase SQL-Editor – VOR dem Deploy der App-Version 1.29.0.
-- Idempotent: das Umschlüsseln läuft nur einmal (Merker in app_config), Funktion und
-- CHECKs werden per create or replace / drop … if exists gesetzt.
--
-- Bisher: Codes 1–7 = Grad, 8 = "?", 9 = "!", 10 = Grad 8 (kam später; Code 8 war schon
-- belegt). Jetzt: Code = Grad für 1–8, 9 und 10 bleiben frei für künftige Grade,
-- "?" = 11, "!" = 12. Umschlüsselung: 8 → 11, 9 → 12, 10 → 8.
--
-- Punkte ändern sich nicht: der Faktor je Boulder bleibt gleich ("?" zählt 4, "!" 6,
-- Grad 8 zählt 8). Darum wird der Rescale-Trigger während des Umschlüsselns abgeschaltet
-- – er würde sonst alte und neue Codes mit verschiedenen Faktoren lesen und Punkte
-- verschieben.
--
-- Neu: CHECK auch auf boulders.difficulty, damit eine noch laufende alte App-Version
-- keine 9/10 mehr schreiben kann (eine alte "?"-Auswahl = Code 8 lässt sich nicht
-- abfangen – sie wird als Grad 8 gespeichert).
--
-- Diese Fassung der Trigger-Funktion ist ab jetzt die maßgebliche (statt 0019).
-- 0008 und 0019 danach NICHT erneut ausführen – sie setzten Funktion und CHECK auf die
-- alten Codes zurück.

-- ── 1. Rescale-Trigger-Funktion mit neuem Code→Faktor-Mapping ────────────────
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
      -- Code→Faktor (muss src/lib/difficulty.ts spiegeln): 1–10 = Grad = Faktor,
      -- 11 = "?" → 4, 12 = "!" → 6, fehlend/sonstiges → 1.
      old_f := case
        when old.difficulty between 1 and 10 then old.difficulty
        when old.difficulty = 11 then 4
        when old.difficulty = 12 then 6
        else 1 end;
      new_f := case
        when new.difficulty between 1 and 10 then new.difficulty
        when new.difficulty = 11 then 4
        when new.difficulty = 12 then 6
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

-- ── 2. Einmalig umschlüsseln ─────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from public.app_config where key = 'difficulty_codes_v2') then
    return;
  end if;

  alter table public.boulders disable trigger trg_boulder_rescale;
  alter table public.gym_boulders drop constraint if exists gym_boulders_difficulty_check;
  alter table public.boulders drop constraint if exists boulders_difficulty_check;

  update public.boulders
     set difficulty = case difficulty when 8 then 11 when 9 then 12 when 10 then 8 end
   where difficulty in (8, 9, 10);

  update public.gym_boulders
     set difficulty = case difficulty when 8 then 11 when 9 then 12 when 10 then 8 end
   where difficulty in (8, 9, 10);

  alter table public.boulders enable trigger trg_boulder_rescale;

  insert into public.app_config (key, value) values ('difficulty_codes_v2', now()::text);
end;
$$;

-- ── 3. CHECKs auf die neuen Codes ────────────────────────────────────────────
alter table public.gym_boulders drop constraint if exists gym_boulders_difficulty_check;
alter table public.gym_boulders add  constraint gym_boulders_difficulty_check
  check (difficulty in (1, 2, 3, 4, 5, 6, 7, 8, 11, 12));

alter table public.boulders drop constraint if exists boulders_difficulty_check;
alter table public.boulders add  constraint boulders_difficulty_check
  check (difficulty is null or difficulty in (1, 2, 3, 4, 5, 6, 7, 8, 11, 12));
