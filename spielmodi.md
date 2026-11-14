# Spielmodi – Konzepte und Übergabe

Übergabe für einen neuen Chat: Diese Datei sammelt die Spielmodus-Wünsche aus dem App-Feedback und die
eigenen Ideen. Für jeden Modus beschreibt sie, wie er funktionieren könnte, und nennt die offenen Fragen.

**Stand 1.28.0:** Das **Grundgerüst** steht. Gebaut sind der Modus **„Nur Flash“**, die Moduswahl mit drei
Ebenen (Modus, Spielform, Extras – alle übrigen als graue Kacheln), die zentrale Rangliste
(`scoreSession`), Spielende (`sessions.ends_at`), Spielleitung (`shared_control`) und „Verlassen behält
Ergebnisse“ (`participants.left_at`). Details zur Umsetzung stehen in `CLAUDE.md` unter „Spielmodi“,
„Rangliste rechnet zentral“, „Spielende und Spielleitung“ und „Verlassen behält die Ergebnisse“.

**Grad-Codes = Grad** (Release 4) ist seit **1.29.0** umgesetzt (Migration `0024`): `?` = 11, `!` = 12,
9/10 frei, dazu `difficultyGrade()`. Bewusst ohne die geplante Wartezeit nach 1.26.2 ausgerollt – die App
nutzt nur ein kleiner Freundeskreis, ein kurz falsch gerechneter Boulder wäre verschmerzbar.

## Entscheidungen aus dem Prüfdokument (14.11.2026)

Aus Lucas' Kommentaren im Dokument „Spielmodi – Konzept & Prüfergebnis“:

- **Erst das Grundgerüst, dann Modi einzeln** – nicht alle auf einmal. ✅ Gerüst in 1.26.2–1.28.0.
- **Rechte nicht verschärfen:** In der Boulder-Community läuft alles auf Ehrlichkeit. Nur Grundlagen
  legen, die spätere Rechte nicht verbauen. „Eingetragen von“ (`results.updated_by`) entfällt vorerst.
- **Verlassen behält Ergebnisse**, Spieler ausgegraut, Wiederbeitritt macht weiter. ✅ 1.27.0.
- **Spielende** umsetzen. ✅ 1.27.0.
- **Spielleitung:** Haken beim Erstellen, standardmäßig an. ✅ 1.27.0.
- **Grad-Codes = Grad**, Leerplätze für Grad 9 und 10; `difficultyGrade()` trotzdem einführen.
  ✅ 1.29.0.
- **Drei Ebenen** (Spielform / Modus / Extras): gute Idee. **Das Zeitlimit ist nie vorbelegt.** ✅ 1.28.0
  (als Katalog, die Extras sind noch nicht wählbar).
- **Rangliste über `scoreSession`.** ✅ 1.28.0.

## Release 4 – Grad-Codes = Grad (✅ 1.29.0, zur Dokumentation)

Migration `0024_difficulty_codes.sql`, eine Transaktion in `do $$ … $$`, gesichert über einen Merker in
`app_config` (`difficulty_codes_v2`), damit ein zweiter Lauf nichts ändert:

1. Rescale-Trigger `trg_boulder_rescale` abschalten (vorab Besitzer prüfen: `pg_tables.tableowner`).
2. CHECK `gym_boulders_difficulty_check` löschen.
3. `boulders` und `gym_boulders`: `update … where difficulty in (8,9,10)` mit 8 → 11, 9 → 12, 10 → 8.
4. Trigger-Funktion ersetzen: Code 1–10 → Faktor = Code, 11 → 4, 12 → 6, sonst 1 (maßgeblich statt 0019).
5. CHECK auf `gym_boulders` **und** erstmals auf `boulders.difficulty`: `null or in (1..8, 11, 12)` –
   alte Schreibvorgänge mit 9/10 scheitern sichtbar.
6. Trigger wieder an, Merker setzen.

Client: `difficulty.ts` mit neuen Codes und `difficultyGrade(code)` (1–10, sonst `null`); Rückfall in
`difficultyFactor` für unbekannte Codes = 1 wie auf dem Server; Kartenfilter-Key auf
`bg:gymFilter:v2:<gymId>` (alten verwerfen); Tests anpassen. Prüfen: Zählung je Code vorher/nachher,
Summe `results.points` je Session unverändert, zweiter Lauf ändert nichts, in einer Multiplikator-Session
`?` → Grad 8 verdoppelt die Punkte genau. Nach dem Deploy Stichprobe auf neu geschriebene Code-8-Zeilen.
`CLAUDE.md`: Abschnitt „Schwierigkeiten“, Setup-Schritt, Hinweis 0008/0019 nicht erneut ausführen.

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
  `src/lib/scoring.ts`. Die Punkte werden in `results.points` gespeichert, und die Rangliste
  (`src/lib/leaderboard.ts`) summiert sie nur.
