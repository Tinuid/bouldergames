// Wählbare Schwierigkeiten – einzige Quelle der Wahrheit (analog zu colors.ts).
//
// In der DB steht in `boulders.difficulty` (int) der `code`. Für die Grade 1–7 ist
// code === Grad === Faktor. Die Sonderstufen "?" und "!" sind in der Halle eigene
// Markierungen und bekommen darum einen eigenen Code (8 / 9), der NICHT mit 1–7
// kollidiert – nur so bleiben sie überall als "?"/"!" erkennbar statt als Grad 4/6.
// Ihr Wertungs-Faktor (Multiplikator-Modus) ist davon entkoppelt: "?" zählt 4, "!" 6.
//
// Neue Stufen NUR hier ergänzen. Wer den Faktor serverseitig braucht (Rescale-Trigger
// bei nachträglicher Grad-Änderung), muss das Mapping in der SQL-Migration spiegeln –
// siehe supabase/migrations/0008_difficulty_special_grades.sql.

export interface DifficultyOption {
  // In boulders.difficulty gespeicherter Wert.
  code: number
  // Anzeige ("1"…"7", "?", "!").
  label: string
  // Punkte-Faktor im Multiplikator-Modus.
  factor: number
}

export const DIFFICULTIES: DifficultyOption[] = [
  { code: 1, label: '1', factor: 1 },
  { code: 2, label: '2', factor: 2 },
  { code: 3, label: '3', factor: 3 },
  { code: 4, label: '4', factor: 4 },
  { code: 5, label: '5', factor: 5 },
  { code: 6, label: '6', factor: 6 },
  { code: 7, label: '7', factor: 7 },
  { code: 8, label: '?', factor: 4 },
  { code: 9, label: '!', factor: 6 },
]

const BY_CODE = new Map(DIFFICULTIES.map((d) => [d.code, d]))

// Anzeige-Label zu einem gespeicherten Code (z.B. für "Grad X"). null = kein Grad.
// Unbekannte Codes werden als Zahl gezeigt (defensiv, sollte nicht vorkommen).
export function difficultyLabel(code: number | null | undefined): string | null {
  if (code == null) return null
  return BY_CODE.get(code)?.label ?? String(code)
}

// Punkte-Faktor (Multiplikator-Modus). Fehlender Grad ⇒ 1. Unbekannte positive Codes
// fallen auf den Code selbst zurück (Abwärtskompatibilität zu reinen Zahlen-Graden).
export function difficultyFactor(code: number | null | undefined): number {
  if (code == null) return 1
  const f = BY_CODE.get(code)?.factor
  if (f != null) return f
  return code > 0 ? code : 1
}
