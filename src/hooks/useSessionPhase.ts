import { useEffect, useState } from 'react'
import { sessionPhase, type SessionPhase } from '../lib/sessionPhase'
import type { Session } from '../types'

// Phase der Challenge, die sich auch ohne Datenänderung umstellt: liegt `ends_at` in der
// Zukunft (später z.B. Time Attack), rendert der Hook genau zu diesem Zeitpunkt neu.
// Heute setzt „Challenge beenden“ die Serverzeit – dann ist die Phase sofort 'ended'.
export function useSessionPhase(session: Pick<Session, 'ends_at'> | null): SessionPhase {
  const endsAt = session?.ends_at ?? null
  const [, setTick] = useState(0)

  useEffect(() => {
    if (endsAt == null) return
    const ms = Date.parse(endsAt) - Date.now()
    if (ms <= 0) return
    // setTimeout verträgt höchstens ~24,8 Tage; weiter entfernte Enden gibt es nicht.
    const t = setTimeout(() => setTick((n) => n + 1), Math.min(ms + 50, 2 ** 31 - 1))
    return () => clearTimeout(t)
  }, [endsAt])

  return session ? sessionPhase(session) : 'running'
}
