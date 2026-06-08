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

## Versionierung (bei jeder spürbaren Änderung mitziehen)

Die `version` in `package.json` wird zur Build-Zeit via `vite.config.ts` `define` eingefroren und
in der PWA unten als `VersionBadge` angezeigt (`__APP_VERSION__`). Bei der autoUpdate-PWA ist das
der einzige sichtbare Hinweis, dass ein Update angekommen ist – darum **immer mitziehen**, wenn
eine Änderung beim Nutzer ankommt (neues Feature, sichtbares Verhalten, Schema-/Migrationsänderung).
SemVer-Daumenregel: neues Feature → Minor (`0.3.1` → `0.4.0`), Bugfix/Kleinkram → Patch
(`0.4.0` → `0.4.1`). Reine Doku-/Test-/Tooling-Änderungen ohne App-Wirkung brauchen keinen Bump.
Die Anpassung gehört in denselben Commit wie die Änderung (Commit-Konvention im Repo:
`Update version to X.Y.Z and …`). Claude soll das ungefragt erledigen, wenn es passt.

## Voraussetzungen zum Laufen (häufige Stolperfalle)

Die App braucht eine `.env` (Vorlage: `.env.example`) mit `VITE_SUPABASE_URL` und
`VITE_SUPABASE_ANON_KEY`. Vite liest `.env` **nur beim Serverstart** – nach Änderungen den
Dev-Server neu starten. Backend-seitig müssen zwei Dinge im Supabase-Dashboard erledigt sein:

1. **Anonymous Sign-ins aktivieren** (Authentication → Providers). Sonst: HTTP 422
   `anonymous_provider_disabled`, und die App bleibt am Auth-Bootstrap hängen.
2. `supabase/migrations/0001_init.sql` einmalig im SQL-Editor ausführen.
3. `supabase/migrations/0002_boulder_images.sql` ausführen (legt die `boulders.image_path`-Spalte
   und den öffentlichen Storage-Bucket `boulder-images` samt Policies an). Diese Migration ist
   idempotent und kann gefahrlos erneut laufen.
4. `supabase/migrations/0003_scoring_mode.sql` ausführen (legt die `sessions.scoring_mode`-Spalte
   an: `'classic'` | `'multiplier'`). Idempotent.
5. `supabase/migrations/0004_boulder_points_rescale.sql` ausführen (legt den `security definer`-
   Trigger `trg_boulder_rescale` an, der bei nachträglicher Grad-Änderung im Multiplikator-Modus
   alle `results.points` des Boulders serverseitig neu skaliert). Idempotent.
6. `supabase/migrations/0005_penalty_mode.sql` ausführen (legt die `sessions.penalty_mode`-Spalte
   an: `'top_floor'` | `'strict'` | `'misses'`). Idempotent.
7. `supabase/migrations/0006_feedback.sql` ausführen (legt die `feedback`-Tabelle samt RLS an:
   jeder Angemeldete darf einfügen **und lesen** – die Feedback-Liste `/feedback` ist öffentlich;
   keine delete-Policy, Löschen läuft nur über die RPC aus 0007). Idempotent.
8. `supabase/migrations/0007_feedback_admin.sql` ausführen (legt `app_config` + die
   `security definer`-RPC `delete_feedback(p_id, p_key)` für passwortgeschütztes Löschen an).
   Das Passwort **gehasht** setzen – siehe Schritt 11 (0010 stellt die RPC auf bcrypt-Vergleich
   um; ein hier noch im Klartext gesetztes Passwort matcht danach nicht mehr). Idempotent.
9. `supabase/migrations/0008_difficulty_special_grades.sql` ausführen (ersetzt die Rescale-
   Trigger-Funktion aus 0004, damit sie die Sonderstufen-Codes 8 = `?` / 9 = `!` korrekt auf
   ihren Wertungs-Faktor 4 bzw. 6 mappt). Keine Schema-Änderung an der Spalte. Idempotent.
