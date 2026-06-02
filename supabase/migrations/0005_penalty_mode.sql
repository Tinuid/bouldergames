-- Boulder Challenges – wählbarer Strafmodus pro Session
-- Ausführen im Supabase SQL-Editor. Idempotent (add column if not exists).
--
-- Legt fest, wie Versuchskosten/Minuspunkte wirken (beim Erstellen wählbar):
--   'top_floor' – erfolgreicher Zug gratis; Flash/Top fallen nie unter 0 (Fail bleibt negativ).
--   'strict'    – jeder Versuch kostet (auch der erfolgreiche); ein Top kann negativ werden.
--   'misses'    – erfolgreicher Zug gratis; nur Fehlversuche kosten (Top kann bei vielen negativ werden).
--
-- DB-Default 'strict' bewahrt das Verhalten bereits bestehender Sessions; neue Sessions
-- setzen ihren Wert explizit aus dem Erstellen-Dialog (dortiger Default: 'top_floor').

alter table public.sessions
  add column if not exists penalty_mode text not null default 'strict'
  check (penalty_mode in ('top_floor', 'strict', 'misses'));
