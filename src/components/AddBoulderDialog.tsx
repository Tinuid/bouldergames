import { useEffect, useState } from 'react'
import { boulderImageUrl } from '../lib/images'
import type { Boulder } from '../types'
import { useDialogEscape } from '../hooks/useDialogEscape'
import { ColorPicker, DifficultyPicker, PhotoField } from './BoulderPickers'

export interface BoulderFormValues {
  difficulty: number | null
  color: string | null
  image: File | null
  // true: ein vorhandenes Bild soll beim Speichern entfernt werden (nur Edit-Modus).
  removeImage: boolean
}

export default function AddBoulderDialog({
  open,
  onClose,
  onSubmit,
  onDelete,
  boulder = null,
  requireDifficulty = false,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (values: BoulderFormValues) => Promise<void>
  // Nur im Edit-Modus relevant: löscht den Boulder (jeder Teilnehmer, siehe Migration 0009).
  onDelete?: () => Promise<void>
  // Gesetzt ⇒ Bearbeiten-Modus (Felder vorbelegt). null/undefined ⇒ Anlegen.
  boulder?: Boulder | null
  // Im Multiplikator-Modus ist der Grad der Punkte-Faktor und daher Pflicht.
  requireDifficulty?: boolean
}) {
  const isEdit = boulder != null
  const [difficulty, setDifficulty] = useState<number | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)

  // Beim Öffnen Felder aus dem Boulder vorbelegen (Edit) bzw. leeren (Anlegen).
  useEffect(() => {
    if (!open) return
    setDifficulty(boulder?.difficulty ?? null)
    setColor(boulder?.color?.trim().toLowerCase() ?? null)
    setImage(null)
    setRemoveImage(false)
    setError(null)
    setResetKey((k) => k + 1)
    // boulder?.difficulty/color bewusst NICHT in den Deps: nur bei Öffnen bzw. Boulder-Wechsel
    // vorbelegen – sonst überschriebe eine externe (Realtime-)Änderung die laufende Eingabe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, boulder?.id])

  // Escape schließt, Body-Scroll sperren – nur solange das Sheet offen ist.
  useDialogEscape(onClose, open)

  if (!open) return null

  // Vorschau: neu gewähltes Bild gewinnt; sonst das vorhandene (falls nicht entfernt).
  const existingUrl =
    !image && !removeImage && boulder?.image_path ? boulderImageUrl(boulder.image_path) : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (requireDifficulty && (difficulty == null || difficulty <= 0)) {
      setError('In diesem Modus zählt der Grad als Punkte-Faktor – bitte einen Grad (> 0) angeben.')
      return
    }
    if (!color) {
      setError('Bitte eine Farbe auswählen.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit({ difficulty, color, image, removeImage })
      onClose()
    } catch (err) {
      // Bild-Upload/Speichern fehlgeschlagen: Dialog offen lassen und Grund zeigen
      // (analog handleDelete), statt den Fehler stumm zu schlucken.
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete || deleting) return
    const confirmed = window.confirm(
      'Diesen Boulder wirklich löschen? Alle Ergebnisse dazu gehen verloren.',
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen.')
    } finally {
      setDeleting(false)
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
          {isEdit ? 'Boulder bearbeiten' : 'Boulder hinzufügen'}
        </div>

        <div className="mb-[11px] mt-[18px] font-display text-[13px] font-semibold text-muted">
          Schwierigkeit / Wertung{' '}
          <span className="font-medium text-faint">
            {requireDifficulty ? '(Pflicht – Punkte-Faktor)' : '(optional)'}
          </span>
        </div>
        <DifficultyPicker value={difficulty} onChange={setDifficulty} required={requireDifficulty} />

        <div className="mb-[11px] mt-[18px] font-display text-[13px] font-semibold text-muted">
          Farbe
        </div>
        <ColorPicker value={color} onChange={setColor} />

        <div className="mb-[11px] mt-[18px] font-display text-[13px] font-semibold text-muted">
          Foto <span className="font-medium text-faint">(optional)</span>
        </div>
        <PhotoField
          file={image}
          existingUrl={existingUrl}
          resetKey={resetKey}
          onPick={(file) => {
            setImage(file)
            if (file) setRemoveImage(false)
          }}
          onClear={() => {
            // "Entfernen" bedeutet: nach dem Speichern kein Foto (verwirft auch ein vorhandenes).
            setImage(null)
            setRemoveImage(true)
          }}
        />

        {error && <p className="mt-3 text-sm text-bad">{error}</p>}

        <div className="mt-[22px] grid grid-cols-[1fr_1.35fr] gap-2.5">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Speichere …' : isEdit ? 'Speichern' : 'Hinzufügen'}
          </button>
        </div>

        {isEdit && onDelete && (
          <button
            type="button"
            className="mt-3 w-full p-2 text-[14px] font-semibold text-bad hover:underline disabled:opacity-50"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Lösche …' : 'Boulder löschen'}
          </button>
        )}
      </form>
    </div>
  )
}
