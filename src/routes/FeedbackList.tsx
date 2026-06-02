import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listFeedback, deleteFeedback } from '../lib/api'
import type { Feedback } from '../types'
import FeedbackDialog from '../components/FeedbackDialog'

// Öffentliche Feedback-Liste: jeder kann alle Einträge lesen. Löschen ist durch
// ein Passwort geschützt, das serverseitig (RPC delete_feedback) geprüft wird –
// beim ersten Löschen abgefragt und danach gerätelokal gemerkt.
const KEY_STORAGE = 'feedback-admin-key'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function FeedbackList() {
  const [entries, setEntries] = useState<Feedback[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [writeOpen, setWriteOpen] = useState(false)

  // Lösch-Dialog: welcher Eintrag, Passwort-Eingabe, Fortschritt/Fehler.
  const [pendingDelete, setPendingDelete] = useState<Feedback | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function load() {
    try {
      const data = await listFeedback()
      setEntries(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.')
    }
  }

  useEffect(() => {
    load()
  }, [])

  function askDelete(f: Feedback) {
    setPendingDelete(f)
    setKeyInput('')
    setDeleteError(null)
  }

  function closeDelete() {
    setPendingDelete(null)
    setKeyInput('')
    setDeleteError(null)
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return
    const savedKey = localStorage.getItem(KEY_STORAGE)
    const key = savedKey ?? keyInput.trim()
    if (!key) {
      setDeleteError('Bitte das Passwort eingeben.')
      return
    }
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteFeedback(pendingDelete.id, key)
      // Erfolgreich ⇒ Passwort fürs Gerät merken, damit es nicht erneut nötig ist.
      localStorage.setItem(KEY_STORAGE, key)
      closeDelete()
      await load()
    } catch (err) {
      // Falsches Passwort ⇒ gemerktes verwerfen und erneut abfragen.
      const wrong = err instanceof Error && /passwort/i.test(err.message)
      if (wrong) localStorage.removeItem(KEY_STORAGE)
      setDeleteError(
        wrong ? 'Falsches Passwort.' : err instanceof Error ? err.message : 'Löschen fehlgeschlagen.',
      )
    } finally {
      setDeleting(false)
    }
  }

  // Im Lösch-Dialog nur dann ein Passwortfeld zeigen, wenn keins gemerkt ist.
  const hasSavedKey = localStorage.getItem(KEY_STORAGE) != null

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-5 p-5">
      <Link to="/" className="text-sm text-slate-400 hover:text-slate-200">
        ← Zurück
      </Link>

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Feedback</h1>
        <button type="button" className="btn-secondary" onClick={() => setWriteOpen(true)}>
          Feedback geben
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {entries === null && !error && <p className="text-sm text-slate-500">Lädt …</p>}

      {entries !== null && entries.length === 0 && (
        <p className="text-sm text-slate-500">Noch kein Feedback eingegangen.</p>
      )}

      {entries !== null && entries.length > 0 && (
        <ul className="flex flex-col gap-3">
          {entries.map((f) => (
            <li key={f.id} className="card">
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="font-semibold">{f.name}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-slate-500">{formatDateTime(f.created_at)}</span>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-700 hover:text-red-400"
                    aria-label="Feedback löschen"
                    title="Löschen"
                    onClick={() => askDelete(f)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-slate-200">{f.message}</p>
            </li>
          ))}
        </ul>
      )}

      <FeedbackDialog
        open={writeOpen}
        onClose={() => {
          setWriteOpen(false)
          load()
        }}
      />

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={closeDelete}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-slate-800 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-lg font-bold">Feedback löschen?</h2>
            <p className="mb-4 text-sm text-slate-400">
              Von <span className="font-semibold text-slate-200">{pendingDelete.name}</span>. Das
              lässt sich nicht rückgängig machen.
            </p>

            {!hasSavedKey && (
              <div className="mb-4">
                <label className="label" htmlFor="delete-key">
                  Lösch-Passwort
                </label>
                <input
                  id="delete-key"
                  type="password"
                  className="input"
                  placeholder="Passwort"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmDelete()
                  }}
                />
              </div>
            )}

            {deleteError && <p className="mb-3 text-sm text-red-400">{deleteError}</p>}

            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={closeDelete}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn-primary flex-1 !bg-red-600 hover:!bg-red-500"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Lösche …' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
