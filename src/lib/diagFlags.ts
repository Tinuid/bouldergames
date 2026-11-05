// TEMPORÄR (Branch diag/foto-flackern): Schalter und Log für die Diagnose des
// Foto-Flackerns, siehe BUGREPORT-foto-flackern.md. Nur im Dev-Build aktiv und nur,
// wenn die App einmal mit ?diag=1 geöffnet wurde. Nicht nach main mergen.
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
const storageKey = (flag: DiagFlag) => `bg:diag:${flag}`

function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch {
    /* egal – Diagnose */
  }
}

/** Ob die Diagnose aktiv ist. ?diag=1 schaltet ein, ?diag=0 aus; dazwischen gilt sessionStorage. */
export const diagActive: boolean = (() => {
  if (!import.meta.env.DEV) return false
  const param = new URLSearchParams(location.search).get('diag')
  if (param === '1') writeStorage(STORAGE_ACTIVE, '1')
  if (param === '0') writeStorage(STORAGE_ACTIVE, null)
  return readStorage(STORAGE_ACTIVE) === '1'
})()

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

export interface DiagEntry {
  t: number // ms seit Start des Logs
  msg: string
}

const MAX_ENTRIES = 40
let logStart = performance.now()
let entries: DiagEntry[] = []
const counts: Record<string, number> = {}

/** Eintrag ins Diagnose-Log; `kind` wird gezählt (z.B. 'resize'). No-op ohne Diagnose. */
export function diagLog(msg: string, kind?: string) {
  if (!diagActive) return
  if (entries.length === 0) logStart = performance.now()
  if (kind) counts[kind] = (counts[kind] ?? 0) + 1
  entries = [...entries.slice(-(MAX_ENTRIES - 1)), { t: performance.now() - logStart, msg }]
  emit()
}

export function clearDiagLog() {
  entries = []
  for (const k of Object.keys(counts)) delete counts[k]
  emit()
}

export function useDiagLog(): { entries: DiagEntry[]; counts: Record<string, number> } {
  useSyncExternalStore(subscribe, () => version)
  return { entries, counts }
}
