import { useEffect, useState } from 'react'
import { boulderImageUrl } from '../../lib/images'
import { HALL_AREAS, areaLabel } from '../../lib/areas'
import { useDialogEscape } from '../../hooks/useDialogEscape'
import { ColorPicker, DifficultyPicker, PhotoField } from '../BoulderPickers'
import type { GymBoulder } from '../../types'

export interface MapBoulderFormValues {
  difficulty: number
  color: string
  area: string | null
  label: string | null
  image: File | null
  removeImage: boolean
}

/**
 * Karten-Boulder anlegen oder bearbeiten (nur im Bearbeitungsmodus erreichbar).
 *
 * Die Position ist beim Öffnen bereits gesetzt – entweder durch den Tipp auf die
 * Karte oder durch das Fadenkreuz. Der Bereich ist daraus per Punkt-in-Polygon
 * vorbelegt, bleibt aber änderbar: die Flächen sind nicht-konvexe Bänder, und ein
 * Boulder an einer Zwischenwand gehört manchmal woandershin, als die Geometrie sagt.
 *
 * Grad ist hier Pflicht (anders als bei Session-Bouldern) – auf dem Karten-Punkt
 * steht die Zahl, ein Punkt ohne Zahl sagt nichts aus.
 */
export default function MapBoulderDialog({
  open,
  boulder,
  suggestedArea,
  onSubmit,
  onRemove,
  onDelete,
  onClose,
}: {
  open: boolean
  // Gesetzt ⇒ Bearbeiten, null ⇒ Anlegen an der zuvor getippten Position.
  boulder: GymBoulder | null
  suggestedArea: string | null
  onSubmit: (values: MapBoulderFormValues) => Promise<void>
  // Abschrauben (weich) – nur im Bearbeiten-Modus.
  onRemove?: () => Promise<void>
  // Endgültig löschen – nimmt die Marken aller Nutzer mit.
  onDelete?: () => Promise<void>
  onClose: () => void
}) {
  const isEdit = boulder != null
  const [difficulty, setDifficulty] = useState<number | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [area, setArea] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    if (!open) return
    setDifficulty(boulder?.difficulty ?? null)
    setColor(boulder?.color ?? null)
    setArea(boulder?.area ?? suggestedArea)
    setLabel(boulder?.label ?? '')
    setImage(null)
    setRemoveImage(false)
    setError(null)
    setResetKey((k) => k + 1)
    // Nur beim Öffnen bzw. Boulder-Wechsel vorbelegen – sonst überschriebe eine
    // Realtime-Änderung die laufende Eingabe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, boulder?.id])

  useDialogEscape(onClose, open)

  if (!open) return null

  const existingUrl =
    !image && !removeImage && boulder?.image_path ? boulderImageUrl(boulder.image_path) : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (difficulty == null) {
      setError('Bitte einen Grad wählen – er steht auf dem Punkt.')
      return
    }
    if (!color) {
      setError('Bitte eine Farbe auswählen.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit({
        difficulty,
        color,
        area,
        label: label.trim() || null,
        image,
        removeImage,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  async function run(action: () => Promise<void>, confirmText: string) {
    if (busy) return
    if (!window.confirm(confirmText)) return
    setBusy(true)
    try {
      await action()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aktion fehlgeschlagen.')
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
          {isEdit ? 'Boulder bearbeiten' : 'Boulder setzen'}
        </div>

        <div className="mb-[11px] mt-[18px] font-display text-[13px] font-semibold text-muted">
          Schwierigkeit <span className="font-medium text-faint">(Pflicht)</span>
        </div>
        <DifficultyPicker value={difficulty} onChange={setDifficulty} required />

        <div className="mb-[11px] mt-[18px] font-display text-[13px] font-semibold text-muted">
          Farbe
        </div>
        <ColorPicker value={color} onChange={setColor} />

        <div className="mb-[11px] mt-[18px] font-display text-[13px] font-semibold text-muted">
          Bereich{' '}
          <span className="font-medium text-faint">
            {suggestedArea && !isEdit ? '(aus der Position ermittelt)' : '(optional)'}
          </span>
        </div>
        <select
          className="input"
          value={area ?? ''}
          onChange={(e) => setArea(e.target.value || null)}
        >
          <option value="">— kein Bereich —</option>
          {HALL_AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        {area && <p className="mt-2 text-[13px] text-muted">{areaLabel(area)}</p>}

        <div className="mb-[11px] mt-[18px] font-display text-[13px] font-semibold text-muted">
          Kennzeichnung <span className="font-medium text-faint">(optional, z.B. „A7")</span>
        </div>
        <input
          className="input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={20}
        />

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
            {saving ? 'Speichere …' : isEdit ? 'Speichern' : 'Setzen'}
          </button>
        </div>

        {isEdit && onRemove && (
          <button
            type="button"
            className="mt-3 w-full p-2 text-[14px] font-semibold text-ink hover:underline disabled:opacity-50"
            disabled={busy}
            onClick={() =>
              run(
                onRemove,
                'Boulder abschrauben? Er verschwindet von der Karte, die Marken bleiben erhalten.',
              )
            }
          >
            Abgeschraubt
          </button>
        )}

        {isEdit && onDelete && (
          <button
            type="button"
            className="mt-1 w-full p-2 text-[14px] font-semibold text-bad hover:underline disabled:opacity-50"
            disabled={busy}
            onClick={() =>
              run(
                onDelete,
                'Endgültig löschen? Die Marken ALLER Nutzer zu diesem Boulder gehen verloren. Zum Abschrauben bitte „Abgeschraubt" verwenden.',
              )
            }
          >
            Endgültig löschen
          </button>
        )}
      </form>
    </div>
  )
}