- **Ergebnis je Boulder und Person:** `results.status` (`open`/`flash`/`top`/`fail`), `attempts`
  (Gesamtversuche) und `updated_at`. Einen Zeitpunkt des Erfolgs gibt es **nicht**.
- **Stellschrauben pro Session:** `game_mode` (`standard`/`flash_only`), `scoring_mode` (Wertung:
  klassisch/Multiplikator) und `penalty_mode`. Alle sind im `EditSessionDialog` änderbar, danach rechnet
  `recomputeSessionResults` neu.
- **Boulder:** `difficulty`-Code, `color` (aus `src/lib/colors.ts`), `week_bonus`, `gym_boulder_id`. Der
  Hallenbereich (`area`) steht nur am Karten-Boulder, also nur bei Bouldern, die von der Karte übernommen
  wurden.
- **Sessions haben kein Start- oder Enddatum**, nur `created_at`.
- **RLS ist die Sicherheitsgrenze.** Regeln, die nicht umgehbar sein sollen (z.B. ein Zeitlimit),
  gehören in Policies, Trigger oder `security definer`-RPCs, nicht nur ins UI.

## Entschieden: Wo die Modi im UI leben

Die Moduswahl ist **Schritt 1 von „Challenge erstellen“** (`/create`, Karten aus `GAME_MODES` in
`src/lib/gameModes.ts`). Schritt 2 sind die Einstellungen unter `/create?modus=…`. Das Hauptmenü bekommt
keine eigenen Einträge, weil jeder Modus eine Session mit Code, Bouldern und Rangliste bleibt. Der Modus
erscheint als Badge im Session-Kopf und in den Listen der Startseite.

Die geplanten Einträge stehen nach Ebene getrennt in `UPCOMING_MODES`, `UPCOMING_FORMS` und
`UPCOMING_EXTRAS` (Icons in `src/components/gameModeIcons.tsx`). Wenn ein Modus gebaut wird, wandert sein
Eintrag nach `GAME_MODES` (mit seinen Eigenschaften `scoresTop`, `usesMisses`, `requiresDifficulty`). Der
`key` wird dann der Wert in der Datenbank.

Solo-Modi ohne Gruppe (z.B. eine persönliche Hallen-Challenge) gehören eher zur Hallenkarte.

## Grundsatzfrage: Modus oder Option?

`game_mode` ist **ein** Wert pro Session. Einige Ideen sind aber keine eigenständigen Spiele, sondern
Zusätze, die mit jedem Modus Sinn ergeben:

| Eher **Modus** (schließen sich aus) | Eher **Option** (kombinierbar) |
|---|---|
| Nur Flash, X Griffe, Wenige Griffe, Seltenheit, Beste N, Last Man Standing, H-O-R-S-E, Hallen-Bingo, Bereichs-Tour, Pyramide, Handicap, Wetten | **Zeitlimit** (Time Attack), **Teams**, **Erstbegehungs-Bonus**, **Zufalls-Boulder** |

**Empfehlung:** Die Optionen bekommen später ein eigenes Panel „Extras“ in den Einstellungen und werden
in `game_config` gespeichert, nicht als `game_mode`. So geht z.B. „Nur Flash + 60 Minuten + Teams“. In
der Moduswahl dürfen sie trotzdem als Karte stehen: Die Karte „Time Attack“ wäre dann „Standard mit
eingeschaltetem Zeitlimit“. Das sollte entschieden sein, bevor der erste Options-Modus gebaut wird.

## Gemeinsame Bausteine

Die meisten Modi setzen sich aus wenigen technischen Bausteinen zusammen. Wenn man diese einmal sauber
baut, werden die folgenden Modi billig. In den Konzepten unten sind sie mit **[A]–[G]** verwiesen.

- **[A] Modus-Einstellungen `sessions.game_config jsonb`:** Parameter je Modus (Farben, Zeitlimit, X,
  N, …). Ein Typ je Modus in `src/types.ts`, Standardwerte und Prüfung in `gameModes.ts`, Eingabefelder
  in Schritt 2 von `/create` und im `EditSessionDialog`. Der Server prüft nur, was missbrauchbar wäre.
