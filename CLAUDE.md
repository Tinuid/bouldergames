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

**Changelog mitpflegen:** Zu jedem Version-Bump gehört ein neuer Eintrag **oben** in
`src/lib/changelog.ts` (kurzer deutscher Nutzertext: was hat sich aus Nutzersicht geändert;
Datum im Format TT.MM.JJJJ). Der Changelog ist bewusst **manuell gepflegt** und unabhängig von
den Git-Commits – er wird in der App über den „Was ist neu?"-Button im Footer der Startseite
angezeigt (`ChangelogDialog`). Auch das gehört in denselben Commit; Claude erledigt es ungefragt.

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
13. `supabase/migrations/0012_session_cleanup.sql` ausführen (legt die `security definer`-RPC
    `cleanup_stale_sessions()` an, die verwaiste Sessions löscht und die `image_path`s der
    gelöschten Boulder zurückgibt; nur für `service_role` ausführbar). Idempotent. **Danach** die
    Edge Function `cleanup-stale-sessions` deployen und schedulen – siehe Schritt 14.
14. Edge Function `cleanup-stale-sessions` deployen und schedulen. Im Projekt ist **kein** Supabase-CLI
    eingerichtet – der erprobte Weg läuft komplett über das **Dashboard**:
    a. **Edge Functions → Deploy a new function → Via Editor**: Name `cleanup-stale-sessions`,
       Inhalt von `supabase/functions/cleanup-stale-sessions/index.ts` einfügen, **„Verify JWT" AUS**
       (Cron hat kein User-JWT), Deploy. `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` sind automatisch da.
    b. **Edge Functions → Secrets**: `CLEANUP_SECRET` = langer Zufallswert setzen. Ohne gesetztes Secret
       (bzw. ohne passenden Header) antwortet die Function mit 401 – das ist der Missbrauchsschutz.
    c. **Database → Extensions**: `pg_cron` **und** `pg_net` aktivieren (sonst existiert `cron.job` nicht
       und die Cron-UI scheitert).
    d. **Integrations → Cron**: täglicher Job (z.B. `0 3 * * *`), Type *Edge Function* →
       `cleanup-stale-sessions`, HTTP-Header `Authorization: Bearer <CLEANUP_SECRET>`.
    (Alternativ via CLI: `supabase functions deploy cleanup-stale-sessions --no-verify-jwt` +
    `supabase secrets set CLEANUP_SECRET=…`.) Verifizieren: Aufruf ohne Secret → 401; DB-Logik im
    SQL-Editor in `begin; … select public.cleanup_stale_sessions(); … rollback;` trocken testen.
15. `supabase/migrations/0013_public_sessions.sql` ausführen (legt die `sessions.is_public`-Spalte
    an: Default `false`; öffentliche Sessions erscheinen auf der Startseite in der Liste
    „Laufende Sessions". Keine RLS-Änderung – `sessions_select` ist ohnehin `using (true)`, das
    Flag ist ein reiner UI-Filter). Idempotent.
16. `supabase/migrations/0014_boulder_reorder.sql` ausführen (legt die `security definer`-RPC
    `reorder_boulders(p_session_id, p_boulder_ids)` an: vergibt `boulders.seq` atomar neu –
    Zwei-Phasen-Renumbering gegen `unique (session_id, seq)`, Advisory-Lock wie `set_boulder_seq`,
    Host-Check via `is_session_host`). Idempotent.
17. `supabase/migrations/0015_gym_map.sql` ausführen (legt die Hallenkarte an: `gyms` inkl. einer
    Seed-Zeile mit dem Kürzel `halle`, den Boulder-Katalog `gym_boulders` und die privaten Marken
    `gym_ticks`, dazu RLS und Realtime für `gym_boulders`). Idempotent. Der Hallenname lässt sich
    danach per `update public.gyms set name = '…' where slug = 'halle';` anpassen.
18. `supabase/migrations/0016_gym_admin.sql` ausführen (legt die passwortgeschützten
    `security definer`-RPCs zum Pflegen des Katalogs an) und **danach einmalig das Lageplan-Passwort
    gehasht setzen** (auskommentiertes `insert … crypt('…', gen_salt('bf', 10))` am Dateiende,
    Schlüssel `gym_admin_key` – bewusst ein anderer als `feedback_admin_key`). Ohne gesetztes
    Passwort ist das Bearbeiten der Karte gesperrt. Idempotent.
