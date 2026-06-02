-- Boulder Challenges – Punkte-Neuberechnung bei nachträglicher Grad-Änderung
-- Ausführen im Supabase SQL-Editor. Idempotent (create or replace / drop ... if exists).
--
-- Hintergrund: Boulder dürfen nachträglich bearbeitet werden (Grad/Farbe/Foto, siehe
-- boulders_update-Policy in 0001). Im Multiplikator-Modus hängt results.points am Grad
-- (points = klassisches Ergebnis × Grad). Ändert ein Boulder-Ersteller (≠ Host) den Grad,
-- dürfte er fremde results per RLS NICHT neu berechnen (results_update erlaubt nur eigene
-- Ergebnisse oder Host). Darum reskaliert dieser security-definer-Trigger die Punkte
-- serverseitig – und damit für ALLE Teilnehmer konsistent.
--
-- Reskalierung per Verhältnis: points = points / altGrad * neuGrad. Da points exakt das
-- Produkt aus klassischem Ergebnis (Ganzzahl) und altGrad ist, ist die Ganzzahl-Division
-- verlustfrei. Nur im 'multiplier'-Modus relevant; im 'classic'-Modus ist der Grad reine Info.

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
      old_f := case when old.difficulty is not null and old.difficulty > 0 then old.difficulty else 1 end;
      new_f := case when new.difficulty is not null and new.difficulty > 0 then new.difficulty else 1 end;
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
