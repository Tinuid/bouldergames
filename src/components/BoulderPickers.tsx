import { useEffect, useRef, useState } from 'react'
import { BOULDER_COLORS } from '../lib/colors'
import { DIFFICULTIES } from '../lib/difficulty'
import { Camera, Picture, X } from './icons'

// Gemeinsame Auswahl-Bausteine für Boulder-Formulare: Grad, Farbe und Foto.
//
// Ursprünglich lagen sie inline in AddBoulderDialog. Herausgezogen, damit der
// Lageplan-Dialog exakt dieselben Bedienelemente benutzt statt einer Kopie – die
// würde bei der nächsten Änderung an Graden oder Farben auseinanderlaufen.
// Bewusst reine Darstellung: kein eigener Formular-State, keine Validierung, kein
// Submit – das bleibt beim jeweiligen Dialog.

export function DifficultyPicker({
  value,
  onChange,
  // false ⇒ erneutes Tippen auf die aktive Stufe hebt die Auswahl auf.
  required = false,
}: {
  value: number | null
  onChange: (code: number | null) => void
  required?: boolean
}) {
  return (
    <>
      {/* 9 Stufen (1–7 plus "?"/"!") in zwei zentrierten Reihen: oben 5, unten 4. */}
      {[DIFFICULTIES.slice(0, 5), DIFFICULTIES.slice(5)].map((row, rowIndex) => (
        <div key={rowIndex} className={`flex justify-center gap-2${rowIndex > 0 ? ' mt-2' : ''}`}>
          {row.map((d) => {
            const selected = value === d.code
            return (
              <button
                key={d.code}
                type="button"
                onClick={() => onChange(selected && !required ? null : d.code)}
                aria-pressed={selected}
                aria-label={
                  d.label === '?' || d.label === '!' ? `Schwierigkeit ${d.label}` : `Grad ${d.label}`
                }
                className={`flex aspect-square w-[calc((100%-2rem)/5)] items-center justify-center rounded-xl border font-num text-[22px] font-bold transition active:scale-90 ${
                  selected
                    ? 'border-accent bg-accent text-accent-ink'
                    : 'border-border-strong bg-surface-2 text-ink'
                }`}
              >
                {d.label}
              </button>
            )
          })}
        </div>
      ))}
    </>
  )
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (name: string) => void
}) {
  return (
    <>
      <div className="grid grid-cols-7 gap-2.5">
        {BOULDER_COLORS.map((c) => {
          const selected = value === c.name
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => onChange(c.name)}
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
      {value && <p className="mt-2 text-[13px] text-muted">{value}</p>}
    </>
  )
}

export function PhotoField({
  file,
  existingUrl,
  onPick,
  onClear,
  // Wird beim Öffnen des Dialogs hochgezählt, um die File-Inputs zurückzusetzen.
  resetKey,
}: {
  file: File | null
  // Bereits gespeichertes Foto (null, wenn keins oder zum Entfernen vorgemerkt).
  existingUrl: string | null
  onPick: (file: File | null) => void
  onClear: () => void
  resetKey?: unknown
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Vorschau-URL zum neu gewählten Bild verwalten und sauber wieder freigeben.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }, [resetKey])

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    onPick(e.target.files?.[0] ?? null)
  }

  const previewSrc = previewUrl ?? existingUrl

  return (
    <>
      {/* Zwei separate Inputs: der eine erzwingt die Kamera (capture), der andere
          lässt bewusst die Galerie/Dateiauswahl offen – damit das Verhalten auf
          allen Geräten gleich und vorhersehbar ist statt vom OS-Default abzuhängen. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={pick}
      />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      {previewSrc ? (
        <div className="relative overflow-hidden rounded-sm2 border border-border-strong">
          <img src={previewSrc} alt="Vorschau" className="max-h-56 w-full object-cover" />
          <button
            type="button"
            className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
            onClick={() => {
              onClear()
              if (cameraInputRef.current) cameraInputRef.current.value = ''
              if (galleryInputRef.current) galleryInputRef.current.value = ''
            }}
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
    </>
  )
}
