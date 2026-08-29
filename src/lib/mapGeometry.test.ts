import { describe, it, expect } from 'vitest'
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampView,
  coverView,
  dotRadius,
  fitView,
  labelOpacity,
  labelSize,
  nearestDot,
  quantizeZoom,
  separateOverlaps,
  screenToUser,
  zoomAround,
  zoomOf,
  type ViewRect,
} from './mapGeometry'
import { LAGEPLAN_VIEWBOX } from './areas'

const CONTENT: ViewRect = { ...LAGEPLAN_VIEWBOX }

// Hochformat-Handy (390×700) und Querformat-Desktop – die beiden Extreme.
const PORTRAIT = 390 / 700
const LANDSCAPE = 1200 / 700

describe('fitView', () => {
  it('enthält den Grundriss vollständig und zentriert ihn', () => {
    for (const aspect of [PORTRAIT, LANDSCAPE, CONTENT.w / CONTENT.h]) {
      const fit = fitView(CONTENT, aspect)
      expect(fit.w).toBeGreaterThanOrEqual(CONTENT.w - 1e-9)
      expect(fit.h).toBeGreaterThanOrEqual(CONTENT.h - 1e-9)
      expect(fit.w / fit.h).toBeCloseTo(aspect, 9)
      // gleiche Mitte wie der Grundriss
      expect(fit.x + fit.w / 2).toBeCloseTo(CONTENT.x + CONTENT.w / 2, 9)
      expect(fit.y + fit.h / 2).toBeCloseTo(CONTENT.y + CONTENT.h / 2, 9)
    }
  })

  it('ergibt Zoom 1 für sich selbst', () => {
    const fit = fitView(CONTENT, PORTRAIT)
    expect(zoomOf(fit, fit)).toBeCloseTo(1, 9)
  })
})

describe('coverView', () => {
  it('liegt vollständig im Grundriss und füllt den Container', () => {
    for (const aspect of [PORTRAIT, LANDSCAPE]) {
      const cover = coverView(CONTENT, aspect)
      expect(cover.w / cover.h).toBeCloseTo(aspect, 9)
      expect(cover.w).toBeLessThanOrEqual(CONTENT.w + 1e-9)
      expect(cover.h).toBeLessThanOrEqual(CONTENT.h + 1e-9)
      // Eine der beiden Achsen schöpft den Grundriss genau aus.
      const füllt =
        Math.abs(cover.w - CONTENT.w) < 1e-9 || Math.abs(cover.h - CONTENT.h) < 1e-9
      expect(füllt).toBe(true)
    }
  })

  it('ist hochkant näher dran als der eingepasste Ausschnitt', () => {
    const fit = fitView(CONTENT, PORTRAIT)
    const cover = coverView(CONTENT, PORTRAIT)
    expect(zoomOf(fit, cover)).toBeGreaterThan(1)
  })

  it('überschreitet den maximalen Zoom nicht', () => {
    const fit = fitView(CONTENT, PORTRAIT)
    expect(zoomOf(fit, coverView(CONTENT, PORTRAIT))).toBeLessThanOrEqual(MAX_ZOOM)
  })
})