10. `supabase/migrations/0009_boulders_member_edit.sql` ausführen (stellt die Policies
    `boulders_update`/`boulders_delete` auf `is_session_member` um – **jeder Teilnehmer** darf nun
    jeden Boulder bearbeiten/löschen, nicht mehr nur Ersteller/Host). Idempotent.
11. `supabase/migrations/0010_feedback_admin_hash.sql` ausführen (aktiviert `pgcrypto` und stellt
    `delete_feedback` auf einen bcrypt-**Hash**-Vergleich um – das Lösch-Passwort liegt nicht mehr
    im Klartext in `app_config`) und **danach einmalig das Lösch-Passwort gehasht setzen**
    (auskommentiertes `insert … crypt('…', gen_salt('bf'))` im File, Passwort ersetzen). Ohne
    gesetztes Passwort ist Löschen gesperrt. Idempotent. In der App wird das Passwort beim ersten
    Löschen abgefragt und nur **im Speicher** der Sitzung gemerkt (nicht im `localStorage`).
12. `supabase/migrations/0011_shared_scoring.sql` ausführen (legt die `sessions.shared_scoring`-
    Spalte an: Default `false`; sowie die `security definer`-RPC `can_score_others(sess)` und
    erweitert die `results_insert`/`results_update`-Policies um `or can_score_others(session_id)`,
    damit bei aktivierter Option **jeder Teilnehmer** Ergebnisse für **alle** Mitspieler schreiben
    darf). Idempotent.

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

**Punktelogik an einer Stelle.** `src/lib/scoring.ts` `computePoints(status, attempts, config, difficulty?)`
ist die einzige Quelle der Wahrheit. `attempts` ist die Gesamtzahl inkl. des erfolgreichen Zugs; die
Fehlversuche sind `attempts − 1` (beim Fail zählen alle Versuche als Fehlversuche). Das UI
(`ResultEditor`) zeigt/steppt **Fehlversuche**, persistiert aber weiterhin Gesamtversuche in
`results.attempts`. Wie Versuchskosten/Minuspunkte wirken, steuert der **pro Session wählbare**
`ScoringConfig.penaltyMode` (`sessions.penalty_mode`, im `CreateSession`-Dialog wählbar):
`'top_floor'` (Standard – nur Fehlversuche kosten, Flash/Top nie < 0, Fail bleibt negativ),
`'strict'` (jeder Versuch kostet, auch der erfolgreiche; Top kann negativ werden) und `'misses'`
(nur Fehlversuche kosten, aber kein Floor). Punkte werden client-seitig berechnet **und** in
`results.points` persistiert, damit das Leaderboard billig aggregieren kann. Das Leaderboard
(`src/components/Leaderboard.tsx`) summiert `points` rein client-seitig aus den `results`.
`normalizeResult` erzwingt Konsistenz (z.B. Flash ⇒ genau 1 Versuch).

Zwei **Spielmodi** (`ScoringConfig.mode`, gespeichert in `sessions.scoring_mode`, beim Erstellen
in `CreateSession` wählbar): `'classic'` (feste Punkte, Grad nur Info) und `'multiplier'`, bei dem
das komplette klassische Ergebnis mit dem Schwierigkeitsgrad des Boulders multipliziert wird (z.B.
Flash auf Grad 4 = `(flashPoints − attemptCost) × 4`). Im Multiplikator-Modus ist der Grad beim
Anlegen eines Boulders **Pflicht** (`AddBoulderDialog`-Prop `requireDifficulty`); fehlt er dennoch,
rechnet `computePoints` mit Faktor 1. Darum muss `difficulty` bis in `upsertResult` durchgereicht
werden.

