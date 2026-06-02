-- Boulder Challenges – Spielmodus "Schwierigkeit als Multiplikator"
-- Ausführen im Supabase SQL-Editor. Idempotent (gefahrlos erneut ausführbar).
--
-- Fügt sessions.scoring_mode hinzu:
--   'classic'    – feste Punkte (Flash/Top minus Versuchskosten); Grad nur Info (Default).
--   'multiplier' – der Schwierigkeitsgrad multipliziert das klassische Ergebnis
--                  (z.B. Flash auf Grad 4 = (flash_points − attempt_cost) × 4).
--
-- Die Punkte werden weiterhin client-seitig berechnet und in results.points persistiert
-- (siehe src/lib/scoring.ts); diese Spalte steuert nur, welche Formel das Frontend nutzt.

alter table public.sessions
  add column if not exists scoring_mode text not null default 'classic'
  check (scoring_mode in ('classic', 'multiplier'));
