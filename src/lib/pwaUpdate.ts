import { registerSW } from 'virtual:pwa-register'

// Service-Worker-Registrierung mit kontrolliertem Neuladen.
//
// Früher (registerType 'autoUpdate' ohne eigenen Code) übernahm ein neuer Service
// Worker zwar sofort, das bereits geöffnete JS-Bundle lief aber weiter – eine neue
// Version kam effektiv erst beim ÜBERNÄCHSTEN Öffnen an. Das ist gefährlich, sobald
// sich die Bedeutung gespeicherter Daten ändert (alte App schreibt nach altem Schema).
//
// Jetzt ('prompt'-Modus): Ein neuer Service Worker wartet, bis wir ihn aktivieren.
// - Sobald er bereitliegt, zeigt das UpdateBanner „Update verfügbar“ mit „Neu laden“
//   (applyUpdate). Der Nutzer entscheidet selbst – darum ohne Dialog-Prüfung.
// - Ignoriert oder weggeklickt: aktiviert (und neu geladen) wird beim nächsten
//   Zurückkehren in die App – bewusst nicht mitten in der Bedienung und nicht, solange
//   ein Dialog offen ist (z.B. ein Foto-Upload im AddBoulderDialog: das Öffnen der Kamera
//   macht die Seite „hidden“, beim Zurückkommen darf der halbe Dialog nicht weggeladen
//   werden).
// - Jede Rückkehr in die App prüft, ob es eine neue Version gibt; solange die App
//   sichtbar ist, zusätzlich alle 15 Minuten (wer die App in der Halle offen hat).
//
// Wichtig: Wie ein Update abläuft, entscheidet immer die Version, die GERADE läuft. Eine
// Änderung hier wirkt erst beim Update NACH der Version, die sie mitbringt.

const CHECK_INTERVAL_MS = 15 * 60 * 1000

let updateReady = false
let applying = false
let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null
const listeners = new Set<() => void>()

function dialogOpen(): boolean {
  return document.querySelector('[role="dialog"]') != null
}

// Abo für React (useSyncExternalStore im UpdateBanner).
export function subscribeUpdateReady(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function isUpdateReady(): boolean {
  return updateReady
}

/** Spielt die bereitliegende Version ein und lädt neu (nur einmal). */
export function applyUpdate(): void {
  if (!updateReady || applying || !updateSW) return
  applying = true
  void updateSW(true)
}

export function setupPwaUpdates(): void {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Neue Version liegt bereit – das Banner bietet „Neu laden“ an; sonst greift die
      // nächste Rückkehr in die App.
      updateReady = true
      listeners.forEach((l) => l())
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        registration.update().catch(() => {
          /* offline o.ä. – beim nächsten Mal wieder */
        })
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return
        if (updateReady && !dialogOpen()) {
          // Lädt die Seite neu, sobald der wartende Service Worker übernimmt.
          applyUpdate()
          return
        }
        // Sonst nur nachsehen, ob es inzwischen eine neue Version gibt.
        check()
      })
      setInterval(() => {
        if (document.visibilityState === 'visible' && !updateReady) check()
      }, CHECK_INTERVAL_MS)
    },
  })
}
