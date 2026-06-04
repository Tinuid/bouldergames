# Code-Review – Boulder Challenges

Stand: 2026-06-04 · Reviewter Stand: `main` @ `1db1e71` (Version 1.3.1)

Umfassender Review der Codebase (Frontend, Hooks, `lib`, alle 9 Migrationen, Konfiguration,
Tests). Findings sind nach Schweregrad priorisiert. **Hinweis:** Einige Punkte sind bewusste
Produktentscheidungen – sie sind hier der Vollständigkeit halber gelistet und können als
"gewollt" abgehakt werden.

---

## Überblick

**Boulder Challenges** – installierbare PWA, um beim Bouldern in der Gruppe Challenges in
Echtzeit zu tracken (Flash/Top/nicht geschafft) mit konfigurierbarem Punktesystem und
Live-Leaderboard.

- **Stack:** React 18 + Vite 5 + TypeScript (strict), Tailwind, `vite-plugin-pwa` (autoUpdate).
  Backend: Supabase (Postgres + Realtime + Anonymous Auth). Deploy via Vercel (SPA-Rewrite).
- **Identität ohne Login:** Jedes Gerät meldet sich anonym an; `auth.uid()` ist die stabile
  Identität. Beitritt rein über `join_code`.
- **Sicherheitsgrenze = RLS** in `0001_init.sql` (drei `security definer`-Helper gegen
  RLS-Rekursion). Migrationen werden manuell im SQL-Editor angewendet.
- **Schichten gut getrennt:** Punktelogik isoliert in `scoring.ts`, alle Queries in `api.ts`,
  Realtime in `useRealtimeSession.ts`, Stammdaten (Farben/Grade) zentralisiert.

**Gesamteindruck:** Für ein account-loses MVP überdurchschnittlich sauber, konsistent und gut
dokumentiert. Hauptschwächen liegen nicht im Code-Stil, sondern im **Vertrauensmodell**
(RLS + client-berechnete Punkte) und in einigen **Robustheits-/UX-Lücken** beim Error-Handling.

---

## 🔴 Kritisch

### 1. Jeder Nutzer kann jede fremde Challenge unwiderruflich löschen
- **Wo:** `supabase/migrations/0001_init.sql:161-162` (+ `Home.tsx:121-155`, `api.ts:128`)
- **Problem:** `sessions_delete` erlaubt das Löschen jedem `is_session_member`. Gleichzeitig
  listet `Home` über `listSessions()` **alle** aktiven Sessions inkl. `join_code` öffentlich auf
  (RLS `sessions_select using(true)`). Damit kann jeder App-Nutzer einer beliebigen fremden
  Challenge beitreten und sie löschen – der FK-Cascade reißt Teilnehmer, Boulder und alle
  Ergebnisse mit. Total-Datenverlust durch beliebige Dritte.
- **Vorschlag:** `sessions_delete` auf `is_session_host(id)` einschränken (nur Ersteller löscht
  die ganze Session); Verlassen bleibt über `participants_delete`.
- **Status:** ☑ gewollt – bewusst offen gehalten (kleine Vertrauensgruppe). Wird evtl. in einer
  späteren Version auf `is_session_host` eingeschränkt; an #3 (öffentliche Lobby) gekoppelt.

---

## 🟡 Mittel

### 2. Punkte werden client-seitig berechnet und ungeprüft persistiert → Cheating
- **Wo:** `api.ts:300-313`, RLS `results_insert/update` in `0001_init.sql:194-200`
- **Problem:** `computePoints` läuft im Client, das Ergebnis landet in `results.points`. Die RLS
  prüft nur **Eigentum** (`owns_participant`), nicht die **Korrektheit** des Punktwerts. Ein
  Teilnehmer kann via direktem Supabase-Call beliebige Punkte schreiben und das Leaderboard
  manipulieren. (Der Rescale-Trigger in `0004/0008` zeigt, dass serverseitige Punktelogik
  möglich ist.)
- **Vorschlag:** Punkte serverseitig per `before insert/update`-Trigger berechnen (Single Source
  of Truth in SQL), oder bewusst als akzeptiertes Risiko dokumentieren.
- **Status:** ☑ gewollt / akzeptiertes Risiko – für Freundes-/Vertrauensgruppen ok. Ein
  serverseitiger Trigger wäre möglich (vgl. Rescale-Trigger 0004/0008), aktuell aber nicht nötig.