describe('clampView', () => {
  const fit = fitView(CONTENT, PORTRAIT)

  it('begrenzt den Zoom auf [MIN_ZOOM, MAX_ZOOM]', () => {
    const tooFarOut = clampView({ ...fit, w: fit.w * 10, h: fit.h * 10 }, CONTENT, fit, PORTRAIT)
    expect(zoomOf(fit, tooFarOut)).toBeCloseTo(MIN_ZOOM, 9)

    const tooFarIn = clampView({ x: 500, y: 400, w: fit.w / 100, h: fit.h / 100 }, CONTENT, fit, PORTRAIT)
    expect(zoomOf(fit, tooFarIn)).toBeCloseTo(MAX_ZOOM, 9)
  })

  it('hält das Seitenverhältnis des Containers', () => {
    const v = clampView({ x: 300, y: 300, w: 400, h: 999 }, CONTENT, fit, PORTRAIT)
    expect(v.w / v.h).toBeCloseTo(PORTRAIT, 9)
  })

  it('lässt höchstens eine halbe Bildschirmbreite über den Kartenrand hinaus', () => {
    const w = fit.w / 4
    const h = w / PORTRAIT

    const left = clampView({ x: -99999, y: 0, w, h }, CONTENT, fit, PORTRAIT)
    expect(left.x).toBeCloseTo(CONTENT.x - w / 2, 9)

    const right = clampView({ x: 99999, y: 0, w, h }, CONTENT, fit, PORTRAIT)
    expect(right.x).toBeCloseTo(CONTENT.x + CONTENT.w - w / 2, 9)
  })

  it('erlaubt es, jeden Punkt der Karte in die Bildschirmmitte zu holen', () => {
    const w = fit.w / 4
    const h = w / PORTRAIT
    // Die vier Ecken des Grundrisses – jede muss zentrierbar sein.
    for (const [px, py] of [
      [CONTENT.x, CONTENT.y],
      [CONTENT.x + CONTENT.w, CONTENT.y],
      [CONTENT.x, CONTENT.y + CONTENT.h],
      [CONTENT.x + CONTENT.w, CONTENT.y + CONTENT.h],
    ]) {
      const v = clampView({ x: px - w / 2, y: py - h / 2, w, h }, CONTENT, fit, PORTRAIT)
      expect(v.x + v.w / 2).toBeCloseTo(px, 6)
      // Vertikal nur, wenn die Achse überhaupt verschiebbar ist.
      if (v.h < CONTENT.h) expect(v.y + v.h / 2).toBeCloseTo(py, 6)
    }
  })

  it('zentriert die Achse, auf der die Karte ganz hineinpasst', () => {
    // Im Hochformat ist der Ausschnitt bei Zoom 1 breiter als der Grundriss –
    // horizontal gibt es dann nichts zu verschieben.
    const v = clampView({ ...fit, x: fit.x + 500 }, CONTENT, fit, PORTRAIT)
    expect(v.x + v.w / 2).toBeCloseTo(CONTENT.x + CONTENT.w / 2, 9)
  })

  it('ist idempotent', () => {
    const once = clampView({ x: 400, y: 200, w: fit.w / 3, h: fit.h / 3 }, CONTENT, fit, PORTRAIT)
    const twice = clampView(once, CONTENT, fit, PORTRAIT)
    expect(twice).toEqual(once)
  })
})

describe('zoomAround', () => {
  it('hält den Ankerpunkt an derselben relativen Stelle', () => {
    const view: ViewRect = { x: 100, y: 100, w: 400, h: 800 }
    const anchor = { x: 200, y: 300 }
    const before = { fx: (anchor.x - view.x) / view.w, fy: (anchor.y - view.y) / view.h }

    const next = zoomAround(view, 200, view.w / view.h, anchor)
    const after = { fx: (anchor.x - next.x) / next.w, fy: (anchor.y - next.y) / next.h }

    expect(after.fx).toBeCloseTo(before.fx, 9)
    expect(after.fy).toBeCloseTo(before.fy, 9)
  })
})

describe('screenToUser', () => {
  const rect = { left: 20, top: 40, width: 390 }

  it('bildet die Ecken des Containers auf die Ecken des Ausschnitts ab', () => {
    const view: ViewRect = { x: 90, y: 10, w: 390, h: 700 }
    expect(screenToUser(view, rect, 20, 40)).toEqual({ x: 90, y: 10 })
    expect(screenToUser(view, rect, 410, 40).x).toBeCloseTo(480, 9)
  })

  it('ist die Umkehrung der Skalierung', () => {
    const view: ViewRect = { x: 90, y: 10, w: 960, h: 1723 }
    const p = screenToUser(view, rect, 215, 400)
    const s = rect.width / view.w
    expect((p.x - view.x) * s + rect.left).toBeCloseTo(215, 9)
  })
})

describe('Größen', () => {
  it('lässt Punkte wachsen, aber langsamer als die Karte', () => {
    const r1 = dotRadius(1)
    const r4 = dotRadius(4)
    // User-Radius schrumpft …
    expect(r4).toBeLessThan(r1)
    // … aber auf dem Bildschirm (r × zoom) wird der Punkt größer …
    expect(r4 * 4).toBeGreaterThan(r1 * 1)
    // … und zwar weniger als proportional zum Zoom.
    expect(r4 * 4).toBeLessThan(r1 * 4)
  })

  it('hält Beschriftungen auf dem Bildschirm nahezu konstant', () => {
    const s1 = labelSize(1) * 1
    const s8 = labelSize(8) * 8
    expect(s8).toBeGreaterThan(s1)
    expect(s8 / s1).toBeLessThan(2)
  })

  it('blendet Beschriftungen beim Hineinzoomen aus', () => {
    expect(labelOpacity(1)).toBe(1)
    expect(labelOpacity(3)).toBe(1)
    expect(labelOpacity(4)).toBeLessThan(1)
    expect(labelOpacity(5)).toBeCloseTo(0.35, 9)
    expect(labelOpacity(8)).toBeCloseTo(0.35, 9)
  })

  it('quantisiert den Zoom in feste Stufen', () => {
    expect(quantizeZoom(1.012)).toBeCloseTo(1, 9)
    expect(quantizeZoom(1.04)).toBeCloseTo(1.05, 9)
  })
})

