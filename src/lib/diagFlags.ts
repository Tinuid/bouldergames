// ════════════════ Diagnose-Modus (vorübergehend, siehe CLAUDE.md) ════════════════
//
// Zweck: das Foto-Flackern eingrenzen (BUGREPORT-foto-flackern.md). Das Flackern
// tritt nur auf, wenn Chrome Android die Kamera direkt öffnet – und das tut es nur
// über HTTPS, also nur in der echten App. Darum läuft die Diagnose bewusst auch im
// Production-Build, ist aber für normale Nutzer unsichtbar und standardmäßig aus.
//
// Einschalten:  5× auf die Versionszeile der Startseite tippen (VersionBadge) –
//               einziger Weg in der installierten PWA, die keine Adresszeile hat –
//               oder im Browser-Tab einmal ?diag=1 an die URL hängen.
// Ausschalten:  „Diagnose aus" im Panel, erneut 5× tippen, oder ?diag=0.
//
// Gespeichert im localStorage (gerätelokal, überlebt Neustarts und ein Neuladen der
// Seite nach der Kamera): bg:diag (an/aus), bg:diag:<flag> (Schalter), bg:diag:log.
//
// Rückbau – alle Einhängepunkte:
//   src/lib/diagFlags.ts             (diese Datei, löschen)
//   src/components/ViewportDiag.tsx  (Panel, löschen)
//   src/App.tsx                      (<ViewportDiag /> + Import)
//   src/components/VersionBadge.tsx  (5×-Tipp-Zähler)
//   src/components/BoulderPickers.tsx (noCapture-Schalter, diagLog bei pick/preview)
//   src/hooks/useDialogEscape.ts     (noScrollLock-Schalter)
//   src/index.css                    (.diag-no-blur / .diag-no-safe-area)
//   CLAUDE.md                        (Abschnitt „Diagnose-Modus")
import { useSyncExternalStore } from 'react'

export type DiagFlag = 'noCapture' | 'noBlur' | 'noSafeArea' | 'noScrollLock' | 'noFrameLoop'

export const DIAG_FLAGS: { flag: DiagFlag; label: string }[] = [
  { flag: 'noCapture', label: 'capture aus' },
  { flag: 'noBlur', label: 'backdrop-filter aus' },
  { flag: 'noSafeArea', label: 'Safe-Area-Padding aus' },
  { flag: 'noScrollLock', label: 'Body-Scroll-Lock aus' },
  { flag: 'noFrameLoop', label: 'Ruckler-Messung aus' },
]

// Flags, die rein per CSS wirken, als Klasse an <html> (Regeln in index.css).
const CSS_CLASS: Partial<Record<DiagFlag, string>> = {
  noBlur: 'diag-no-blur',
  noSafeArea: 'diag-no-safe-area',
}

const STORAGE_ACTIVE = 'bg:diag'
const STORAGE_LOG = 'bg:diag:log'
const storageKey = (flag: DiagFlag) => `bg:diag:${flag}`

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* egal – Diagnose */
  }
}

/** Ob die Diagnose aktiv ist. ?diag=1 schaltet ein, ?diag=0 aus; sonst gilt localStorage. */
export const diagActive: boolean = (() => {
  const param = new URLSearchParams(location.search).get('diag')
  if (param === '1') writeStorage(STORAGE_ACTIVE, '1')
  if (param === '0') writeStorage(STORAGE_ACTIVE, null)
  return readStorage(STORAGE_ACTIVE) === '1'
})()

/** Schaltet die Diagnose um und lädt neu (Einstieg für die installierte PWA). */
export function toggleDiag() {
  writeStorage(STORAGE_ACTIVE, diagActive ? null : '1')
  location.reload()
}

// ─── Flags ───────────────────────────────────────────────────────────────

const flags: Record<DiagFlag, boolean> = {
  noCapture: false,
  noBlur: false,
  noSafeArea: false,
  noScrollLock: false,
  noFrameLoop: false,
}

const listeners = new Set<() => void>()
let version = 0

function emit() {
  version++
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

function applyCssClass(flag: DiagFlag) {
  const cls = CSS_CLASS[flag]
  if (cls) document.documentElement.classList.toggle(cls, flags[flag])
}

if (diagActive) {
  for (const { flag } of DIAG_FLAGS) {
    flags[flag] = readStorage(storageKey(flag)) === '1'
    applyCssClass(flag)
  }
}

export function getDiagFlag(flag: DiagFlag): boolean {
  return diagActive && flags[flag]
}

export function setDiagFlag(flag: DiagFlag, on: boolean) {
  flags[flag] = on
  writeStorage(storageKey(flag), on ? '1' : null)
  applyCssClass(flag)
  diagLog(`flag ${flag}=${on ? 'an' : 'aus'}`)
  emit()
}

export function useDiagFlag(flag: DiagFlag): boolean {
  useSyncExternalStore(subscribe, () => version)
  return getDiagFlag(flag)
}

// ─── Log ────────────────────────────────────────────────────────────────
// Wird bei jedem Eintrag in den localStorage gespiegelt: Lädt Chrome die Seite nach
// der Kamera neu (oder verwirft sie im Hintergrund), bleibt der Verlauf davor erhalten.

export interface DiagEntry {
  at: number // Date.now() – absolut, damit Einträge über ein Neuladen hinweg vergleichbar bleiben
  msg: string
}

interface StoredLog {
  entries: DiagEntry[]
  counts: Record<string, number>
}

const MAX_ENTRIES = 80

function loadLog(): StoredLog {
  if (!diagActive) return { entries: [], counts: {} }
  try {
    const parsed = JSON.parse(readStorage(STORAGE_LOG) ?? '') as StoredLog
    if (Array.isArray(parsed.entries) && parsed.counts) return parsed
  } catch {
    /* kein oder kaputtes Log – neu anfangen */
  }
  return { entries: [], counts: {} }
}

let log: StoredLog = loadLog()

/** Eintrag ins Diagnose-Log; `kind` wird gezählt (z.B. 'resize'). No-op ohne Diagnose. */
export function diagLog(msg: string, kind?: string) {
  if (!diagActive) return
  const counts = kind ? { ...log.counts, [kind]: (log.counts[kind] ?? 0) + 1 } : log.counts
  log = { entries: [...log.entries.slice(-(MAX_ENTRIES - 1)), { at: Date.now(), msg }], counts }
  writeStorage(STORAGE_LOG, JSON.stringify(log))
  emit()
}

export function clearDiagLog() {
  log = { entries: [], counts: {} }
  writeStorage(STORAGE_LOG, null)
  emit()
}

export function useDiagLog(): StoredLog {
  useSyncExternalStore(subscribe, () => version)
  return log
}
