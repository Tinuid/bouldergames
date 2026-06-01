// Domänen-Typen, passend zum Postgres-Schema (supabase/migrations/0001_init.sql).

export type ResultStatus = 'open' | 'flash' | 'top' | 'fail'

export interface ScoringConfig {
  flashPoints: number
  topPoints: number
  attemptCost: number
}

export const DEFAULT_SCORING: ScoringConfig = {
  flashPoints: 30,
  topPoints: 25,
  attemptCost: 5,
}

export interface Session {
  id: string
  join_code: string
  name: string
  host_id: string
  flash_points: number
  top_points: number
  attempt_cost: number
  status: 'active' | 'archived'
  created_at: string
}

export interface Participant {
  id: string
  session_id: string
  user_id: string
  display_name: string
  color: string | null
  joined_at: string
}

export interface Boulder {
  id: string
  session_id: string
  seq: number
  difficulty: number | null
  color: string | null
  created_by: string
  created_at: string
}

export interface Result {
  id: string
  session_id: string
  boulder_id: string
  participant_id: string
  status: ResultStatus
  attempts: number
  points: number
  updated_at: string
}

// Hilfs-Mapper: Session-Datensatz -> ScoringConfig
export function scoringFromSession(s: Session): ScoringConfig {
  return {
    flashPoints: s.flash_points,
    topPoints: s.top_points,
    attemptCost: s.attempt_cost,
  }
}
