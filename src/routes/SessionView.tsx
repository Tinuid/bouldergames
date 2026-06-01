import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRealtimeSession } from '../hooks/useRealtimeSession'
import { addBoulder, deleteSession, joinSession, upsertResult } from '../lib/api'
import { uploadBoulderImage } from '../lib/images'
import { forgetSession, rememberSession } from '../lib/localHistory'
import { scoringFromSession, type ResultStatus } from '../types'
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
    return <div className="flex min-h-full items-center justify-center text-slate-400">Lädt …</div>
  }

  if (notFound || (error && !session)) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-bold">Challenge nicht gefunden</h1>
        <p className="text-slate-400">{error ?? 'Der Link oder Code ist ungültig.'}</p>
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
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="text-2xl font-bold">{session.name}</h1>
        <p className="text-slate-400">Tritt der Challenge bei, um mitzumachen.</p>
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

  async function handleSaveResult(boulderId: string, status: ResultStatus, attempts: number) {
    if (!myParticipant) return
    try {
      await upsertResult({
        sessionId: session!.id,
        boulderId,
        participantId: myParticipant.id,
        status,
        attempts,
        scoring,
      })
      refresh()
    } catch (err) {
      console.error('Ergebnis speichern fehlgeschlagen', err)
    }
  }

  async function handleAddBoulder(
    difficulty: number | null,
    color: string | null,
    image: File | null,
  ) {
    if (!userId) return
    // Bild zuerst hochladen (verkleinert), damit der Pfad direkt am Boulder hängt.
    const imagePath = image ? await uploadBoulderImage(image, userId) : null
    await addBoulder({ sessionId: session!.id, userId, difficulty, color, imagePath })
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
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-5 p-5 pb-28">
      <header className="flex flex-col gap-3 pt-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link to="/" className="text-sm text-slate-400 hover:text-slate-200">
              ← Übersicht
            </Link>
            <h1 className="text-2xl font-bold leading-tight">{session.name}</h1>
          </div>
          <button
            className="shrink-0 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-red-500/10 hover:text-red-400"
            onClick={handleDelete}
          >
            Löschen
          </button>
        </div>
        <div className="flex items-center justify-between">
          <ShareSession code={session.join_code} />
          <span className="text-xs text-slate-500">
            ⚡{scoring.flashPoints} · ✓{scoring.topPoints} ·{' '}
            {scoring.freeSuccess ? '−' + scoring.attemptCost + '/Fehlversuch' : '−' + scoring.attemptCost + '/Versuch'}
          </span>
        </div>
      </header>

      <Leaderboard participants={participants} results={results} currentUserId={userId} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Boulder ({boulders.length})
          </h2>
        </div>

        {boulders.length === 0 && (
          <p className="card text-center text-slate-400">
            Noch keine Boulder. Füge den ersten hinzu!
          </p>
        )}

        {boulders.map((b) => (
          <BoulderCard
            key={b.id}
            boulder={b}
            myResult={mine.get(b.id)}
            allResults={byBoulder.get(b.id) ?? []}
            scoring={scoring}
            onSaveResult={(status, attempts) => handleSaveResult(b.id, status, attempts)}
          />
        ))}
      </section>

      {/* Floating-Button zum Hinzufügen */}
      <button
        className="btn-primary fixed bottom-5 left-1/2 z-40 -translate-x-1/2 shadow-lg"
        onClick={() => setDialogOpen(true)}
      >
        + Boulder hinzufügen
      </button>

      <AddBoulderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={handleAddBoulder}
      />
    </div>
  )
}
