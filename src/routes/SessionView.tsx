import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRealtimeSession } from '../hooks/useRealtimeSession'
import { useDialogEscape } from '../hooks/useDialogEscape'
import { useGymTickSync } from '../hooks/useGymTickSync'
import {
  addBoulder,
  deleteBoulder,
  deleteSession,
  joinSession,
  leaveSession,
  listGymBouldersByIds,
  reorderBoulders,
  updateBoulder,
  upsertResult,
} from '../lib/api'
import { deleteBoulderImage, uploadBoulderImage } from '../lib/images'
import { forgetSession, rememberSession } from '../lib/localHistory'
import { DIFFICULTIES } from '../lib/difficulty'
import { BOULDER_COLORS, colorSwatch } from '../lib/colors'
import {
  scoringFromSession,
  type Boulder,
  type GymBoulder,
  type PenaltyMode,
  type ResultStatus,
} from '../types'
import type { BoulderFormValues } from '../components/AddBoulderDialog'
import { Bolt, Check, ChevronLeft, Edit, More, Plan, Plus, Trash } from '../components/icons'

const PENALTY_LABELS: Record<PenaltyMode, string> = {
  top_floor: 'Top nie negativ',
  strict: 'strikt',
  misses: 'nur Fehlversuche',
}
import LeaderboardSummary from '../components/LeaderboardSummary'
import BoulderCard from '../components/BoulderCard'
import BoulderRanking from '../components/BoulderRanking'
import AddBoulderDialog from '../components/AddBoulderDialog'
import ShareSession from '../components/ShareSession'
import EditSessionDialog from '../components/EditSessionDialog'
import ReorderBouldersDialog from '../components/ReorderBouldersDialog'

