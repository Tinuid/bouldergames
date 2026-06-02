import { useEffect, useRef, useState } from 'react'
import { boulderImageUrl } from '../lib/images'
import { BOULDER_COLORS } from '../lib/colors'
import type { Boulder } from '../types'
import { Camera, Picture, X } from './icons'

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
  // Nur im Edit-Modus relevant: löscht den Boulder (Ersteller/Host).
  onDelete?: () => Promise<void>
  // Gesetzt ⇒ Bearbeiten-Modus (Felder vorbelegt). null/undefined ⇒ Anlegen.
  boulder?: Boulder | null
  // Im Multiplikator-Modus ist der Grad der Punkte-Faktor und daher Pflicht.
  requireDifficulty?: boolean
}) {
  const isEdit = boulder != null
  const [difficulty, setDifficulty] = useState('')
  const [color, setColor] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Beim Öffnen Felder aus dem Boulder vorbelegen (Edit) bzw. leeren (Anlegen).
  useEffect(() => {
    if (!open) return
    setDifficulty(boulder?.difficulty != null ? String(boulder.difficulty) : '')
    setColor(boulder?.color?.trim().toLowerCase() ?? '')
    setImage(null)
    setRemoveImage(false)
    setError(null)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }, [open, boulder?.id])

  // Vorschau-URL zum neu gewählten Bild verwalten und sauber wieder freigeben.
  useEffect(() => {
    if (!image) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(image)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  if (!open) return null

  // Vorschau: neu gewähltes Bild gewinnt; sonst das vorhandene (falls nicht entfernt).
  const existingUrl =
    !image && !removeImage && boulder?.image_path ? boulderImageUrl(boulder.image_path) : null
  const previewSrc = previewUrl ?? existingUrl

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImage(file)
    if (file) setRemoveImage(false)
  }

  function clearImage() {
    // "Entfernen" bedeutet: nach dem Speichern kein Foto (verwirft auch ein vorhandenes).
    setImage(null)
    setRemoveImage(true)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    const raw = difficulty.trim()
    const parsed = raw === '' ? null : Number(raw)
    const diff = parsed != null && !Number.isNaN(parsed) ? parsed : null
    if (requireDifficulty && (diff == null || diff <= 0)) {
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
      await onSubmit({ difficulty: diff, color, image, removeImage })
      onClose()
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
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
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
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const value = String(n)
            const selected = difficulty === value
            return (
              <button
                key={n}
                type="button"
                // Im optionalen Modus lässt sich die Auswahl durch erneutes Tippen aufheben.
                onClick={() => setDifficulty(selected && !requireDifficulty ? '' : value)}
                aria-pressed={selected}
                className={`flex aspect-square items-center justify-center rounded-xl border font-num text-[22px] font-bold transition active:scale-90 ${
                  selected
                    ? 'border-accent bg-accent text-accent-ink'
                    : 'border-border-strong bg-surface-2 text-ink'
                }`}
              >
                {n}
              </button>
            )
          })}
        </div>

        <div className="mb-[11px] mt-[18px] font-display text-[13px] font-semibold text-muted">Farbe</div>
        <div className="grid grid-cols-7 gap-2.5">
          {BOULDER_COLORS.map((c) => {
            const selected = color === c.name
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                title={c.name}
                aria-label={c.name}
                aria-pressed={selected}
                className="flex aspect-square items-center justify-center rounded-full transition active:scale-90"
              >
                <span
                  className={`aspect-square w-full rounded-full transition ${
                    selected
                      ? 'scale-110 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14),0_0_0_2px_var(--surface),0_0_0_4px_var(--accent)]'
                      : 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]'
                  }`}
                  style={{ background: c.swatch }}
                />
              </button>
            )
          })}
        </div>
        {color && <p className="mt-2 text-[13px] text-muted">{color}</p>}

        <div className="mb-[11px] mt-[18px] font-display text-[13px] font-semibold text-muted">
          Foto <span className="font-medium text-faint">(optional)</span>
        </div>
        {/* Zwei separate Inputs: der eine erzwingt die Kamera (capture), der andere
            lässt bewusst die Galerie/Dateiauswahl offen – damit das Verhalten auf
            allen Geräten gleich und vorhersehbar ist statt vom OS-Default abzuhängen. */}
        <input
          ref={cameraInputRef}
          id="image-camera"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={pickImage}
        />
        <input
          ref={galleryInputRef}
          id="image-gallery"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={pickImage}
        />
        {previewSrc ? (
          <div className="relative overflow-hidden rounded-sm2 border border-border-strong">
            <img src={previewSrc} alt="Vorschau" className="max-h-56 w-full object-cover" />
            <button
              type="button"
              className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
              onClick={clearImage}
            >
              <X className="text-sm" />
              Entfernen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm2 border border-border-strong bg-surface-2 px-2 py-3.5 text-[13.5px] font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-[0.97]"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="text-[17px]" />
              Foto aufnehmen
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm2 border border-border-strong bg-surface-2 px-2 py-3.5 text-[13.5px] font-semibold text-ink transition hover:border-accent hover:text-accent active:scale-[0.97]"
              onClick={() => galleryInputRef.current?.click()}
            >
              <Picture className="text-[17px]" />
              Aus Galerie
            </button>
          </div>
        )}

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
