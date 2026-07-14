import { useState } from 'react'
import { recomputeSessionResults, updateSession } from '../lib/api'
import { useDialogEscape } from '../hooks/useDialogEscape'
import { scoringFromSession, type Boulder, type Result, type Session } from '../types'
import SessionSettingsFields, {
  type SessionSettingsValues,
} from './SessionSettingsFields'
import { GripVertical } from './icons'

// Dialog, mit dem der Host die Spieleinstellungen einer bestehenden Session
// ändert. Vorbefüllt aus der Session; teilt das Formular mit CreateSession.
export default function EditSessionDialog({
  session,
  boulders,
  results,
  onClose,
  onSaved,
  onReorderBoulders,
}: {
  session: Session
  boulders: Boulder[]
  results: Result[]
  onClose: () => void
  onSaved: () => void
  // Öffnet den Sortier-Dialog für die Boulder-Reihenfolge (nur Host, wie dieser
  // Dialog selbst). Ungespeicherte Einstellungs-Änderungen gehen dabei verloren.
  onReorderBoulders: () => void
}) {
  const initialScoring = scoringFromSession(session)
  const [values, setValues] = useState<SessionSettingsValues>({
    name: session.name,
    mode: initialScoring.mode,
    flashPoints: initialScoring.flashPoints,
    topPoints: initialScoring.topPoints,
    attemptCost: initialScoring.attemptCost,
    penaltyMode: initialScoring.penaltyMode,
    sharedScoring: session.shared_scoring,
    isPublic: session.is_public,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useDialogEscape(onClose, true)

  const patch = (p: Partial<SessionSettingsValues>) => setValues((s) => ({ ...s, ...p }))

  // Wirken sich die Änderungen auf die Punktevergabe aus? Nur dann müssen
  // bestehende Ergebnisse neu berechnet werden (Name/„für andere“ tun das nicht).
  const scoringChanged =
    values.mode !== initialScoring.mode ||
    values.flashPoints !== initialScoring.flashPoints ||
    values.topPoints !== initialScoring.topPoints ||
    values.attemptCost !== initialScoring.attemptCost ||
    values.penaltyMode !== initialScoring.penaltyMode
  const willRecompute = scoringChanged && results.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    const scoring = {
      mode: values.mode,
      flashPoints: values.flashPoints,
      topPoints: values.topPoints,
      attemptCost: values.attemptCost,
      penaltyMode: values.penaltyMode,
    }
    try {
      await updateSession({
        sessionId: session.id,
        name: values.name,
        scoring,
        sharedScoring: values.sharedScoring,
        isPublic: values.isPublic,
      })
      if (willRecompute) {
        await recomputeSessionResults({ sessionId: session.id, results, boulders, scoring })
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
      setSaving(false)
    }
  }

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="sheet-grip" />
        <div className="mb-[18px] font-display text-[21px] font-extrabold tracking-[-0.02em]">
          Einstellungen bearbeiten
        </div>

        <SessionSettingsFields values={values} onChange={patch} />

        {boulders.length >= 2 && (
          <>
            <div className="mb-1 mt-1 border-t border-border" />
            <button
              type="button"
              className="mb-2 flex w-full items-center gap-2.5 rounded-btn px-1 py-3 text-[15px] font-semibold transition hover:bg-surface-2"
              onClick={onReorderBoulders}
            >
              <GripVertical className="text-[18px]" />
              Boulder-Reihenfolge ändern
            </button>
          </>
        )}

        {willRecompute && (
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted">
            Die Punkteregeln haben sich geändert – alle {results.length} bereits eingetragenen
            Ergebnisse werden mit den neuen Regeln neu berechnet.
          </p>
        )}

        {error && <p className="mb-3 text-sm text-bad">{error}</p>}

        <div className="grid grid-cols-[1fr_1.35fr] gap-2.5">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
            Abbrechen
          </button>
          <button type="submit" className="btn-primary" disabled={saving || !values.name.trim()}>
            {saving ? 'Speichere …' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  )
}