- **[B] Rangliste rechnet:** Heute entstehen Punkte je Ergebnis isoliert. Bei Seltenheit, Beste N,
  Erstbegehung, Teams, Pyramide, Bingo und Bereichs-Tour hängen sie von anderen Ergebnissen oder der
  Reihenfolge ab. Lösung: eine Funktion `scoreSession(session, participants, boulders, results)` in
  `leaderboard.ts`. Sie liefert je Spieler die Gesamtpunkte und je Ergebnis „zählt mit X Punkten“.
  Alle Ranglisten-Ansichten, `PlayerDetail` und `BoulderRanking` nutzen sie. `results.points` bleibt die
  Basis aus `computePoints`. Rein clientseitig, ohne Migration; der Server muss nicht mitrechnen, weil
  niemand die Rangliste fälschen kann, ohne Ergebnisse zu fälschen.
- **[C] Zeitfenster:** `sessions.starts_at` und `ends_at`, gesetzt nur über eine Host-RPC mit
  Serverzeit. Eine Hilfsfunktion `is_session_open(sess)` wird in die `results`-Policies eingehängt.
  Die Handy-Uhr gleicht ihren Versatz zur Serverzeit einmal per RPC `server_now()` ab, damit der
  Countdown stimmt.
- **[D] Runden-Motor:** `sessions.current_round int` und je Teilnehmer ein Rundenzustand
  (`participants.out_in_round`, `participants.letters`). Der Host steuert per RPC
  `start_round`/`close_round`, die RLS lässt nur Ergebnisse für den Boulder der laufenden Runde zu.
- **[E] Zeitpunkt des Erfolgs `results.topped_at`:** Ein Trigger setzt `now()`, wenn der Status auf
  `flash`/`top` wechselt, und leert ihn beim Zurücknehmen. Daraus folgt „wer war Erster“ und „vor der
  Frist geschafft“.
- **[F] Teams `participants.team smallint`:** Teamzuordnung je Teilnehmer, Namen und Farben der Teams
  in `game_config`.
- **[G] Griffzahl `results.holds smallint`:** wird beim Top eingetragen.

Aufwand: **S** = Nachmittag, **M** = 1–2 Sitzungen, **L** = mehrere Sitzungen. Der Aufwand gilt ohne die
Bausteine, die schon stehen.

---

## Konzepte je Modus

### Nur Flash – ✅ gebaut in 1.26.0
„Flash oder nichts“. Ein Flash bringt die Flash-Punkte, alles andere bringt 0, ohne Minuspunkte.
Versuchskosten und Strafmodus sind ausgeblendet, ×Grad und Boulder der Woche wirken weiter. Der
Top-Knopf bleibt für die Statistik („zählt nur Flash“), der Versuchszähler entfällt (`countsAttempts`).

### Time Attack – Punkte gegen die Uhr (M) · [A] [C]
- **Spielidee:** Alle haben dasselbe Zeitfenster, z.B. 60 Minuten. Wer darin die meisten Punkte holt,
  gewinnt.
- **Ablauf:**
  1. Der Host legt die Dauer fest (30/45/60/90 min, `game_config.durationMin`). Die Session steht danach
     auf „Wartet auf Start“. Boulder dürfen schon angelegt werden, Ergebnisse noch nicht.
  2. Der Host tippt „Start“. Die RPC `start_timer` setzt `starts_at = now()` und
     `ends_at = now() + Dauer`.
  3. Im Session-Kopf läuft ein großer Countdown, in den letzten 5 Minuten rot.
  4. Bei 0 kommt das Banner „Zeit ist um“, die Eingabe ist gesperrt, und die Rangliste zeigt das
     Endergebnis mit Treppchen.
- **Wertung:** Unverändert über die eingestellte Wertung, Zeit ändert nur das Fenster. Bei
  Punktgleichheit gewinnt, wer weniger Versuche brauchte.
- **Server:** `results_insert`/`update` nur, wenn `is_session_open`. Eine **Gnadenfrist von 2 Minuten**
  nach `ends_at` gilt, weil man nach dem letzten Zug erst eintippen muss. Die Frist gilt nur für
  Boulder, die vor Ablauf schon einen Eintrag hatten oder in dieser Zeit neu eingetragen werden.
- **Host-Extras:** „+5 min“ (RPC `extend_timer`) und „Abbrechen“. Pause eher nicht, weil man in der
  Halle ohnehin nicht anhält.
- **Offen:**
  - Option statt Modus? (siehe Grundsatzfrage)
  - Gnadenfrist fest oder einstellbar?
  - Auch ein Zeitlimit pro Boulder (Stoppuhr)? Das wäre eher ein eigener Modus.

