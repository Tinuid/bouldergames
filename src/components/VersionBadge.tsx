import { useRef } from 'react'
import { toggleDiag } from '../lib/diagFlags'

// Dezente Versionsanzeige. Version stammt aus package.json (zur Build-Zeit
// via vite.config.ts `define` eingefroren), das Build-Datum vom Build-Zeitpunkt.
// Nützlich bei der autoUpdate-PWA, um zu prüfen, ob ein Update angekommen ist.

const buildDate = new Date(__BUILD_DATE__).toLocaleDateString('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

// Diagnose-Modus (vorübergehend, siehe CLAUDE.md): 5 Tipps innerhalb von 2 s schalten
// ihn um. Einziger Einstieg in der installierten PWA, die keine Adresszeile für ?diag=1 hat.
const DIAG_TAPS = 5
const DIAG_WINDOW_MS = 2000

export default function VersionBadge() {
  const taps = useRef<number[]>([])

  function onTap() {
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < DIAG_WINDOW_MS), now]
    if (taps.current.length >= DIAG_TAPS) {
      taps.current = []
      toggleDiag()
    }
  }

  return (
    <p className="select-none text-center text-xs text-faint" onClick={onTap}>
      Version {__APP_VERSION__} · {buildDate}
    </p>
  )
}
