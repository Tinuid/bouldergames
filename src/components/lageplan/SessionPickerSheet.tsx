import { useEffect, useState } from 'react'
import { listMySessions, type MySession } from '../../lib/api'
import { useDialogEscape } from '../../hooks/useDialogEscape'
import { ChevronRight, Users } from '../icons'

/**
 * Auswahl einer laufenden Challenge, in die Boulder von der Karte übernommen
 * werden sollen.
 *
 * Angeboten werden nur Sessions, in denen man tatsächlich Teilnehmer ist – das ist
 * zugleich die Bedingung, die die Policy boulders_insert per is_session_member
 * verlangt. Der gerätelokale Verlauf wäre dafür die falsche Quelle: er kann auf
 * aufgeräumte oder verlassene Challenges zeigen.
 */
export default function SessionPickerSheet({
  open,
  userId,
  count,
  onPick,
  onClose,
}: {
  open: boolean
  userId: string
  // Anzahl der ausgewählten Boulder – nur für die Überschrift.
  count: number
  onPick: (session: MySession) => Promise<void>
  onClose: () => void
}) {
  const [sessions, setSessions] = useState<MySession[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setSessions(null)
    setError(null)
    listMySessions(userId)
      .then((data) => {
        if (!cancelled) setSessions(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen.')
      })
    return () => {
      cancelled = true
    }
  }, [open, userId])

  useDialogEscape(onClose, open)

  if (!open) return null

  async function pick(session: MySession) {
    if (busyId) return
    setBusyId(session.id)
    setError(null)
    try {
      await onPick(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hinzufügen fehlgeschlagen.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="font-display text-[21px] font-extrabold tracking-[-0.02em]">
          {count === 1 ? 'Boulder hinzufügen' : `${count} Boulder hinzufügen`}
        </div>
        <p className="mt-2 text-[14px] text-muted">Zu welcher Challenge?</p>

        {sessions == null && !error && <p className="mt-4 text-[14px] text-muted">Lädt …</p>}
        {error && <p className="mt-3 text-sm text-bad">{error}</p>}

        {sessions != null && sessions.length === 0 && (
          <p className="mt-4 text-[14px] text-muted">
            Du bist in keiner laufenden Challenge. Starte eine neue – dann sind die ausgewählten
            Boulder direkt drin.
          </p>
        )}

        {sessions != null && sessions.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2.5">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-left transition hover:border-accent disabled:opacity-50"
                  onClick={() => pick(s)}
                  disabled={busyId != null}
                >
                  <Users className="shrink-0 text-[18px] text-faint" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[16px] font-bold">
                      {s.name}
                    </span>
                    <span className="block truncate text-[13px] text-muted">
                      als {s.displayName} · {s.join_code}
                    </span>
                  </span>
                  {busyId === s.id ? (
                    <span className="shrink-0 text-[13px] text-muted">…</span>
                  ) : (
                    <ChevronRight className="shrink-0 text-[18px] text-faint" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="btn-ghost mt-[22px] w-full" onClick={onClose}>
          Abbrechen
        </button>
      </div>
    </div>
  )
}
