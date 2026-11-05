// TEMPORÄR (Branch diag/foto-flackern): Diagnose-Overlay für das Foto-Flackern,
// siehe BUGREPORT-foto-flackern.md. Zeigt Viewport-Werte live, protokolliert alle
// Viewport-/Sichtbarkeits-Events und hängt Schalter für die Gegenproben an.
// Nur im Dev-Build und nach einmaligem ?diag=1. Nicht nach main mergen.
import { useEffect, useRef, useState } from 'react'
import {
  DIAG_FLAGS,
  clearDiagLog,
  diagActive,
  diagLog,
  getDiagFlag,
  setDiagFlag,
  useDiagFlag,
  useDiagLog,
  type DiagFlag,
} from '../lib/diagFlags'

let probe: HTMLDivElement | null = null

function safeAreaInsets(): string {
  if (!probe) {
    probe = document.createElement('div')
    probe.style.cssText =
      'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);'
    document.body.appendChild(probe)
  }
  const cs = getComputedStyle(probe)
  const n = (v: string) => Math.round(parseFloat(v) || 0)
  return `${n(cs.paddingTop)}/${n(cs.paddingRight)}/${n(cs.paddingBottom)}/${n(cs.paddingLeft)}`
}

/** Kompakte Momentaufnahme aller relevanten Viewport-Werte. */
function snapshot(): string {
  const vv = window.visualViewport
  const r = (v: number) => Math.round(v * 10) / 10
  const vvPart = vv ? `vv=${r(vv.height)}@${r(vv.offsetTop)} s${r(vv.scale)}` : 'vv=–'
  return (
    `${innerWidth}×${innerHeight} ${vvPart} ch=${document.documentElement.clientHeight} ` +
    `sa=${safeAreaInsets()} dpr=${r(devicePixelRatio)}`
  )
}

function useViewportEvents() {
  useEffect(() => {
    const vv = window.visualViewport
    const pairs: [EventTarget, string][] = [
      [window, 'resize'],
      [window, 'orientationchange'],
      [window, 'pagehide'],
      [window, 'pageshow'],
      [window, 'focus'],
      [window, 'blur'],
      [document, 'visibilitychange'],
    ]
    if (vv) {
      pairs.push([vv, 'resize'], [vv, 'scroll'])
    }
    const handlers = pairs.map(([target, type]) => {
      const kind = target === vv ? `vv.${type}` : type
      const h =
        type === 'visibilitychange'
          ? () => diagLog(`visibility=${document.visibilityState} · ${snapshot()}`, 'visibility')
          : () => diagLog(`${kind} · ${snapshot()}`, kind)
      target.addEventListener(type, h)
      return () => target.removeEventListener(type, h)
    })
    diagLog(`start · ${snapshot()}`)

    // Frame-Lücken > 80 ms (Jank, GPU-Stall, Hintergrund). Im Hintergrund pausiert rAF –
    // die eine große Lücke beim Zurückkehren ist erwartbar, viele kleine danach nicht.
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const gap = now - last
      if (gap > 80) diagLog(`frame-gap ${Math.round(gap)} ms`, 'frame-gap')
      last = now
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      handlers.forEach((off) => off())
      cancelAnimationFrame(raf)
    }
  }, [])
}

function copyText(text: string) {
  // Über http im LAN gibt es kein navigator.clipboard (kein sicherer Kontext) – Fallback.
  if (navigator.clipboard && window.isSecureContext) {
    void navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.cssText = 'position:fixed;left:-9999px;top:0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
  } catch {
    /* egal */
  }
  ta.remove()
}

function FlagToggle({ flag, label }: { flag: DiagFlag; label: string }) {
  const on = useDiagFlag(flag)
  return (
    <label className="flex items-center gap-1.5">
      <input type="checkbox" checked={on} onChange={(e) => setDiagFlag(flag, e.target.checked)} />
      {label}
    </label>
  )
}

function DiagPanel() {
  useViewportEvents()
  const { entries, counts } = useDiagLog()
  const [open, setOpen] = useState(true)
  const [, setTick] = useState(0)
  const logRef = useRef<HTMLDivElement>(null)

  // Live-Zeile auch ohne Events aktuell halten.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [entries])

  const countLine = Object.entries(counts)
    .map(([k, v]) => `${k}:${v}`)
    .join(' ')

  const asText = () =>
    [
      `now: ${snapshot()}`,
      `counts: ${countLine}`,
      `flags: ${DIAG_FLAGS.map((f) => `${f.flag}=${getDiagFlag(f.flag) ? 1 : 0}`).join(' ')}`,
      `ua: ${navigator.userAgent}`,
      ...entries.map((e) => `${(e.t / 1000).toFixed(3).padStart(8)}s ${e.msg}`),
    ].join('\n')

  return (
    <div
      className="fixed left-1 z-[9999] max-w-[94vw] rounded-md bg-black/80 p-1.5 font-mono text-[10px] leading-tight text-white"
      style={{ top: 'max(4px, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded bg-white/20 px-1.5"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? '−' : '+'} diag
        </button>
        <span className="truncate">{snapshot()}</span>
      </div>
      {open && (
        <>
          <div className="mt-1 break-words text-yellow-200">{countLine || 'noch keine Events'}</div>
          <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
            {DIAG_FLAGS.map((f) => (
              <FlagToggle key={f.flag} flag={f.flag} label={f.label} />
            ))}
          </div>
          <div
            ref={logRef}
            className="mt-1 max-h-[38vh] overflow-y-auto whitespace-pre-wrap break-all"
          >
            {entries.map((e, i) => (
              <div key={i}>
                <span className="text-white/50">{(e.t / 1000).toFixed(2)}s</span> {e.msg}
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1.5">
            <button
              type="button"
              className="rounded bg-white/20 px-1.5 py-0.5"
              onClick={clearDiagLog}
            >
              Log leeren
            </button>
            <button
              type="button"
              className="rounded bg-white/20 px-1.5 py-0.5"
              onClick={() => copyText(asText())}
            >
              Kopieren
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function ViewportDiag() {
  return diagActive ? <DiagPanel /> : null
}
