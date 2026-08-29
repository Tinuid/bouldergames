import { describe, it, expect } from 'vitest'
import { HALL_AREAS, LAGEPLAN_VIEWBOX, areaAt, areaLabel } from './areas'

// Je Bereich ein Punkt weit im Inneren (per Rasterscan über die Polygone ermittelt,
// jeweils der Punkt mit dem größten Abstand zur nächsten Kante). Bewusst NICHT die
// Beschriftungs-Anker: die sitzen dort, wo das Label optisch gut steht – bei den
// bandförmigen Flächen (kreide-heide, abenteuerland, torf-terrasse) also teils
// außerhalb des eigenen Umrisses.
const INSIDE: Record<string, [number, number]> = {
  'moor-door': [908, 143.9],
  'kreide-heide': [170.8, 352.8],
  'feiner-findling': [488.1, 330.3],
  pulverturm: [745.2, 390.9],
  'ems-arena': [952.2, 776.1],
  'torf-terrasse': [588.3, 797.2],
  abenteuerland: [158.9, 656.9],
  abenteuerfels: [370.4, 678.4],
}

describe('HALL_AREAS', () => {
  it('enthält alle acht Bereiche mit eindeutigen Ids', () => {
    expect(HALL_AREAS).toHaveLength(8)
    expect(new Set(HALL_AREAS.map((a) => a.id)).size).toBe(8)
  })

  it('hat für jeden Bereich Beschriftungszeilen und einen Anker', () => {
    for (const a of HALL_AREAS) {
      expect(a.lines.length).toBeGreaterThan(0)
      expect(Number.isFinite(a.labelAt.x)).toBe(true)
      expect(Number.isFinite(a.labelAt.y)).toBe(true)
    }
  })

  it('liegt vollständig im Ausschnitt des Lageplans', () => {
    const { x, y, w, h } = LAGEPLAN_VIEWBOX
    for (const a of HALL_AREAS) {
      const nums = (a.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
      for (let i = 0; i + 1 < nums.length; i += 2) {
        expect(nums[i]).toBeGreaterThanOrEqual(x - 1)
        expect(nums[i]).toBeLessThanOrEqual(x + w + 1)
        expect(nums[i + 1]).toBeGreaterThanOrEqual(y - 1)
        expect(nums[i + 1]).toBeLessThanOrEqual(y + h + 1)
      }
    }
  })
})

describe('areaAt', () => {
  it('findet jeden Bereich an einem Punkt in seinem Inneren', () => {
    for (const a of HALL_AREAS) {
      const [x, y] = INSIDE[a.id]
      expect(areaAt(x, y)).toBe(a.id)
    }
  })

  it('lässt die obenliegende Fläche gewinnen (abenteuerfels vor abenteuerland)', () => {
    // abenteuerfels liegt geometrisch im Bereich von abenteuerland und wird später
    // gezeichnet – die Rückwärts-Iteration muss ihn darum zuerst treffen.
    const [x, y] = INSIDE.abenteuerfels
    expect(areaAt(x, y)).toBe('abenteuerfels')
  })

  it('gibt außerhalb aller Flächen null zurück', () => {
    expect(areaAt(100, 30)).toBeNull()
    expect(areaAt(1040, 880)).toBeNull()
  })
})

describe('areaLabel', () => {
  it('liefert den Anzeigenamen', () => {
    expect(areaLabel('kreide-heide')).toBe('Kreide-Heide')
    expect(areaLabel('feiner-findling')).toBe('feiner Findling')
  })

  it('behandelt null und unbekannte Ids defensiv', () => {
    expect(areaLabel(null)).toBeNull()
    expect(areaLabel(undefined)).toBeNull()
    expect(areaLabel('gibts-nicht')).toBe('gibts-nicht')
  })
})
