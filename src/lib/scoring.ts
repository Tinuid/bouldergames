import type { ResultStatus, ScoringConfig } from '../types'
import { difficultyFactor } from './difficulty'

/**
 * Punkteberechnung. `attempts` ist die Gesamtzahl der Versuche inkl. des erfolgreichen;
 * die Fehlversuche davor sind `attempts - 1`. Wie Versuchskosten/Minuspunkte wirken,
 * steuert `config.penaltyMode`:
 *
 *  'top_floor' (Standard) – nur Fehlversuche kosten; Flash/Top werden auf >= 0 gedeckelt
 *                           (Fail bleibt negativ).
 *  'misses'               – nur Fehlversuche kosten; kein Floor (Top kann negativ werden).
 *  'strict'               – jeder Versuch kostet (auch der erfolgreiche); kein Floor.
 *
 *  flash → flashPoints - kosten
 *  top   → topPoints   - kosten        (top_floor: max(0, …))
 *  fail  → 0           - tries * attemptCost
 *  open  → 0
 *
 * kosten = (strict ? tries : tries - 1) * attemptCost.
 *
 * Beispiele mit Defaults (30 / 25 / 5):
 *  - top_floor: Flash 30 · Top 1 Fehlv. 20 · Top 8 Fehlv. 0 · Fail(3) -15
 *  - strict:    Flash 25 · Top 1 Fehlv. 15 · Top 5 Fehlv. -5 · Fail(3) -15
 *  - misses:    Flash 30 · Top 1 Fehlv. 20 · Top 6 Fehlv. -5 · Fail(3) -15
 *
 * Im Multiplikator-Modus (`mode === 'multiplier'`) wird das (ggf. gedeckelte) Ergebnis
 * mit dem Schwierigkeits-Faktor multipliziert (fehlender Grad = Faktor 1). `difficulty`
 * ist der gespeicherte Code; das Code→Faktor-Mapping liegt in difficulty.ts (Grade 1–7
 * = sich selbst, Sonderstufen "?"=4 / "!"=6).
 */
export function computePoints(
  status: ResultStatus,
  attempts: number,
  config: ScoringConfig,
  difficulty: number | null = null,
): number {
  const tries = Math.max(0, attempts)
  const failed = Math.max(0, tries - 1)
  // strict: der erfolgreiche Zug kostet mit; sonst kosten nur die Fehlversuche.
  const successCost = config.penaltyMode === 'strict' ? tries : failed

  let base: number
  switch (status) {
    case 'flash':
      base = config.flashPoints - successCost * config.attemptCost
      break
    case 'top':
      base = config.topPoints - successCost * config.attemptCost
      break
    case 'fail':
      base = -tries * config.attemptCost
      break
    case 'open':
      return 0
  }

  // "Top nie negativ": Flash/Top auf >= 0 deckeln (Fail bleibt negativ).
  if (config.penaltyMode === 'top_floor' && (status === 'flash' || status === 'top')) {
    base = Math.max(0, base)
  }

  if (config.mode === 'multiplier') {
    // `difficulty` ist der gespeicherte Code; der Faktor kommt aus difficulty.ts
    // (Grade 1–7 = sich selbst, Sonderstufen "?"=4 / "!"=6, fehlend = 1).
    return base * difficultyFactor(difficulty)
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
