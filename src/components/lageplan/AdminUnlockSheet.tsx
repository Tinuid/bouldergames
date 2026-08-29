import { useEffect, useState } from 'react'
import { useDialogEscape } from '../../hooks/useDialogEscape'

/**
 * Passwort-Abfrage für den Bearbeitungsmodus der Karte.
 *
 * Aufbau wie der Lösch-Dialog in FeedbackList: das Passwort wird serverseitig
 * geprüft (RPC verify_gym_admin_key) und danach ausschließlich im React-State der
 * Sitzung gehalten – bewusst NICHT im localStorage, damit es nicht im Klartext auf
 * dem Gerät liegt. Nach einem Reload ist es weg und wird neu abgefragt.
 */
export default function AdminUnlockSheet({
  open,
  onUnlock,
  onClose,
}: {
  open: boolean
  onUnlock: (key: string) => Promise<void>
  onClose: () => void
}) {
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setKey('')
    setError(null)
  }, [open])

  useDialogEscape(onClose, open)

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!key.trim()) {
      setError('Bitte das Passwort eingeben.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onUnlock(key.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prüfung fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="sheet-grip" />
        <div className="font-display text-[21px] font-extrabold tracking-[-0.02em]">
          Lageplan bearbeiten
        </div>
        <p className="mt-2 text-[14px] text-muted">
          Boulder setzen, ändern und abschrauben ist passwortgeschützt. Das Passwort wird nur für
          diese Sitzung gemerkt.
        </p>

        <label className="label mt-[18px]" htmlFor="gym-admin-key">
          Passwort
        </label>
        <input
          id="gym-admin-key"
          type="password"
          className="input"
          autoComplete="current-password"
          autoFocus
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />

        {error && <p className="mt-3 text-sm text-bad">{error}</p>}

        <div className="mt-[22px] grid grid-cols-[1fr_1.35fr] gap-2.5">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Prüfe …' : 'Entsperren'}
          </button>
        </div>
      </form>
    </div>
  )
}
