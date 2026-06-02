import { describe, it, expect } from 'vitest'
import { computePoints, normalizeResult } from './scoring'
import { DEFAULT_SCORING } from '../types'

// Standard-Strafmodus ist 'top_floor' (Top nie negativ).
describe('computePoints – top_floor (Default 30 / 25 / 5)', () => {
  it('Flash = 30 (erfolgreicher Zug gratis)', () => {
    expect(computePoints('flash', 1, DEFAULT_SCORING)).toBe(30)
  })

  it('Top, 1 Fehlversuch (attempts 2) = 25 - 1*5 = 20', () => {
    expect(computePoints('top', 2, DEFAULT_SCORING)).toBe(20)
  })

  it('Top, 8 Fehlversuche (attempts 9) → auf 0 gedeckelt', () => {
    expect(computePoints('top', 9, DEFAULT_SCORING)).toBe(0)
  })

  it('Nicht geschafft, 3 Fehlversuche = -15 (Fail wird nicht gedeckelt)', () => {
    expect(computePoints('fail', 3, DEFAULT_SCORING)).toBe(-15)
  })

  it('Offen = 0', () => {
    expect(computePoints('open', 0, DEFAULT_SCORING)).toBe(0)
  })
})

describe('computePoints – strict (erfolgreicher Zug kostet mit)', () => {
  const cfg = { ...DEFAULT_SCORING, penaltyMode: 'strict' as const }

  it('Flash (attempts 1) = 30 - 1*5 = 25', () => {
    expect(computePoints('flash', 1, cfg)).toBe(25)
  })

  it('Top, 1 Fehlversuch (attempts 2) = 25 - 2*5 = 15', () => {
    expect(computePoints('top', 2, cfg)).toBe(15)
  })

  it('Top, 5 Fehlversuche (attempts 6) = 25 - 6*5 = -5 (kein Floor)', () => {
    expect(computePoints('top', 6, cfg)).toBe(-5)
  })

  it('Nicht geschafft, 3x = -15', () => {
    expect(computePoints('fail', 3, cfg)).toBe(-15)
  })
})

describe('computePoints – misses (nur Fehlversuche, kein Floor)', () => {
  const cfg = { ...DEFAULT_SCORING, penaltyMode: 'misses' as const }

  it('Flash = 30', () => {
    expect(computePoints('flash', 1, cfg)).toBe(30)
  })

  it('Top, 1 Fehlversuch = 20', () => {
    expect(computePoints('top', 2, cfg)).toBe(20)
  })

  it('Top, 6 Fehlversuche (attempts 7) = 25 - 6*5 = -5 (kein Floor)', () => {
    expect(computePoints('top', 7, cfg)).toBe(-5)
  })
})

describe('computePoints im Multiplikator-Modus (Grad × Ergebnis)', () => {
  const cfg = { ...DEFAULT_SCORING, mode: 'multiplier' as const } // top_floor

  it('Flash auf Grad 4 = 30 × 4 = 120', () => {
    expect(computePoints('flash', 1, cfg, 4)).toBe(120)
  })

  it('Top, 1 Fehlversuch auf Grad 4 = (25 − 5) × 4 = 80', () => {
    expect(computePoints('top', 2, cfg, 4)).toBe(80)
  })

  it('Top, 8 Fehlversuche auf Grad 4 = max(0,…) × 4 = 0 (Floor vor Multiplikation)', () => {
    expect(computePoints('top', 9, cfg, 4)).toBe(0)
  })

  it('3 Fehlversuche auf Grad 4 = (−15) × 4 = −60', () => {
    expect(computePoints('fail', 3, cfg, 4)).toBe(-60)
  })

  it('fehlender Grad zählt als Faktor 1', () => {
    expect(computePoints('flash', 1, cfg, null)).toBe(30)
  })

  it('strict-Modus im Multiplikator: Top, 5 Fehlversuche auf Grad 4 = (−5) × 4 = −20', () => {
    const strict = { ...cfg, penaltyMode: 'strict' as const }
    expect(computePoints('top', 6, strict, 4)).toBe(-20)
  })
})

describe('normalizeResult', () => {
  it('Flash erzwingt genau 1 Versuch', () => {
    expect(normalizeResult('flash', 5)).toEqual({ status: 'flash', attempts: 1 })
  })

  it('Open erzwingt 0 Versuche', () => {
    expect(normalizeResult('open', 3)).toEqual({ status: 'open', attempts: 0 })
  })

  it('Top mit 0 Versuchen wird auf 1 angehoben', () => {
    expect(normalizeResult('top', 0)).toEqual({ status: 'top', attempts: 1 })
  })

  it('Fail behält die Versuchszahl', () => {
    expect(normalizeResult('fail', 4)).toEqual({ status: 'fail', attempts: 4 })
  })
})
