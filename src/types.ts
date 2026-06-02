// Domänen-Typen, passend zum Postgres-Schema (supabase/migrations/0001_init.sql).

export type ResultStatus = 'open' | 'flash' | 'top' | 'fail'

// Spielmodus:
//  'classic'    – feste Punkte (Flash/Top minus Versuchskosten), Grad ist nur Info.
//  'multiplier' – der Schwierigkeitsgrad multipliziert das klassische Ergebnis
//                 (z.B. Flash auf Grad 4 = (flashPoints − Kosten) × 4). Grad ist Pflicht.
export type ScoringMode = 'classic' | 'multiplier'

export interface ScoringConfig {
  mode: ScoringMode
  flashPoints: number
  topPoints: number
  attemptCost: number
  // Wenn true: Top & Flash kosten keine Punkte – nur nicht erfolgreiche Versuche.
  freeSuccess?: boolean
}

export const DEFAULT_SCORING: ScoringConfig = {
  mode: 'classic',
  flashPoints: 30,
  topPoints: 25,
  attemptCost: 5,
  freeSuccess: false,
}

export interface Session {
  id: string
  join_code: string
  name: string
  host_id: string
  scoring_mode: ScoringMode
  flash_points: number
  top_points: number
  attempt_cost: number
  free_success: boolean
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
  // Objekt-Pfad im Storage-Bucket 'boulder-images' (nicht die volle URL), z.B.
  // "<user_id>/<uuid>.jpg". null = kein Bild. Siehe src/lib/images.ts.
  image_path: string | null
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
    mode: s.scoring_mode ?? 'classic',
    flashPoints: s.flash_points,
    topPoints: s.top_points,
    attemptCost: s.attempt_cost,
    freeSuccess: s.free_success,
  }
}