19. `supabase/migrations/0017_boulder_gym_link.sql` ausführen (legt `boulders.gym_boulder_id`
    an – die Herkunfts-Referenz auf den Hallen-Katalog –, dazu einen partiellen Unique-Index
    gegen doppelte Übernahme in dieselbe Session und einen Index auf `participants.user_id`
    für die Liste „meine Challenges"). Keine RLS-Änderung, keine neue RPC. Idempotent.

`src/lib/supabase.ts` wirft bewusst **nicht** beim Import, wenn die Env fehlt (Client wird mit
Platzhaltern erzeugt), damit die App startet und eine Konfigurations-Meldung zeigt.
`ensureAnonymousSession()` wirft dann den eigentlichen Fehler, den `AuthProvider` abfängt.

## Architektur (Big Picture)

**Identität ohne Login.** Es gibt keine Accounts. Jedes Gerät meldet sich beim App-Start per
Supabase **Anonymous Sign-in** an (`AuthProvider` in `src/hooks/useAuth.tsx` → `ensureAnonymousSession`).
Die resultierende `auth.uid()` ist die stabile Identität, an der alles hängt: `sessions.host_id`,
`participants.user_id`, `boulders.created_by`. Beitritt zu einer Session läuft rein über den
kurzen `join_code` (kein Token).

**Öffentliche Sessions (opt-in).** Pro Session wählbares Flag `sessions.is_public` (Migration
`0013`; Toggle „Öffentlich sichtbar" in `SessionSettingsFields`, damit beim Erstellen **und**
nachträglich im `EditSessionDialog` änderbar). Öffentliche aktive Sessions listet die Startseite
unter „Laufende Sessions" (`listPublicSessions()` in `src/lib/api.ts`, inkl. Teilnehmerzahl via
`participants(count)`; Realtime-Re-Fetch über den Channel `lobby-sessions`). Ein Klick führt auf
`/s/:id` – dort greift das bestehende Inline-Beitritts-Formular für Nicht-Mitglieder. Wichtig:
Das Flag ist ein reiner **UI-Filter**, keine Sicherheitsgrenze – die RLS `sessions_select` ist
seit `0001` `using (true)`, jeder Angemeldete kann alle Sessions lesen.

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

