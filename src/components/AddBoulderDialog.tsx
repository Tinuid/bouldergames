import { useEffect, useRef, useState } from 'react'
import { boulderImageUrl } from '../lib/images'
import { BOULDER_COLORS } from '../lib/colors'
import type { Boulder } from '../types'

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
  boulder = null,
  requireDifficulty = false,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (values: BoulderFormValues) => Promise<void>
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <form
        className="w-full max-w-md rounded-2xl bg-slate-800 p-5"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="mb-4 text-lg font-bold">{isEdit ? 'Boulder bearbeiten' : 'Boulder hinzufügen'}</h2>
        <div className="flex flex-col gap-4">
          <div>
            <span className="label">
              Schwierigkeit / Wertung{requireDifficulty ? ' (Pflicht – Punkte-Faktor)' : ' (optional)'}
            </span>
            <div className="flex flex-wrap gap-2">
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
                    className={`h-10 w-10 rounded-lg text-sm font-bold transition ${
                      selected
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    }`}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <span className="label">Farbe</span>
            <div className="flex flex-wrap gap-2">
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
                    className={`h-8 w-8 rounded-full ring-1 ring-slate-600 transition ${
                      selected ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white' : ''
                    }`}
                    style={{ background: c.swatch }}
                  />
                )
              })}
            </div>
            {color && <p className="mt-1.5 text-sm text-slate-400">{color}</p>}
          </div>
          <div>
            <span className="label">Foto (optional)</span>
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
              <div className="relative overflow-hidden rounded-xl border border-slate-700">
                <img src={previewSrc} alt="Vorschau" className="max-h-56 w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
                  onClick={clearImage}
                >
                  Entfernen
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  📷 Foto aufnehmen
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  🖼️ Aus Galerie
                </button>
              </div>
            )}
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Speichere …' : isEdit ? 'Speichern' : 'Hinzufügen'}
          </button>
        </div>
      </form>
    </div>
  )
}
