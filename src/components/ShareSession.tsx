import { useState } from 'react'
import { Share } from './icons'

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
    <div className="flex items-center gap-3">
      <button onClick={() => copy(code, 'code')} className="code-chip" title="Code kopieren">
        {copied === 'code' ? 'Kopiert ✓' : code}
      </button>
      <button
        onClick={share}
        className="flex items-center gap-1.5 text-[15px] font-semibold text-muted transition hover:text-accent"
      >
        <Share className="text-[18px]" />
        {copied === 'link' ? 'Kopiert ✓' : 'Teilen'}
      </button>
    </div>
  )
}
