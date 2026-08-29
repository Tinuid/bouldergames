// Reine Geometrie für die Hallenkarte: Ausschnitt einpassen, Zoom begrenzen,
// Bildschirm- in SVG-Koordinaten umrechnen, Punkt-Größen und Treffer-Test.
//
// Bewusst ohne DOM-Abhängigkeit und ohne React – so ist der heikelste Teil des
// Lageplans (Clamping und Zoom-Anker) unter Vitest testbar. Die Werte kommen aus
// useSvgPanZoom, das nur noch Events und Rendering beisteuert.

export interface ViewRect {
  x: number
  y: number
  w: number
  h: number
}

export interface Point {
  x: number
  y: number
}

// Zoom 1 = "eingepasst". Weiter herauszoomen als eingepasst ist bewusst nicht
// erlaubt (harter Anschlag, kein Rubber-Band). Bei 8× zeigt ein 390px-Handy noch
// gut ein Sechstel der Hallenbreite – genug, um Punkte präzise zu setzen.
export const MIN_ZOOM = 1
export const MAX_ZOOM = 8

// Punkt-Radius in SVG-User-Einheiten bei Zoom 1. Die Dämpfung sorgt dafür, dass
// Punkte beim Hineinzoomen zwar größer werden, aber deutlich langsamer als die
// Karte – sonst sieht man am Ende nur noch Punkte und keinen Plan mehr.
// Bildschirmradius ∝ zoom^(1 − DOT_DAMPING).
export const DOT_BASE_R = 26
export const DOT_DAMPING = 0.55

// Bereichs-Beschriftungen werden stärker gegenskaliert (bleiben also fast konstant
// groß, wie Ortsnamen auf einer Landkarte) und blenden beim Hineinzoomen aus.
export const LABEL_BASE_SIZE = 32
export const LABEL_DAMPING = 0.85

// Zoom wird für React-State gerundet: Punkte und Labels hängen davon ab, und ohne
// Quantisierung würde jeder Pinch-Frame die ganze Punktebene neu rendern.
export const ZOOM_STEP = 0.05

// Größter Ausschnitt mit dem Seitenverhältnis des Containers, der den Grundriss
// vollständig enthält, zentriert auf dessen Mitte. Damit ist
// preserveAspectRatio="xMidYMid meet" die Identität – es gibt kein Letterboxing,
// und die Umrechnung Bildschirm ⇄ User bleibt eine simple Affine.
export function fitView(content: ViewRect, aspect: number): ViewRect {
  const contentAspect = content.w / content.h
  const w = contentAspect > aspect ? content.w : content.h * aspect
  const h = w / aspect
  return {
    x: content.x + (content.w - w) / 2,
    y: content.y + (content.h - h) / 2,
    w,
    h,
  }
}

// Gegenstück zu fitView: der größte Ausschnitt mit Container-Seitenverhältnis, der
// noch VOLLSTÄNDIG im Grundriss liegt – der Plan füllt damit den Bildschirm aus und
// wird an den Rändern angeschnitten.
//
// Das ist der Startzustand der Karte, nicht fitView. Auf einem Hochkant-Display ist
// der eingepasste Ausschnitt anderthalbmal so hoch wie der Plan: der läge dann klein
// in der Mitte, und Verschieben wäre gesperrt, weil ohnehin alles zu sehen ist – das
// fühlt sich an, als reagiere die Karte nicht. Herauszoomen auf die Gesamtansicht
// bleibt jederzeit möglich (Zoom 1 = fitView).
export function coverView(content: ViewRect, aspect: number): ViewRect {
  const contentAspect = content.w / content.h
  const w = contentAspect > aspect ? content.h * aspect : content.w
  const h = w / aspect
  return {
    x: content.x + (content.w - w) / 2,
    y: content.y + (content.h - h) / 2,
    w,
    h,
  }
}

export function zoomOf(fit: ViewRect, view: ViewRect): number {
  return fit.w / view.w
}