### Farb-Challenge – Nur bestimmte Farben zählen (S–M) · [A]
- **Spielidee:** Die Session legt fest, welche Hallenfarben im Spiel sind, z.B. nur Rot und Grün.
- **Ablauf:** In Schritt 2 wählt man die erlaubten Farben als Mehrfachauswahl aus `BOULDER_COLORS`
  (`game_config.colors`, mindestens eine).
  - Im `AddBoulderDialog` bietet der `ColorPicker` nur diese Farben an, und die Farbe ist Pflicht.
  - Auf der Karte sind im Auswahlmodus andere Farben ausgegraut und nicht wählbar. Dafür lässt sich
    das bestehende Ausgrauen der Filter nutzen.
  - Der Session-Kopf zeigt die Farbpunkte.
- **Wertung:** unverändert.
- **Server:** Ein `before insert or update`-Trigger auf `boulders` lehnt fremde Farben ab. Damit sind
  alle Boulder einer Session immer gültig, und die Wertung muss nichts prüfen.
- **Später ändern:** Der Host darf Farben nur hinzufügen. Wegnehmen geht nur, wenn kein Boulder die
  Farbe trägt; der Dialog nennt sonst die betroffenen Boulder.
- **Erweiterung „Themen-Challenge“:** Dieselbe Mechanik mit Grad-Spanne (`gradeMin`/`gradeMax`) und
  Bereichen (`areas`, nur für Karten-Boulder). Empfehlung: gleich als `theme` mit drei optionalen
  Filtern bauen, die Karte heißt weiter „Farb-Challenge“.
- **Offen:** Themen-Variante gleich mitbauen?

### Last Man Standing – Wer nicht toppt, fliegt raus (M–L) · [D]
- **Spielidee:** Ausscheidungsrunden. Pro Runde gibt es einen Boulder. Wer ihn nicht schafft, ist raus,
  und der Letzte gewinnt.
- **Ablauf:**
  1. Runde n = Boulder mit `seq` n. Der Host kann die Liste vorab bauen oder jede Runde live einen
     Boulder anlegen.
  2. Der Host tippt „Runde starten“. Die Session zeigt groß **nur** den aktuellen Boulder und die Liste
     „Noch dabei“ / „Raus“.
  3. Jeder noch Aktive hat **N Versuche** (`game_config.attemptsPerRound`, Standard 3; 1 = Flash
     nötig).
  4. Der Host tippt „Runde beenden“. Die RPC `close_round` setzt `out_in_round = n` bei allen ohne Top
     innerhalb von N Versuchen.
  5. **Alle raus?** Dann bleiben alle drin, und die Runde zählt nicht.
  6. Es endet, wenn höchstens einer übrig ist oder die Boulder ausgehen.
- **Wertung:** keine Punkte. Platz nach Ausscheide-Runde (später raus = besser). Gleichstand in einer
  Runde trennt die Zahl der Tops, dann die Zahl der Versuche.
- **Server:** RLS lässt Ergebnisse nur für den Boulder der laufenden Runde und nur für nicht
  ausgeschiedene Teilnehmer zu. Ab dem N-ten Fehlversuch ist kein Top mehr möglich (Prüfung in der
  Policy oder per Trigger).
- **UI:** `shared_scoring` passt gut, weil ein Schiedsrichter für alle eintragen kann. Die Rangliste ist
  eine Ausscheide-Treppe statt Punktetabelle.
- **Offen:**
  - Synchron (alle am selben Boulder) ist die Empfehlung; jeder im eigenen Tempo wäre deutlich
    komplizierter.
  - Darf der Host einen Ausgeschiedenen zurückholen (Fehlklick)?

### Wetten – Punkte auf Flash oder Top setzen (L) · [B] + Tabelle `bets`
- **Spielidee:** Neben dem Klettern wettet man mit Chips, ob man selbst oder andere einen Boulder
  flashen, toppen oder nicht schaffen.
- **Ablauf:**
  1. Jeder startet mit 100 Chips (`game_config.startChips`). Chips sind getrennt von den
     Kletterpunkten.
  2. Auf einer Boulder-Karte tippt man bei einem Mitspieler (oder sich selbst) auf „Wetten“ und wählt
     Vorhersage und Einsatz.
  3. Gewettet werden darf nur, solange das Ziel bei diesem Boulder noch **keinen Versuch** eingetragen
     hat.
  4. Quoten sind fest: **Flash ×3, Top ×2, „Kein Top“ ×2**. Ein Flash zählt auch als Top. Optional
     später Quoten nach Grad.
  5. Aufgelöst wird **ohne Trigger**: Die Rangliste rechnet [B] aus Wetten und aktuellen Ergebnissen.
     „Kein Top“ gilt erst als gewonnen, wenn der Host die Session beendet, weil ein Fail später noch
     zum Top werden kann.
- **Wertung:** Zwei Ranglisten, „Klettern“ (Punkte) und „Wetten“ (Chips), plus „Gesamt“ = Punkte +
  Chip-Gewinn.
