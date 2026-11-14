import { describe, it, expect } from 'vitest'
import { canControlSession, isActiveParticipant, sessionPhase } from './sessionPhase'

describe('sessionPhase', () => {
  const now = Date.parse('2026-11-14T18:00:00Z')

  it('ohne ends_at läuft die Challenge', () => {
    expect(sessionPhase({ ends_at: null }, now)).toBe('running')
  })

  it('ends_at in der Vergangenheit = beendet', () => {
    expect(sessionPhase({ ends_at: '2026-11-14T17:59:59Z' }, now)).toBe('ended')
  })

  it('ends_at genau jetzt = beendet', () => {
    expect(sessionPhase({ ends_at: '2026-11-14T18:00:00Z' }, now)).toBe('ended')
  })

  it('ends_at in der Zukunft (späteres Zeitlimit) = läuft noch', () => {
    expect(sessionPhase({ ends_at: '2026-11-14T19:00:00Z' }, now)).toBe('running')
  })
})

describe('isActiveParticipant', () => {
  it('ohne left_at aktiv, mit left_at nicht', () => {
    expect(isActiveParticipant({ left_at: null })).toBe(true)
    expect(isActiveParticipant({ left_at: '2026-11-14T18:00:00Z' })).toBe(false)
  })
})

describe('canControlSession', () => {
  const session = { host_id: 'host', shared_control: true }
  const active = { left_at: null }
  const left = { left_at: '2026-11-14T18:00:00Z' }

  it('der Host darf immer steuern', () => {
    expect(canControlSession({ ...session, shared_control: false }, 'host', null)).toBe(true)
  })

  it('mit shared_control darf jedes aktive Mitglied steuern', () => {
    expect(canControlSession(session, 'anna', active)).toBe(true)
  })

  it('ohne shared_control nur der Host', () => {
    expect(canControlSession({ ...session, shared_control: false }, 'anna', active)).toBe(false)
  })

  it('wer verlassen hat oder nicht dabei ist, darf nicht steuern', () => {
    expect(canControlSession(session, 'anna', left)).toBe(false)
    expect(canControlSession(session, 'anna', null)).toBe(false)
  })
})