// Begrenzt Zoom und Position: erst die Breite (Höhe folgt aus dem Seitenverhältnis),
// dann je Achse – passt der Grundriss auf der Achse ganz hinein, wird zentriert,
// sonst am Rand angeschlagen. So läuft man eingezoomt nie über die Karte hinaus.
export function clampView(view: ViewRect, content: ViewRect, fit: ViewRect, aspect: number): ViewRect {
  const w = Math.min(Math.max(view.w, fit.w / MAX_ZOOM), fit.w / MIN_ZOOM)
  const h = w / aspect

  // Eine Breitenänderung wird um den Mittelpunkt des übergebenen Ausschnitts
  // ausgeglichen; ohne Änderung bleibt x/y unberührt.
  let x = view.x + (view.w - w) / 2
  let y = view.y + (view.h - h) / 2

  if (w >= content.w) x = content.x + (content.w - w) / 2
  else x = Math.min(Math.max(x, content.x), content.x + content.w - w)

  if (h >= content.h) y = content.y + (content.h - h) / 2
  else y = Math.min(Math.max(y, content.y), content.y + content.h - h)

  return { x, y, w, h }
}

// Neuer Ausschnitt mit der Breite `newW`, bei dem der User-Space-Punkt `anchor`
// an derselben Bildschirmstelle bleibt. Das ist der Kern von Pinch, Wheel-Zoom und
// Doppeltipp – ein Anker-Update erledigt Zoom und Verschiebung in einem Schritt.
export function zoomAround(view: ViewRect, newW: number, aspect: number, anchor: Point): ViewRect {
  const fx = (anchor.x - view.x) / view.w
  const fy = (anchor.y - view.y) / view.h
  const newH = newW / aspect
  return { x: anchor.x - fx * newW, y: anchor.y - fy * newH, w: newW, h: newH }
}

// Allgemeinere Variante von zoomAround: der User-Space-Punkt `anchor` soll an einer
// bestimmten RELATIVEN Bildschirmposition des Containers landen (0..1 je Achse).
// Nötig beim Pinch, wo sich der Ankerpunkt (die Fingermitte) auf dem Bildschirm
// mitbewegt – so erledigt ein Schritt Zoom und Verschiebung zugleich.
export function viewForAnchor(
  anchor: Point,
  fracX: number,
  fracY: number,
  newW: number,
  aspect: number,
): ViewRect {
  const newH = newW / aspect
  return { x: anchor.x - fracX * newW, y: anchor.y - fracY * newH, w: newW, h: newH }
}

// Pixel pro SVG-User-Einheit.
export function scaleOf(view: ViewRect, widthPx: number): number {
  return widthPx / view.w
}

// Bildschirm- in User-Koordinaten. `rect` ist die Bounding-Box des <svg>.
export function screenToUser(
  view: ViewRect,
  rect: { left: number; top: number; width: number },
  clientX: number,
  clientY: number,
): Point {
  const s = scaleOf(view, rect.width)
  return { x: view.x + (clientX - rect.left) / s, y: view.y + (clientY - rect.top) / s }
}

export function dotRadius(zoom: number): number {
  return DOT_BASE_R * Math.pow(zoom, -DOT_DAMPING)
}

export function labelSize(zoom: number): number {
  return LABEL_BASE_SIZE * Math.pow(zoom, -LABEL_DAMPING)
}

// Beschriftungen verblassen beim Hineinzoomen: ab Zoom 3 beginnt die Rampe, ab
// Zoom 5 bleiben sie bei 0.35 stehen. Wer so nah dran ist, weiß, wo er ist.
export function labelOpacity(zoom: number): number {
  if (zoom <= 3) return 1
  if (zoom >= 5) return 0.35
  return 1 - ((zoom - 3) / 2) * 0.65
}

export function quantizeZoom(zoom: number): number {
  return Math.round(zoom / ZOOM_STEP) * ZOOM_STEP
}

// Nächstgelegener Punkt zu einer Tap-Position, innerhalb von Radius + Slop.
// Bewusst statt onClick auf den <circle>-Elementen: so lösen wir (a) den Fall
// "Pan endet zufällig auf einem Punkt" sauber im Aufrufer und (b) sind auf einem
// Touchscreen deutlich verzeihender als exakte Kreisgeometrie.
// Bei Gleichstand gewinnt der zuletzt gezeichnete (oben liegende) Punkt.
export function nearestDot<T extends { id: string; x: number; y: number }>(
  dots: T[],
  p: Point,
  radiusUser: number,
  slopUser: number,
): T | null {
  const max = radiusUser + slopUser
  let best: T | null = null
  let bestD = Infinity
  for (const d of dots) {
    const dist = Math.hypot(d.x - p.x, d.y - p.y)
    if (dist <= max && dist <= bestD) {
      best = d
      bestD = dist
    }
  }
  return best
}