export default function SessionView() {
  const { sessionId } = useParams()
  // Rückkehr von der Karte: dort steht die Id des KARTEN-Boulders, hier suchen wir
  // den Session-Boulder, der von ihm abstammt, und springen ihn an.
  const [searchParams, setSearchParams] = useSearchParams()
  const returnToGymBoulder = searchParams.get('boulder')
  const navigate = useNavigate()
  // Rückkehr von der Ranglisten-Seite: dort steht die Id des SESSION-Boulders im
  // Router-State (nicht in der URL – der Sprung ist flüchtig und muss keinen Reload
  // überleben; ?boulder= ist bereits mit der Karten-Boulder-Id belegt).
  const location = useLocation()
  const returnToBoulderId = (location.state as { highlightBoulderId?: string } | null)
    ?.highlightBoulderId
  const { userId } = useAuth()
  const { session, participants, boulders, results, loading, error, notFound, refresh } =
    useRealtimeSession(sessionId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBoulder, setEditingBoulder] = useState<Boulder | null>(null)
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [addSourceOpen, setAddSourceOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reorderOpen, setReorderOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  // Escape schließt das Menü-Sheet, Body-Scroll sperren – nur solange offen.
  useDialogEscape(closeMenu, menuOpen)
  const closeAddSource = useCallback(() => setAddSourceOpen(false), [])
  // Nie stapeln (siehe Kommentar am Menü) – daher ist immer höchstens eins offen.
  useDialogEscape(closeAddSource, addSourceOpen)
  const [filterDifficulty, setFilterDifficulty] = useState<number | null>(null)
  const [filterColor, setFilterColor] = useState<string | null>(null)
  const [hideDone, setHideDone] = useState(false)
  const [rankingBoulder, setRankingBoulder] = useState<Boulder | null>(null)
  const [highlightBoulderId, setHighlightBoulderId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Fehler-Toast nach kurzer Zeit automatisch ausblenden.
  useEffect(() => {
    if (!saveError) return
    const t = setTimeout(() => setSaveError(null), 5000)
    return () => clearTimeout(t)
  }, [saveError])

  const myParticipant = useMemo(
    () => participants.find((p) => p.user_id === userId) ?? null,
    [participants, userId],
  )

  // Karten-Boulder zu allen übernommenen Bouldern (Migration 0017): liefert das Foto
  // – die tragen bewusst keinen eigenen image_path, sonst löschte das nächtliche
  // Aufräumen dieser Session das Bild im Katalog mit – und die Position für die
  // Mini-Karte. Einmalig nachgeladen, kein Realtime-Abo: Änderungen im Katalog
  // ziehen beim nächsten Laden nach.
  const [gymByBoulder, setGymByBoulder] = useState<Map<string, GymBoulder>>(new Map())
  const gymRefKey = useMemo(
    () =>
      boulders
        .map((b) => b.gym_boulder_id)
        .filter((id): id is string => id != null)
        .sort()
        .join(','),
    [boulders],
  )
  useEffect(() => {
    if (!gymRefKey) {
      setGymByBoulder(new Map())
      return
    }
    let cancelled = false
    listGymBouldersByIds(gymRefKey.split(','))
      .then((rows) => {
        if (!cancelled) setGymByBoulder(new Map(rows.map((r) => [r.id, r])))
      })
      .catch(() => {
        /* ohne Foto weiter – die Karte zeigt dann nur Grad und Farbe */
      })
    return () => {
      cancelled = true
    }
  }, [gymRefKey])

  // Teilnehmer für die Pro-Spieler-Eingabe: ich zuerst, dann die übrigen (Beitritts-Reihenfolge).
  const orderedParticipants = useMemo(() => {
    if (!myParticipant) return participants
    return [myParticipant, ...participants.filter((p) => p.id !== myParticipant.id)]
  }, [participants, myParticipant])

  // "andere ausblenden" – gerätelokaler Toggle pro Session (Default an = aufgeräumte Ansicht,
  // identisch zum Verhalten ohne shared_scoring). Wer für andere einträgt, blendet sie ein.
  const [hideOthers, setHideOthers] = useState(true)
  useEffect(() => {
    if (!sessionId) return
    const v = localStorage.getItem(`bg:hideOthers:${sessionId}`)
    if (v != null) setHideOthers(v === '1')
  }, [sessionId])
  const toggleHideOthers = useCallback(() => {
    setHideOthers((v) => {
      const next = !v
      if (sessionId) localStorage.setItem(`bg:hideOthers:${sessionId}`, next ? '1' : '0')
      return next
    })
  }, [sessionId])

  // Session im gerätelokalen Verlauf merken, sobald sie geladen ist.
  useEffect(() => {
    if (session && myParticipant) {
      rememberSession({
        sessionId: session.id,
        code: session.join_code,
        name: session.name,
        displayName: myParticipant.display_name,
      })
    }
  }, [session, myParticipant])

  // Index: (boulderId+participantId) -> Result für mich, und
  // boulderId -> (participantId -> Result) für die Pro-Spieler-Eingabe (shared_scoring)
  // sowie für die Rangliste eines Boulders.
  const { mine, byBoulderParticipant } = useMemo(() => {
    const mine = new Map<string, (typeof results)[number]>()
    const byBoulderParticipant = new Map<string, Map<string, (typeof results)[number]>>()
    for (const r of results) {
      let perP = byBoulderParticipant.get(r.boulder_id)
      if (!perP) {
        perP = new Map()
        byBoulderParticipant.set(r.boulder_id, perP)
      }
      perP.set(r.participant_id, r)
      if (myParticipant && r.participant_id === myParticipant.id) {
        mine.set(r.boulder_id, r)
      }
    }
    return { mine, byBoulderParticipant }
  }, [results, myParticipant])

  // Geflashte/getoppte Boulder, die von der Hallenkarte stammen, dort als "erledigt"
  // markieren – einmal pro Boulder und Gerät, still im Hintergrund.
  useGymTickSync({ sessionId, userId, boulders, myResults: mine })

  // Nur die Grade/Farben als Filter-Optionen anbieten, die in der Session vorkommen –
  // in der Reihenfolge der zentralen Quellen (difficulty.ts / colors.ts).
  const availableDifficulties = useMemo(() => {
    const present = new Set(boulders.map((b) => b.difficulty).filter((d): d is number => d != null))
    return DIFFICULTIES.filter((d) => present.has(d.code))
  }, [boulders])
  const availableColors = useMemo(() => {
    const present = new Set(boulders.map((b) => b.color).filter((c): c is string => c != null))
    return BOULDER_COLORS.filter((c) => present.has(c.name))
  }, [boulders])

  // Aktiven Filter zurücksetzen, sobald seine Option nicht mehr vorkommt
  // (Boulder gelöscht/umgestuft) – verhindert eine leere Liste ohne sichtbaren Grund.
  useEffect(() => {
    if (
      filterDifficulty != null &&
      !availableDifficulties.some((d) => d.code === filterDifficulty)
    ) {
      setFilterDifficulty(null)
    }
  }, [filterDifficulty, availableDifficulties])
  useEffect(() => {
    if (filterColor != null && !availableColors.some((c) => c.name === filterColor)) {
      setFilterColor(null)
    }
  }, [filterColor, availableColors])

  // Sichtbare Boulder nach Grad-/Farb-Auswahl und Filter "erledigte ausblenden".
  // "Erledigt" = eigenes Ergebnis ist flash/top (ein Fail gilt nicht als erledigt).
  const visibleBoulders = useMemo(() => {
    return boulders.filter((b) => {
      if (hideDone) {
        const status = mine.get(b.id)?.status
        if (status === 'flash' || status === 'top') return false
      }
      if (filterDifficulty != null && b.difficulty !== filterDifficulty) return false
      if (filterColor != null && b.color !== filterColor) return false
      return true
    })
  }, [boulders, filterDifficulty, filterColor, hideDone, mine])
  const filtering = filterDifficulty != null || filterColor != null || hideDone
  const resetFilters = useCallback(() => {
    setFilterDifficulty(null)
    setFilterColor(null)
    setHideDone(false)
  }, [])

  // Zu einem Boulder springen (aus der Spieler-Detailansicht der Ranglisten-Seite oder von
  // der Karte): Filter zurücksetzen (sonst ist der Boulder evtl. ausgeblendet und nicht im
  // DOM), dann markieren.
  const goToBoulder = useCallback(
    (boulderId: string) => {
      resetFilters()
      setHighlightBoulderId(boulderId)
    },
    [resetFilters],
  )

  useEffect(() => {
    if (!returnToGymBoulder || boulders.length === 0) return
    const target = boulders.find((b) => b.gym_boulder_id === returnToGymBoulder)
    // Parameter in jedem Fall entfernen, sonst springt ein Reload erneut dorthin.
    setSearchParams({}, { replace: true })
    if (target) goToBoulder(target.id)
  }, [returnToGymBoulder, boulders, goToBoulder, setSearchParams])

  useEffect(() => {
    if (!returnToBoulderId || boulders.length === 0) return
    const exists = boulders.some((b) => b.id === returnToBoulderId)
    // State in jedem Fall leeren, sonst springt ein erneutes Rendern wieder dorthin.
    navigate(location.pathname, { replace: true, state: null })
    if (exists) goToBoulder(returnToBoulderId)
  }, [returnToBoulderId, boulders, goToBoulder, navigate, location.pathname])

  // Nach dem Anspringen zum Boulder scrollen und das Aufleuchten nach der Animation wieder
  // zurücknehmen (damit die animate-bump-Klasse beim nächsten Mal erneut auslösen kann).
  useEffect(() => {
    if (!highlightBoulderId) return
    const raf = requestAnimationFrame(() => {
      // Sofort (ohne Smooth-Scroll) auf die richtige Höhe – das Hinunterscrollen war anstrengend.
      document
        .getElementById(`boulder-card-${highlightBoulderId}`)
        ?.scrollIntoView({ block: 'center' })
    })
    const t = setTimeout(() => setHighlightBoulderId(null), 1200)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
    }
  }, [highlightBoulderId])

  if (loading) {
    return <div className="flex min-h-full items-center justify-center text-muted">Lädt …</div>
  }

  if (notFound || (error && !session)) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-3 p-6 text-center">
        <h1 className="font-display text-xl font-bold">Challenge nicht gefunden</h1>
        <p className="text-muted">{error ?? 'Der Link oder Code ist ungültig.'}</p>
        <Link to="/" className="btn-primary">
          Zur Startseite
        </Link>
      </div>
    )
  }

  if (!session) return null
  const scoring = scoringFromSession(session)
  const sharedScoring = session.shared_scoring
  const isHost = session.host_id === userId
  const showOthers = sharedScoring && !hideOthers

  // Noch nicht beigetreten (z.B. über geteilten Link geöffnet) -> Name abfragen.
  if (!myParticipant) {
    async function doJoin(e: React.FormEvent) {
      e.preventDefault()
      if (!userId || !joinName.trim() || joining) return
      setJoining(true)
      try {
        await joinSession(session!.id, userId, joinName)
        refresh()
      } finally {
        setJoining(false)
      }
    }
    return (
      <div className="animate-screen-in mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="font-display text-[34px] font-extrabold tracking-[-0.025em]">
          {session.name}
        </h1>
        <p className="text-muted">Tritt der Challenge bei, um mitzumachen.</p>
        <form className="flex flex-col gap-3" onSubmit={doJoin}>
          <input
            className="input"
            placeholder="Dein Name"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            autoFocus
          />
          <button className="btn-primary" disabled={joining}>
            {joining ? 'Trete bei …' : 'Beitreten'}
          </button>
        </form>
      </div>
    )
  }

  async function handleSaveResult(
    boulderId: string,
    participantId: string,
    status: ResultStatus,
    attempts: number,
    difficulty: number | null,
  ) {
    if (!myParticipant) return
    try {
      await upsertResult({
        sessionId: session!.id,
        boulderId,
        participantId,
        status,
        attempts,
        scoring,
        difficulty,
      })
      refresh()
    } catch (err) {
      console.error('Ergebnis speichern fehlgeschlagen', err)
      // Nutzer informieren (z.B. schlechtes WLAN in der Halle) und den optimistischen
      // Editor-Stand via refresh() auf den echten DB-Wert zurücksetzen.
      setSaveError(
        err instanceof Error
          ? `Nicht gespeichert: ${err.message}`
          : 'Ergebnis konnte nicht gespeichert werden – bitte erneut versuchen.',
      )
      refresh()
    }
  }

  // Beide Hinzufügen-Knöpfe öffnen erst die Quellenwahl: selbst anlegen oder vom
  // Lageplan holen. Der zweite Weg führt auf die Karte im Auswahlmodus für genau
  // diese Challenge.
  function openAddBoulder() {
    setAddSourceOpen(true)
  }

  function openManualBoulder() {
    setAddSourceOpen(false)
    setEditingBoulder(null)
    setDialogOpen(true)
  }

  function openEditBoulder(b: Boulder) {
    setEditingBoulder(b)
    setDialogOpen(true)
  }

  function closeBoulderDialog() {
    setDialogOpen(false)
    setEditingBoulder(null)
  }

  async function handleSubmitBoulder(values: BoulderFormValues) {
    if (!userId) return
    const { difficulty, color, image, removeImage } = values
    if (editingBoulder) {
      // Bearbeiten: Bild ggf. ersetzen/entfernen, sonst vorhandenes behalten.
      let imagePath = editingBoulder.image_path
      if (image) {
        imagePath = await uploadBoulderImage(image, userId)
        await deleteBoulderImage(editingBoulder.image_path) // altes Bild best-effort aufräumen
      } else if (removeImage) {
        imagePath = null
        await deleteBoulderImage(editingBoulder.image_path)
      }
      // Im Multiplikator-Modus rechnet ein DB-Trigger die Punkte bei Grad-Änderung neu.
      await updateBoulder({ boulderId: editingBoulder.id, difficulty, color, imagePath })
    } else {
      // Anlegen: Bild zuerst hochladen (verkleinert), damit der Pfad direkt am Boulder hängt.
      const imagePath = image ? await uploadBoulderImage(image, userId) : null
      await addBoulder({ sessionId: session!.id, userId, difficulty, color, imagePath })
    }
    refresh()
  }

  // Neue Boulder-Reihenfolge speichern (nur Host, atomar via RPC – siehe 0014).
  // Fehler wandern zum Dialog (Inline-Anzeige, Dialog bleibt offen).
  async function handleReorder(orderedIds: string[]) {
    await reorderBoulders(session!.id, orderedIds)
    refresh()
  }

  async function handleDeleteBoulder() {
    if (!editingBoulder) return
    const b = editingBoulder
    await deleteBoulder(b.id)
    // Bild best-effort aufräumen (Storage hängt nicht am DB-Cascade).
    await deleteBoulderImage(b.image_path)
    refresh()
  }

  async function handleLeave() {
    if (!myParticipant) return
    const confirmed = window.confirm(
      'Challenge verlassen? Deine Ergebnisse in dieser Challenge gehen verloren. Die Challenge bleibt für die anderen bestehen.',
    )
    if (!confirmed) return
    try {
      await leaveSession(myParticipant.id)
      forgetSession(session!.id)
      navigate('/')
    } catch (err) {
      console.error('Challenge verlassen fehlgeschlagen', err)
      alert(err instanceof Error ? err.message : 'Verlassen fehlgeschlagen.')
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      'Challenge wirklich beenden und löschen? Alle Boulder und Ergebnisse gehen unwiderruflich verloren.',
    )
    if (!confirmed) return
    try {
      await deleteSession(session!.id)
      forgetSession(session!.id)
      navigate('/')
    } catch (err) {
      console.error('Challenge löschen fehlgeschlagen', err)
      alert(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.')
    }
  }

  return (
    <div className="animate-screen-in mx-auto flex min-h-full max-w-md flex-col px-5 pb-11 pt-14">
      <div className="mb-3.5 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-0.5 text-[15px] font-semibold text-muted hover:text-ink"
        >
          <ChevronLeft className="text-[18px]" />
          Übersicht
        </Link>
        <div className="flex items-center gap-1">
          <button
            className="text-[15px] font-semibold text-muted hover:text-ink"
            onClick={handleLeave}
          >
            Verlassen
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-[9px] text-faint transition hover:bg-surface-2 hover:text-ink"
            onClick={() => setMenuOpen(true)}
            aria-label="Weitere Aktionen"
            title="Weitere Aktionen"
          >
            <More className="text-[20px]" />
          </button>
        </div>
      </div>

      <h1 className="mb-4 font-display text-[34px] font-extrabold leading-none tracking-[-0.025em]">
        {session.name}
      </h1>

      <div className="mb-4">
        <ShareSession code={session.join_code} />
      </div>

      <div className="mb-[22px] flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] leading-relaxed text-muted">
        {scoring.mode === 'multiplier' && (
          <>
            <span className="font-num font-bold text-accent">×Grad</span>
            <span className="text-faint">·</span>
          </>
        )}
        <span className="inline-flex items-center gap-1">
          <Bolt className="text-[14px] text-accent" />
          {scoring.flashPoints} Flash
        </span>
        <span className="text-faint">·</span>
        <span className="inline-flex items-center gap-1">
          <Check className="text-[14px] text-ok" />
          {scoring.topPoints} Top
        </span>
        <span className="text-faint">·</span>
        <span>−{scoring.attemptCost}/Fehlversuch</span>
        <span className="text-faint">·</span>
        <span className="font-semibold text-ok">{PENALTY_LABELS[scoring.penaltyMode]}</span>
      </div>

      <div className="mb-[26px]">
        <LeaderboardSummary
          participants={participants}
          results={results}
          currentUserId={userId}
          onOpen={() => navigate(`/s/${sessionId}/rangliste`)}
        />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="section-label">
            Boulder (
            {filtering ? `${visibleBoulders.length} / ${boulders.length}` : boulders.length})
          </h2>
          <button
            className="flex items-center gap-1 text-[12px] font-bold text-accent"
            onClick={openAddBoulder}
          >
            <Plus className="text-[15px]" />
            Hinzufügen
          </button>
        </div>

        {boulders.length > 0 && (
          <div className="flex flex-col gap-3">
            {availableDifficulties.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-[13px] font-semibold text-muted">Grad</span>
                  {filtering && (
                    <button
                      type="button"
                      className="text-[13px] font-semibold text-accent"
                      onClick={resetFilters}
                    >
                      Zurücksetzen
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableDifficulties.map((d) => {
                    const selected = filterDifficulty === d.code
                    return (
                      <button
                        key={d.code}
                        type="button"
                        onClick={() => setFilterDifficulty(selected ? null : d.code)}
                        aria-pressed={selected}
                        aria-label={
                          d.label === '?' || d.label === '!'
                            ? `Schwierigkeit ${d.label}`
                            : `Grad ${d.label}`
                        }
                        className={`flex h-[30px] w-[30px] items-center justify-center rounded-lg border font-num text-[14px] font-bold transition active:scale-90 ${
                          selected
                            ? 'border-accent bg-accent text-accent-ink'
                            : 'border-border-strong bg-surface-2 text-ink'
                        }`}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {availableColors.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-[13px] font-semibold text-muted">Farbe</span>
                  {filtering && availableDifficulties.length === 0 && (
                    <button
                      type="button"
                      className="text-[13px] font-semibold text-accent"
                      onClick={resetFilters}
                    >
                      Zurücksetzen
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((c) => {
                    const selected = filterColor === c.name
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setFilterColor(selected ? null : c.name)}
                        title={c.name}
                        aria-label={c.name}
                        aria-pressed={selected}
                        className={`h-6 w-6 rounded-full transition active:scale-90 ${
                          selected
                            ? 'scale-110 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14),0_0_0_2px_var(--surface),0_0_0_4px_var(--accent)]'
                            : 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]'
                        }`}
                        style={{ background: colorSwatch(c.name) }}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              className={`chip flex-row items-center justify-center gap-2 py-2.5 text-[13px] font-semibold ${hideDone ? 'is-active' : ''}`}
              onClick={() => setHideDone((v) => !v)}
              aria-pressed={hideDone}
            >
              {hideDone && <Check className="text-[15px]" />}
              Erledigte ausblenden
            </button>

            {sharedScoring && (
              <button
                type="button"
                className={`chip flex-row items-center justify-center gap-2 py-2.5 text-[13px] font-semibold ${hideOthers ? 'is-active' : ''}`}
                onClick={toggleHideOthers}
                aria-pressed={hideOthers}
              >
                {hideOthers && <Check className="text-[15px]" />}
                Andere ausblenden
              </button>
            )}
          </div>
        )}

        {visibleBoulders.map((b) => {
          return (
            <BoulderCard
              key={b.id}
              boulder={b}
              fallbackImagePath={
                b.gym_boulder_id ? (gymByBoulder.get(b.gym_boulder_id)?.image_path ?? null) : null
              }
              gymPosition={
                b.gym_boulder_id
                  ? (() => {
                      const g = gymByBoulder.get(b.gym_boulder_id)
                      return g ? { x: g.x, y: g.y } : null
                    })()
                  : null
              }
              onOpenMap={
                b.gym_boulder_id
                  ? () => navigate(`/karte?session=${session.id}&boulder=${b.gym_boulder_id}`)
                  : undefined
              }
              myResult={mine.get(b.id)}
              scoring={scoring}
              onSaveResult={(status, attempts) =>
                handleSaveResult(b.id, myParticipant.id, status, attempts, b.difficulty)
              }
              onEdit={() => openEditBoulder(b)}
              onOpenRanking={() => setRankingBoulder(b)}
              highlight={b.id === highlightBoulderId}
              participants={orderedParticipants}
              resultsByParticipant={byBoulderParticipant.get(b.id)}
              myParticipantId={myParticipant.id}
              showOthers={showOthers}
              onSaveResultFor={(participantId, status, attempts) =>
                handleSaveResult(b.id, participantId, status, attempts, b.difficulty)
              }
            />
          )
        })}

        {boulders.length > 0 && visibleBoulders.length === 0 && (
          <p className="px-0.5 py-2 text-[14px] text-muted">Keine Boulder passen zum Filter.</p>
        )}

        <button
          className="flex w-full items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-border-strong bg-transparent p-[15px] font-display text-[15px] font-bold text-muted transition hover:border-accent hover:text-accent"
          onClick={openAddBoulder}
        >
          <Plus className="text-[18px]" />
          Boulder hinzufügen
        </button>
      </section>

      <AddBoulderDialog
        open={dialogOpen}
        onClose={closeBoulderDialog}
        onSubmit={handleSubmitBoulder}
        onDelete={editingBoulder ? handleDeleteBoulder : undefined}
        boulder={editingBoulder}
        requireDifficulty={scoring.mode === 'multiplier'}
      />

      {addSourceOpen && (
        <div className="sheet-scrim" onClick={() => setAddSourceOpen(false)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-grip" />
            <div className="font-display text-[21px] font-extrabold tracking-[-0.02em]">
              Boulder hinzufügen
            </div>
            <button
              type="button"
              className="mt-[18px] flex w-full items-center gap-2.5 rounded-btn px-1 py-3.5 text-[16px] font-semibold transition hover:bg-surface-2"
              onClick={openManualBoulder}
            >
              <Plus className="text-[20px]" />
              Selbst anlegen
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-btn px-1 py-3.5 text-[16px] font-semibold transition hover:bg-surface-2"
              onClick={() => {
                setAddSourceOpen(false)
                navigate(`/karte?session=${session.id}&pick=1`)
              }}
            >
              <Plan className="text-[20px]" />
              Vom Lageplan
            </button>
            <button
              type="button"
              className="btn-secondary mt-1 w-full"
              onClick={() => setAddSourceOpen(false)}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="sheet-scrim" onClick={closeMenu}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-grip" />
            {isHost && (
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-btn px-1 py-3.5 text-[16px] font-semibold transition hover:bg-surface-2"
                onClick={() => {
                  closeMenu()
                  setSettingsOpen(true)
                }}
              >
                <Edit className="text-[20px]" />
                Einstellungen bearbeiten
              </button>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-btn px-1 py-3.5 text-[16px] font-semibold transition hover:bg-surface-2"
              onClick={() => {
                closeMenu()
                navigate(`/karte?session=${session.id}`)
              }}
            >
              <Plan className="text-[20px]" />
              Auf der Karte zeigen
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-btn px-1 py-3.5 text-[16px] font-semibold text-bad transition hover:bg-surface-2"
              onClick={() => {
                closeMenu()
                handleDelete()
              }}
            >
              <Trash className="text-[20px]" />
              Challenge löschen
            </button>
            <button type="button" className="btn-secondary mt-1 w-full" onClick={closeMenu}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {settingsOpen && isHost && (
        <EditSessionDialog
          session={session}
          boulders={boulders}
          results={results}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false)
            refresh()
          }}
          onReorderBoulders={() => {
            // Einstellungs-Sheet schließen, Sortier-Sheet öffnen (kein Stacking).
            setSettingsOpen(false)
            setReorderOpen(true)
          }}
        />
      )}

      {isHost && (
        <ReorderBouldersDialog
          open={reorderOpen}
          boulders={boulders}
          onClose={() => setReorderOpen(false)}
          onSave={handleReorder}
        />
      )}

      {rankingBoulder && (
        <BoulderRanking
          boulder={rankingBoulder}
          participants={orderedParticipants}
          resultsByParticipant={byBoulderParticipant.get(rankingBoulder.id)}
          currentUserId={userId}
          onClose={() => setRankingBoulder(null)}
        />
      )}

      {saveError && (
        <div className="fixed inset-x-0 bottom-5 z-[70] flex justify-center px-5">
          <div
            role="alert"
            className="flex max-w-md items-center gap-2 rounded-btn border border-bad/40 bg-bad-soft px-4 py-3 text-[14px] font-semibold text-bad shadow-lg"
            onClick={() => setSaveError(null)}
          >
            {saveError}
          </div>
        </div>
      )}
    </div>
  )
}
