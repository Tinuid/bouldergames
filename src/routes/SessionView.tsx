import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRealtimeSession } from '../hooks/useRealtimeSession'
import {
  addBoulder,
  deleteBoulder,
  deleteSession,
  joinSession,
  updateBoulder,
  upsertResult,
} from '../lib/api'
import { deleteBoulderImage, uploadBoulderImage } from '../lib/images'
import { forgetSession, rememberSession } from '../lib/localHistory'
import { scoringFromSession, type Boulder, type PenaltyMode, type ResultStatus } from '../types'
import type { BoulderFormValues } from '../components/AddBoulderDialog'
import { Bolt, Check, ChevronLeft, Plus } from '../components/icons'

const PENALTY_LABELS: Record<PenaltyMode, string> = {
  top_floor: 'Top nie negativ',
  strict: 'strikt',
  misses: 'nur Fehlversuche',
}
import Leaderboard from '../components/Leaderboard'
import BoulderCard from '../components/BoulderCard'
import AddBoulderDialog from '../components/AddBoulderDialog'
import ShareSession from '../components/ShareSession'

export default function SessionView() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { userId } = useAuth()
  const { session, participants, boulders, results, loading, error, notFound, refresh } =
    useRealtimeSession(sessionId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBoulder, setEditingBoulder] = useState<Boulder | null>(null)
  const [joinName, setJoinName] = useState('')
  const [joining, setJoining] = useState(false)

  const myParticipant = useMemo(
    () => participants.find((p) => p.user_id === userId) ?? null,
    [participants, userId],
  )

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

  // Index: boulderId -> Results, und (boulderId+participantId) -> Result
  const { byBoulder, mine } = useMemo(() => {
    const byBoulder = new Map<string, typeof results>()
    const mine = new Map<string, (typeof results)[number]>()
    for (const r of results) {
      const arr = byBoulder.get(r.boulder_id) ?? []
      arr.push(r)
      byBoulder.set(r.boulder_id, arr)
      if (myParticipant && r.participant_id === myParticipant.id) {
        mine.set(r.boulder_id, r)
      }
    }
    return { byBoulder, mine }
  }, [results, myParticipant])

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
        <h1 className="font-display text-[34px] font-extrabold tracking-[-0.025em]">{session.name}</h1>
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
    status: ResultStatus,
    attempts: number,
    difficulty: number | null,
  ) {
    if (!myParticipant) return
    try {
      await upsertResult({
        sessionId: session!.id,
        boulderId,
        participantId: myParticipant.id,
        status,
        attempts,
        scoring,
        difficulty,
      })
      refresh()
    } catch (err) {
      console.error('Ergebnis speichern fehlgeschlagen', err)
    }
  }

  function openAddBoulder() {
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

  async function handleDeleteBoulder() {
    if (!editingBoulder) return
    const b = editingBoulder
    await deleteBoulder(b.id)
    // Bild best-effort aufräumen (Storage hängt nicht am DB-Cascade).
    await deleteBoulderImage(b.image_path)
    refresh()
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
        <button className="text-[15px] font-semibold text-bad" onClick={handleDelete}>
          Löschen
        </button>
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
        <Leaderboard participants={participants} results={results} currentUserId={userId} />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="section-label">Boulder ({boulders.length})</h2>
          <button
            className="flex items-center gap-1 text-[12px] font-bold text-accent"
            onClick={openAddBoulder}
          >
            <Plus className="text-[15px]" />
            Hinzufügen
          </button>
        </div>

        {boulders.map((b) => {
          const canEdit = b.created_by === userId || session.host_id === userId
          return (
            <BoulderCard
              key={b.id}
              boulder={b}
              myResult={mine.get(b.id)}
              allResults={byBoulder.get(b.id) ?? []}
              scoring={scoring}
              onSaveResult={(status, attempts) =>
                handleSaveResult(b.id, status, attempts, b.difficulty)
              }
              onEdit={canEdit ? () => openEditBoulder(b) : undefined}
            />
          )
        })}

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
    </div>
  )
}
