# Spielmodi – Vorschläge und Übergabe

Übergabe für einen neuen Chat: Diese Datei sammelt die Spielmodus-Wünsche aus dem App-Feedback,
deutet sie, zeigt den technischen Ansatz und nennt die offenen Fragen.

**Stand 1.26.0:** Das Gerüst (`sessions.game_mode`, Migration `0021`) und der Modus **„Nur Flash“**
sind gebaut. Details zur Umsetzung stehen in `CLAUDE.md` unter „Spielmodi“.

## Herkunft (Feedback, alle vom 08.11.2026, gleiches Gerät, anonym)

| Feedback-ID | Wortlaut |
|---|---|
| `75a7ae1c-ec81-4b8c-8576-5ea6b9b92fb8` | „Spielmodi: Last man Standing · Wetten · Nur Flash“ |
| `3f407207-42bf-4d23-b5b3-39abe347142e` | „Time Attack · Möglichst wenig Griffe · Am meisten Boulder mit X griffen“ |
| `ad59af69-d893-4222-b955-87caf7da1658` | „Nur rote/grüne Boulder“ |

Wenn alle Modi eines Eintrags umgesetzt sind, den Eintrag löschen:
`delete from public.feedback where id = '…'` per Supabase-MCP.

## Was heute schon da ist (relevant für Modi)

- **Punkte an einer Stelle:** `computePoints(status, attempts, config, difficulty, weekBonus)` in
  `src/lib/scoring.ts`. Die Punkte werden in `results.points` gespeichert, und das Leaderboard summiert
  sie client-seitig.
- **Ergebnis je Boulder und Person:** `results.status` (`open`/`flash`/`top`/`fail`) und `attempts`
  (Gesamtversuche).
- **Zwei Stellschrauben pro Session:**
  - `sessions.scoring_mode`: `'classic'` oder `'multiplier'`, mit CHECK-Constraint aus `0003`.
  - `sessions.penalty_mode`: `'top_floor'`, `'strict'` oder `'misses'`.
  Beide werden in `CreateSession` über `SessionSettingsFields` gewählt und lassen sich im
  `EditSessionDialog` ändern. Danach rechnet `recomputeSessionResults` alle Ergebnisse neu.
- **Boulder:** `difficulty`-Code, `color` (aus `src/lib/colors.ts`), `week_bonus` (Boulder der Woche, ×2).
- **Sessions haben kein Start- oder Enddatum**, nur `created_at`. `status = 'archived'` existiert, wird
  aber nicht genutzt.
- **RLS ist die Sicherheitsgrenze.** Regeln, die nicht umgehbar sein sollen (z.B. ein Zeitlimit),
  gehören in Policies oder Trigger, nicht nur ins UI.

## Entschieden: Wo die Modi im UI leben

Die Moduswahl ist **Schritt 1 von „Challenge erstellen“** (`/create`, Karten aus `GAME_MODES` in
`src/lib/gameModes.ts`). Schritt 2 sind die Einstellungen unter `/create?modus=…`. Das Hauptmenü
bekommt keine eigenen Einträge, weil jeder Modus eine Session mit Code, Bouldern und Rangliste bleibt.
Der Modus erscheint als Badge im Session-Kopf und in den Listen der Startseite. Angekündigte Modi
stehen als ausgegraute „bald“-Karten in `UPCOMING_GAME_MODES`.

Ausnahme für später: Solo-Modi ohne Gruppe (z.B. eine persönliche Hallen-Challenge) gehören eher zur
Hallenkarte.

## Grundsatzentscheidung vorab: wie werden Modi modelliert?

Die Wünsche verändern drei verschiedene Dinge:

1. **Wertung** (wie Punkte entstehen): Nur Flash, wenige Griffe
2. **Regeln oder Filter** (welche Boulder zählen): Nur rote/grüne Boulder
3. **Ablauf** (Zeit, Ausscheiden, Wetten): Time Attack, Last Man Standing, Wetten

**Vorschlag:** eine neue Spalte `sessions.game_mode text not null default 'standard'` mit CHECK, dazu
bei Bedarf `sessions.game_config jsonb` für modusspezifische Parameter (erlaubte Farben, Zeitlimit,
X Griffe). `scoring_mode` (klassisch/Multiplikator) bleibt **unabhängig** davon, sodass sich z.B.
„Nur Flash“ mit dem Multiplikator kombinieren lässt. `ScoringConfig` bekommt `gameMode` und die
Konfiguration, damit `computePoints` die einzige Quelle der Wahrheit bleibt.

**Umgesetzt:** Gebaut ist nur `game_mode`. `game_config jsonb` kommt mit dem ersten Modus, der
Parameter braucht (Farb-Challenge). Das Panel „Spielmodus“ (Klassisch/Multiplikator) heißt jetzt
„Wertung“.

Der Modus ist nach dem Erstellen im `EditSessionDialog` änderbar, mit Neuberechnung. Bei Ablauf-Modi
(Time Attack, Last Man Standing) muss das neu entschieden werden.

