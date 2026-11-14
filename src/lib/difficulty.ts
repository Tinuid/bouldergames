// Wählbare Schwierigkeiten – einzige Quelle der Wahrheit (analog zu colors.ts).
//
// In der DB steht in `boulders.difficulty` (int) der `code`. Seit Migration 0024 gilt
// **Code = Grad** für die Grade 1–8; die Codes 9 und 10 sind für künftige Grade
// reserviert. Die Sonderstufen "?" und "!" sind in der Halle eigene Markierungen und haben
// eigene Codes (11 / 12), damit sie überall als "?"/"!" erkennbar bleiben statt als Grad
// 4/6. Ihr Wertungs-Faktor (Multiplikator-Modus) ist davon entkoppelt: "?" zählt 4, "!" 6.
// (Bis 0024: "?" = 8, "!" = 9, Grad 8 = 10.)
//
// Die Reihenfolge der Liste ist die Anzeige-Reihenfolge (Picker, Filter) – nicht die der Codes.
//
// Neue Stufen NUR hier ergänzen. Wer den Faktor serverseitig braucht (Rescale-Trigger
// bei nachträglicher Grad-Änderung), muss das Mapping in einer neuen SQL-Migration
// spiegeln – aktuelle Fassung des Triggers: supabase/migrations/0024_difficulty_codes.sql –
// und die CHECKs auf boulders.difficulty und gym_boulders.difficulty erweitern.

export interface DifficultyOption {
  // In boulders.difficulty gespeicherter Wert.
  code: number
  // Anzeige ("1"…"8", "?", "!").
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
  { code: 8, label: '8', factor: 8 },
  { code: 11, label: '?', factor: 4 },
  { code: 12, label: '!', factor: 6 },
]

// Grade liegen im Code-Bereich 1–10 (9 und 10 reserviert); darüber Sonderstufen.
const MAX_GRADE_CODE = 10

const BY_CODE = new Map(DIFFICULTIES.map((d) => [d.code, d]))

// Anzeige-Label zu einem gespeicherten Code (z.B. für "Grad X"). null = kein Grad.
// Unbekannte Codes werden als Zahl gezeigt (defensiv, sollte nicht vorkommen).
export function difficultyLabel(code: number | null | undefined): string | null {
  if (code == null) return null
  return BY_CODE.get(code)?.label ?? String(code)
}

// Punkte-Faktor (Multiplikator-Modus). Fehlender oder unbekannter Code ⇒ 1 – genau wie
// der Rescale-Trigger auf dem Server, damit Client und Server nie verschieden rechnen.
export function difficultyFactor(code: number | null | undefined): number {
  if (code == null) return 1
  return BY_CODE.get(code)?.factor ?? 1
}

// Echter Grad eines Codes (1–10) – für Rechnungen mit Abständen („Grad 5+“, „X+1“,
// Handicap, Pyramide). Sonderstufen "?"/"!" und fehlender Grad ⇒ null: sie sind kein Grad.
export function difficultyGrade(code: number | null | undefined): number | null {
  if (code == null) return null
  return code >= 1 && code <= MAX_GRADE_CODE ? code : null
}
