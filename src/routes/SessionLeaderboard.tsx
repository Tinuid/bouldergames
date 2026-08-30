import { useMemo } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRealtimeSession } from '../hooks/useRealtimeSession'
import { computeLeaderboardRows, rankClass, summarizeLeaderboard } from '../lib/leaderboard'
import type { Participant } from '../types'
import { ChevronLeft } from '../components/icons'
import Leaderboard from '../components/Leaderboard'
import Podium from '../components/Podium'
import PlayerDetail from '../components/PlayerDetail'

/**
 * Vollständige Rangliste einer Challenge – eigene Seite (/s/:sessionId/rangliste), damit
 * der Zurück-Button des Geräts funktioniert und der Ausschnitt teilbar ist. Geöffnet über
 * den kompakten Streifen im Kopf der Challenge (LeaderboardSummary).
 *
 * Lädt die Session selbst über useRealtimeSession: die Challenge-Ansicht steigt beim
 * Navigieren aus, es entsteht also kein zweites Realtime-Abo.
 *
 * Der angesehene Spieler steht in der URL (?player=<participantId>), nicht im State:
 * nur so bekommt das Öffnen einen eigenen History-Eintrag, und der Weg zurück aus einem
 * angetippten Boulder landet wieder im Vergleich statt in der nackten Liste.
 */
export default function SessionLeaderboard() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { userId } = useAuth()
  const { session, participants, boulders, results, loading, error, notFound } =
    useRealtimeSession(sessionId)

  // Unbekannte Id (alter Link, Spieler ausgetreten) ⇒ kein Overlay, Liste bleibt bedienbar.
  const viewedPlayerId = searchParams.get('player')
  const viewedPlayer = useMemo(
    () => participants.find((p) => p.id === viewedPlayerId) ?? null,
    [participants, viewedPlayerId],
  )

  // Bewusst push (kein replace): der Eintrag ist genau das Ziel des Zurück-Buttons.
  function openPlayer(participant: Participant) {
    setSearchParams({ player: participant.id })
  }

  function closePlayer() {
    // Zurückgehen räumt den eigenen History-Eintrag ab, statt einen zweiten anzulegen.
    // Ist die Rangliste selbst der erste Eintrag (geteilter Link, Reload), führte das
    // aus der App heraus – dann nur den Parameter entfernen.
    if (location.key === 'default') setSearchParams({}, { replace: true })
    else navigate(-1)
  }

  const rows = useMemo(() => computeLeaderboardRows(participants, results), [participants, results])
  const summary = useMemo(() => summarizeLeaderboard(rows, userId), [rows, userId])
  const myParticipant = useMemo(
    () => participants.find((p) => p.user_id === userId) ?? null,
    [participants, userId],
  )

  // Aus der Spieler-Detailansicht zu einem Boulder springen: zurück in die Challenge,
  // die den Boulder anhand des Router-States markiert und anspringt. Bewusst nicht der
  // vorhandene ?boulder=-Parameter – der meint die Karten-Boulder-Id (Migration 0017).
  function goToBoulder(boulderId: string) {
    navigate(`/s/${sessionId}`, { state: { highlightBoulderId: boulderId } })
  }

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

  const podiumRows = rows.slice(0, 3)
  const listStart = podiumRows.length
  // "Dein Platz"-Leiste nur, wenn man selbst nicht schon im Treppchen steht.
  const showMyBar = summary.me != null && rows.indexOf(summary.me) >= listStart
  const listTitle =
    rows.length > listStart
      ? `Platz ${rows[listStart].rank} – ${rows[rows.length - 1].rank}`
      : 'Weitere'

  return (
    <div className="animate-screen-in mx-auto flex min-h-full max-w-md flex-col px-5 pb-11 pt-6">
      <div className="mb-3.5 flex items-center justify-between">
        <Link
          to={`/s/${sessionId}`}
          className="inline-flex min-w-0 items-center gap-0.5 text-[15px] font-semibold text-muted hover:text-ink"
        >
          <ChevronLeft className="shrink-0 text-[18px]" />
          <span className="truncate">{session.name}</span>
        </Link>
      </div>

      <h1 className="font-display text-[34px] font-extrabold leading-none tracking-[-0.025em]">
        Leaderboard
      </h1>
      <div className="mb-[22px] mt-[5px] text-[13px] text-muted">
        {participants.length === 1 ? '1 Teilnehmer' : `${participants.length} Teilnehmer`} ·{' '}
        {boulders.length === 1 ? '1 Boulder' : `${boulders.length} Boulder`}
      </div>

      {podiumRows.length > 0 && (
        <div className="mb-[22px]">
          <Podium
            rows={podiumRows}
            currentUserId={userId}
            onSelectPlayer={(row) => openPlayer(row.participant)}
          />
        </div>
      )}

      {rows.length > listStart && (
        <Leaderboard
          participants={participants}
          results={results}
          currentUserId={userId}
          onSelectPlayer={openPlayer}
          skipTop={listStart}
          title={listTitle}
        />
      )}

      {rows.length === 0 && (
        <p className="px-1 py-2 text-[14px] text-muted">
          Noch keine Teilnehmer in dieser Challenge.
        </p>
      )}

      {/* Angeheftet, damit der eigene Platz beim Scrollen durch ein großes Feld nie verschwindet.
          Der Abstandshalter mit mt-auto schiebt die Leiste ans untere Ende, solange die Liste
          kurz genug ist, um gar nicht zu scrollen. */}
      {showMyBar && summary.me && (
        <>
          <div className="mt-auto h-4 shrink-0" />
          <div className="sticky bottom-0 -mx-5 border-t border-border bg-surface px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-[11px] shadow-[0_-6px_18px_rgba(40,33,20,0.06)]">
            <div className="mx-auto flex max-w-md items-center gap-3">
              <span
                className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-num text-[14px] font-bold tabular-nums ${rankClass(
                  summary.me.rank,
                )}`}
              >
                {summary.me.rank}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-[15px] font-bold tracking-[-0.01em]">
                  Dein Platz
                </div>
                <div className="mt-px truncate text-[12px] text-muted">
                  {summary.gapToNext != null && summary.nextRank != null
                    ? `${summary.gapToNext} Punkte auf Platz ${summary.nextRank}`
                    : `Platz ${summary.me.rank} von ${summary.total}`}
                </div>
              </div>
              <span className="font-num text-[22px] font-bold leading-none tracking-[-0.02em] tabular-nums">
                {summary.me.points}
              </span>
            </div>
          </div>
        </>
      )}

      {viewedPlayer && (
        <PlayerDetail
          participant={viewedPlayer}
          meParticipant={myParticipant}
          boulders={boulders}
          results={results}
          onClose={closePlayer}
          onSelectBoulder={goToBoulder}
        />
      )}
    </div>
  )
}