## Die Modi im Einzelnen

Aufwand: **S** = Nachmittag, **M** = 1–2 Sitzungen, **L** = mehrere Sitzungen.

### 1. Nur Flash (S) – ✅ gebaut in 1.26.0
- **Entschieden:** „Flash oder nichts“. Ein Flash bringt die Flash-Punkte, alles andere bringt 0, ohne
  Minuspunkte. Versuchskosten und Strafmodus sind ausgeblendet, ×Grad und Boulder der Woche wirken weiter.
- Der Top-Knopf bleibt für die Statistik („zählt nur Flash“). Der Versuchszähler entfällt
  (`countsAttempts`).

### 2. Farb-Challenge: „Nur rote/grüne Boulder“ (S–M)
- **Idee:** Die Session legt fest, welche Hallenfarben zählen.
- **Ansatz:**
  - Speichern in `game_config.colors: string[]` (Namen aus `BOULDER_COLORS`).
  - Der `ColorPicker` im `AddBoulderDialog` bietet nur diese Farben an.
  - Beim Übernehmen von der Karte (`addBouldersFromGym`, Auswahlmodus in `GymMap`) andere Farben
    ausgrauen oder ablehnen.
  - Die Session-Ansicht zeigt die Farben im Kopf.
- **Verallgemeinerbar** zur „Themen-Challenge“: Farben, Bereiche (`HALL_AREAS`) oder eine Grad-Spanne.
  Vielleicht gleich so bauen.
- **Offen:**
  - Werden falsche Farben nur ausgeblendet, oder soll der Server sie per Trigger ablehnen?
  - Gilt die Regel nur für neue oder auch für schon vorhandene Boulder?

### 3. Time Attack (M)
- **Idee:** In einem festen Zeitfenster (z.B. 60 min) möglichst viele Punkte sammeln.
- **Ansatz:**
  - Neue Spalten `sessions.starts_at` und `ends_at`; der Host startet die Uhr per Knopf.
  - Countdown im Session-Kopf.
  - Nach Ablauf sperrt die RLS (`results_insert`/`results_update`: `now() <= ends_at`) weitere
    Einträge, mit Serverzeit statt Handyzeit.
  - Nach Ablauf zeigt die Rangliste das Endergebnis.
- **Offen:**
  - Gemeint ist vermutlich ein Zeitfenster für alle. Oder Zeit pro Boulder mit Stoppuhr?
  - Darf der Host verlängern oder pausieren?
  - Was passiert mit Ergebnissen, die kurz vor Ablauf offline eingetragen wurden?

### 4. Möglichst wenig Griffe (M) – **Bedeutung erst klären**
- **Vermutung:** „Eliminate“-Spiel: Einen Boulder mit möglichst wenigen der vorgesehenen Griffe toppen.
  Wer weniger Griffe braucht, bekommt mehr Punkte.
- **Ansatz:**
  - Neues Feld `results.holds int`, eingetragen beim Top.
  - Wertung entweder relativ pro Boulder (Platz 1 = meiste Punkte, wie `BoulderRanking`) oder absolut
    (z.B. Bonus pro eingespartem Griff, dann bräuchte jeder Boulder eine Griffzahl).
- **Offen:** Ist das so gemeint? Relative oder absolute Wertung?

### 5. Am meisten Boulder mit X Griffen (S–M) – **Bedeutung erst klären**
- **Vermutung:** Vor dem Start wird X festgelegt (z.B. 5 Griffe). Gewonnen hat, wer die meisten
  Boulder schafft, ohne mehr als X Griffe zu benutzen. Jeder Top zählt 1, Grad und Versuche sind egal.
- **Ansatz:**
  - Speichern in `game_config.maxHolds`.
  - Wertung „Anzahl Tops“: neuer, einfacher Wertungsfall in `computePoints` (Top/Flash = 1, sonst 0).
  - Die Einhaltung der X Griffe ist Ehrensache, die App zählt keine Griffe.
- **Offen:** Ist das so gemeint? Oder sind Boulder gemeint, die genau X Griffe haben?
- Zusammen mit Modus 4 entscheiden, eventuell als ein Modus „Griffe“ mit Varianten.

### 6. Last Man Standing (M–L)
- **Idee:** Ausscheidungsrunden. Pro Runde gibt es einen Boulder, und wer ihn nicht schafft, scheidet
  aus. Der Letzte gewinnt.
- **Ansatz:**
  - Runde = Boulder in `seq`-Reihenfolge; der Host gibt die nächste Runde frei.
  - Neue Spalte `participants.eliminated_in_round int`, gesetzt, wenn jemand die Runde nicht schafft.
  - Die Rangliste zeigt „noch dabei“ und die Ausscheide-Reihenfolge statt Punkten.
  - Bei geteilter Wertung (`shared_scoring`) kann einer für alle eintragen.
- **Offen:**
  - Was passiert, wenn alle in einer Runde ausscheiden? Alle weiter, oder Stechen?
  - Wie viele Versuche hat man pro Runde, nur einen oder bis zu N?
  - Läuft es synchron (alle am selben Boulder) oder jeder im eigenen Tempo?

