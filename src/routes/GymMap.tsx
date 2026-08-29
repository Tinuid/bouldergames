import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRealtimeGym } from '../hooks/useRealtimeGym'
import { useSvgPanZoom } from '../hooks/useSvgPanZoom'
import { DEFAULT_GYM_SLUG } from '../lib/gyms'
import { areaAt, areaLabel, LAGEPLAN_VIEWBOX } from '../lib/areas'
import { difficultyLabel } from '../lib/difficulty'
import { dotRadius, nearestDot } from '../lib/mapGeometry'
import { deleteBoulderImage, uploadBoulderImage } from '../lib/images'
import {
  addBouldersFromGym,
  clearGymTick,
  deleteGymBoulder,
  getSessionById,
  isWrongPasswordError,
  listBoulders,
  moveGymBoulder,
  setGymBoulderRemoved,
  setGymTick,
  upsertGymBoulder,
  verifyGymAdminKey,
  type MySession,
} from '../lib/api'
import LageplanMap from '../components/lageplan/LageplanMap'
import type { MapDotVM } from '../components/lageplan/MapDots'
import MapFilterBar from '../components/lageplan/MapFilterBar'
import { EMPTY_FILTER, matchesFilter, type MapFilter } from '../lib/mapFilter'
import BoulderMapSheet from '../components/lageplan/BoulderMapSheet'
import MapBoulderDialog, {
  type MapBoulderFormValues,
} from '../components/lageplan/MapBoulderDialog'
import AdminUnlockSheet from '../components/lageplan/AdminUnlockSheet'
import SessionPickerSheet from '../components/lageplan/SessionPickerSheet'
import { Check, ChevronLeft, Crosshair, More, Plus, X } from '../components/icons'
import type { GymBoulder, GymTickState } from '../types'

// Browsen oder Boulder für eine Challenge einsammeln. Der Bearbeitungsmodus hängt
// bewusst separat an adminKey – man kann auch beim Pflegen etwas auswählen.
type MapMode = 'browse' | 'select'

// Zusätzliche Trefferfläche um einen Punkt, in Bildschirm-Pixeln. Auf einem
// Touchscreen ist exakte Kreisgeometrie zu streng.
const TAP_SLOP_PX = 10

// Stabile leere Menge: sonst bekäme die memoisierte Punktebene bei jedem Rendern
// eine neue Referenz und würde unnötig neu zeichnen.
const EMPTY_SET: Set<string> = new Set()

function filterStorageKey(gymId: string) {
  return `bg:gymFilter:${gymId}`
}