**Boulder-Reihenfolge ändern (nur Host).** Die sichtbare Boulder-Nummer ist `boulders.seq`;
der Host kann sie über den Eintrag „Boulder-Reihenfolge ändern" im `EditSessionDialog`
umsortieren (`ReorderBouldersDialog`, Drag & Drop via `@dnd-kit` – Ziehen **nur** am
Griff-Button, damit Tippen/Scrollen nichts verschiebt; Änderungen werden lokal gesammelt
und erst mit „Speichern" persistiert). Gespeichert wird atomar über die `security definer`-RPC
`reorder_boulders` (Migration `0014`, Client: `reorderBoulders` in `api.ts`), weil einzelne
`seq`-Updates am `unique (session_id, seq)` scheitern würden (Zwei-Phasen-Renumbering:
erst +1000000, dann 1..n). Die RPC prüft `is_session_host`, nimmt denselben Advisory-Lock
wie `set_boulder_seq` (kein Race mit gleichzeitigen Inserts) und lehnt veraltete Listen ab
(ID-Menge muss exakt den Bouldern der Session entsprechen). Der Rescale-Trigger feuert bei
`seq`-Updates nicht – Punkte bleiben unberührt. Die normale Boulder-Liste ist bewusst
**nicht** ziehbar.

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

**Automatisches Aufräumen verwaister Sessions.** Da ohne Accounts nichts je gelöscht wird, räumt ein
nächtlicher Cron alte Sessions weg. Die Logik steckt in der `security definer`-RPC
`cleanup_stale_sessions()` (Migration `0012`): sie löscht alle Sessions, auf die **eines** der
Kriterien zutrifft – inaktiv > 14 Tage (jüngste Aktivität über `results`/`boulders`/`participants`),
leer (keine Teilnehmer, mit 1h Grace-Period) oder älter als 6 Wochen – und gibt die `image_path`s der
gelöschten Boulder zurück. Der `on delete cascade` räumt `participants`/`boulders`/`results` mit, **nicht**
aber den Storage-Bucket – darum entfernt die Edge Function `supabase/functions/cleanup-stale-sessions`
die zurückgegebenen Fotos batchweise aus `boulder-images`. Pfade-Sammeln und Löschen laufen in **einer**
Transaktion in der RPC (kein Race). Die Function läuft mit `service_role` (umgeht RLS) und ist über das
Secret `CLEANUP_SECRET` (Bearer-Header) geschützt; deployt mit `--no-verify-jwt`, getriggert per Cron
(Setup-Schritte 13/14 oben). **Nicht** abgedeckt: verwaiste anonyme `auth.users` wachsen weiter.

**Hallenkarte (`/karte`) – ein Katalog neben dem Session-Modell.** Boulder in Sessions sind
Wegwerf-Objekte: sie hängen per `not null`-FK an einer Session und werden von
`cleanup_stale_sessions()` mitgelöscht. Der Hallen-Katalog ist das Gegenteil und lebt darum in
eigenen Tabellen (Migration `0015`): `gyms` (eine Seed-Zeile, aufgelöst über den `slug` aus
`src/lib/gyms.ts` – **nie** eine uuid im Code), `gym_boulders` (Position im SVG-User-Space, Grad,
Farbe, Bereich, Foto, `removed_at` für „abgeschraubt") und `gym_ticks` (die persönlichen Marken
`done`/`project`). Die neuen Tabellen haben **keinen** FK auf `sessions` und werden vom nächtlichen
Cleanup absichtlich **nicht** erfasst – beim Anfassen von `0012` so lassen.

**Marken sind privat und gerätegebunden.** `gym_ticks` ist per RLS auf `user_id = auth.uid()`
beschränkt – anders als `results`, wo eine Session ein bewusst geteilter Gruppenkontext ist. Ohne
Accounts heißt das: die Marken hängen am Gerät. Ein späterer echter Login erbt sie nur, wenn er den
anonymen Nutzer *aufwertet* (`linkIdentity`, gleiche `auth.uid()`); ein frisch angelegtes Konto
nicht. Zähler wie „12× getoppt" ließen sich später über eine `security definer`-RPC nachrüsten, die
nie eine `user_id` herausgibt – dafür muss die RLS **nicht** gelockert werden.

**Der Katalog wird nur über Passwort-RPCs geschrieben.** Auf `gym_boulders` gibt es bewusst keine
`insert`/`update`/`delete`-Policy; alles läuft über `upsert_gym_boulder`, `move_gym_boulder`,
`set_gym_boulder_removed` und `delete_gym_boulder` (Migration `0016`, bcrypt-Vergleich gegen
`app_config.gym_admin_key`) – dasselbe Muster wie `delete_feedback`. `verify_gym_admin_key` entsperrt
den Modus vorab; das Passwort liegt in der App nur im React-State, **nie** im `localStorage`. Das ist
faktisch schon der Betreiber-Modus, nur ohne Accounts.

**Plan-Geometrie und Bereiche zentralisiert.** `src/lib/areas.ts` (`HALL_AREAS`) ist die einzige
Quelle der Wahrheit für die acht Hallenflächen: Pfad-`id` (= gespeicherter Wert in
`gym_boulders.area`), Anzeigename, Beschriftung und die SVG-Pfaddaten. Die Originaldatei
`src/assets/lageplan.svg` bleibt nur als Referenz liegen. Neue Bereiche brauchen einen Eintrag hier
**und** eine Migration, weil das Vokabular als CHECK-Constraint gespiegelt ist. `areaAt(x, y)` macht
Punkt-in-Polygon (Even-Odd-Ray-Cast, rückwärts iteriert, damit `abenteuerfels` nicht von
`abenteuerland` überstimmt wird) – aber **nur als Vorbelegung** beim Setzen: die Flächen sind
nicht-konvexe Bänder, in deren Konkavität der Test falsch liegt. Darum ist `area` eine gespeicherte,
im Dialog änderbare Spalte und wird nie zur Renderzeit abgeleitet.

**Zoom/Pan ohne Bibliothek.** `src/hooks/useSvgPanZoom.ts` steuert die `viewBox` (Pan, Pinch,
Wheel, Doppeltipp), `src/lib/mapGeometry.ts` enthält die testbare Mathematik. Zwei Invarianten, die
man nicht brechen darf: (1) `view.w/view.h` folgt immer dem Seitenverhältnis des Containers, damit
`preserveAspectRatio` die Identität ist und Bildschirm ⇄ User eine simple Affine bleibt; (2) die
`viewBox` wird **imperativ** gesetzt, nie als React-Attribut – sonst würfe jedes Re-Rendering während
einer Geste den Ausschnitt auf den veralteten State zurück, und ein Pan würde hunderte SVG-Knoten pro
Frame neu rendern. Der Zoom landet nur **gequantelt** im State (Punkt- und Label-Größen hängen daran).
Punkte skalieren gedämpft (`dotRadius`), damit beim Hineinzoomen mehr Plan und nicht nur ein
riesiger Punkt sichtbar wird. Getroffen wird über `nearestDot` im Screen statt per `onClick` am
Kreis – die Punktebene ist `pointer-events: none`, sonst löste ein Pan, das auf einem Punkt endet,
eine Auswahl aus. Gefilterte Punkte werden ausgegraut (nicht versteckt, sonst verliert die Karte ihre
räumliche Aussage) und fliegen aus dem Treffer-Test.

**Brücke Karte ↔ Challenge (Migration `0017`).** `boulders.gym_boulder_id` hält fest, aus welchem
Karten-Boulder ein Session-Boulder übernommen wurde. Der Link ist **Provenienz, kein Spiegel**: Grad und
Farbe werden beim Übernehmen **kopiert** und sind in der Challenge frei änderbar. Es darf keine View
gebaut werden, die den Grad live aus `gym_boulders` liest – sonst verschöbe eine Grad-Korrektur im
Katalog über den Rescale-Trigger (`0004`/`0008`) still die Punkte laufender und abgeschlossener
Challenges.

**Das Foto wird dagegen referenziert, nicht kopiert.** Übernommene Boulder tragen bewusst
`image_path = null`; die Session-Ansicht löst das Bild über `gym_boulder_id` auf
(`listGymBouldersByIds` → `BoulderCard`-Prop `fallbackImagePath`). Grund: `cleanup_stale_sessions()`
(`0012`) sammelt die `boulders.image_path` gelöschter Sessions ein und die Edge Function entfernt genau
diese Objekte aus dem Bucket – stünde dort der Pfad des Karten-Boulders, wäre dessen Foto nachts weg.
Ein später in der Session selbst aufgenommenes Foto gewinnt und wird korrekt mitgeräumt.

**Das Übernehmen läuft ohne RPC**, als normaler Insert vom Client (`addBouldersFromGym` in `api.ts`) und
damit innerhalb der Policy `boulders_insert` (`created_by = auth.uid()` und `is_session_member`). Ein
Mehrfach-Insert ist dabei sicher: der `before insert`-Trigger `set_boulder_seq` sieht die zuvor
eingefügten Zeilen derselben Anweisung und nummeriert korrekt in Array-Reihenfolge durch – nachgemessen
(10 Zeilen ⇒ `seq` 1..10). Doppelte Übernahmen fängt der partielle Unique-Index
`uq_boulders_session_gym_boulder` ab; der Client filtert sie vorher heraus und meldet „war schon drin".

**Beide Richtungen im UI.** Auf der Karte schaltet „Auswählen" in den Auswahlmodus (`MapMode`), in dem ein
Tipp sammelt statt das Detail-Sheet zu öffnen; die Aktionsleiste sitzt im `footer`-Slot von
`MapFilterBar`. Aus einer Challenge führt „Auf der Karte zeigen" auf `/karte?session=<id>` (Boulder
hervorgehoben, Ausschnitt eingepasst) und „+ Hinzufügen → Vom Lageplan" auf `/karte?session=<id>&pick=1`
(startet direkt im Auswahlmodus und fügt ohne Zwischendialog in genau diese Challenge ein). Die
Vorauswahl für eine **neue** Challenge reist bewusst im Router-State nach `/create` und nicht in der URL –
sie ist flüchtig und muss einen Reload nicht überleben.