- **Daten & Server:** Tabelle `bets` mit `session_id`, `boulder_id`, `bettor_id`, `target_id`,
  `prediction` (`flash`/`top`/`no_top`), `stake` und `created_at`.
  - Angelegt wird nur über eine RPC `place_bet`. Sie prüft, dass der Wettende Mitglied ist, das Ziel
    beim Boulder noch keinen Versuch hat und das Chip-Guthaben reicht. Das Guthaben rechnet sie
    serverseitig aus offenen Einsätzen und aufgelösten Wetten.
  - Lesen dürfen alle Mitglieder. Die eigene Wette zurückziehen geht, solange das Ziel noch keinen
    Versuch hat.
- **Offen:**
  - Wetten auf sich selbst erlauben? Eine Wette auf den eigenen Fail wäre ein Anreiz zu schummeln,
    darum bei sich selbst nur „Flash“ und „Top“.
  - Höchsteinsatz je Wette?

### Wenige Griffe – Toppen mit möglichst wenig Griffen (M) · [G] [B] – Bedeutung erst klären
- **Spielidee (Vermutung):** Ein „Eliminate“-Spiel. Man toppt den Boulder und benutzt dabei möglichst
  wenige der vorgesehenen Griffe.
- **Ablauf:** Beim Top erscheint im `ResultEditor` ein Stepper „Griffe benutzt“ (`results.holds`). Ohne
  Zahl zählt der Top noch nicht.
- **Wertung (relativ je Boulder, [B]):** Wer die wenigsten Griffe brauchte, bekommt am meisten:
  Platz 1 = 10, 2 = 8, 3 = 6, 4 = 5, 5 = 4 … (Gleichstand teilt). Kein Top = 0. Die
  `BoulderRanking` sortiert nach Griffen. So braucht kein Boulder eine „offizielle“ Griffzahl.
- **Alternative (absolut):** Jeder Boulder bekommt beim Anlegen seine Griffzahl, und es gibt einen
  Bonus pro eingespartem Griff. Das erfordert mehr Pflege und ist fehleranfälliger.
- **Offen:** Bedeutung beim Feedbackgeber bestätigen. Zählen Tritte mit?

### X Griffe – Die meisten Boulder mit höchstens X Griffen (S) · [A] – Bedeutung erst klären
- **Spielidee (Vermutung):** Vor dem Start wird X festgelegt (`game_config.maxHolds`, z.B. 6). Man darf
  pro Boulder höchstens X Griffe benutzen, und wer die meisten schafft, gewinnt.
- **Ablauf:** Der Session-Kopf zeigt groß „Max. 6 Griffe“. Das Einhalten ist Ehrensache, die App zählt
  keine Griffe.
- **Wertung:** neuer Zweig in `computePoints`: Flash/Top = 1, sonst 0. Mit Wertung „Multiplikator“
  zählt ein Top den Grad-Faktor, sodass schwere Boulder mehr bringen. Versuche sind egal.
- **Offen:** Sind vielleicht Boulder gemeint, die *genau* X Griffe haben? Mit „Wenige Griffe“ zu
  **einem** Modus „Griffe“ mit zwei Varianten zusammenlegen?

### Beste N – Nur deine besten Boulder zählen (S) · [A] [B]
- **Spielidee:** Wie im Wettkampf zählen nur die N besten Ergebnisse jeder Person (`game_config.bestN`,
  Standard 5). Viele leichte Boulder bringen nichts, wenige schwere schon.
- **Wertung ([B]):** Je Spieler werden die N höchsten **positiven** `results.points` summiert. Fails
  schaden nicht, und genau das ist der Reiz: Probieren lohnt sich. Gleichstand: das N+1-te Ergebnis
  entscheidet.
- **UI:** Die Rangliste zeigt „zählt 5 von 8“. In `PlayerDetail` und auf den eigenen Boulder-Karten
  markiert ein Stern die zählenden Ergebnisse. Ein Hinweis zeigt, was der nächste Top bringen müsste,
  um mitzuzählen.
- **Gut als Einstieg in [B]**, weil die Regel trivial ist.

### Seltenheit – Seltene Tops zählen mehr (M) · [B]
- **Spielidee:** Dynamische Wertung wie im Wettkampf. Jeder Boulder hat einen Topf von z.B. 1000 Punkten,
  der unter allen aufgeteilt wird, die ihn toppen. Ein Boulder, den nur du schaffst, bringt 1000, einer,
  den alle vier schaffen, bringt 250.
