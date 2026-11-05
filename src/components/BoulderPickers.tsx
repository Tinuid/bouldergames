import { useEffect, useRef, useState } from 'react'
import { BOULDER_COLORS } from '../lib/colors'
import { DIFFICULTIES } from '../lib/difficulty'
import { makePreviewBlob } from '../lib/images'
import { diagLog, useDiagFlag } from '../lib/diagFlags' // Diagnose-Modus (vorübergehend, siehe CLAUDE.md)
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
                  d.label === '?' || d.label === '!'
                    ? `Schwierigkeit ${d.label}`
                    : `Grad ${d.label}`
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

  // Vorschau zum neu gewählten Bild: bewusst verkleinert statt der Originaldatei
  // (Begründung bei makePreviewBlob). Schlägt das Verkleinern fehl, dient das Original
  // als Notlösung. URL beim Wechsel/Unmount wieder freigeben.
  useEffect(() => {
    setPreviewUrl(null)
    if (!file) return
    let cancelled = false
    let url: string | null = null
    makePreviewBlob(file)
      .catch((): Blob => file)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setPreviewUrl(url)
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [file])
  const previewPending = file !== null && previewUrl === null

  useEffect(() => {
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }, [resetKey])

  // Diagnose-Modus (vorübergehend, siehe CLAUDE.md): Gegenprobe ohne capture + Log.
  const noCapture = useDiagFlag('noCapture')

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    const via = e.target === cameraInputRef.current ? 'kamera' : 'galerie'
    const capture = e.target.getAttribute('capture') ?? '–'
    diagLog(
      f
        ? `pick ${via} (capture=${capture}): ${f.type} ${Math.round(f.size / 1024)} KB`
        : `pick ${via} (capture=${capture}): leer`,
      'pick',
    )
    onPick(f)
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
        capture={noCapture ? undefined : 'environment'}
        className="hidden"
        onChange={pick}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={pick}
      />
      {previewPending ? (
        // Gleiche Box wie die fertige Vorschau (Höhe, Rahmen, Fläche), damit der Wechsel
        // Platzhalter → Bild nichts verschiebt. Kein sichtbarer Text: das Verkleinern
        // dauert nur Sekundenbruchteile, ein unlesbar kurz aufblitzendes Wort wirkt als Ruckler.
        <div className="h-56 rounded-sm2 border border-border-strong bg-surface-2" aria-busy="true">
          <span className="sr-only">Vorschau wird erstellt …</span>
        </div>
      ) : previewSrc ? (
        <div className="relative h-56 overflow-hidden rounded-sm2 border border-border-strong bg-surface-2">
          <img
            src={previewSrc}
            alt="Vorschau"
            className="h-full w-full object-cover"
            onLoad={(e) =>
              diagLog(
                `preview geladen ${e.currentTarget.naturalWidth}×${e.currentTarget.naturalHeight}`,
                'preview',
              )
            }
          />
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
            onClick={() => {
              diagLog('tap „Foto aufnehmen"', 'tap')
              cameraInputRef.current?.click()
            }}
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
