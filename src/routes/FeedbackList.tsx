import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listFeedback, deleteFeedback } from '../lib/api'
import type { Feedback } from '../types'
import FeedbackDialog from '../components/FeedbackDialog'
import { ChevronLeft, Trash } from '../components/icons'

// Öffentliche Feedback-Liste: jeder kann alle Einträge lesen. Löschen ist durch
// ein Passwort geschützt, das serverseitig (RPC delete_feedback) geprüft wird –
// beim ersten Löschen abgefragt und danach nur im Speicher (React-State) für die
// aktuelle Seiten-Sitzung gemerkt. Bewusst NICHT im localStorage, damit das
// Passwort nicht im Klartext auf dem Gerät liegt; nach einem Reload neu eingeben.

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
  // Einmal korrekt eingegebenes Passwort für diese Seiten-Sitzung merken (nur im
  // Speicher, nicht persistiert). Nach Reload ist es weg und wird neu abgefragt.
  const [unlockedKey, setUnlockedKey] = useState<string | null>(null)

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
    const key = unlockedKey ?? keyInput.trim()
    if (!key) {
      setDeleteError('Bitte das Passwort eingeben.')
      return
    }
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteFeedback(pendingDelete.id, key)
      // Erfolgreich ⇒ Passwort für diese Sitzung merken, damit es nicht erneut nötig ist.
      setUnlockedKey(key)
      closeDelete()
      await load()
    } catch (err) {
      // Falsches Passwort ⇒ gemerktes verwerfen und erneut abfragen.
      const wrong = err instanceof Error && /passwort/i.test(err.message)
      if (wrong) setUnlockedKey(null)
      setDeleteError(
        wrong ? 'Falsches Passwort.' : err instanceof Error ? err.message : 'Löschen fehlgeschlagen.',
      )
    } finally {
      setDeleting(false)
    }
  }

  // Im Lösch-Dialog nur dann ein Passwortfeld zeigen, wenn keins gemerkt ist.
  const hasSavedKey = unlockedKey != null

  return (
    <div className="animate-screen-in mx-auto flex min-h-full max-w-2xl flex-col gap-5 px-5 pb-11 pt-14">
      <Link
        to="/"
        className="inline-flex items-center gap-0.5 text-[15px] font-semibold text-muted hover:text-ink"
      >
        <ChevronLeft className="text-[18px]" />
        Zurück
      </Link>

      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[34px] font-extrabold leading-none tracking-[-0.025em]">
          Feedback
        </h1>
        <button type="button" className="btn-secondary !min-h-0 !px-4 !py-2.5 !text-[15px]" onClick={() => setWriteOpen(true)}>
          Feedback geben
        </button>
      </div>

      {error && <p className="text-sm text-bad">{error}</p>}

      {entries === null && !error && <p className="text-sm text-muted">Lädt …</p>}

      {entries !== null && entries.length === 0 && (
        <p className="text-sm text-muted">Noch kein Feedback eingegangen.</p>
      )}

      {entries !== null && entries.length > 0 && (
        <ul className="flex flex-col gap-3">
          {entries.map((f) => (
            <li key={f.id} className="card">
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="font-display font-bold">{f.name}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-faint">{formatDateTime(f.created_at)}</span>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[16px] text-faint transition hover:bg-surface-2 hover:text-bad"
                    aria-label="Feedback löschen"
                    title="Löschen"
                    onClick={() => askDelete(f)}
                  >
                    <Trash />
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-ink">{f.message}</p>
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
        <div className="sheet-scrim" onClick={closeDelete}>
          <div
            className="sheet !max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-grip" />
            <h2 className="mb-2 font-display text-[21px] font-extrabold tracking-[-0.02em]">
              Feedback löschen?
            </h2>
            <p className="mb-4 text-sm text-muted">
              Von <span className="font-semibold text-ink">{pendingDelete.name}</span>. Das lässt
              sich nicht rückgängig machen.
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

            {deleteError && <p className="mb-3 text-sm text-bad">{deleteError}</p>}

            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={closeDelete}>
                Abbrechen
              </button>
              <button
                type="button"
                className="btn-primary flex-1 !bg-bad"
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