- **Wertung ([B]):** Pro Top `topf / Anzahl Tops`, ein Flash bekommt +20 %. Fehlversuche kosten nichts.
  Die Wertung ersetzt Klassisch/Multiplikator, deshalb ist das Panel „Wertung“ ausgeblendet.
- **UI:** Jede Boulder-Karte zeigt den aktuellen Wert („gerade 333 P.“). Die Rangliste ist bewusst in
  Bewegung: Toppt ein anderer „deinen“ Boulder, sinken deine Punkte. Das ist der Spaß an dem Modus.
- **Offen:** Topf je Grad unterschiedlich (z.B. 100 × Faktor)? Zählt der eigene Top schon, wenn man
  allein in der Session ist?

### Erstbegehung – Bonus für den ersten Top (S–M) · [E] [B]
- **Spielidee:** Normale Wertung. Wer einen Boulder als Erster der Gruppe toppt, bekommt einen Bonus
  (`game_config.firstBonus`, Standard +10 oder ×2).
- **Wertung ([B]):** Pro Boulder bekommt das Ergebnis mit dem kleinsten `topped_at` [E] den Bonus. Wird
  der Top zurückgenommen, rückt der Nächste nach.
- **UI:** Auf der Karte steht eine Fahne „Erstbegehung: Alex“, dazu ein kurzer Toast für alle, wenn sie
  vergeben wird.
- **Haken:** Gezählt wird die Reihenfolge des **Eintragens**, nicht des Kletterns. Das ist akzeptabel,
  weil es zum sofortigen Eintragen anregt, sollte aber im Hinweistext stehen.
- **Eher Option als Modus** (siehe Grundsatzfrage).

### Handicap – Punkte nach eigenem Niveau (M) · [A]
- **Spielidee:** Gemischte Gruppen spielen fair. Jeder gibt sein Niveau an (einen Grad), und Punkte gibt
  es relativ dazu.
- **Ablauf:** Beim Erstellen und Beitreten wählt man „Dein Niveau“ (`participants.level`, Grad-Code),
  änderbar im eigenen Profil der Session. Der Grad ist bei Bouldern Pflicht.
- **Wertung:** Der Faktor hängt am Abstand zwischen Boulder-Grad und eigenem Niveau:
  ≤ −2 → ×0,25 · −1 → ×0,5 · 0 → ×1 · +1 → ×1,5 · +2 → ×2 · ≥ +3 → ×3. Das läuft in `computePoints`
  mit dem Niveau des Teilnehmers (neuer Parameter), sodass gespeicherte Punkte weiter funktionieren.
  Ändert jemand sein Niveau, werden nur seine eigenen Ergebnisse neu berechnet.
- **Server:** Niveau-Änderungen werden protokolliert oder nach dem ersten Ergebnis gesperrt, damit
  niemand sich kurz vor Schluss schlechter macht. Empfehlung: nach dem ersten eigenen Top darf nur noch
  der Host ändern.
- **Offen:** Tabelle der Faktoren so oder linear? Niveau später pro Halle merken (Karte)?

### Teams – Gemeinsam punkten (M) · [F]
- **Spielidee:** Zwei bis vier Teams. Jeder klettert für sich, die Punkte zählen fürs Team.
- **Ablauf:**
  - Beim Beitreten wählt man ein Team, oder der Host verteilt (Knopf „Zufällig verteilen“).
  - Teamnamen und -farben stehen in `game_config.teams`, mit Vorschlägen wie „Crimps“ gegen „Slopers“.
- **Wertung:** Pro Ergebnis unverändert. Die Team-Rangliste summiert. Bei ungleich großen Teams lässt
  sich auf **Durchschnitt pro Kopf** umschalten (`game_config.teamScore`).
- **UI:** Der Ranglisten-Kopf zeigt die Teams gegeneinander (Balken), darunter die Einzelwertung mit
  Teamfarbe. Session-Kopf: „Team Crimps führt mit 45“.
- **Eher Option als Modus:** Teams passen auf fast jeden Modus (Teams + Time Attack, Teams + Bingo).

### Hallen-Bingo – Eine Reihe Aufgaben voll machen (M–L) · [A] [E] [B]
- **Spielidee:** Alle bekommen dieselbe 4×4-Karte (oder 3×3) mit Aufgaben, etwa „ein blauer Boulder“,
  „ein Boulder im Abenteuerland“, „Grad 5+ geflasht“, „der Boulder der Woche“ oder „ein Boulder ohne
  Fehlversuch“. Wer zuerst eine Reihe, Spalte oder Diagonale voll hat, ruft Bingo.
