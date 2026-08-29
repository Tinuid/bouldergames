import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampView,
  coverView,
  fitView,
  quantizeZoom,
  scaleOf,
  screenToUser,
  viewForAnchor,
  zoomOf,
  type Point,
  type ViewRect,
} from '../lib/mapGeometry'

// Bewegungs-Schwelle in CSS-Pixeln, ab der aus einem Tippen ein Ziehen wird.
// Etwas großzügiger als die 6px activationConstraint in ReorderBouldersDialog –
// hier ist der ganze Bildschirm Ziehfläche und Finger driften beim Tippen.
const TAP_SLOP = 8
const TAP_MAX_MS = 600
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_SLOP = 30
const LONG_PRESS_MS = 450
const DOUBLE_TAP_ZOOM = 3
const ANIM_MS = 220

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

interface Options {
  // Der darzustellende Ausschnitt (Grundriss). Zoom 1 = "passt hinein".
  content: ViewRect
  // Blockiert alle Gesten – z.B. während ein Punkt anders gehandhabt wird.
  disabled?: boolean
  // Tippen (keine Bewegung, ein Finger) an einer Position im User-Space.
  onTap?: (p: Point) => void
  // Langes Drücken ohne Bewegung. In Etappe 1 ungenutzt, Aufhänger für später.
  onLongPress?: (p: Point) => void
}

/**
 * Pan/Zoom für ein <svg> über dessen viewBox – bewusst ohne Fremdbibliothek
 * (gleiche Haltung wie ImageLightbox; @dnd-kit arbeitet im Screen-Space und kann
 * kein Pinch).
 *
 * Zwei Dinge sind hier wichtiger als sie aussehen:
 *
 * 1. Die viewBox wird IMPERATIV gesetzt, nie über ein React-Attribut. Ein Pan
 *    erzeugt damit null Re-Renders – bei einigen hundert Punkten wäre alles andere
 *    auf einem Handy zäh. Der Zoom landet nur gequantelt im State, weil Punkt- und
 *    Label-Größen davon abhängen.
 * 2. view.w/view.h wird immer auf das Seitenverhältnis des Containers gehalten.
 *    Damit ist preserveAspectRatio die Identität (kein Letterboxing) und die
 *    Umrechnung Bildschirm ⇄ User bleibt eine simple Affine.
 */
