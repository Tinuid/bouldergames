import { useEffect, useRef, useState } from 'react'

export default function AddBoulderDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (
    difficulty: number | null,
    color: string | null,
    image: File | null,
  ) => Promise<void>
}) {
  const [difficulty, setDifficulty] = useState('')
  const [color, setColor] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Vorschau-URL zum gewählten Bild verwalten und sauber wieder freigeben.
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

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImage(file)
  }

  function clearImage() {
    setImage(null)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    try {
      const diff = difficulty.trim() === '' ? null : Number(difficulty)
      await onAdd(Number.isNaN(diff as number) ? null : diff, color.trim() || null, image)
      setDifficulty('')
      setColor('')
      clearImage()
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
        <h2 className="mb-4 text-lg font-bold">Boulder hinzufügen</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="diff">
              Schwierigkeit / Wertung
            </label>
            <input
              id="diff"
              type="number"
              inputMode="numeric"
              className="input"
              placeholder="z.B. 4"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label" htmlFor="color">
              Farbe (optional)
            </label>
            <input
              id="color"
              className="input"
              placeholder="z.B. rot"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
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
            {previewUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-slate-700">
                <img src={previewUrl} alt="Vorschau" className="max-h-56 w-full object-cover" />
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
        <div className="mt-5 flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Speichere …' : 'Hinzufügen'}
          </button>
        </div>
      </form>
    </div>
  )
}
