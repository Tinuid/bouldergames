import type { ResultStatus, ScoringConfig } from '../types'
import { difficultyFactor } from './difficulty'
import { gameModeInfo } from './gameModes'

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
 * = sich selbst, Grad 8 = Code 10, Sonderstufen "?"=4 / "!"=6).
 *
 * `weekBonus` (Boulder der Woche, `boulders.week_bonus`) verdoppelt zum Schluss das
 * GANZE Ergebnis – in beiden Spielmodi und bewusst auch Minuspunkte, analog zum
 * Grad-Faktor. Der Server-Rescale (0019) bleibt dadurch korrekt: er skaliert über das
 * Verhältnis alter/neuer Grad-Faktor, der Bonus-Faktor kürzt sich heraus.
 *
 * Spielmodus „Nur Flash“ (`gameMode === 'flash_only'`): ein Flash bringt die Flash-Punkte,
 * alles andere (Top, nicht geschafft, offen) zählt 0 – ohne Minuspunkte; Versuchskosten
 * und Strafmodus wirken nicht. Grad-Faktor und Boulder der Woche wirken weiter.
 */
export function computePoints(
  status: ResultStatus,
  attempts: number,
  config: ScoringConfig,
  difficulty: number | null = null,
  weekBonus = false,
): number {
  const tries = Math.max(0, attempts)
  const failed = Math.max(0, tries - 1)
  // strict: der erfolgreiche Zug kostet mit; sonst kosten nur die Fehlversuche.
  const successCost = config.penaltyMode === 'strict' ? tries : failed

  let base: number
  if (config.gameMode === 'flash_only') {
    base = status === 'flash' ? config.flashPoints : 0
    return applyFactors(base, config, difficulty, weekBonus)
  }
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

  return applyFactors(base, config, difficulty, weekBonus)
}

// Grad-Faktor (nur Multiplikator) und Boulder-der-Woche-Bonus – in jedem Spielmodus gleich.
function applyFactors(
  base: number,
  config: ScoringConfig,
  difficulty: number | null,
  weekBonus: boolean,
): number {
  if (config.mode === 'multiplier') {
    // `difficulty` ist der gespeicherte Code; der Faktor kommt aus difficulty.ts
    // (Grade 1–7 = sich selbst, Grad 8 = Code 10, Sonderstufen "?"=4 / "!"=6, fehlend = 1).
    base = base * difficultyFactor(difficulty)
  }
  return weekBonus ? base * WEEK_BONUS_FACTOR : base
}

/**
 * Ob Fehlversuche in dieser Session etwas zählen – nur dann zeigt das UI den
 * Versuchszähler und die Versuchsanzahlen. Bei „Nur Flash“ oder Kosten 0 nicht.
 */
export function countsAttempts(config: ScoringConfig): boolean {
  return gameModeInfo(config.gameMode).usesMisses && config.attemptCost > 0
}

/**
 * Ist der Boulder für diese Person erledigt (Filter „erledigte ausblenden“)? Normal nur nach
 * Flash oder Top – ein Fail lässt sich noch zum Top machen. Bei einem Versuch pro Boulder
 * (`singleAttempt`, „Nur Flash“) ist dagegen jedes eingetragene Ergebnis endgültig.
 */
export function isResultDone(
  status: ResultStatus | undefined,
  config: Pick<ScoringConfig, 'gameMode'>,
): boolean {
  if (status == null || status === 'open') return false
  if (gameModeInfo(config.gameMode).singleAttempt) return true
  return status === 'flash' || status === 'top'
}

// Punkte-Faktor des Boulders der Woche.
export const WEEK_BONUS_FACTOR = 2

/** Ob ein Karten-Boulder gerade Boulder der Woche ist (markiert und nicht abgeschraubt). */
export function isBoulderOfWeek(b: { featured_at: string | null; removed_at: string | null }) {
  return b.featured_at != null && b.removed_at == null
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