**Schwierigkeiten zentralisiert.** Die wählbaren Stufen leben als einzige Quelle der Wahrheit in
`src/lib/difficulty.ts` (`DIFFICULTIES`): die Grade 1–7 sowie die Sonderstufen `?` und `!`. In
`boulders.difficulty` (int) steht der **Code** – für 1–7 ist er identisch mit dem Grad, `?` = 8,
`!` = 9. Anzeige-Label (`difficultyLabel`) und Wertungs-Faktor (`difficultyFactor`) sind davon
entkoppelt: `?` zählt 4, `!` zählt 6. Eigene Codes verhindern, dass `?`/`!` als Grad 4/6 missgedeutet
werden. Neue Stufen **nur hier** ergänzen – und das Code→Faktor-Mapping in
`0008_difficulty_special_grades.sql` (Rescale-Trigger) spiegeln, da der Server bei Grad-Änderung
ebenfalls über den Faktor reskaliert.

**Datenzugriff zentralisiert.** Alle Supabase-Queries liegen in `src/lib/api.ts` – Routen und
Komponenten rufen diese Funktionen auf, statt selbst `supabase.from(...)` zu nutzen. Wichtige
Konventionen: Upserts nutzen `onConflict` (`participants` → `session_id,user_id`; `results` →
`boulder_id,participant_id`). Die fortlaufende `boulders.seq` wird **per DB-Trigger** (Advisory-Lock,
race-sicher) vergeben – beim Insert **kein** `seq` mitsenden.

**Boulder-Bilder via Storage, nicht in der DB.** Jeder Boulder kann ein Foto haben. Die Bilder
liegen im öffentlichen Storage-Bucket `boulder-images`; in der DB steht nur der Objekt-Pfad
(`boulders.image_path`, z.B. `<user_id>/<uuid>.jpg`), **nicht** die volle URL oder base64. Das ist
bewusst so: Realtime lädt bei jeder Änderung die ganze `boulders`-Tabelle neu (s.u.) – base64-Blobs
würden die Payloads aufblähen. `src/lib/images.ts` kapselt alles: client-seitiges Verkleinern via
Canvas (max. 1600px Kante, JPEG ~0.82, EXIF-Orientierung berücksichtigt), Upload und das Bauen der
öffentlichen URL (`boulderImageUrl`). Der Upload-Pfad **muss** mit `auth.uid()` als erstem
Pfadsegment beginnen – die Storage-RLS in `0002` erzwingt das. Ablauf beim Anlegen: erst Bild
hochladen, dann `addBoulder` mit dem zurückgegebenen Pfad. `BoulderCard` zeigt ein Thumbnail, das
`ImageLightbox` (eigene Komponente, keine externe Lib) zum Zoomen öffnet.

**Boulder nachträglich bearbeiten.** **Jeder Teilnehmer** (RLS `boulders_update`/`boulders_delete`
via `is_session_member`, siehe Migration `0009`) kann Grad/Farbe/Foto **jedes** Boulders ändern oder
ihn löschen – nicht mehr nur Ersteller/Host. `AddBoulderDialog` dient als Anlegen- **und**
Bearbeiten-Dialog (Prop `boulder` gesetzt ⇒ Edit-Modus, Felder vorbelegt); `BoulderCard` zeigt dafür
einen ✎-Button, sobald `SessionView` ein `onEdit` reicht (jetzt immer). `updateBoulder` schreibt die Änderung;
ein neues Foto wird hochgeladen und das alte best-effort via `deleteBoulderImage` aufgeräumt. Im
Multiplikator-Modus hängen die Punkte am Grad – die Neuberechnung **aller** Ergebnisse (auch
fremder) übernimmt der DB-Trigger aus `0004` serverseitig, weil die `results_update`-RLS einem
Nicht-Host das Schreiben fremder Ergebnisse verbietet.

