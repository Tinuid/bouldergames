import { describe, it, expect } from 'vitest'
import { computePoints, normalizeResult } from './scoring'
import { DEFAULT_SCORING } from '../types'

describe('computePoints (Default 30 / 25 / 5)', () => {
  it('Flash = 30 - 1*5 = 25', () => {
    expect(computePoints('flash', 1, DEFAULT_SCORING)).toBe(25)
  })

  it('Top im 2. Versuch = 25 - 2*5 = 15', () => {
    expect(computePoints('top', 2, DEFAULT_SCORING)).toBe(15)
  })

  it('Top im 1. Versuch = 25 - 1*5 = 20', () => {
    expect(computePoints('top', 1, DEFAULT_SCORING)).toBe(20)
  })

  it('3x ohne Top = 0 - 3*5 = -15', () => {
    expect(computePoints('fail', 3, DEFAULT_SCORING)).toBe(-15)
  })

  it('Offen = 0', () => {
    expect(computePoints('open', 0, DEFAULT_SCORING)).toBe(0)
  })
})

describe('computePoints mit eigener Konfiguration', () => {
  const config = { mode: 'classic' as const, flashPoints: 50, topPoints: 40, attemptCost: 10 }

  it('Flash = 50 - 10 = 40', () => {
    expect(computePoints('flash', 1, config)).toBe(40)
  })

  it('Top im 3. Versuch = 40 - 30 = 10', () => {
    expect(computePoints('top', 3, config)).toBe(10)
  })
})

describe('computePoints mit freeSuccess (Top & Flash kosten nichts)', () => {
  const config = { ...DEFAULT_SCORING, freeSuccess: true }

  it('Flash = 30 (erfolgreicher Versuch gratis)', () => {
    expect(computePoints('flash', 1, config)).toBe(30)
  })

  it('Top im 1. Versuch = 25 (keine Fehlversuche)', () => {
    expect(computePoints('top', 1, config)).toBe(25)
  })

  it('Top im 3. Versuch = 25 - 2*5 = 15 (nur die 2 Fehlversuche kosten)', () => {
    expect(computePoints('top', 3, config)).toBe(15)
  })

  it('3x ohne Top = -3*5 = -15 (Fehlversuche kosten unverändert)', () => {
    expect(computePoints('fail', 3, config)).toBe(-15)
  })

  it('Offen = 0', () => {
    expect(computePoints('open', 0, config)).toBe(0)
  })
})

describe('computePoints im Multiplikator-Modus (Grad × klassisches Ergebnis)', () => {
  const config = { ...DEFAULT_SCORING, mode: 'multiplier' as const }

  it('Flash auf Grad 1 = (30 − 5) × 1 = 25', () => {
    expect(computePoints('flash', 1, config, 1)).toBe(25)
  })

  it('Flash auf Grad 4 = (30 − 5) × 4 = 100', () => {
    expect(computePoints('flash', 1, config, 4)).toBe(100)
  })

  it('Top im 2. Versuch auf Grad 4 = (25 − 10) × 4 = 60', () => {
    expect(computePoints('top', 2, config, 4)).toBe(60)
  })

  it('3x ohne Top auf Grad 4 = (−15) × 4 = −60', () => {
    expect(computePoints('fail', 3, config, 4)).toBe(-60)
  })

  it('fehlender Grad zählt als Faktor 1', () => {
    expect(computePoints('flash', 1, config, null)).toBe(25)
  })

  it('Offen = 0 unabhängig vom Grad', () => {
    expect(computePoints('open', 0, config, 4)).toBe(0)
  })

  it('Multiplikator-Modus mit freeSuccess: Flash auf Grad 4 = 30 × 4 = 120', () => {
    const free = { ...config, freeSuccess: true }
    expect(computePoints('flash', 1, free, 4)).toBe(120)
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
