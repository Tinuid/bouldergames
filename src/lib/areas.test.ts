import { describe, it, expect } from 'vitest'
import { HALL_AREAS, LAGEPLAN_VIEWBOX, areaAt, areaLabel, parseRings } from './areas'
// Die Migration als Text – so prüft der Test das echte CHECK-Vokabular statt einer Abschrift.
import migration0018 from '../../supabase/migrations/0018_lageplan_v2.sql?raw'

// Je Bereich ein Punkt weit im Inneren (per Rasterscan über die Polygone ermittelt,
// jeweils der Punkt mit dem größten Abstand zur nächsten Kante). Bewusst NICHT die
// Beschriftungs-Anker: die sitzen dort, wo das Label optisch gut steht – im
// handgezeichneten Plan meist auf der Lauffläche neben der Wand.
const INSIDE: Record<string, [number, number]> = {
  'moor-door': [743.5, 186.5],
  'kreide-heide': [434, 567],
  'feiner-findling': [368, 401],
  pulverturm: [738.5, 438],
  'ems-arena': [1053, 440],
  'torf-terrasse': [531.5, 711.5],
  abenteuerland: [337.5, 612],
}

// Innenpunkte der jeweils ZWEITEN Teilfläche mehrteiliger Bereiche.
const SECOND_RING: Record<string, [number, number]> = {
  // Senkrechter Streifen am linken Rand.
  'kreide-heide': [93, 397],
  // Block in der Mitte des U-Bands (im Vorgänger-Plan "Abenteuerfels").
  abenteuerland: [323, 737],
}

describe('HALL_AREAS', () => {
  it('enthält alle sieben Bereiche mit eindeutigen Ids', () => {
    expect(HALL_AREAS).toHaveLength(7)
    expect(new Set(HALL_AREAS.map((a) => a.id)).size).toBe(7)
  })

  it('spiegelt das Vokabular des CHECK-Constraints (Migration 0018)', () => {
    const checks = [...migration0018.matchAll(/check \(area is null or area in \(([^)]*)\)/g)]
    expect(checks.length).toBeGreaterThan(0)
    const allowed = [...checks[checks.length - 1][1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
    expect(HALL_AREAS.map((a) => a.id).sort()).toEqual(allowed.sort())
  })

  it('zerlegt mehrteilige Flächen in einzelne Ringe', () => {
    const rings = (id: string) => parseRings(HALL_AREAS.find((a) => a.id === id)!.d)
    expect(rings('kreide-heide')).toHaveLength(2)
    expect(rings('abenteuerland')).toHaveLength(2)
    expect(rings('pulverturm')).toHaveLength(1)
    for (const r of rings('kreide-heide')) expect(r.length).toBeGreaterThanOrEqual(3)
    // Die zweite Teilfläche beginnt genau am Punkt ihres eigenen M.
    expect(rings('abenteuerland')[1][0]).toEqual([255.5, 728.7])
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
      for (const ring of parseRings(a.d)) {
        for (const [px, py] of ring) {
          expect(px).toBeGreaterThanOrEqual(x - 1)
          expect(px).toBeLessThanOrEqual(x + w + 1)
          expect(py).toBeGreaterThanOrEqual(y - 1)
          expect(py).toBeLessThanOrEqual(y + h + 1)
        }
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

  it('trifft auch die zweite Teilfläche mehrteiliger Bereiche', () => {
    for (const [id, [x, y]] of Object.entries(SECOND_RING)) {
      expect(areaAt(x, y)).toBe(id)
      expect(areaAt(x, y, 0)).toBe(id)
    }
  })

  it('erfindet keine Kante zwischen den Teilflächen', () => {
    // (238, 730) liegt im Gang zwischen U-Band und Mittelblock des Abenteuerlands –
    // gut 17 Einheiten von beiden entfernt, aber genau auf der Strecke vom Ende der
    // ersten zum Anfang der zweiten Teilfläche. Würden die Ringe zu einem Polygonzug
    // verkettet, läge der Punkt auf dieser Scheinkante (Abstand 0).
    expect(areaAt(238, 730, 5)).toBeNull()
    expect(areaAt(238, 730)).toBe('abenteuerland')
  })

  it('gibt weit außerhalb aller Flächen null zurück', () => {
    expect(areaAt(40, 60)).toBeNull()
    expect(areaAt(600, 1000)).toBeNull()
    expect(areaAt(200, 200)).toBeNull()
  })

  it('zieht knapp danebenliegende Punkte auf die nächste Fläche', () => {
    // Boulder hängen AN der Wand, also auf der Polygonkante – ohne Toleranz fiele
    // die Hälfte durch. Punkte kurz außerhalb des Pulverturms:
    expect(areaAt(868, 650)).toBe('pulverturm')
    expect(areaAt(866, 640)).toBe('pulverturm')
    expect(areaAt(868, 650, 0)).toBeNull()
  })

  it('respektiert die Toleranzgrenze', () => {
    const [x, y] = INSIDE['pulverturm']
    // Weit weg von allem, mit abgeschalteter Toleranz auch direkt neben der Fläche.
    expect(areaAt(x, y, 0)).toBe('pulverturm')
    expect(areaAt(40, 60, 0)).toBeNull()
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