**Ergebnisse für andere eintragen (optional).** Pro Session beim Erstellen wählbar
(`sessions.shared_scoring`, Toggle in `CreateSession`). Ist es aus (Default), trägt jeder nur
eigene Ergebnisse ein – `BoulderCard` zeigt dann unverändert nur den eigenen `ResultEditor`. Ist
es an, darf **jeder Teilnehmer** Ergebnisse für **alle** Mitspieler schreiben; serverseitig
erzwingt das die RLS-Funktion `can_score_others(sess)` (Mitglied **und** `shared_scoring=true`),
um die `results_insert`/`results_update`-Policies erweitert (Migration `0011`). Im UI rendert
`BoulderCard` unter der eigenen Zeile je eine **kompakte** `ResultEditor`-Zeile pro weiterem
Teilnehmer (`compact`/`label`-Props: Name links, Icon-Buttons rechts). Sichtbar nur, wenn der
gerätelokale Toggle **„Andere ausblenden"** abgewählt ist – dieser ist pro Session in
`localStorage` (`bg:hideOthers:<sessionId>`) gemerkt und **standardmäßig an**, damit wer nur für
sich einträgt die aufgeräumte Standardansicht behält. `upsertResult` nimmt die `participantId`
bereits entgegen; `handleSaveResult` in `SessionView` reicht sie nur durch. Bewusst **keine
Gäste** (Teilnehmer ohne Gerät) – ein später doch beitretender Gast würde eine doppelte Identität
erzeugen.

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
Namens-/Beitritts-Formular) und `/feedback` (`FeedbackList` – öffentliche Feedback-Liste).

**Farben zentralisiert.** Die wählbaren Hallen-Farben für Boulder leben als einzige Quelle der
Wahrheit in `src/lib/colors.ts` (`BOULDER_COLORS`: persistierter `name` + CSS-`swatch`, inkl.
Zweiton-Verläufen). `colorSwatch(name)` mappt einen gespeicherten Farbnamen zurück auf den
CSS-Hintergrund. `AddBoulderDialog` (Auswahl) und `BoulderCard` (Farbklecks) nutzen beides – neue
Farben **nur hier** ergänzen.

**Feedback.** Freitext-Feedback aus der App: `FeedbackDialog` (von `Home` per Floating-Button
geöffnet) schreibt über `submitFeedback` in die `feedback`-Tabelle; die öffentliche Liste
`/feedback` (`FeedbackList`) liest alle Einträge via `listFeedback` (neueste zuerst). Löschen ist
passwortgeschützt und läuft ausschließlich über die `security definer`-RPC `delete_feedback`
(`deleteFeedback`, prüft das in `app_config` hinterlegte Passwort serverseitig) – es gibt bewusst
keine delete-Policy auf der Tabelle. Schema/RLS siehe Migrationen `0006`/`0007`.

## Schema-Änderungen

Die `supabase/migrations/*.sql` sind die Schema-Quelle der Wahrheit und werden **manuell** in
Reihenfolge im Supabase-SQL-Editor angewendet (kein lokales Supabase/Docker eingerichtet).
`0001_init.sql` ist **nicht idempotent** – `create policy` schlägt fehl, wenn die Policy schon
existiert. Für erneute Läufe `drop policy if exists ...` voranstellen oder gezielt nur die neuen
Statements ausführen. Neuere Migrationen (z.B. `0002_boulder_images.sql`) sind bewusst idempotent
geschrieben (`add column if not exists`, `drop policy if exists` vor jedem `create policy`,
`on conflict` beim Bucket-Insert) – als Konvention für künftige Migrationen so beibehalten.
TypeScript-Typen für die Tabellen liegen in `src/types.ts` und müssen bei Schemaänderungen
manuell synchron gehalten werden.

## Bewusst (noch) nicht gebaut

Keine DELETE-Policy für `results` (einzelne Ergebnisse löschen fehlt); Archivieren von Sessions
(`status='archived'`) ist im UI nicht umgesetzt – nur hartes Löschen durch jeden Teilnehmer
(`sessions_delete` via `is_session_member`, Cascade); Host-Korrektur fremder Ergebnisse ist per RLS erlaubt, aber im UI
nicht umgesetzt; keine Pro-Boulder-Detailansicht ("wer hat was"), keine Challenge-Modi, keine
Offline-Eingabe mit Sync.
