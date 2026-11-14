import type { GameMode } from '../types'

// Katalog der Spielmodi – einzige Quelle der Wahrheit für Anzeige-Texte und Reihenfolge
// (Moduswahl beim Erstellen, Edit-Dialog, Badges). Ein neuer Modus braucht hier einen
// Eintrag, den Typ `GameMode` in types.ts, eine Migration für den CHECK auf
// `sessions.game_mode` und – falls er die Punkte ändert – einen Zweig in computePoints.

export interface GameModeInfo {
  value: GameMode
  title: string
  // Kurzer Untertitel auf der Karte
  subtitle: string
  // Ein, zwei Sätze Erklärung
  description: string
}

export const GAME_MODES: GameModeInfo[] = [
  {
    value: 'standard',
    title: 'Standard',
    subtitle: 'Flash, Top & Versuche',
    description: 'Flash und Top bringen Punkte, Fehlversuche kosten – wie du es einstellst.',
  },
  {
    value: 'flash_only',
    title: 'Nur Flash',
    subtitle: 'Top zählt nichts',
    description:
      'Nur ein Flash bringt Punkte. Ein Top nach Fehlversuchen oder ein nicht geschaffter Boulder zählt 0 – Minuspunkte gibt es keine.',
  },
]

// Angekündigte Modi: nur als ausgegraute Kachel unter „Bald verfügbar“ in der Moduswahl,
// nicht wählbar und (noch) nicht im CHECK der Datenbank. Wird ein Modus gebaut, wandert er
// von hier nach GAME_MODES. Erst die Wünsche aus dem Feedback, dann die eigenen Ideen
// (Details und offene Fragen: spielmodi.md).
export const UPCOMING_GAME_MODES: { key: string; title: string; subtitle: string }[] = [
  // Aus dem Feedback
  { key: 'time_attack', title: 'Time Attack', subtitle: 'Punkte gegen die Uhr' },
  { key: 'color', title: 'Farb-Challenge', subtitle: 'Nur bestimmte Farben zählen' },
  {
    key: 'last_man_standing',
    title: 'Last Man Standing',
    subtitle: 'Wer nicht toppt, fliegt raus',
  },
  { key: 'bets', title: 'Wetten', subtitle: 'Punkte auf Flash oder Top setzen' },
  { key: 'few_holds', title: 'Wenige Griffe', subtitle: 'Toppen mit möglichst wenig Griffen' },
  { key: 'max_holds', title: 'X Griffe', subtitle: 'Die meisten Boulder mit höchstens X Griffen' },
  // Ideen
  { key: 'best_n', title: 'Beste N', subtitle: 'Nur deine besten Boulder zählen' },
  { key: 'rarity', title: 'Seltenheit', subtitle: 'Seltene Tops zählen mehr' },
  { key: 'first_ascent', title: 'Erstbegehung', subtitle: 'Bonus für den ersten Top' },
  { key: 'handicap', title: 'Handicap', subtitle: 'Punkte nach eigenem Niveau' },
  { key: 'teams', title: 'Teams', subtitle: 'Gemeinsam punkten' },
  { key: 'bingo', title: 'Hallen-Bingo', subtitle: 'Eine Reihe Aufgaben voll machen' },
  { key: 'area_tour', title: 'Bereichs-Tour', subtitle: 'In jedem Bereich einer' },
  { key: 'pyramid', title: 'Pyramide', subtitle: 'Viele leichte, wenige schwere' },
  { key: 'horse', title: 'H-O-R-S-E', subtitle: 'Nachklettern oder Buchstabe' },
  { key: 'random', title: 'Zufalls-Boulder', subtitle: 'Die App lost aus' },
]

export function isGameMode(value: unknown): value is GameMode {
  return GAME_MODES.some((m) => m.value === value)
}

export function gameModeInfo(value: GameMode): GameModeInfo {
  return GAME_MODES.find((m) => m.value === value) ?? GAME_MODES[0]
}
