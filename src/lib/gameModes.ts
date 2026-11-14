import type { GameMode } from '../types'

// Katalog der Spielmodi – einzige Quelle der Wahrheit für Anzeige-Texte, Reihenfolge und
// die EIGENSCHAFTEN jedes Modus (Moduswahl beim Erstellen, Edit-Dialog, Badges,
// Einstellungen, Ergebnis-Eingabe).
//
// Drei Ebenen (siehe spielmodi.md):
//   - Spielform: wie gespielt wird (frei, Runden, Sammelspiel) – heute nur „frei“, kein
//     DB-Feld; die Formen sind angekündigt.
//   - Modus (`sessions.game_mode`): wie Punkte entstehen – Standard, Nur Flash, …
//   - Extras: Zusätze, die sich mit jedem Modus kombinieren lassen (Zeitlimit, Teams, …) –
//     heute alle angekündigt, nie vorbelegt (`defaultOn: false`).
// Nicht zu verwechseln mit der „Wertung“ (Klassisch/Multiplikator, `sessions.scoring_mode`).
//
// Ein neuer Modus braucht: einen Eintrag hier (mit seinen Eigenschaften), den Typ `GameMode`
// in types.ts, eine Migration für den CHECK auf `sessions.game_mode` und seine Wertungsregel
// (computePoints in scoring.ts bzw. scoreSession in leaderboard.ts). Alle anderen Stellen
// fragen nur die Eigenschaften ab – keine Abfragen auf einzelne Modus-Werte verstreuen.

export interface GameModeInfo {
  value: GameMode
  title: string
  // Kurzer Untertitel auf der Karte
  subtitle: string
  // Ein, zwei Sätze Erklärung
  description: string
  // Bringt ein Top (nach Fehlversuchen) Punkte? Sonst blenden die Einstellungen „Punkte für
  // Top“ aus.
  scoresTop: boolean
  // Ein Versuch pro Boulder: Die Eingabe bietet nur Flash oder „Nope“ (gespeichert als
  // `fail` mit 1 Versuch), einen Top-Knopf gibt es nicht. Jedes Ergebnis ≠ offen gilt als
  // erledigt (isResultDone in scoring.ts).
  singleAttempt: boolean
  // Wirken Fehlversuche (Kosten pro Fehlversuch, Strafmodus)? Sonst entfallen diese
  // Einstellungen und der Versuchszähler (countsAttempts).
  usesMisses: boolean
  // Ist der Grad beim Anlegen eines Boulders Pflicht? (Zusätzlich zur Wertung
  // „Multiplikator“, die ihn ohnehin verlangt.)
  requiresDifficulty: boolean
}

export const GAME_MODES: GameModeInfo[] = [
  {
    value: 'standard',
    title: 'Standard',
    subtitle: 'Flash, Top & Versuche',
    description: 'Flash und Top bringen Punkte, Fehlversuche kosten – wie du es einstellst.',
    scoresTop: true,
    usesMisses: true,
    singleAttempt: false,
    requiresDifficulty: false,
  },
  {
    value: 'flash_only',
    title: 'Nur Flash',
    subtitle: 'Ein Versuch pro Boulder',
    description:
      'Ein Versuch pro Boulder: Ein Flash bringt Punkte, danach ist der Boulder durch. Minuspunkte gibt es keine.',
    scoresTop: false,
    usesMisses: false,
    singleAttempt: true,
    requiresDifficulty: false,
  },
]

// Angekündigte Einträge: nur als ausgegraute Kachel unter „bald verfügbar“ in der
// Moduswahl, nicht wählbar und (noch) nicht in der Datenbank. Wird einer gebaut, wandert er
// in die passende Liste der wählbaren Einträge. `key` = späterer Wert in der Datenbank.
// Details und offene Fragen: spielmodi.md.
export interface UpcomingEntry {
  key: string
  title: string
  subtitle: string
}

// Weitere Modi (wie Punkte entstehen).
export const UPCOMING_MODES: UpcomingEntry[] = [
  { key: 'best_n', title: 'Beste N', subtitle: 'Nur deine besten Boulder zählen' },
  { key: 'rarity', title: 'Seltenheit', subtitle: 'Seltene Tops zählen mehr' },
  { key: 'handicap', title: 'Handicap', subtitle: 'Punkte nach eigenem Niveau' },
  { key: 'pyramid', title: 'Pyramide', subtitle: 'Viele leichte, wenige schwere' },
  { key: 'max_holds', title: 'X Griffe', subtitle: 'Die meisten Boulder mit höchstens X Griffen' },
  { key: 'few_holds', title: 'Wenige Griffe', subtitle: 'Toppen mit möglichst wenig Griffen' },
]

// Spielformen (wie gespielt wird).
export const UPCOMING_FORMS: UpcomingEntry[] = [
  {
    key: 'last_man_standing',
    title: 'Last Man Standing',
    subtitle: 'Wer nicht toppt, fliegt raus',
  },
  { key: 'horse', title: 'H-O-R-S-E', subtitle: 'Nachklettern oder Buchstabe' },
  { key: 'bingo', title: 'Hallen-Bingo', subtitle: 'Eine Reihe Aufgaben voll machen' },
  { key: 'area_tour', title: 'Bereichs-Tour', subtitle: 'In jedem Bereich einer' },
]

// Extras (mit jedem Modus kombinierbar). Nie vorbelegt – auch das Zeitlimit muss man bewusst
// einschalten.
export interface UpcomingExtra extends UpcomingEntry {
  defaultOn: false
}

export const UPCOMING_EXTRAS: UpcomingExtra[] = [
  {
    key: 'time_attack',
    title: 'Zeitlimit',
    subtitle: 'Time Attack – Punkte gegen die Uhr',
    defaultOn: false,
  },
  { key: 'color', title: 'Farbfilter', subtitle: 'Nur bestimmte Farben zählen', defaultOn: false },
  { key: 'teams', title: 'Teams', subtitle: 'Gemeinsam punkten', defaultOn: false },
  {
    key: 'first_ascent',
    title: 'Erstbegehung',
    subtitle: 'Bonus für den ersten Top',
    defaultOn: false,
  },
  { key: 'random', title: 'Zufalls-Boulder', subtitle: 'Die App lost aus', defaultOn: false },
  { key: 'bets', title: 'Wetten', subtitle: 'Punkte auf Flash oder Top setzen', defaultOn: false },
]

export function isGameMode(value: unknown): value is GameMode {
  return GAME_MODES.some((m) => m.value === value)
}

export function gameModeInfo(value: GameMode | null | undefined): GameModeInfo {
  return GAME_MODES.find((m) => m.value === value) ?? GAME_MODES[0]
}

// Der Standard-Modus – Badges und Hinweise erscheinen nur für Modi abseits davon.
export function isDefaultGameMode(value: GameMode | null | undefined): boolean {
  return gameModeInfo(value).value === GAME_MODES[0].value
}
