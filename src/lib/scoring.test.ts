import { describe, it, expect } from 'vitest'
import { computePoints, normalizeResult } from './scoring'
import { DEFAULT_SCORING } from '../types'

describe('computePoints (Default 30 / 25 / 5, nur Fehlversuche kosten)', () => {
  it('Flash = 30 (0 Fehlversuche, erfolgreicher Zug gratis)', () => {
    expect(computePoints('flash', 1, DEFAULT_SCORING)).toBe(30)
  })

  it('Top, 0 Fehlversuche (attempts 1) = 25', () => {
    expect(computePoints('top', 1, DEFAULT_SCORING)).toBe(25)
  })

  it('Top, 1 Fehlversuch (attempts 2) = 25 - 1*5 = 20', () => {
    expect(computePoints('top', 2, DEFAULT_SCORING)).toBe(20)
  })

  it('Top, 3 Fehlversuche (attempts 4) = 25 - 3*5 = 10', () => {
    expect(computePoints('top', 4, DEFAULT_SCORING)).toBe(10)
  })

  it('Nicht geschafft, 3 Fehlversuche = -3*5 = -15', () => {
    expect(computePoints('fail', 3, DEFAULT_SCORING)).toBe(-15)
  })

  it('Offen = 0', () => {
    expect(computePoints('open', 0, DEFAULT_SCORING)).toBe(0)
  })
})

describe('computePoints mit eigener Konfiguration', () => {
  const config = { mode: 'classic' as const, flashPoints: 50, topPoints: 40, attemptCost: 10 }

  it('Flash = 50 (gratis)', () => {
    expect(computePoints('flash', 1, config)).toBe(50)
  })

  it('Top, 2 Fehlversuche (attempts 3) = 40 - 2*10 = 20', () => {
    expect(computePoints('top', 3, config)).toBe(20)
  })
})

describe('computePoints im Multiplikator-Modus (Grad × klassisches Ergebnis)', () => {
  const config = { ...DEFAULT_SCORING, mode: 'multiplier' as const }

  it('Flash auf Grad 1 = 30 × 1 = 30', () => {
    expect(computePoints('flash', 1, config, 1)).toBe(30)
  })

  it('Flash auf Grad 4 = 30 × 4 = 120', () => {
    expect(computePoints('flash', 1, config, 4)).toBe(120)
  })

  it('Top, 1 Fehlversuch auf Grad 4 = (25 − 5) × 4 = 80', () => {
    expect(computePoints('top', 2, config, 4)).toBe(80)
  })

  it('3 Fehlversuche auf Grad 4 = (−15) × 4 = −60', () => {
    expect(computePoints('fail', 3, config, 4)).toBe(-60)
  })

  it('fehlender Grad zählt als Faktor 1', () => {
    expect(computePoints('flash', 1, config, null)).toBe(30)
  })

  it('Offen = 0 unabhängig vom Grad', () => {
    expect(computePoints('open', 0, config, 4)).toBe(0)
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
