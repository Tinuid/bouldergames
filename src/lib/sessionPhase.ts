import type { Participant, Session } from '../types'

// Phase einer Challenge – EINE Stelle, die Banner, Lesemodus, Menü und Listen fragen.
//
// Das Spielende hängt allein an `sessions.ends_at` (Migration 0023): „Challenge beenden“
// setzt die Serverzeit, „Wieder öffnen“ null. Ein späteres Zeitlimit (Time Attack)
// setzt dort einen Zeitpunkt in der Zukunft – darum ist es ein Zeitpunkt statt eines
// Flags. Die Spalte `sessions.status` ('active'/'archived') bleibt ungenutzt.
//
// Achtung Uhrzeit: verglichen wird mit der Geräte-Uhr. Geht sie nach, wirkt eine gerade
// beendete Challenge kurz noch offen – der Server lehnt Einträge trotzdem ab
// (Trigger trg_results_session_open, Fehlercode BCEND).

export type SessionPhase = 'running' | 'ended'

export function sessionPhase(
  session: Pick<Session, 'ends_at'>,
  now: number = Date.now(),
): SessionPhase {
  if (session.ends_at == null) return 'running'
  return Date.parse(session.ends_at) <= now ? 'ended' : 'running'
}

// Teilnehmer, der die Challenge nicht verlassen hat (left_at, Migration 0023).
export function isActiveParticipant(p: Pick<Participant, 'left_at'>): boolean {
  return p.left_at == null
}

// Darf dieses Gerät die Challenge steuern (beenden/wieder öffnen)? Spiegelt die
// SQL-Funktion can_control_session: Host ODER (aktives Mitglied UND shared_control).
export function canControlSession(
  session: Pick<Session, 'host_id' | 'shared_control'>,
  userId: string | null,
  myParticipant: Pick<Participant, 'left_at'> | null,
): boolean {
  if (userId != null && session.host_id === userId) return true
  return session.shared_control && myParticipant != null && isActiveParticipant(myParticipant)
}
