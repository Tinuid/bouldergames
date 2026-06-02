import type { ResultStatus, ScoringConfig } from '../types'

/**
 * Punkteberechnung: Nur Fehlversuche kosten `attemptCost` – der erfolgreiche Zug
 * (bei Flash/Top) ist gratis. `attempts` ist die Gesamtzahl der Versuche inkl. des
 * erfolgreichen; die Fehlversuche davor sind also `attempts - 1`.
 *
 *  flash → flashPoints                              (1 Versuch, 0 Fehlversuche)
 *  top   → topPoints - (attempts - 1) * attemptCost
 *  fail  → 0         - attempts * attemptCost       (kein Erfolg ⇒ alle Versuche sind Fehlversuche)
 *  open  → 0                                         (noch nichts eingetragen)
 *
 * Beispiele mit Defaults (30 / 25 / 5):
 *  - Flash:                     30
 *  - Top, 1 Fehlversuch:        25 - 1*5 = 20
 *  - Top, 3 Fehlversuche:       25 - 3*5 = 10
 *  - Nicht geschafft (3x):       0 - 3*5 = -15
 *
 * Im Multiplikator-Modus (`mode === 'multiplier'`) wird das komplette klassische
 * Ergebnis mit dem Schwierigkeitsgrad multipliziert (fehlender Grad = Faktor 1):
 *
 *  Flash auf Grad 4 (30/25/5):   30 * 4 = 120
 *  Top, 1 Fehlversuch auf Grad 4: (25 - 5) * 4 = 80
 */
export function computePoints(
  status: ResultStatus,
  attempts: number,
  config: ScoringConfig,
  difficulty: number | null = null,
): number {
  const tries = Math.max(0, attempts)
  // Nur Fehlversuche kosten; der erfolgreiche Zug ist gratis.
  const failed = Math.max(0, tries - 1)

  let base: number
  switch (status) {
    case 'flash':
      base = config.flashPoints - failed * config.attemptCost
      break
    case 'top':
      base = config.topPoints - failed * config.attemptCost
      break
    case 'fail':
      base = -tries * config.attemptCost
      break
    case 'open':
      return 0
  }

  if (config.mode === 'multiplier') {
    const factor = difficulty && difficulty > 0 ? difficulty : 1
    return base * factor
  }
  return base
}

/**
 * Normalisiert Status + Versuche zu einem konsistenten Zustand.
 * - Flash impliziert genau 1 Versuch.
 * - Erfolgszustände brauchen mindestens 1 Versuch.
 */
export function normalizeResult(
  status: ResultStatus,
  attempts: number,
): { status: ResultStatus; attempts: number } {
  if (status === 'flash') return { status, attempts: 1 }
  if (status === 'open') return { status, attempts: 0 }
  if ((status === 'top' || status === 'fail') && attempts < 1) {
    return { status, attempts: 1 }
  }
  return { status, attempts }
}

export const STATUS_LABELS: Record<ResultStatus, string> = {
  open: 'Offen',
  flash: 'Flash',
  top: 'Top',
  fail: 'Nicht geschafft',
}