### 3. Öffentliche Session-Liste hebelt das Code-basierte Zugangsmodell aus
- **Wo:** `Home.tsx:121-155`, `api.ts:91-104`
- **Problem:** CLAUDE.md beschreibt Zugang "faktisch über Kenntnis des Codes". Tatsächlich zeigt
  die Startseite Name + Code + Spielerzahl jeder aktiven Challenge. Privacy-/Designwiderspruch
  (und Voraussetzung für Finding #1).
- **Vorschlag:** Entweder Lobby bewusst als Feature framen (dann RLS-Löschrechte verschärfen, #1)
  oder Liste entfernen und nur den gerätelokalen Verlauf zeigen.
- **Status:** ☑ gewollt – aktuell als offene Lobby gewollt; spätere Anpassung möglich (an #1
  gekoppelt).

### 7. Feedback: öffentlich lesbar, plaintext-Passwort, kein Rate-Limit
- **Wo:** `0006_feedback.sql`, `0007_feedback_admin.sql`, `FeedbackList.tsx:62-89`
- **Problem:**
  - Jeder Angemeldete kann alle Feedbacks lesen (`feedback_select using(true)`) und unbegrenzt
    einfügen (kein Rate-Limit → Spam möglich).
  - Das Lösch-Passwort liegt **plaintext** in `app_config` und wird nach Eingabe **plaintext im
    `localStorage`** gespeichert (`KEY_STORAGE`). Der serverseitige Vergleich ist nicht
    client-umgehbar, aber ein Klartext-Shared-Secret bleibt schwach.
- **Vorschlag:** Kein Klartext im `localStorage` (nur "freigeschaltet"-Flag), Passwort
  serverseitig gehasht vergleichen, einfaches Insert-Rate-Limit erwägen.
- **Status:** ☑ teilweise erledigt (1.4.0) – beide **Plaintext**-Stellen behoben: Passwort wird
  nur noch im Speicher der Sitzung gehalten (kein `localStorage`), und `app_config` speichert nur
  noch einen bcrypt-Hash (`pgcrypto`, Migration `0010`, RPC vergleicht via `crypt`). Rate-Limit
  bewusst **nicht** umgesetzt (gewollt). Öffentliche Lesbarkeit bleibt (gekoppelt an #3).

---

## 🟢 Niedrig / Nice-to-have

### 10. `useEffect`-Abhängigkeiten im Leaderboard
- **Wo:** `Leaderboard.tsx:50-62`
- **Problem:** Der "Bump"-Effekt hängt nur an `[myRow?.points]`, `myRow` wird aber bei jedem
  Render neu via `.find` berechnet. Funktioniert, würde aber `react-hooks/exhaustive-deps`
  triggern.
- **Status:** ☑ erledigt (1.4.0) – `myRow` mit `useMemo` stabilisiert, Effekt-Dep auf `[myRow]`.

### 11. Doppelte Fetches
- **Wo:** `useRealtimeSession.ts:81-97` + z.B. `SessionView.tsx:171`
- **Problem:** Mutationen rufen `refresh()` **und** lösen via Realtime ein erneutes Laden
  derselben Tabelle aus. Bewusst für sofortiges Feedback, aber doppelt. Für MVP-Größen
  unkritisch.
- **Status:** ☑ gewollt – bewusste Abwägung für sofortiges UI-Feedback.

### 12. Accessibility der Bottom-Sheets
- **Wo:** `AddBoulderDialog`, `FeedbackDialog`, Menü-Sheet in `SessionView.tsx:397`
- **Problem:** Kein `role="dialog"`/`aria-modal`, kein Focus-Trap, kein Escape-to-close (nur
  `PlayerDetail`/`ImageLightbox` machen das vorbildlich). Tastatur-/Screenreader-Nutzer
  benachteiligt.
- **Status:** ☑ erledigt (1.4.0) – neuer Hook `useDialogEscape` (Escape + Body-Scroll-Lock,
  zentralisiert das zuvor duplizierte Muster); `role="dialog"`/`aria-modal` auf allen Sheets;
  `ImageLightbox`/`PlayerDetail` auf den Hook umgestellt.

### 13. Tooling: kein Linter/Formatter
- **Problem:** Keine ESLint-/Prettier-Konfiguration. Bei sonst sehr konsistentem Stil wäre ein
  Linter (inkl. `react-hooks`-Plugin) günstig, um #10 u.ä. automatisch zu fangen.
- **Status:** ☑ erledigt (1.4.0) – ESLint 9 (Flat-Config, `typescript-eslint` + `react-hooks` +
  `react-refresh`) und Prettier eingerichtet; Scripts `lint`/`format`. Kein flächiges Reformat
  des Bestands (bewusst).

---

## Tests

- **Punktelogik:** `scoring.test.ts` deckt `computePoints` über alle drei `penaltyMode`-Varianten,
  den Multiplikator-Modus inkl. Sonderstufen (Code 8/9) und `normalizeResult` sehr gut ab –
  die kritischste Logik ist gut priorisiert.
- **Lücken:** Keine Tests für `difficulty.ts` (`difficultyFactor` bei unbekannten Codes /
  Fallback `code > 0`), `codes.ts` (`normalizeJoinCode`), `api.ts` oder Komponenten. Kein
  RLS-Test (verständlich ohne lokales Supabase).
- **Vorschlag:** Schnelle Unit-Tests für `difficultyFactor`/`difficultyLabel`-Edgecases und
  `normalizeJoinCode` ergänzen. RLS-Policies (#1, #2) wären die wertvollsten Integrationstests.

---

## Performance

Unkritisch und bewusst einfach gehalten:
- Realtime lädt bei jeder Änderung die **ganze** betroffene Tabelle neu (`useRealtimeSession`).
  Für Gruppengrößen ok; würde bei sehr großen Sessions skalieren müssen.
- Keine N+1-Probleme; `listSessions` nutzt `participants(count)` korrekt aggregiert.
- Bilder werden client-seitig auf 1600px/JPEG 0.82 verkleinert (`images.ts`) und nur als Pfad
  gespeichert – gute Entscheidung gegen aufgeblähte Realtime-Payloads.
- Indizes auf `*_session` und `feedback.created_at` vorhanden.

---

## Empfohlene Reihenfolge

Nach Durchsprache (2026-06-04) sind die größeren Sicherheits-/Designthemen bewusste
Produktentscheidungen und bleiben vorerst offen (siehe Status oben):

1. 🔴 **#1** Lösch-Recht für Sessions – **gewollt**, evtl. spätere Version (an #3 gekoppelt).
2. 🟡 **#2** Punkte-Vertrauensmodell – **gewollt / akzeptiertes Risiko**.
3. 🟡 **#3** Öffentliche Lobby – **gewollt**, spätere Anpassung möglich.
4. 🟡 **#7** Feedback-Härtung – Plaintext behoben (1.4.0); Rate-Limit bewusst offen.

---

## Erledigt (Version 1.4.0)

- **#7** Beide Plaintext-Stellen des Feedback-Lösch-Passworts behoben: Client hält das Passwort
  nur noch im Speicher der Sitzung (`FeedbackList.tsx`, kein `localStorage` mehr); `app_config`
  speichert nur noch einen bcrypt-Hash – neue Migration `0010_feedback_admin_hash.sql` aktiviert
  `pgcrypto` und stellt die RPC `delete_feedback` auf `crypt`-Vergleich um. Rate-Limit bewusst
  nicht umgesetzt.
- **#10** `myRow` im Leaderboard mit `useMemo` stabilisiert, Effekt-Dependency auf `[myRow]`
  (`Leaderboard.tsx`).
- **#12** Neuer Hook `useDialogEscape` (Escape-to-close + Body-Scroll-Lock); `role="dialog"`/
  `aria-modal` auf `AddBoulderDialog`, `FeedbackDialog` und dem Menü-Sheet in `SessionView`;
  `ImageLightbox`/`PlayerDetail` auf den Hook umgestellt (Duplizierung entfernt).
- **#13** ESLint 9 (Flat-Config: `typescript-eslint`, `react-hooks`, `react-refresh`) und Prettier
  eingerichtet (`eslint.config.js`, `.prettierrc.json`, Scripts `lint`/`format`). Kein flächiges
  Reformat des Bestands.

---

## Erledigt (Version 1.3.2)

- **#4** Fehler beim Ergebnis-Speichern werden jetzt als Toast angezeigt; der optimistische
  Editor-Stand wird via `refresh()` auf den echten DB-Wert zurückgesetzt (`SessionView.tsx`).
- **#5** `submit()` in `AddBoulderDialog` hat nun ein `catch`, das den Fehler im Dialog anzeigt
  (analog `handleDelete`).
- **#6** `createSession` löscht die eben erstellte Session best-effort wieder, wenn der
  Host-Beitritt fehlschlägt – keine verwaisten Sessions mehr (`api.ts`).
- **#8** Berechtigungs-Texte/-Kommentare auf "jeder Teilnehmer" (Migration 0009) korrigiert
  (`api.ts`, `BoulderCard.tsx`, `AddBoulderDialog.tsx`).
- **#9** Toter Code entfernt: ungenutzte `scoring`-Prop in `PlayerDetail`, Legacy-Feld
  `free_success` und ungenutztes `Participant.color` in `types.ts`.