- **Ablauf:**
  - Beim Erstellen würfelt die App die Karte aus einem Aufgabenkatalog (`src/lib/bingoTasks.ts`, jede
    Aufgabe als Prüffunktion über Boulder und Ergebnis) und speichert sie in `game_config.bingo`.
    „Neu würfeln“ ist möglich. Es kommen nur Aufgaben auf die Karte, die die Halle hergibt, z.B. keine
    Farbe, die es gerade nicht gibt.
  - Die Felder haken sich **automatisch** ab, wenn ein passender Top eingetragen ist. Ein Boulder
    erfüllt höchstens ein Feld; die Zuordnung ist ein kleines Matching, bei 16 Feldern problemlos.
- **Wertung ([B]):** 1 Punkt pro Feld, 3 pro voller Linie. Bingo-Sieger ist, wer zuerst eine Linie hatte
  (über `topped_at` [E]).
- **UI:** Die Bingo-Karte ist der Kopf der Session und füllt sich live, dazu kommen die Karten der
  anderen klein in der Rangliste. Bereichs-Aufgaben gehen nur mit Bouldern von der Hallenkarte.
- **Offen:** Gleiche Karte für alle (fair, Empfehlung) oder je Spieler eine eigene?

### Bereichs-Tour – In jedem Bereich einer (M) · [B]
- **Spielidee:** Man kommt einmal durch die ganze Halle und braucht in jedem der 7 Bereiche (`HALL_AREAS`)
  mindestens einen Top.
- **Ablauf:** Es zählen nur Boulder von der Hallenkarte, weil nur sie einen Bereich haben. Frei angelegte
  Boulder sind im Modus nicht möglich, oder man wählt den Bereich beim Anlegen von Hand.
- **Wertung ([B]):** Rangfolge nach Anzahl abgehakter Bereiche, dann nach Punkten. Wer alle 7 hat,
  bekommt einen Bonus. Variante: Je Bereich zählt nur der beste Boulder.
- **UI:** Ein Grundriss wie die `MiniMap`, aber groß, mit den Bereichen eingefärbt, sobald man dort
  getoppt hat; je Spieler in der Rangliste. Die Bauteile dafür (`HALL_AREAS`, `MAP_STYLE.mini`) gibt es
  schon.
- **Offen:** Mindestgrad je Bereich, damit man nicht nur die leichtesten nimmt?

### Pyramide – Viele leichte, wenige schwere (M) · [A] [B]
- **Spielidee:** Jeder baut seine Pyramide: 4× Grad X, 3× X+1, 2× X+2, 1× X+3. Es zählt nur, was in die
  Pyramide passt, und wer sie zuerst voll hat oder am weitesten kommt, gewinnt.
- **Ablauf:** X wählt **jeder selbst** beim Beitreten, wie das Niveau beim Handicap (gleiches Feld
  `participants.level`). Die Form steht in `game_config.shape`, Standard `[4,3,2,1]`. Der Grad ist
  Pflicht.
- **Wertung ([B]):** Jeder Top füllt einen freien Platz seiner Stufe. Ein schwererer Boulder darf einen
  leeren tieferen Platz füllen, ein leichterer nie. Punkte = gefüllte Plätze × Stufe (1–4), dazu ein
  Bonus für die volle Pyramide. Überzählige Tops zählen 0.
- **UI:** Die eigene Pyramide als Grafik im Kopf, die sich Stein für Stein füllt. Die Rangliste zeigt
  kleine Pyramiden.
- **Offen:** Gilt ein Flash mehr?

### H-O-R-S-E – Nachklettern oder Buchstabe (L) · [D]
- **Spielidee:** Wie beim Basketball-Spiel. Reihum gibt einer einen Boulder vor und muss ihn selbst
  schaffen. Wer ihn danach nicht nachklettert, bekommt einen Buchstaben, und mit H-O-R-S-E ist man raus.
- **Ablauf (Runden-Motor [D]):**
  1. Der Vorgeber (Reihenfolge nach Beitritt) legt den Boulder an oder wählt ihn auf der Karte.
  2. Er muss ihn in N Versuchen schaffen. Schafft er es nicht, gibt es keine Buchstaben, und der
     Nächste gibt vor.
  3. Alle anderen Aktiven müssen in N Versuchen nachziehen; wer scheitert, bekommt einen Buchstaben
     (`participants.letters`).
  4. Mit 5 Buchstaben ist man raus. Der Letzte gewinnt.
- **Varianten:** Das Wort ist einstellbar, z.B. „B-O-U-L-D-E-R“ mit 7 Buchstaben für längere Spiele.
- **UI:** Buchstaben-Anzeige je Spieler, und der aktuelle Vorgeber ist hervorgehoben.
- **Baut direkt auf Last Man Standing auf**; danach ist es eher M.