**Wiederfinden in der Halle.** Jeder übernommene Boulder zeigt in `BoulderCard` neben dem Foto eine
Mini-Karte (`MiniMap`, flacher Grundriss aus `HALL_AREAS` plus ein bewusst überproportionaler Punkt
in der Farbe des Boulders – Zweiton-Farben brauchen dafür `ColorDefs` mit einem `useId`-Präfix je
Vorkommen); ein Tipp führt auf `/karte?session=<id>&boulder=<gymBoulderId>` und wählt ihn dort aus. Ohne diesen
Rückweg nützt der Katalog in der Halle wenig.

**Gesetzt wird nur über das Fadenkreuz**, nicht durch Tippen auf die Karte: mit dem Finger auf eine
freie Stelle zu zielen ist ungenau, weil der Finger genau die Stelle verdeckt. Aus demselben Grund gibt
es keine Zoom-Knöpfe – gezoomt wird mit zwei Fingern, am Rechner mit dem Rad, und für die Tastatur
liegen `+`/`-`/`0` auf der fokussierten Karte.

**Verschieben per zweitem Tipp, nicht per Drag.** Im Bearbeitungsmodus wird ein Punkt ausgewählt,
„Verschieben" scharfgeschaltet und die neue Position angetippt. Ein Ein-Finger-Drag am Punkt wäre
nicht vom Verschieben der Karte zu unterscheiden. `useSvgPanZoom` liefert `onLongPress` und
`disabled` bereits mit, falls später doch ein Drag dazukommen soll.

