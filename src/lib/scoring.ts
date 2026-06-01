import type { ResultStatus, ScoringConfig } from '../types'

/**
 * Punkteberechnung "strikt bezahlen" (Default):
 * Jeder Versuch kostet `attemptCost` – auch der erfolgreiche.
 *
 *  flash → flashPoints - attempts * attemptCost   (Flash = Top im 1. Versuch, attempts = 1)
 *  top   → topPoints   - attempts * attemptCost
 *  fail  → 0           - attempts * attemptCost
 *  open  → 0           (noch nichts eingetragen)
 *
 * Beispiele mit Defaults (30 / 25 / 5):
 *  - Flash:               30 - 1*5  = 25
 *  - Top im 2. Versuch:   25 - 2*5  = 15
 *  - 3x ohne Top:          0 - 3*5  = -15
 *
 * Mit `freeSuccess`: Nur nicht erfolgreiche Versuche kosten – der erfolgreiche
 * (bei Flash/Top) ist gratis. Bei einem Top zählen also nur die `attempts - 1`
 * Fehlversuche davor.
 *
 *  flash → flashPoints                              (1 Versuch, erfolgreich ⇒ gratis)
 *  top   → topPoints - (attempts - 1) * attemptCost
 *  fail  → 0         - attempts * attemptCost
 */
export function computePoints(
  status: ResultStatus,
  attempts: number,
  config: ScoringConfig,
): number {
  const tries = Math.max(0, attempts)
  // Bei freeSuccess kostet der erfolgreiche Versuch nichts, nur die Fehlversuche davor.
  const successfulCost = config.freeSuccess ? Math.max(0, tries - 1) : tries

  switch (status) {
    case 'flash':
      return config.flashPoints - successfulCost * config.attemptCost
    case 'top':
      return config.topPoints - successfulCost * config.attemptCost
    case 'fail':
      return -tries * config.attemptCost
    case 'open':
      return 0
  }
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
