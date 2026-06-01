import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getHistory, forgetSession, type HistoryEntry } from '../lib/localHistory'

export default function Home() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    setHistory(getHistory())
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
    </div>
  )
}
