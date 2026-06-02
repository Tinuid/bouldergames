// Dezente Versionsanzeige. Version stammt aus package.json (zur Build-Zeit
// via vite.config.ts `define` eingefroren), das Build-Datum vom Build-Zeitpunkt.
// Nützlich bei der autoUpdate-PWA, um zu prüfen, ob ein Update angekommen ist.

const buildDate = new Date(__BUILD_DATE__).toLocaleDateString('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export default function VersionBadge() {
  return (
    <p className="text-center text-xs text-faint">
      Version {__APP_VERSION__} · {buildDate}
    </p>
  )
}
