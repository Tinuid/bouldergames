import { registerSW } from 'virtual:pwa-register'

// Service-Worker-Registrierung mit kontrolliertem Neuladen.
//
// Früher (registerType 'autoUpdate' ohne eigenen Code) übernahm ein neuer Service
// Worker zwar sofort, das bereits geöffnete JS-Bundle lief aber weiter – eine neue
// Version kam effektiv erst beim ÜBERNÄCHSTEN Öffnen an. Das ist gefährlich, sobald
// sich die Bedeutung gespeicherter Daten ändert (alte App schreibt nach altem Schema).
//
// Jetzt ('prompt'-Modus): Ein neuer Service Worker wartet, bis wir ihn aktivieren.
// Aktiviert (und neu geladen) wird beim nächsten Zurückkehren in die App – bewusst
// nicht mitten in der Bedienung und nicht, solange ein Dialog offen ist (z.B. ein
// Foto-Upload im AddBoulderDialog: das Öffnen der Kamera macht die Seite „hidden“,
// beim Zurückkommen darf der halbe Dialog nicht weggeladen werden).
// Zusätzlich prüft jede Rückkehr in die App, ob es eine neue Version gibt.

function dialogOpen(): boolean {
  return document.querySelector('[role="dialog"]') != null
}

export function setupPwaUpdates(): void {
  let updateReady = false

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Neue Version liegt bereit – angewendet wird erst bei der nächsten Rückkehr.
      updateReady = true
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return
        if (updateReady && !dialogOpen()) {
          // Lädt die Seite neu, sobald der wartende Service Worker übernimmt.
          void updateSW(true)
          return
        }
        // Sonst nur nachsehen, ob es inzwischen eine neue Version gibt.
        registration.update().catch(() => {
          /* offline o.ä. – beim nächsten Mal wieder */
        })
      })
    },
  })
}
