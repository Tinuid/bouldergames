-- Boulder Challenges – Herkunfts-Referenz von Session-Bouldern auf den Hallen-Katalog
-- Ausführen im Supabase SQL-Editor, NACH 0015/0016. Idempotent.
--
-- Boulder von der Hallenkarte können in eine Challenge übernommen werden. Dabei
-- werden Grad und Farbe KOPIERT (der Link ist Provenienz, kein Spiegel – siehe
-- unten), nur das Foto wird über die Referenz aufgelöst.
--
-- Warum das Foto NICHT kopiert wird: cleanup_stale_sessions() (0012) sammelt beim
-- nächtlichen Aufräumen die boulders.image_path der gelöschten Sessions ein und die
-- Edge Function entfernt genau diese Objekte aus dem Bucket. Stünde dort derselbe
-- Pfad wie am Karten-Boulder, würde das Aufräumen dessen Foto mitlöschen. Da
-- boulders.image_path bei übernommenen Bouldern null bleibt, sieht das Aufräumen den
-- Katalog-Pfad nie – es braucht dafür also KEINE Sonderbehandlung in 0012.

-- on delete set null: ein endgültig gelöschter Katalog-Boulder darf eine laufende
-- Challenge nie beschädigen. Beim Abschrauben (gym_boulders.removed_at) bleibt die
-- Zeile ohnehin bestehen, das Foto also auch.
alter table public.boulders
  add column if not exists gym_boulder_id uuid
  references public.gym_boulders (id) on delete set null;

create index if not exists idx_boulders_gym_boulder on public.boulders (gym_boulder_id);

-- Denselben Karten-Boulder nicht zweimal in dieselbe Challenge ziehen. PARTIELL,
-- weil ein normales unique beliebig viele NULLs zuließe – frei angelegte Boulder
-- (gym_boulder_id is null) dürfen davon nicht eingeschränkt werden.
create unique index if not exists uq_boulders_session_gym_boulder
  on public.boulders (session_id, gym_boulder_id) where gym_boulder_id is not null;

-- Für die Liste "meine Challenges" wird erstmals nur nach user_id gefiltert. Der
-- vorhandene idx_participants_session hilft dabei nicht, und das
-- unique (session_id, user_id) aus 0001 ebenso wenig (falsche Spaltenreihenfolge).
create index if not exists idx_participants_user on public.participants (user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Bewusst KEINE neue RPC und keine RLS-Änderung.
--
-- Das Übernehmen läuft als ganz normaler Insert vom Client und damit innerhalb der
-- bestehenden Policy boulders_insert (created_by = auth.uid() AND is_session_member).
-- Eine security-definer-RPC würde die RLS umgehen und müsste die Mitgliedschaft
-- selbst nachbauen – unnötiges Risiko.
--
-- Ein Mehrfach-Insert ist hier sicher: der before-insert-Trigger set_boulder_seq()
-- (0001) sieht die zuvor eingefügten Zeilen DERSELBEN Anweisung und vergibt korrekt
-- fortlaufende Nummern. Nachgemessen: 10 Zeilen in einem Insert ⇒ seq 1..10.
-- ────────────────────────────────────────────────────────────────────────────

notify pgrst, 'reload schema';