export default function GymMap() {
  const { userId } = useAuth()
  const { gym, boulders, ticks, loading, error, notFound, refresh } = useRealtimeGym(
    DEFAULT_GYM_SLUG,
    userId ?? undefined,
  )

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Aus einer Challenge heraus geöffnet: deren Boulder werden hervorgehoben, und
  // "Hinzufügen" überspringt die Challenge-Auswahl.
  const contextSessionId = searchParams.get('session')
  const startInPickMode = searchParams.get('pick') === '1'
  // Aus der Mini-Karte eines Challenge-Boulders: genau diesen auswählen.
  const contextBoulderId = searchParams.get('boulder')

  const [filter, setFilter] = useState<MapFilter>(EMPTY_FILTER)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [mode, setMode] = useState<MapMode>(startInPickMode ? 'select' : 'browse')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [contextSession, setContextSession] = useState<{ id: string; name: string } | null>(null)
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set())

  // Bearbeitungsmodus. Der Schlüssel lebt nur hier im Speicher – nach einem Reload
  // ist er weg und wird neu abgefragt (Muster aus FeedbackList).
  const [adminKey, setAdminKey] = useState<string | null>(null)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [placeAt, setPlaceAt] = useState<{ x: number; y: number } | null>(null)
  const [editing, setEditing] = useState<GymBoulder | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)

  // Optimistische Marken: das Badge soll im selben Frame erscheinen, in dem getippt
  // wurde. Ein Eintrag fällt weg, sobald die Realtime-/Refresh-Daten ihn bestätigen.
  const [tickOverlay, setTickOverlay] = useState<Record<string, GymTickState | null>>({})

  const adminMode = adminKey != null

  // Fehlermeldung nach 5s ausblenden (wie in SessionView).
  useEffect(() => {
    if (!saveError) return
    const t = setTimeout(() => setSaveError(null), 5000)
    return () => clearTimeout(t)
  }, [saveError])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(t)
  }, [notice])

  // Kontext-Challenge laden: Name für das Banner, ihre Karten-Boulder für die
  // Hervorhebung. Bewusst einmalig – die Session-Ansicht bleibt die Stelle, an der
  // Änderungen live ankommen.
  useEffect(() => {
    if (!contextSessionId) {
      setContextSession(null)
      setHighlightIds(new Set())
      return
    }
    let cancelled = false
    Promise.all([getSessionById(contextSessionId), listBoulders(contextSessionId)])
      .then(([session, sessionBoulders]) => {
        if (cancelled) return
        if (session) setContextSession({ id: session.id, name: session.name })
        setHighlightIds(
          new Set(
            sessionBoulders
              .map((b) => b.gym_boulder_id)
              .filter((id): id is string => id != null),
          ),
        )
      })
      .catch(() => {
        if (!cancelled) setSaveError('Die Challenge konnte nicht geladen werden.')
      })
    return () => {
      cancelled = true
    }
  }, [contextSessionId])

  // Filterwahl pro Halle gerätelokal merken.
  const gymId = gym?.id
  useEffect(() => {
    if (!gymId) return
    try {
      const raw = localStorage.getItem(filterStorageKey(gymId))
      if (raw) setFilter({ ...EMPTY_FILTER, ...JSON.parse(raw) })
    } catch {
      /* defekter Eintrag: einfach ohne Filter starten */
    }
  }, [gymId])

  useEffect(() => {
    if (!gymId) return
    try {
      localStorage.setItem(filterStorageKey(gymId), JSON.stringify(filter))
    } catch {
      /* Speicher voll/gesperrt: der Filter gilt dann nur für diese Sitzung */
    }
  }, [gymId, filter])

  const tickByBoulder = useMemo(() => {
    const map = new Map<string, GymTickState>()
    for (const t of ticks) map.set(t.gym_boulder_id, t.state)
    for (const [id, state] of Object.entries(tickOverlay)) {
      if (state == null) map.delete(id)
      else map.set(id, state)
    }
    return map
  }, [ticks, tickOverlay])

  // Eingehende Daten bestätigen das Overlay ⇒ Overlay aufräumen.
  useEffect(() => {
    setTickOverlay((prev) => {
      if (Object.keys(prev).length === 0) return prev
      const server = new Map(ticks.map((t) => [t.gym_boulder_id, t.state]))
      const next: Record<string, GymTickState | null> = {}
      for (const [id, state] of Object.entries(prev)) {
        if ((server.get(id) ?? null) !== state) next[id] = state
      }
      return Object.keys(next).length === Object.keys(prev).length ? prev : next
    })
  }, [ticks])

  const available = useMemo(
    () => ({
      difficulties: [...new Set(boulders.map((b) => b.difficulty))],
      areas: [...new Set(boulders.map((b) => b.area).filter((a): a is string => a != null))],
      colors: [...new Set(boulders.map((b) => b.color))],
    }),
    [boulders],
  )

  // Optionen, die es nicht mehr gibt, aus dem Filter räumen – sonst steht man vor
  // einer leeren Karte ohne sichtbaren Grund (Muster aus SessionView).
  useEffect(() => {
    setFilter((f) => {
      const difficulties = f.difficulties.filter((d) => available.difficulties.includes(d))
      const areas = f.areas.filter((a) => available.areas.includes(a))
      const colors = f.colors.filter((c) => available.colors.includes(c))
      if (
        difficulties.length === f.difficulties.length &&
        areas.length === f.areas.length &&
        colors.length === f.colors.length
      ) {
        return f
      }
      return { ...f, difficulties, areas, colors }
    })
  }, [available])

  const dots = useMemo<MapDotVM[]>(
    () =>
      boulders.map((b) => {
        const tick = tickByBoulder.get(b.id) ?? null
        const area = areaLabel(b.area)
        return {
          id: b.id,
          x: b.x,
          y: b.y,
          color: b.color,
          label: difficultyLabel(b.difficulty) ?? '?',
          tick,
          dimmed: !matchesFilter(filter, b, tick),
          // Aus einer Challenge geöffnet: alles, was nicht dazugehört, tritt zurück.
          // Nur im Browse-Modus – beim Auswählen sucht man ja gerade die anderen.
          faded:
            mode === 'browse' && highlightIds.size > 0 && !highlightIds.has(b.id),
          aria: [
            `Grad ${difficultyLabel(b.difficulty)}`,
            b.color,
            area,
            tick === 'done' ? 'erledigt' : tick === 'project' ? 'Projekt' : null,
          ]
            .filter(Boolean)
            .join(', '),
        }
      }),
    [boulders, filter, tickByBoulder, mode, highlightIds],
  )

  const visibleDots = useMemo(() => dots.filter((d) => !d.dimmed), [dots])

  // Aktuelle Werte für den Tap-Handler, ohne ihn bei jeder Filteränderung neu zu
  // bauen (er hängt am Pan/Zoom-Hook).
  const stateRef = useRef({ visibleDots, adminMode, movingId, boulders, mode })
  stateRef.current = { visibleDots, adminMode, movingId, boulders, mode }

  const panZoomRef = useRef<{ zoomQ: number; fitScale: number }>({ zoomQ: 1, fitScale: 1 })

  const handleTap = useCallback(
    (p: { x: number; y: number }) => {
      const {
        visibleDots: vd,
        adminMode: admin,
        movingId: moving,
        mode: currentMode,
      } = stateRef.current
      const { zoomQ, fitScale } = panZoomRef.current

      // Verschieben ist scharfgeschaltet: der nächste Tipp ist die neue Position.
      // Bewusst kein Ziehen am Punkt – das wäre nicht vom Verschieben der Karte
      // zu unterscheiden.
      if (admin && moving && adminKey) {
        const id = moving
        setMovingId(null)
        moveGymBoulder({ key: adminKey, id, x: p.x, y: p.y, area: areaAt(p.x, p.y) })
          .then(refresh)
          .catch((err) => {
            if (isWrongPasswordError(err)) setAdminKey(null)
            setSaveError(err instanceof Error ? err.message : 'Verschieben fehlgeschlagen.')
            refresh()
          })
        return
      }

      const pxPerUnit = fitScale * zoomQ
      const hit = nearestDot(vd, p, dotRadius(zoomQ), TAP_SLOP_PX / pxPerUnit)

      // Im Auswahlmodus sammelt ein Tipp ein bzw. wieder aus – bewusst kein
      // Detail-Sheet, sonst wäre das Tippen doppeldeutig.
      if (currentMode === 'select') {
        if (!hit) return
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (next.has(hit.id)) next.delete(hit.id)
          else next.add(hit.id)
          return next
        })
        return
      }

      // Gesetzt wird ausschließlich über das Fadenkreuz: mit dem Finger auf eine
      // freie Stelle zu zielen ist ungenau (der Finger verdeckt genau die Stelle),
      // und ein zweiter Bedienweg fürs Anlegen bringt nichts.
      setSelectedId(hit ? hit.id : null)
    },
    [adminKey, refresh],
  )

  const panZoom = useSvgPanZoom({ content: LAGEPLAN_VIEWBOX, onTap: handleTap })
  panZoomRef.current = { zoomQ: panZoom.zoomQ, fitScale: panZoom.fitScale }
  const { focusOn, fitTo, zoomBy, panBy, reset } = panZoom

  // Ist ein einzelner Boulder gemeint, den einmalig auswählen – der Fokus-Effekt
  // weiter unten holt ihn dann in die Mitte.
  const preselectedRef = useRef(false)
  // Wer aus einer Challenge auf einen bestimmten Boulder springt, will nach dem
  // Schließen des Sheets wieder dorthin – nicht auf der Karte stehenbleiben.
  // Gilt nur für genau diese eine Auswahl; danach verhält sich die Karte normal.
  const backOnCloseRef = useRef(false)
  useEffect(() => {
    if (preselectedRef.current || !contextBoulderId || boulders.length === 0) return
    if (!boulders.some((b) => b.id === contextBoulderId)) return
    preselectedRef.current = true
    backOnCloseRef.current = contextSessionId != null
    setSelectedId(contextBoulderId)
  }, [contextBoulderId, contextSessionId, boulders])

  // Kommt man aus einer Challenge, einmalig auf deren Boulder einpassen. Entfällt,
  // wenn ohnehin ein bestimmter Boulder gemeint ist.
  const fittedRef = useRef(false)
  useEffect(() => {
    if (contextBoulderId) return
    if (fittedRef.current || highlightIds.size === 0 || boulders.length === 0) return
    const points = boulders.filter((b) => highlightIds.has(b.id)).map((b) => ({ x: b.x, y: b.y }))
    if (points.length === 0) return
    fittedRef.current = true
    fitTo(points)
  }, [highlightIds, boulders, fitTo, contextBoulderId])

  const selected = useMemo(
    () => boulders.find((b) => b.id === selectedId) ?? null,
    [boulders, selectedId],
  )

  // Ausgewählten Punkt ins obere Drittel holen, damit ihn das Sheet nicht verdeckt.
  // Bewusst nur an selectedId gehängt: bei jedem Realtime-Re-Fetch entsteht ein
  // neues Boulder-Objekt, und die Karte würde sonst ständig nachanimieren.
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  useEffect(() => {
    const b = selectedRef.current
    if (!b) return
    focusOn({ x: b.x, y: b.y }, { bias: 0.32 })
  }, [selectedId, focusOn])

  async function handleSetTick(state: GymTickState | null) {
    if (!selected || !userId) return
    const id = selected.id
    setTickOverlay((prev) => ({ ...prev, [id]: state }))
    try {
      if (state == null) await clearGymTick(id, userId)
      else await setGymTick({ gymBoulderId: id, userId, state })
      refresh()
    } catch (err) {
      setTickOverlay((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setSaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
      refresh()
    }
  }

  // Was auf der Karte als ausgewählt gezeichnet wird: im Auswahlmodus die Menge,
  // sonst der eine angetippte Punkt. Memoisiert, weil die Punktebene sonst bei
  // jedem Rendern eine neue Set-Referenz bekäme und neu zeichnen würde.
  const dotSelection = useMemo(
    () => (mode === 'select' ? selectedIds : selectedId ? new Set([selectedId]) : EMPTY_SET),
    [mode, selectedIds, selectedId],
  )

  // In Auswahlreihenfolge (Set behält die Einfügereihenfolge) – daraus ergibt sich
  // die Nummerierung der Boulder in der Challenge.
  const selectedBoulders = useMemo(() => {
    const byId = new Map(boulders.map((b) => [b.id, b]))
    return [...selectedIds].map((id) => byId.get(id)).filter((b): b is GymBoulder => b != null)
  }, [boulders, selectedIds])

  function leaveSelectMode() {
    setMode('browse')
    setSelectedIds(new Set())
  }

  function startChallenge() {
    // Über den Router-State statt über die URL: die Auswahl ist flüchtig und muss
    // einen Reload von /create nicht überleben.
    navigate('/create', { state: { gymBoulderIds: [...selectedIds] } })
  }

  async function addToSession(session: MySession | { id: string; name: string }) {
    if (!userId) return
    const { added, skipped } = await addBouldersFromGym({
      sessionId: session.id,
      userId,
      boulders: selectedBoulders,
    })

    const parts = [added === 1 ? '1 Boulder hinzugefügt' : `${added} Boulder hinzugefügt`]
    if (skipped > 0) parts.push(skipped === 1 ? '1 war schon drin' : `${skipped} waren schon drin`)
    setNotice(`${parts.join(', ')} – ${session.name}`)

    // Kommt man aus genau dieser Challenge, die Hervorhebung gleich nachziehen.
    if (contextSessionId === session.id) {
      setHighlightIds((prev) => new Set([...prev, ...selectedIds]))
    }
    setSelectedIds(new Set())
    setPickerOpen(false)
  }

  async function handleUnlock(key: string) {
    await verifyGymAdminKey(key)
    setAdminKey(key)
    setUnlockOpen(false)
  }

  async function handleDialogSubmit(values: MapBoulderFormValues) {
    if (!adminKey || !gym || !userId) return
    const target = editing
    const position = target ? { x: target.x, y: target.y } : placeAt
    if (!position) return

    try {
      let imagePath = target?.image_path ?? null
      if (values.image) imagePath = await uploadBoulderImage(values.image, userId)
      else if (values.removeImage) imagePath = null

      await upsertGymBoulder({
        key: adminKey,
        id: target?.id ?? null,
        gymId: gym.id,
        x: position.x,
        y: position.y,
        area: values.area,
        difficulty: values.difficulty,
        color: values.color,
        label: values.label,
        imagePath,
      })

      // Ersetztes/entferntes Foto best-effort aufräumen (fremde Uploads darf die
      // Storage-Policy nicht löschen – das schluckt deleteBoulderImage).
      const old = target?.image_path
      if (old && old !== imagePath) await deleteBoulderImage(old)

      setPlaceAt(null)
      setEditing(null)
      refresh()
    } catch (err) {
      if (isWrongPasswordError(err)) setAdminKey(null)
      throw err
    }
  }

  const dialogBusy = dialogOpen || unlockOpen || menuOpen

  if (notFound) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-3 p-6">
        <h1 className="font-display text-xl font-bold">Keine Halle hinterlegt</h1>
        <p className="text-muted">
          Die Migration <code>0015_gym_map.sql</code> ist noch nicht ausgeführt oder es gibt keine
          Halle mit dem Kürzel „{DEFAULT_GYM_SLUG}".
        </p>
        <Link to="/" className="btn-secondary">
          Zur Übersicht
        </Link>
      </div>
    )
  }

  return (
    <div
      className="animate-screen-in fixed inset-0 z-40 flex flex-col overflow-hidden bg-bg"
      // position: fixed bezieht sich auf den Viewport und ignoriert das
      // Safe-Area-Padding, das body in index.css trägt – hier also selbst setzen.
      style={{
        padding:
          'env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left)',
      }}
    >
      <header className="flex touch-manipulation items-center justify-between gap-2 px-4 py-3">
        <Link
          to={
            contextSession
              ? `/s/${contextSession.id}${selectedId ? `?boulder=${selectedId}` : ''}`
              : '/'
          }
          className="flex min-w-0 items-center gap-1 text-[14px] font-semibold text-muted"
        >
          <ChevronLeft className="shrink-0 text-[18px]" />
          <span className="truncate">{contextSession ? 'Challenge' : 'Übersicht'}</span>
        </Link>
        <div className="min-w-0 flex-1 truncate text-center font-display text-[16px] font-extrabold tracking-[-0.02em]">
          {gym?.name ?? 'Hallenkarte'}
        </div>
        {mode === 'select' ? (
          <button
            type="button"
            className="flex items-center gap-1 rounded-btn bg-accent px-3 py-1.5 text-[13px] font-bold text-accent-ink"
            onClick={leaveSelectMode}
          >
            <Check className="text-[15px]" />
            Fertig
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            {/* Wer über die Mini-Karte eines einzelnen Boulders kommt, will nachsehen,
                nicht sammeln – dann ist der Knopf nur im Weg. */}
            {!contextBoulderId && (
              <button
                type="button"
                className="rounded-btn border border-border-strong bg-surface-2 px-3 py-1.5 text-[13px] font-bold text-ink"
                onClick={() => {
                  setSelectedId(null)
                  setMode('select')
                }}
              >
                Auswählen
              </button>
            )}
            <button
              type="button"
              aria-label="Mehr"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted"
              onClick={() => setMenuOpen(true)}
            >
              <More />
            </button>
          </div>
        )}
      </header>

      {/* min-h-0 ist Pflicht: ohne das kollabiert h-full auf dem <svg> in einer
          Flex-Spalte. */}
      <div className="relative min-h-0 flex-1">
        <LageplanMap
          svgRef={panZoom.svgRef}
          bind={panZoom.bind}
          dots={dots}
          zoomQ={panZoom.zoomQ}
          fitScale={panZoom.fitScale}
          selectedIds={dotSelection}
          highlightedAreaIds={filter.areas.length > 0 ? new Set(filter.areas) : undefined}
          ghost={placeAt}
          onKeyDown={(e) => {
            const step = 0.1
            if (e.key === 'ArrowLeft') panBy(-step, 0)
            else if (e.key === 'ArrowRight') panBy(step, 0)
            else if (e.key === 'ArrowUp') panBy(0, -step)
            else if (e.key === 'ArrowDown') panBy(0, step)
            else if (e.key === '+') zoomBy(1.25)
            else if (e.key === '-') zoomBy(1 / 1.25)
            else if (e.key === '0') reset(true)
            else return
            e.preventDefault()
          }}
        />

        {/* Kommt man über die Mini-Karte eines einzelnen Boulders, ist das Banner
            überflüssig: man will hier nichts hinzufügen, sondern nur nachsehen. */}
        {contextSession && !adminMode && !contextBoulderId && (
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-ink px-4 py-1.5 text-[13px] font-semibold text-white">
            <span className="min-w-0 truncate">
              {mode === 'select' ? 'Boulder für' : 'Challenge'}: {contextSession.name}
            </span>
            {mode === 'browse' && (
              <button
                type="button"
                className="shrink-0 underline"
                onClick={() => {
                  setSelectedId(null)
                  setMode('select')
                }}
              >
                Boulder hinzufügen
              </button>
            )}
          </div>
        )}

        {adminMode && (
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 bg-accent px-4 py-1.5 text-[13px] font-semibold text-accent-ink">
            <span className="truncate">
              {movingId
                ? 'Neue Position antippen oder „Hierhin"'
                : 'Bearbeitungsmodus – auf die Karte tippen, um einen Boulder zu setzen'}
            </span>
            <button
              type="button"
              className="shrink-0 underline"
              onClick={() => (movingId ? setMovingId(null) : setAdminKey(null))}
            >
              {movingId ? 'Abbrechen' : 'Beenden'}
            </button>
          </div>
        )}

        {/* Fadenkreuz: die Karte unter ein festes Kreuz schieben ist genauer, als mit
            dem Finger zu zielen. */}
        {adminMode && mode === 'browse' && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <Crosshair className="text-[38px] text-accent opacity-70" />
          </div>
        )}

        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-2">
          {adminMode && mode === 'browse' && (
            <button
              type="button"
              className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-border-strong bg-surface px-4 text-[13px] font-bold text-ink shadow-card"
              onClick={() => {
                // Mitte des sichtbaren Ausschnitts = Position des Fadenkreuzes.
                const c = panZoom.view
                const p = { x: c.x + c.w / 2, y: c.y + c.h / 2 }
                if (movingId && adminKey) {
                  const id = movingId
                  setMovingId(null)
                  moveGymBoulder({ key: adminKey, id, x: p.x, y: p.y, area: areaAt(p.x, p.y) })
                    .then(refresh)
                    .catch((err) => {
                      if (isWrongPasswordError(err)) setAdminKey(null)
                      setSaveError(err instanceof Error ? err.message : 'Verschieben fehlgeschlagen.')
                      refresh()
                    })
                  return
                }
                setPlaceAt(p)
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              {movingId ? <Crosshair className="text-[16px]" /> : <Plus className="text-[16px]" />}
              {movingId ? 'Hierhin' : 'Hier setzen'}
            </button>
          )}
        </div>

        {loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-muted">
            Lädt …
          </div>
        )}
        {error && (
          <div className="absolute inset-x-0 top-3 z-[70] flex justify-center px-5">
            <p className="rounded-sm2 bg-bad px-4 py-2 text-[13px] font-semibold text-white shadow-lg">
              {error}
            </p>
          </div>
        )}
        {saveError && (
          <div className="absolute inset-x-0 top-3 z-[70] flex justify-center px-5">
            <p
              role="alert"
              className="rounded-sm2 bg-bad px-4 py-2 text-[13px] font-semibold text-white shadow-lg"
            >
              {saveError}
            </p>
          </div>
        )}

        {notice && (
          <div className="absolute inset-x-0 top-3 z-[70] flex justify-center px-5">
            <p
              role="status"
              className="flex items-center gap-2 rounded-sm2 bg-ink px-4 py-2 text-[13px] font-semibold text-white shadow-lg"
            >
              <Check className="shrink-0 text-[15px] text-ok" />
              {notice}
            </p>
          </div>
        )}

        {/* Eine SVG-Karte ist für einen Screenreader nicht navigierbar – darum
            zusätzlich die gefilterten Boulder als Liste. Nebeneffekt: das ist in
            Etappe 2 die fertige Oberfläche für die Mehrfachauswahl. */}
        <ul className="sr-only">
          {visibleDots.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                aria-pressed={mode === 'select' ? selectedIds.has(d.id) : undefined}
                onClick={() => {
                  if (mode !== 'select') {
                    setSelectedId(d.id)
                    return
                  }
                  setSelectedIds((prev) => {
                    const next = new Set(prev)
                    if (next.has(d.id)) next.delete(d.id)
                    else next.add(d.id)
                    return next
                  })
                }}
              >
                {d.aria}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <MapFilterBar
        value={filter}
        onChange={setFilter}
        available={available}
        visibleCount={visibleDots.length}
        totalCount={dots.length}
        open={filterOpen}
        onOpenChange={setFilterOpen}
        footer={
          mode === 'select' ? (
            <div className="flex items-center gap-2.5 border-t border-border px-5 py-3">
              <span className="shrink-0 font-num text-[13px] font-bold tabular-nums">
                {selectedIds.size} ausgewählt
              </span>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  aria-label="Auswahl leeren"
                  className="shrink-0 text-muted"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X className="text-[16px]" />
                </button>
              )}
              <div className="ml-auto flex gap-2">
                {contextSession ? (
                  <button
                    type="button"
                    className="rounded-btn bg-accent px-3 py-2 text-[13px] font-bold text-accent-ink disabled:opacity-40"
                    disabled={selectedIds.size === 0}
                    onClick={() => addToSession(contextSession).catch((err) => setSaveError(String(err)))}
                  >
                    Hinzufügen
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="rounded-btn border border-border-strong bg-surface-2 px-3 py-2 text-[13px] font-bold text-ink disabled:opacity-40"
                      disabled={selectedIds.size === 0}
                      onClick={() => setPickerOpen(true)}
                    >
                      Zu Challenge
                    </button>
                    <button
                      type="button"
                      className="rounded-btn bg-accent px-3 py-2 text-[13px] font-bold text-accent-ink disabled:opacity-40"
                      disabled={selectedIds.size === 0}
                      onClick={startChallenge}
                    >
                      Neue Challenge
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : undefined
        }
      />

      {selected && mode === 'browse' && !dialogBusy && (
        <BoulderMapSheet
          boulders={[selected]}
          tick={tickByBoulder.get(selected.id) ?? null}
          adminMode={adminMode}
          onSetTick={handleSetTick}
          onEdit={() => {
            setEditing(selected)
            setPlaceAt(null)
            setDialogOpen(true)
          }}
          onStartMove={() => {
            setMovingId(selected.id)
            setSelectedId(null)
          }}
          onClose={() => {
            const closedId = selected.id
            setSelectedId(null)
            if (backOnCloseRef.current && contextSession) {
              backOnCloseRef.current = false
              // Mit der Boulder-Id zurück, damit die Challenge direkt bei ihm
              // aufsetzt und nicht oben in der Rangliste.
              navigate(`/s/${contextSession.id}?boulder=${closedId}`)
            }
          }}
        />
      )}

      {menuOpen && (
        <div className="sheet-scrim" onClick={() => setMenuOpen(false)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-grip" />
            <div className="font-display text-[21px] font-extrabold tracking-[-0.02em]">
              Hallenkarte
            </div>
            <p className="mt-2 text-[14px] text-muted">
              Deine Marken („Erledigt" und „Projekt") sieht nur dieses Gerät – es gibt keine
              Benutzerkonten.
            </p>
            <button
              type="button"
              className="btn-secondary mt-[18px] w-full"
              onClick={() => {
                setMenuOpen(false)
                if (adminMode) setAdminKey(null)
                else setUnlockOpen(true)
              }}
            >
              {adminMode ? 'Bearbeitung beenden' : 'Lageplan bearbeiten'}
            </button>
            <button
              type="button"
              className="btn-ghost mt-2.5 w-full"
              onClick={() => setMenuOpen(false)}
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      <SessionPickerSheet
        open={pickerOpen}
        userId={userId ?? ''}
        count={selectedIds.size}
        onPick={addToSession}
        onClose={() => setPickerOpen(false)}
      />

      <AdminUnlockSheet
        open={unlockOpen}
        onUnlock={handleUnlock}
        onClose={() => setUnlockOpen(false)}
      />

      <MapBoulderDialog
        open={dialogOpen}
        boulder={editing}
        suggestedArea={placeAt ? areaAt(placeAt.x, placeAt.y) : null}
        onSubmit={handleDialogSubmit}
        onRemove={
          editing && adminKey
            ? async () => {
                await setGymBoulderRemoved({ key: adminKey, id: editing.id, removed: true })
                setSelectedId(null)
                setEditing(null)
                refresh()
              }
            : undefined
        }
        onDelete={
          editing && adminKey
            ? async () => {
                await deleteGymBoulder({ key: adminKey, id: editing.id })
                setSelectedId(null)
                setEditing(null)
                refresh()
              }
            : undefined
        }
        onClose={() => {
          setDialogOpen(false)
          setPlaceAt(null)
          setEditing(null)
        }}
      />
    </div>
  )
}
