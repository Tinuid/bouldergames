# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Was das ist

Boulder Challenges – eine installierbare PWA, um beim Bouldern in der Gruppe Challenges
in Echtzeit zu tracken (Flash/Top/nicht geschafft) mit einstellbarem Punktesystem und
Live-Leaderboard. React + Vite + TypeScript Frontend, Supabase (Postgres + Realtime +
Anonymous Auth) als Backend. UI-Texte und Kommentare sind auf Deutsch.

## Befehle

```bash
npm run dev          # Vite Dev-Server (http://localhost:5173)
npm run build        # tsc --noEmit && vite build  (Typecheck + Production-Build inkl. PWA-SW)
npm run preview      # Production-Build lokal testen (Service Worker aktiv)
npm run test         # Vitest einmalig (Scoring-Unit-Tests)
npm run test:watch   # Vitest im Watch-Modus

# Einzelnen Test / Filter:
npx vitest run src/lib/scoring.test.ts
npx vitest run -t "Flash"
```

Build nutzt bewusst `tsc --noEmit && vite build` (keine TS-Projekt-Referenzen – die lösten
TS6310 aus, weil `tsc -b` referenzierte Projekte mit `noEmit` ablehnt). Vite kompiliert
`vite.config.ts` selbst via esbuild; diese Datei wird nicht durch `tsc` typgeprüft.

## Voraussetzungen zum Laufen (häufige Stolperfalle)

Die App braucht eine `.env` (Vorlage: `.env.example`) mit `VITE_SUPABASE_URL` und
`VITE_SUPABASE_ANON_KEY`. Vite liest `.env` **nur beim Serverstart** – nach Änderungen den
Dev-Server neu starten. Backend-seitig müssen zwei Dinge im Supabase-Dashboard erledigt sein:
1. **Anonymous Sign-ins aktivieren** (Authentication → Providers). Sonst: HTTP 422
   `anonymous_provider_disabled`, und die App bleibt am Auth-Bootstrap hängen.
2. `supabase/migrations/0001_init.sql` einmalig im SQL-Editor ausführen.

`src/lib/supabase.ts` wirft bewusst **nicht** beim Import, wenn die Env fehlt (Client wird mit
Platzhaltern erzeugt), damit die App startet und eine Konfigurations-Meldung zeigt.
`ensureAnonymousSession()` wirft dann den eigentlichen Fehler, den `AuthProvider` abfängt.

## Architektur (Big Picture)

**Identität ohne Login.** Es gibt keine Accounts. Jedes Gerät meldet sich beim App-Start per
Supabase **Anonymous Sign-in** an (`AuthProvider` in `src/hooks/useAuth.tsx` → `ensureAnonymousSession`).
Die resultierende `auth.uid()` ist die stabile Identität, an der alles hängt: `sessions.host_id`,
`participants.user_id`, `boulders.created_by`. Beitritt zu einer Session läuft rein über den
kurzen `join_code` (kein Token).

**RLS ist die echte Sicherheitsgrenze, nicht das UI.** Die Rechte ("jeder fügt Boulder hinzu,
trägt aber nur eigene Ergebnisse ein; Host darf alles korrigieren") werden in
`supabase/migrations/0001_init.sql` per Row-Level-Security erzwungen. Die Policies nutzen drei
`security definer`-Hilfsfunktionen (`is_session_host`, `is_session_member`, `owns_participant`),
um RLS-Rekursion zu vermeiden – beim Ändern von Policies, die auf `participants`/`sessions`
zugreifen, diese Funktionen verwenden statt Sub-Selects mit RLS. Anonyme Nutzer haben die
Postgres-Rolle `authenticated` (mit `is_anonymous=true`), darum sind alle Policies `to authenticated`.

**Punktelogik an einer Stelle.** `src/lib/scoring.ts` `computePoints(status, attempts, config)`
ist die einzige Quelle der Wahrheit für das Modell "strikt bezahlen" (jeder Versuch kostet, auch
der erfolgreiche; Flash = Top im 1. Versuch). Punkte werden client-seitig berechnet **und** in
`results.points` persistiert, damit das Leaderboard billig aggregieren kann. Das Leaderboard
(`src/components/Leaderboard.tsx`) summiert `points` rein client-seitig aus den `results`.
`normalizeResult` erzwingt Konsistenz (z.B. Flash ⇒ genau 1 Versuch).

**Datenzugriff zentralisiert.** Alle Supabase-Queries liegen in `src/lib/api.ts` – Routen und
Komponenten rufen diese Funktionen auf, statt selbst `supabase.from(...)` zu nutzen. Wichtige
Konventionen: Upserts nutzen `onConflict` (`participants` → `session_id,user_id`; `results` →
`boulder_id,participant_id`). Die fortlaufende `boulders.seq` wird **per DB-Trigger** (Advisory-Lock,
race-sicher) vergeben – beim Insert **kein** `seq` mitsenden.

**Realtime per Re-Fetch.** `src/hooks/useRealtimeSession.ts` lädt eine komplette Session
(Stammdaten + Teilnehmer + Boulder + Ergebnisse) und abonniert `postgres_changes` für
`participants`/`boulders`/`results`/`sessions`. Bei jeder Änderung wird die betroffene Tabelle
komplett neu geladen (bewusst einfach gehalten; ausreichend für Gruppengrößen). Mutationen rufen
zusätzlich `refresh()` für sofortiges Feedback. Realtime ist in der Migration über
`alter publication supabase_realtime` + `replica identity full` aktiviert.

**Verlauf gerätelokal.** Ohne Accounts merkt sich `src/lib/localHistory.ts` besuchte Sessions in
`localStorage` (für die "Zuletzt gespielt"-Liste auf `Home`).

**Routing/Screens.** `src/App.tsx` rendert erst nach erfolgreichem Auth-Bootstrap. Routen:
`/` (Home), `/create`, `/join` + `/join/:code`, `/s/:sessionId` (`SessionView` – Hauptscreen;
wird die Session über einen geteilten Link ohne vorherigen Beitritt geöffnet, zeigt er inline ein
Namens-/Beitritts-Formular).

## Schema-Änderungen

`supabase/migrations/0001_init.sql` ist die Schema-Quelle der Wahrheit und wird **manuell** im
Supabase-SQL-Editor angewendet (kein lokales Supabase/Docker eingerichtet). Das Skript ist
**nicht idempotent** – `create policy` schlägt fehl, wenn die Policy schon existiert. Für erneute
Läufe `drop policy if exists ...` voranstellen oder gezielt nur die neuen Statements ausführen.
TypeScript-Typen für die Tabellen liegen in `src/types.ts` und müssen bei Schemaänderungen
manuell synchron gehalten werden.

## Bewusst (noch) nicht gebaut

Keine DELETE-Policy für `sessions`/`results` (Challenge löschen/archivieren fehlt); Host-Korrektur
fremder Ergebnisse ist per RLS erlaubt, aber im UI nicht umgesetzt; keine Pro-Boulder-Detailansicht
("wer hat was"), keine Challenge-Modi, keine Offline-Eingabe mit Sync.