**Verlauf gerätelokal.** Ohne Accounts merkt sich `src/lib/localHistory.ts` besuchte Sessions in
`localStorage` (für die "Zuletzt gespielt"-Liste auf `Home`).

**Routing/Screens.** `src/App.tsx` rendert erst nach erfolgreichem Auth-Bootstrap. Routen:
`/` (Home), `/create`, `/join` + `/join/:code`, `/s/:sessionId` (`SessionView` – Hauptscreen;
wird die Session über einen geteilten Link ohne vorherigen Beitritt geöffnet, zeigt er inline ein
Namens-/Beitritts-Formular), `/s/:sessionId/rangliste` (`SessionLeaderboard` – vollständige
Rangliste; der Spieler-Vergleich `PlayerDetail` hängt an `?player=<participantId>` und **nicht** an
React-State, damit er einen eigenen History-Eintrag bekommt: der Sprung zu einem Boulder führt
nach `/s/:sessionId`, und der Zurück-Button muss wieder im Vergleich landen), `/karte` (`GymMap` – Hallenkarte, optional mit `?session=<id>` und `&pick=1`; bewusst der einzige Screen ohne
`max-w-md`-Spalte: `fixed inset-0` mit eigenem Safe-Area-Padding, weil `position: fixed` das Padding
des `body` ignoriert) und `/feedback` (`FeedbackList` – öffentliche Feedback-Liste).

**Farben zentralisiert.** Die wählbaren Hallen-Farben für Boulder leben als einzige Quelle der
Wahrheit in `src/lib/colors.ts` (`BOULDER_COLORS`: persistierter `name` + `hex`/`hex2`; der
CSS-`swatch` inkl. Zweiton-Verlauf wird daraus abgeleitet). `colorSwatch(name)` mappt einen
gespeicherten Farbnamen zurück auf den CSS-Hintergrund. Für die SVG-Punkte der Hallenkarte gibt es
zusätzlich `colorStops`/`colorSvgFill` (ein `linear-gradient(...)` ist als SVG-`fill` ungültig, darum
generierte `<linearGradient>`-Defs statt CSS-String-Parsing) und `colorInk`/`colorInkHalo` für den
Kontrast der Grad-Zahl auf hellen Punkten. `AddBoulderDialog`/`BoulderPickers` (Auswahl) und
`BoulderCard` (Farbklecks) nutzen den `swatch` – neue Farben **nur hier** ergänzen.

**Gemeinsame Formular-Bausteine.** Grad-Kacheln, Farbkreise und das Foto-Feld liegen in
`src/components/BoulderPickers.tsx` (`DifficultyPicker`, `ColorPicker`, `PhotoField`) und werden von
`AddBoulderDialog` (Session) **und** `MapBoulderDialog` (Karte) benutzt. Bewusst reine Darstellung:
Formular-State, Validierung und Submit bleiben im jeweiligen Dialog.

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
Offline-Eingabe mit Sync. Kein Aufräumen verwaister anonymer `auth.users` (die wachsen monoton; das
Session-Cleanup aus `0012` löscht sie **nicht** mit).