describe('nearestDot', () => {
  const dots = [
    { id: 'a', x: 100, y: 100, r: 20 },
    { id: 'b', x: 130, y: 100, r: 20 },
    { id: 'c', x: 900, y: 800, r: 20 },
  ]

  it('findet den nächstgelegenen Punkt in Reichweite', () => {
    expect(nearestDot(dots, { x: 105, y: 102 }, 10)?.id).toBe('a')
    expect(nearestDot(dots, { x: 126, y: 100 }, 10)?.id).toBe('b')
  })

  it('gibt null zurück, wenn nichts in Reichweite liegt', () => {
    expect(nearestDot(dots, { x: 500, y: 500 }, 10)).toBeNull()
  })

  it('berücksichtigt den Radius jedes Punktes einzeln', () => {
    const mixed = [
      { id: 'klein', x: 0, y: 0, r: 5 },
      { id: 'gross', x: 60, y: 0, r: 30 },
    ]
    // 35 Einheiten vom kleinen entfernt (außer Reichweite), 25 vom großen (drin).
    expect(nearestDot(mixed, { x: 35, y: 0 }, 0)?.id).toBe('gross')
  })

  it('lässt bei Gleichstand den zuletzt gezeichneten Punkt gewinnen', () => {
    const overlapping = [
      { id: 'unten', x: 200, y: 200, r: 20 },
      { id: 'oben', x: 200, y: 200, r: 20 },
    ]
    expect(nearestDot(overlapping, { x: 200, y: 200 }, 10)?.id).toBe('oben')
  })
})

describe('separateOverlaps', () => {
  function minPairDistance(pos: Map<string, { x: number; y: number }>): number {
    const all = [...pos.values()]
    let min = Infinity
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        min = Math.min(min, Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y))
      }
    }
    return min
  }

  it('zieht dicht beieinander liegende Punkte auseinander', () => {
    // Der reale Fall: zwei Boulder vier Einheiten auseinander.
    const dots = [
      { id: 'a', x: 646, y: 690 },
      { id: 'b', x: 649, y: 694 },
    ]
    const out = separateOverlaps(dots, 20)
    expect(minPairDistance(out)).toBeGreaterThanOrEqual(20 - 1e-6)
  })

  it('trennt auch exakt deckungsgleiche Punkte', () => {
    const dots = [
      { id: 'a', x: 500, y: 500 },
      { id: 'b', x: 500, y: 500 },
      { id: 'c', x: 500, y: 500 },
    ]
    const out = separateOverlaps(dots, 15)
    expect(minPairDistance(out)).toBeGreaterThan(0)
  })

  it('lässt weit auseinanderliegende Punkte unangetastet', () => {
    const dots = [
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 900, y: 800 },
    ]
    const out = separateOverlaps(dots, 20)
    expect(out.get('a')).toEqual({ x: 100, y: 100 })
    expect(out.get('b')).toEqual({ x: 900, y: 800 })
  })

  it('ist deterministisch', () => {
    const dots = [
      { id: 'a', x: 300, y: 300 },
      { id: 'b', x: 302, y: 301 },
      { id: 'c', x: 300, y: 300 },
    ]
    expect(separateOverlaps(dots, 25)).toEqual(separateOverlaps(dots, 25))
  })

  it('verschiebt so wenig wie möglich', () => {
    const dots = [
      { id: 'a', x: 400, y: 400 },
      { id: 'b', x: 418, y: 400 },
    ]
    const out = separateOverlaps(dots, 20)
    // Fehlen 2 Einheiten, wandert jeder Punkt nur je eine.
    expect(Math.abs(out.get('a')!.x - 399)).toBeLessThan(0.01)
    expect(Math.abs(out.get('b')!.x - 419)).toBeLessThan(0.01)
  })
})