### Zufalls-Boulder – Die App lost aus (M) · [C] [E]
- **Spielidee:** Die App zieht einen zufälligen Boulder von der Hallenkarte. Wer ihn innerhalb einer
  Frist toppt, bekommt doppelte Punkte.
- **Ablauf:**
  - Ein Knopf „Würfeln“ (Host oder alle, einstellbar) ruft die RPC `draw_random_boulder`. Sie zieht
    serverseitig einen nicht abgeschraubten Karten-Boulder, optional in einer Grad-Spanne, und legt
    ihn in der Session an mit `bonus_until = now() + Frist` (z.B. 15 min).
  - Die Karte des Boulders zeigt einen Countdown, und die Mini-Karte führt hin.
- **Wertung:** Bonus ×2, wenn `topped_at` [E] ≤ `bonus_until`. Gerechnet wird in der Rangliste [B] oder
  über einen Trigger wie beim Boulder der Woche.
- **Varianten:** Als **Option** zu jedem Modus (alle 20 min ein Zufalls-Boulder) oder als eigener Modus,
  bei dem **nur** gezogene Boulder zählen.
- **Offen:** Wer darf würfeln? Wie oft?

---

## Empfohlene Reihenfolge (aktualisiert)

Geordnet so, dass jeder Schritt einen Baustein legt, den spätere Modi wiederverwenden:

1. ~~**Gerüst + Nur Flash**~~ – erledigt in 1.26.0.
2. ~~**Grundsatzfrage Modus/Option**~~ – entschieden: drei Ebenen. ~~[B] Rangliste rechnet~~,
   ~~[H] Spielende~~, ~~Spielleitung~~, ~~Verlassen~~ – erledigt in 1.26.2–1.28.0.
   ~~Release 4 (Grad-Codes)~~ – erledigt in 1.29.0.
3. **Beste N** (S): erster Modus auf [B]; legt `game_config` [A] an (für N) und füllt den `switch` in
   `scoreSession`.
4. **Farb-Challenge** (S–M) und **X Griffe** (S): nutzen [A], keine neue Wertungsmechanik.
5. **Time Attack** (M): baut [C], die erste serverseitige Ablaufregel.
6. **Erstbegehung** (S–M): baut [E]. Danach sind **Seltenheit**, **Teams** [F] und
   **Zufalls-Boulder** günstig.
7. **Handicap** und **Pyramide**: teilen sich `participants.level`.
8. **Last Man Standing** (M–L): baut [D], danach **H-O-R-S-E**.
9. **Hallen-Bingo**, **Bereichs-Tour**.
10. **Wenige Griffe** [G]: erst nach Rückfrage zur Bedeutung.
11. **Wetten** (L): zuletzt, wenn [B] erprobt ist.

## Konventionen fürs Umsetzen (aus `CLAUDE.md`)

- Migrationen nummeriert fortführen (nächste: `0025_…`), **idempotent** schreiben, `src/types.ts`
  manuell mitziehen. Vor dem Push per Supabase-MCP anwenden und Setup-Schritt in `CLAUDE.md` ergänzen.
- `computePoints` bleibt die Quelle der Basis-Punkte. Neue Faktoren laufen überall mit, wo heute
  `difficulty`/`weekBonus` mitlaufen (`upsertResult`, `recomputeSessionResults`, `ResultEditor`).
  Relative Wertungen laufen über [B].
- Modus-Eintrag aus `UPCOMING_MODES` nach `GAME_MODES` verschieben (mit Eigenschaften), CHECK auf
  `sessions.game_mode` per Migration erweitern. Keine Abfragen auf einzelne Modus-Werte verstreuen –
  nur die Eigenschaften abfragen; relative Wertungen gehören in `scoreSession`.
- Migrationen, die die **Bedeutung** gespeicherter Daten ändern, erst ausrollen, wenn die Vorversion
  einige Tage draußen ist (PWA-Update kommt beim nächsten Zurückkehren in die App).
- Versionssprung (neues Feature = Minor) plus Changelog-Eintrag oben in `src/lib/changelog.ts`, im
  selben Commit. Commit-Stil: `Update version to X.Y.Z and …`. Direkt auf `main` committen und pushen.
- UI-Texte und Kommentare auf Deutsch.

## Startprompt für den neuen Chat

> Lies `spielmodi.md` und `CLAUDE.md`. Wir bauen Spielmodi für die Boulder-Challenges. Das Grundgerüst
> steht (1.26.2–1.29.0), alle Modi haben ein Konzept. Wähle mit mir den nächsten Modus laut „Empfohlene
> Reihenfolge“, kläre seine offenen Fragen und erstelle einen Plan.
