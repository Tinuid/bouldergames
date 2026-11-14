-- Boulder Challenges – Spielmodus pro Session
-- Ausführen im Supabase SQL-Editor. Idempotent (add column if not exists).
--
-- Der Spielmodus ist unabhängig von der Wertung (scoring_mode: klassisch/Multiplikator):
--   'standard'   – Flash, Top und Fehlversuche wie bisher.
--   'flash_only' – „Nur Flash“: nur ein Flash bringt Punkte; Top, nicht geschafft und
--                  offen zählen 0 (keine Minuspunkte, Strafmodus/Kosten wirken nicht).
--
-- Bestehende Sessions bekommen 'standard' und verhalten sich unverändert. Der Rescale-
-- Trigger (0019) braucht keine Anpassung: 0 × Faktor bleibt 0, ein Flash skaliert normal.
-- Weitere Modi erweitern den CHECK per neuer Migration (drop constraint + add).

alter table public.sessions
  add column if not exists game_mode text not null default 'standard';

alter table public.sessions drop constraint if exists sessions_game_mode_check;
alter table public.sessions
  add constraint sessions_game_mode_check check (game_mode in ('standard', 'flash_only'));
