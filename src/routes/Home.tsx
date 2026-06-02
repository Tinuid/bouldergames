import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getHistory, forgetSession, type HistoryEntry } from '../lib/localHistory'
import { listSessions, type SessionSummary } from '../lib/api'
import { supabase } from '../lib/supabase'
import BrandMark from '../components/BrandMark'
import VersionBadge from '../components/VersionBadge'
import FeedbackDialog from '../components/FeedbackDialog'
import { ChevronRight, Picture, Plus, Share, Users, X } from '../components/icons'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function Home() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  // Übersicht aller aktiven Challenges – einmal laden und bei Änderungen an der
  // sessions-Tabelle neu laden (gleiches Re-Fetch-Muster wie useRealtimeSession).
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const data = await listSessions()
        if (active) {
          setSessions(data)
          setSessionsError(null)
        }
      } catch (err) {
        if (active) setSessionsError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.')
      } finally {
        if (active) setSessionsLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel('lobby-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => load())
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  function remove(id: string) {
    forgetSession(id)
    setHistory(getHistory())
  }

  return (
    <div className="animate-screen-in mx-auto flex min-h-full max-w-md flex-col gap-6 px-5 pb-11 pt-14">
      <header className="px-1 pb-2 pt-3.5 text-center">
        <BrandMark className="mx-auto mb-5 h-[64px] w-[64px] drop-shadow-sm" />
        <h1 className="font-display text-[46px] font-extrabold leading-[0.96] tracking-[-0.025em]">
          Boulder
          <br />
          <span className="text-accent">Challenges</span>
        </h1>
        <p className="mx-auto mt-3.5 max-w-[30ch] text-[15px] leading-relaxed text-muted [text-wrap:balance]">
          Tracke Flashes, Tops &amp; Versuche mit deiner Crew – in Echtzeit.
        </p>
      </header>

      <div className="flex flex-col gap-2.5">
        <Link to="/create" className="btn-primary">
          <Plus className="text-[19px]" />
          Neue Challenge erstellen
        </Link>
        <Link to="/join" className="btn-secondary">
          <Users className="text-[19px]" />
          Challenge beitreten
        </Link>
      </div>

      {history.length > 0 && (
        <section>
          <h2 className="section-label mb-2.5 px-0.5">Zuletzt gespielt</h2>
          <ul className="flex flex-col gap-2.5">
            {history.map((h) => (
              <li key={h.sessionId} className="card flex items-center gap-3 !p-4">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => navigate(`/s/${h.sessionId}`)}
                >
                  <div className="truncate font-display text-[17px] font-bold tracking-[-0.01em]">
                    {h.name}
                  </div>
                  <div className="mt-0.5 truncate text-[13px] text-muted">
                    Code {h.code} · als {h.displayName}
                  </div>
                </button>
                <button
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-[15px] text-faint transition hover:bg-surface-2 hover:text-ink"
                  aria-label="Aus Verlauf entfernen"
                  onClick={() => remove(h.sessionId)}
                >
                  <X />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="section-label mb-2.5 px-0.5">Alle Challenges</h2>

        {sessionsLoading && <p className="text-sm text-muted">Lädt …</p>}

        {sessionsError && <p className="text-sm text-bad">{sessionsError}</p>}

        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
          <p className="text-sm text-muted">Noch keine Challenges. Erstelle die erste!</p>
        )}

        <ul className="flex flex-col gap-2.5">
          {sessions.map((s) => (
            <li key={s.id} className="card !p-4">
              <button
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => navigate(`/s/${s.id}`)}
              >
                <div className="min-w-0">
                  <div className="truncate font-display text-[17px] font-bold tracking-[-0.01em]">
                    {s.name}
                  </div>
                  <div className="mt-0.5 text-[13px] text-muted">
                    Code {s.join_code} · {formatDate(s.created_at)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-[13px] text-muted">{s.participantCount} Spieler</span>
                  <ChevronRight className="text-[17px] text-faint" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-auto pt-4">
        <VersionBadge />
      </footer>

      {/* Floating-Buttons unten rechts: Feedback ansehen (alle) & geben. */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate('/feedback')}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-border-strong bg-surface text-[22px] text-muted shadow-lg shadow-black/10 transition hover:text-accent"
          aria-label="Feedback ansehen"
          title="Feedback ansehen"
        >
          <Picture />
        </button>
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-[22px] text-accent-ink shadow-lg shadow-black/20 transition hover:brightness-110"
          aria-label="Feedback geben"
          title="Feedback geben"
        >
          <Share />
        </button>
      </div>

      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  )
}