export function useSvgPanZoom({ content, disabled = false, onTap, onLongPress }: Options) {
  const svgRef = useRef<SVGSVGElement>(null)

  // Wahrheit über den aktuellen Ausschnitt. Der State ist nur die zuletzt
  // festgeschriebene Kopie (für Verbraucher, die ihn wirklich brauchen).
  const viewRef = useRef<ViewRect>({ ...content })
  const [view, setView] = useState<ViewRect>({ ...content })
  const [zoomQ, setZoomQ] = useState(1)
  const [isGesturing, setIsGesturing] = useState(false)
  // Pixel pro User-Einheit bei Zoom 1. Ändert sich nur mit der Containergröße und
  // erlaubt Verbrauchern, aus zoomQ die tatsächliche Bildschirmgröße zu bestimmen
  // (z.B. ob ein Badge groß genug für sein Symbol ist).
  const [fitScale, setFitScale] = useState(1)

  const aspectRef = useRef(content.w / content.h)
  const fitRef = useRef<ViewRect>({ ...content })
  const rectRef = useRef<Rect>({ left: 0, top: 0, width: 1, height: 1 })
  const rafRef = useRef(0)
  const animRef = useRef(0)

  // Gestenzustand
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const lastPanRef = useRef<{ x: number; y: number } | null>(null)
  const pinchRef = useRef<{ dist: number } | null>(null)
  const gestureRef = useRef({ startX: 0, startY: 0, startedAt: 0, maxMove: 0, everMulti: false })
  const lastTapRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const longPressRef = useRef(0)

  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const writeViewBox = useCallback(() => {
    const v = viewRef.current
    svgRef.current?.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`)
    const q = quantizeZoom(zoomOf(fitRef.current, v))
    setZoomQ((prev) => (Math.abs(prev - q) < 1e-6 ? prev : q))
  }, [])

  const scheduleWrite = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      writeViewBox()
    })
  }, [writeViewBox])

  // Ausschnitt setzen: immer clampen, danach zeichnen. commit=true schreibt ihn
  // zusätzlich in den React-State (am Ende einer Geste).
  const applyView = useCallback(
    (next: ViewRect, commit = false) => {
      viewRef.current = clampView(next, content, fitRef.current, aspectRef.current)
      scheduleWrite()
      if (commit) setView(viewRef.current)
    },
    [content, scheduleWrite],
  )

  const measure = useCallback(() => {
    const el = svgRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) return
    rectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height }
    aspectRef.current = r.width / r.height
    fitRef.current = fitView(content, aspectRef.current)
    const s = r.width / fitRef.current.w
    setFitScale((prev) => (Math.abs(prev - s) < 1e-6 ? prev : s))
  }, [content])

  // Container-Größe verfolgen: Seitenverhältnis und Fit hängen daran, und ein
  // Drehen des Geräts darf den Ausschnitt nicht ungültig machen.
  useLayoutEffect(() => {
    const el = svgRef.current
    if (!el) return

    const onResize = () => {
      const before = viewRef.current
      const cx = before.x + before.w / 2
      const cy = before.y + before.h / 2
      const zoom = zoomOf(fitRef.current, before)
      measure()
      // Zoomstufe und Mitte beibehalten, Höhe aus dem neuen Verhältnis ableiten.
      const w = fitRef.current.w / zoom
      const h = w / aspectRef.current
      applyView({ x: cx - w / 2, y: cy - h / 2, w, h }, true)
    }

    measure()
    // Startzustand: bildschirmfüllend, nicht eingepasst (siehe coverView).
    applyView(coverView(content, aspectRef.current), true)
    // Synchron zeichnen statt erst im nächsten Frame: sonst zeigt das erste Bild
    // ein <svg> ohne viewBox, also den Plan 1:1 ab Koordinate 0,0.
    writeViewBox()

    const ro = new ResizeObserver(onResize)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure, applyView, content, writeViewBox])

  // Safari zoomt sonst die ganze Seite: die nicht standardisierten gesture*-Events
  // feuern dort teils auch auf Elementen mit touch-action: none.
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault()
    document.addEventListener('gesturestart', stop)
    document.addEventListener('gesturechange', stop)
    return () => {
      document.removeEventListener('gesturestart', stop)
      document.removeEventListener('gesturechange', stop)
    }
  }, [])

  // Beim Abräumen die Handles NICHT nur abbrechen, sondern auch zurücksetzen:
  // scheduleWrite() nutzt rafRef als Wächter ("läuft schon ein Frame?"). Bliebe da
  // ein abgebrochenes Handle stehen, würde ab dem nächsten Anmontieren nie wieder
  // gezeichnet – in der Entwicklung passiert genau das, weil StrictMode jede
  // Komponente einmal ab- und wieder anmontiert. Ergebnis wäre eine Karte ohne
  // viewBox, die auf keine Geste mehr reagiert.
  useEffect(
    () => () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = 0
      }
      window.clearTimeout(longPressRef.current)
    },
    [],
  )

  const toUser = useCallback(
    (clientX: number, clientY: number): Point =>
      screenToUser(viewRef.current, rectRef.current, clientX, clientY),
    [],
  )

  const animateTo = useCallback(
    (target: ViewRect) => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      const clamped = clampView(target, content, fitRef.current, aspectRef.current)
      if (reducedMotion) {
        applyView(clamped, true)
        return
      }
      const from = { ...viewRef.current }
      const t0 = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / ANIM_MS)
        const e = 1 - Math.pow(1 - p, 3)
        applyView({
          x: from.x + (clamped.x - from.x) * e,
          y: from.y + (clamped.y - from.y) * e,
          w: from.w + (clamped.w - from.w) * e,
          h: from.h + (clamped.h - from.h) * e,
        })
        if (p < 1) animRef.current = requestAnimationFrame(step)
        else {
          animRef.current = 0
          applyView(clamped, true)
        }
      }
      animRef.current = requestAnimationFrame(step)
    },
    [applyView, content, reducedMotion],
  )

  // Zoom auf eine Stufe, optional verankert an einem User-Space-Punkt.
  const zoomTo = useCallback(
    (zoom: number, anchor?: Point, animate = false) => {
      const z = Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM)
      const w = fitRef.current.w / z
      const v = viewRef.current
      const a = anchor ?? { x: v.x + v.w / 2, y: v.y + v.h / 2 }
      const fracX = anchor ? (a.x - v.x) / v.w : 0.5
      const fracY = anchor ? (a.y - v.y) / v.h : 0.5
      const next = viewForAnchor(a, fracX, fracY, w, aspectRef.current)
      if (animate) animateTo(next)
      else applyView(next, true)
    },
    [animateTo, applyView],
  )

  const zoomBy = useCallback(
    (factor: number) => zoomTo(zoomOf(fitRef.current, viewRef.current) * factor),
    [zoomTo],
  )

  const reset = useCallback(
    (animate = false) => {
      if (animate) animateTo(fitRef.current)
      else applyView(fitRef.current, true)
    },
    [animateTo, applyView],
  )

  // Auf einen Punkt zentrieren. `bias` verschiebt das Ziel nach oben (0.5 = Mitte,
  // 0.32 = oberes Drittel), damit ein aufgeklapptes Sheet ihn nicht verdeckt.
  const focusOn = useCallback(
    (p: Point, opts?: { zoom?: number; bias?: number; animate?: boolean }) => {
      const z = Math.min(Math.max(opts?.zoom ?? zoomOf(fitRef.current, viewRef.current), MIN_ZOOM), MAX_ZOOM)
      const w = fitRef.current.w / z
      const next = viewForAnchor(p, 0.5, opts?.bias ?? 0.5, w, aspectRef.current)
      if (opts?.animate ?? true) animateTo(next)
      else applyView(next, true)
    },
    [animateTo, applyView],
  )

  // Auf eine Punktwolke einpassen (Aufhänger für Etappe 2: Boulder einer Session).
  const fitTo = useCallback(
    (points: Point[], paddingUser = 80, animate = true) => {
      if (points.length === 0) return
      const xs = points.map((p) => p.x)
      const ys = points.map((p) => p.y)
      const x0 = Math.min(...xs) - paddingUser
      const x1 = Math.max(...xs) + paddingUser
      const y0 = Math.min(...ys) - paddingUser
      const y1 = Math.max(...ys) + paddingUser
      const w = Math.max(x1 - x0, (y1 - y0) * aspectRef.current)
      const h = w / aspectRef.current
      const next = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h }
      if (animate) animateTo(next)
      else applyView(next, true)
    },
    [animateTo, applyView],
  )

  const panBy = useCallback(
    (fracX: number, fracY: number) => {
      const v = viewRef.current
      applyView({ ...v, x: v.x + v.w * fracX, y: v.y + v.h * fracY }, true)
    },
    [applyView],
  )

  // ── Gesten ────────────────────────────────────────────────────────────────

  const endGesture = useCallback(() => {
    pointersRef.current.clear()
    lastPanRef.current = null
    pinchRef.current = null
    window.clearTimeout(longPressRef.current)
    setIsGesturing(false)
    setView(viewRef.current)
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (disabled) return
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = 0
      }
      // WebKit hat setPointerCapture auf SVG-Elementen zeitweise mit einer
      // Ausnahme quittiert. Ohne try/catch bräche der Handler an dieser Stelle ab
      // und es gäbe überhaupt keine Gesten mehr – die Zeiger-Buchhaltung unten
      // funktioniert aber auch ohne Capture.
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* ohne Capture weitermachen */
      }
      if (pointersRef.current.size === 0) measure()

      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      setIsGesturing(true)

      if (pointersRef.current.size === 1) {
        lastPanRef.current = { x: e.clientX, y: e.clientY }
        gestureRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startedAt: performance.now(),
          maxMove: 0,
          everMulti: false,
        }
        if (onLongPress) {
          const p = toUser(e.clientX, e.clientY)
          window.clearTimeout(longPressRef.current)
          longPressRef.current = window.setTimeout(() => {
            if (gestureRef.current.maxMove <= TAP_SLOP) onLongPress(p)
          }, LONG_PRESS_MS)
        }
      } else {
        gestureRef.current.everMulti = true
        window.clearTimeout(longPressRef.current)
        const [a, b] = [...pointersRef.current.values()]
        pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) }
        lastPanRef.current = null
      }
    },
    [disabled, measure, onLongPress, toUser],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (disabled) return
      if (!pointersRef.current.has(e.pointerId)) return
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      const g = gestureRef.current
      g.maxMove = Math.max(g.maxMove, Math.hypot(e.clientX - g.startX, e.clientY - g.startY))

      const rect = rectRef.current
      const pointers = [...pointersRef.current.values()]

      if (pointers.length >= 2 && pinchRef.current) {
        const [a, b] = pointers
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (dist <= 0) return
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        // Ankerpunkt ist der User-Punkt unter der bisherigen Fingermitte; er soll
        // unter der neuen Mitte liegen bleiben – das erledigt Zoom und
        // Zwei-Finger-Verschieben in einem Schritt.
        const anchor = toUser(mid.x, mid.y)
        const newW = viewRef.current.w * (pinchRef.current.dist / dist)
        pinchRef.current = { dist }
        applyView(
          viewForAnchor(
            anchor,
            (mid.x - rect.left) / rect.width,
            (mid.y - rect.top) / rect.height,
            Math.min(Math.max(newW, fitRef.current.w / MAX_ZOOM), fitRef.current.w / MIN_ZOOM),
            aspectRef.current,
          ),
        )
        return
      }

      const last = lastPanRef.current
      if (!last) return
      const s = scaleOf(viewRef.current, rect.width)
      applyView({
        ...viewRef.current,
        x: viewRef.current.x - (e.clientX - last.x) / s,
        y: viewRef.current.y - (e.clientY - last.y) / s,
      })
      lastPanRef.current = { x: e.clientX, y: e.clientY }
    },
    [applyView, disabled, toUser],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!pointersRef.current.has(e.pointerId)) return
      pointersRef.current.delete(e.pointerId)
      window.clearTimeout(longPressRef.current)

      const g = gestureRef.current
      const wasTap =
        !g.everMulti && g.maxMove <= TAP_SLOP && performance.now() - g.startedAt < TAP_MAX_MS

      if (pointersRef.current.size === 0) {
        if (wasTap) {
          const now = performance.now()
          const prev = lastTapRef.current
          const isDouble =
            prev != null &&
            now - prev.t < DOUBLE_TAP_MS &&
            Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < DOUBLE_TAP_SLOP

          if (isDouble) {
            lastTapRef.current = null
            const p = toUser(e.clientX, e.clientY)
            const zoom = zoomOf(fitRef.current, viewRef.current)
            if (zoom < 2.5) zoomTo(DOUBLE_TAP_ZOOM, p, true)
            else reset(true)
          } else {
            lastTapRef.current = { x: e.clientX, y: e.clientY, t: now }
            onTap?.(toUser(e.clientX, e.clientY))
          }
        }
        endGesture()
      } else if (pointersRef.current.size === 1) {
        // Vom Pinch zurück auf einen Finger: Pan-Referenz neu setzen, sonst
        // springt die Karte um die Differenz.
        const [only] = [...pointersRef.current.values()]
        lastPanRef.current = { ...only }
        pinchRef.current = null
      }
    },
    [endGesture, onTap, reset, toUser, zoomTo],
  )

  // pointercancel MUSS wie pointerup aufräumen: iOS feuert es großzügig (Edge-Swipe,
  // eingehender Anruf). Bleibt ein Geist-Pointer in der Map, hängt die Karte
  // dauerhaft im Pinch-Modus.
  const onPointerCancel = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      pointersRef.current.delete(e.pointerId)
      if (pointersRef.current.size === 0) endGesture()
    },
    [endGesture],
  )

  // Wheel/Trackpad nativ binden: Reacts onWheel wird passiv registriert, dort
  // wirkt preventDefault() nicht und die Seite scrollt mit.
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (disabled) return
      e.preventDefault()
      measure()
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      // Trackpad-Pinch kommt in Chrome/Safari als wheel mit ctrlKey – feiner dosiert.
      const factor = Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0015))
      const rect = rectRef.current
      const anchor = toUser(e.clientX, e.clientY)
      const newW = Math.min(
        Math.max(viewRef.current.w / factor, fitRef.current.w / MAX_ZOOM),
        fitRef.current.w / MIN_ZOOM,
      )
      applyView(
        viewForAnchor(
          anchor,
          (e.clientX - rect.left) / rect.width,
          (e.clientY - rect.top) / rect.height,
          newW,
          aspectRef.current,
        ),
        true,
      )
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [applyView, disabled, measure, toUser])

  return {
    svgRef,
    view,
    zoom: zoomOf(fitRef.current, view),
    zoomQ,
    fitScale,
    isGesturing,
    toUser,
    zoomTo,
    zoomBy,
    panBy,
    focusOn,
    fitTo,
    reset,
    // Kein onPointerLeave: durch setPointerCapture kommen pointerup/pointercancel
    // garantiert an, und ein Leave beim Überfahren des Randes würde die Geste
    // sonst mitten im Ziehen abbrechen.
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  }
}
