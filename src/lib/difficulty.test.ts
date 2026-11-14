import { describe, it, expect } from 'vitest'
import { DIFFICULTIES, difficultyFactor, difficultyGrade, difficultyLabel } from './difficulty'

describe('Grad-Codes (seit Migration 0024: Code = Grad)', () => {
  it('Grade 1–8 haben ihren Grad als Code und Faktor', () => {
    for (let g = 1; g <= 8; g++) {
      expect(difficultyLabel(g)).toBe(String(g))
      expect(difficultyFactor(g)).toBe(g)
      expect(difficultyGrade(g)).toBe(g)
    }
  })

  it('"?" = 11 zählt 4, "!" = 12 zählt 6 – beide sind kein Grad', () => {
    expect(difficultyLabel(11)).toBe('?')
    expect(difficultyFactor(11)).toBe(4)
    expect(difficultyGrade(11)).toBeNull()
    expect(difficultyLabel(12)).toBe('!')
    expect(difficultyFactor(12)).toBe(6)
    expect(difficultyGrade(12)).toBeNull()
  })

  it('9 und 10 sind für künftige Grade reserviert und noch nicht wählbar', () => {
    expect(DIFFICULTIES.some((d) => d.code === 9 || d.code === 10)).toBe(false)
    expect(difficultyGrade(9)).toBe(9)
    expect(difficultyGrade(10)).toBe(10)
  })

  it('fehlender oder unbekannter Code zählt Faktor 1', () => {
    expect(difficultyFactor(null)).toBe(1)
    expect(difficultyFactor(99)).toBe(1)
    expect(difficultyGrade(null)).toBeNull()
  })
})
