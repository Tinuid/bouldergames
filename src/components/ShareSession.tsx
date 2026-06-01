import { useState } from 'react'

export default function ShareSession({ code }: { code: string }) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const joinUrl = `${location.origin}/join/${code}`

  async function copy(value: string, what: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(what)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* Clipboard nicht verfügbar – ignorieren */
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Boulder Challenge', text: `Tritt bei mit Code ${code}`, url: joinUrl })
      } catch {
        /* abgebrochen */
      }
    } else {
      copy(joinUrl, 'link')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => copy(code, 'code')}
        className="rounded-lg bg-slate-700 px-3 py-1.5 font-mono text-lg font-bold tracking-widest hover:bg-slate-600"
        title="Code kopieren"
      >
        {copied === 'code' ? 'Kopiert!' : code}
      </button>
      <button onClick={share} className="btn-ghost px-3 py-1.5 text-sm">
        Teilen
      </button>
    </div>
  )
}
