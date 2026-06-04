import { useEffect } from 'react'

/**
 * Schließt einen Dialog/Sheet bei Escape und sperrt solange den Body-Scroll.
 * Zentralisiert das zuvor in ImageLightbox/PlayerDetail duplizierte Muster, damit
 * auch die Bottom-Sheets (AddBoulderDialog, FeedbackDialog, Menü-Sheet) es nutzen.
 *
 * `active` steuert, ob der Effekt greift – wichtig für Komponenten, die dauerhaft
 * gemountet sind und nur über ein `open`-Prop ein-/ausgeblendet werden (sonst würde
 * der Body-Scroll auch im geschlossenen Zustand gesperrt).
 */
export function useDialogEscape(onClose: () => void, active = true) {
  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, active])
}