### 7. Wetten (L)
- **Idee:** Vor einem Versuch setzt man Punkte darauf, ob man selbst oder ein anderer einen Boulder
  flasht oder toppt. Liegt man richtig, gewinnt man den Einsatz, sonst verliert man ihn.
- **Ansatz:**
  - Neue Tabelle `bets`: `session_id`, `boulder_id`, Wettender, Ziel-Teilnehmer, Vorhersage
    `flash`/`top`/`fail`, Einsatz, Ergebnis.
  - RLS: jeder darf eigene Wetten anlegen, alle dürfen lesen.
  - Die Auflösung läuft, sobald das Ziel-Ergebnis feststeht, am besten per Trigger auf `results`,
    damit sie konsistent ist.
  - Das Leaderboard rechnet Wettgewinne zusätzlich zu den Punkten.
- **Offen:**
  - Darf man auf andere wetten oder nur auf sich selbst?
  - Muss die Wette vor dem ersten Versuch stehen, und wie wird das erzwungen?
  - Gibt es Quoten (z.B. abhängig vom Grad) oder 1:1?
  - Kann man mehr setzen, als man an Punkten hat?
- Der aufwendigste Modus: neue Tabelle, Trigger, eigene UI. Ideal erst, wenn das Modus-Gerüst steht.

### Weitere Ideen (Brainstorming 14.11.2026, noch nicht bewertet)

| Idee | Kurz | Aufwand |
|---|---|---|
| Beste N zählen | Nur die besten N Boulder je Person kommen in die Wertung. | S |
| Seltenheits-Wertung | Ein Top ist umso mehr wert, je weniger in der Gruppe ihn geschafft haben. | M |
| Erstbegehung | Bonus für den ersten Top eines Boulders in der Gruppe. | S–M |
| Handicap | Eigener Grad-Bereich je Person, Punkte relativ zum eigenen Niveau. | M |
| Teams | Teams, deren Punkte addiert werden; Rangliste nach Teams und Spielern. | M |
| Hallen-Bingo | 4×4-Raster mit Aufgaben (Farbe/Bereich/Grad); wer zuerst eine Reihe hat, gewinnt. | M–L |
| Bereichs-Tour | In jedem Hallenbereich mindestens ein Boulder, Fortschritt auf der Mini-Karte. | M |
| Pyramide | 4× Grad X, 3× X+1, 2× X+2, 1× X+3; es zählt nur, was in die Pyramide passt. | M |
| H-O-R-S-E | Einer gibt einen Boulder vor, wer ihn nicht schafft, bekommt einen Buchstaben. | L |
| Zufalls-Boulder | Die App lost einen Boulder von der Karte aus; wer ihn in einer Frist schafft, bekommt einen Bonus. | M |

**Technischer Haken – relative Wertung:** Heute entstehen die Punkte je Ergebnis isoliert in
`computePoints` und liegen in `results.points`. Bei Seltenheit, Erstbegehung, Beste N und Teams hängen
die Punkte von den Ergebnissen anderer ab. Diese Modi muss die Rangliste berechnen
(`src/lib/leaderboard.ts`), und `results.points` bleibt nur die Basis. Das einmal sauber anlegen, bevor
der erste dieser Modi gebaut wird.

## Empfohlene Reihenfolge

1. ~~**Gerüst + Nur Flash**~~ – erledigt in 1.26.0.
2. **Farb- bzw. Themen-Challenge:** nur Konfiguration und Filter, keine neue Wertung.
3. **Time Attack:** erste serverseitige Ablaufregel (RLS mit Zeitfenster).
4. **Griffe-Modi:** erst nach Rückfrage zur Bedeutung.
5. **Last Man Standing.**
6. **Wetten.**

## Konventionen fürs Umsetzen (aus `CLAUDE.md`)

- Migrationen nummeriert fortführen (nächste: `0021_…`), **idempotent** schreiben, `src/types.ts`
  manuell mitziehen. Vor dem Push per Supabase-MCP anwenden und Setup-Schritt in `CLAUDE.md` ergänzen.
- `computePoints` bleibt die einzige Punktequelle; neue Faktoren laufen überall mit, wo heute
  `difficulty`/`weekBonus` mitlaufen (`upsertResult`, `recomputeSessionResults`, `ResultEditor`).
- Versionssprung (neues Feature = Minor) plus Changelog-Eintrag oben in `src/lib/changelog.ts`, im
  selben Commit. Commit-Stil: `Update version to X.Y.Z and …`. Direkt auf `main` committen und pushen.
- UI-Texte und Kommentare auf Deutsch.

## Startprompt für den neuen Chat

> Lies `spielmodi.md` und `CLAUDE.md`. Wir bauen Spielmodi für die Boulder-Challenges. Das Gerüst und
> „Nur Flash“ stehen. Wähle mit mir den nächsten Modus, kläre seine offenen Fragen und erstelle einen
> Plan.
