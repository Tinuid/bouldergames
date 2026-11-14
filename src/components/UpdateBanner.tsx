import { useState, useSyncExternalStore } from 'react'
import { applyUpdate, isUpdateReady, subscribeUpdateReady } from '../lib/pwaUpdate'
import { X } from './icons'

// Hinweis „Update verfügbar“, sobald ein neuer Service Worker bereitliegt (pwaUpdate.ts).
// „Neu laden“ spielt die Version sofort ein; ✕ blendet den Hinweis aus – dann kommt die
// neue Version beim nächsten Zurückkehren in die App.
//
// Oben statt unten: unten liegen der Fehler-Toast der Challenge und die schwebenden Knöpfe
// der Startseite. Bewusst role="status" und NICHT "dialog" – dialogOpen() in pwaUpdate.ts
// würde sonst das automatische Neuladen beim Zurückkehren blockieren.
export default function UpdateBanner() {
  const ready = useSyncExternalStore(subscribeUpdateReady, isUpdateReady)
  const [dismissed, setDismissed] = useState(false)

  if (!ready || dismissed) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center px-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
    >
      <div
        role="status"
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-btn border border-border-strong bg-surface py-2 pl-4 pr-2 shadow-lg"
      >
        <span className="min-w-0 flex-1 font-display text-[15px] font-bold text-ink">
          Update verfügbar
        </span>
        <button
          type="button"
          onClick={applyUpdate}
          className="shrink-0 rounded-[10px] bg-accent px-3.5 py-2 font-display text-[14px] font-bold text-accent-ink transition active:scale-[0.97]"
        >
          Neu laden
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Später"
          title="Später"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[16px] text-muted transition hover:text-ink"
        >
          <X />
        </button>
      </div>
    </div>
  )
}
