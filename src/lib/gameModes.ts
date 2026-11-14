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

// Angekündigte Modi: nur als ausgegraute „bald“-Karte in der Moduswahl, nicht wählbar
// und (noch) nicht im CHECK der Datenbank.
export const UPCOMING_GAME_MODES: { key: string; title: string; subtitle: string }[] = [
  { key: 'time_attack', title: 'Time Attack', subtitle: 'Punkte gegen die Uhr' },
]

export function isGameMode(value: unknown): value is GameMode {
  return GAME_MODES.some((m) => m.value === value)
}

export function gameModeInfo(value: GameMode): GameModeInfo {
  return GAME_MODES.find((m) => m.value === value) ?? GAME_MODES[0]
}
