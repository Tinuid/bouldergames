import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getHistory, forgetSession, type HistoryEntry } from '../lib/localHistory'
import { listSessions, type SessionSummary } from '../lib/api'
import { supabase } from '../lib/supabase'
import VersionBadge from '../components/VersionBadge'

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
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-6 p-5">
      <header className="pt-6 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Boulder <span className="text-brand">Challenges</span>
        </h1>
        <p className="mt-2 text-slate-400">
          Tracke Flashes, Tops &amp; Versuche mit deiner Crew – in Echtzeit.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Link to="/create" className="btn-primary text-lg">
          Neue Challenge erstellen
        </Link>
        <Link to="/join" className="btn-secondary text-lg">
          Challenge beitreten
        </Link>
      </div>

      {history.length > 0 && (
        <section className="mt-2">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Zuletzt gespielt
          </h2>
          <ul className="flex flex-col gap-2">
            {history.map((h) => (
              <li key={h.sessionId} className="card flex items-center justify-between">
                <button
                  className="flex-1 text-left"
                  onClick={() => navigate(`/s/${h.sessionId}`)}
                >
                  <div className="font-semibold">{h.name}</div>
                  <div className="text-sm text-slate-400">
                    Code {h.code} · als {h.displayName}
                  </div>
                </button>
                <button
                  className="ml-2 rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-700 hover:text-slate-200"
                  aria-label="Aus Verlauf entfernen"
                  onClick={() => remove(h.sessionId)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-2">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Alle Challenges
        </h2>

        {sessionsLoading && <p className="text-sm text-slate-500">Lädt …</p>}

        {sessionsError && (
          <p className="text-sm text-red-400">{sessionsError}</p>
        )}

        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
          <p className="text-sm text-slate-500">
            Noch keine Challenges. Erstelle die erste!
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <li key={s.id} className="card">
              <button
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => navigate(`/s/${s.id}`)}
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{s.name}</div>
                  <div className="text-sm text-slate-400">
                    Code {s.join_code} · {formatDate(s.created_at)}
                  </div>
                </div>
                <span className="shrink-0 text-sm text-slate-400">
                  {s.participantCount} Spieler
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-auto pt-4">
        <VersionBadge />
      </footer>
    </div>
  )
}
