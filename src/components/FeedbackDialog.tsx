import { useEffect, useState } from 'react'
import { submitFeedback } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

// Dialog zum Abschicken von freiem Feedback (Name + Text). Wird über den
// Floating-Button auf der Startseite geöffnet. Schreibt in die feedback-Tabelle
// (per RLS nur einfügbar, nicht lesbar – siehe 0006_feedback.sql).
export default function FeedbackDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { userId } = useAuth()
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  // Beim Öffnen Felder/Status zurücksetzen.
  useEffect(() => {
    if (!open) return
    setName('')
    setMessage('')
    setError(null)
    setSent(false)
  }, [open])

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (!message.trim()) {
      setError('Bitte einen Text eingeben.')
      return
    }
    if (!userId) {
      setError('Noch nicht angemeldet – bitte kurz warten und erneut versuchen.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await submitFeedback({ userId, name, message })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Senden fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="sheet-grip" />
        <h2 className="mb-4 font-display text-[21px] font-extrabold tracking-[-0.02em]">Feedback</h2>

        {sent ? (
          <div className="flex flex-col gap-4">
            <p className="text-muted">Danke für dein Feedback! 🙌</p>
            <button type="button" className="btn-primary" onClick={onClose}>
              Schließen
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              <div>
                <label className="label" htmlFor="feedback-name">
                  Name (optional)
                </label>
                <input
                  id="feedback-name"
                  type="text"
                  className="input"
                  placeholder="Anonym"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                />
              </div>
              <div>
                <label className="label" htmlFor="feedback-message">
                  Dein Feedback
                </label>
                <textarea
                  id="feedback-message"
                  className="input min-h-32 resize-y"
                  placeholder="Was läuft gut, was fehlt, was nervt?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  autoFocus
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-bad">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={onClose}>
                Abbrechen
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Sende …' : 'Senden'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
