import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

// Client immer erzeugen (mit Platzhaltern, falls unkonfiguriert), damit die App
// startet und eine hilfreiche Meldung zeigen kann, statt mit weißem Bildschirm
// am Import zu scheitern. Die eigentliche Prüfung erfolgt in ensureAnonymousSession().
export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)

// Laufende Anmeldung, modulweit geteilt. Ohne diese Deduplizierung starten zwei
// gleichzeitige Aufrufe (z.B. der doppelte Effekt-Lauf unter React StrictMode) je ein
// signInAnonymously() → zwei anonyme User. supabase-js schickt dann das JWT des einen,
// der React-State hält die user_id des anderen, und Inserts mit user_id = auth.uid()
// (z.B. participants_insert) scheitern mit 403.
let pending: Promise<string> | null = null

/**
 * Stellt sicher, dass das Gerät anonym angemeldet ist, und gibt die user_id zurück.
 * Ohne klassischen Login bekommt jedes Gerät so eine stabile Identität (auth.uid()),
 * mit der RLS-Policies die Rechte durchsetzen können.
 */
export function ensureAnonymousSession(): Promise<string> {
  if (!pending) {
    pending = bootstrapAnonymousSession().catch((err: unknown) => {
      // Fehler nicht cachen – ein neuer Versuch darf wieder anlaufen.
      pending = null
      throw err
    })
  }
  return pending
}

async function bootstrapAnonymousSession(): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase ist nicht konfiguriert. Lege eine .env-Datei nach dem Vorbild von .env.example an ' +
        '(VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY) – siehe README.',
    )
  }
  const { data } = await supabase.auth.getSession()
  if (data.session?.user) {
    return data.session.user.id
  }
  const { data: signed, error } = await supabase.auth.signInAnonymously()
  if (error || !signed.user) {
    throw error ?? new Error('Anonyme Anmeldung fehlgeschlagen.')
  }
  return signed.user.id
}
