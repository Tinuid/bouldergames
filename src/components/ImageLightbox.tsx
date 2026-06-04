import { useState } from 'react'
import { X } from './icons'
import { useDialogEscape } from '../hooks/useDialogEscape'

/**
 * Vollbild-Overlay für ein Boulder-Foto. Klick auf das Bild schaltet zwischen
 * "einpassen" und vergrößert (scrollbar) um; Hintergrund-Klick, X oder Escape
 * schließen. Bewusst ohne externe Lightbox-Library gehalten.
 */
export default function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string
  alt?: string
  onClose: () => void
}) {
  const [zoomed, setZoomed] = useState(false)

  // Escape schließt, Body-Scroll währenddessen sperren.
  useDialogEscape(onClose)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-auto bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Schließen"
        className="fixed right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl leading-none text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X />
      </button>
      <img
        src={src}
        alt={alt ?? 'Boulder-Foto'}
        className={
          zoomed
            ? 'max-w-none cursor-zoom-out'
            : 'max-h-[90vh] max-w-full cursor-zoom-in object-contain'
        }
        onClick={(e) => {
          e.stopPropagation()
          setZoomed((z) => !z)
        }}
      />
    </div>
  )
}
