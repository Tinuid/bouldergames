// Edge Function: cleanup-stale-sessions
//
// Räumt verwaiste Sessions auf. Der DB-Teil (Sessions + abhängige Zeilen löschen)
// steckt in der security-definer-RPC cleanup_stale_sessions() (siehe
// supabase/migrations/0012_session_cleanup.sql); die RPC gibt die image_path's der
// gelöschten Boulder zurück, die hier aus dem Storage-Bucket 'boulder-images'
// entfernt werden – der Cascade in der DB räumt den Storage NICHT mit.
//
// Aufruf per Cron (Supabase Cron oder pg_cron + pg_net), siehe CLAUDE.md. Geschützt
// über ein gemeinsames Secret CLEANUP_SECRET (Authorization: Bearer <secret>), da die
// Function mit --no-verify-jwt deployed wird (Cron hat kein User-JWT).
//
// Deploy:  supabase functions deploy cleanup-stale-sessions --no-verify-jwt
// Secret:  supabase secrets set CLEANUP_SECRET=<langer-zufallswert>

import { createClient } from 'jsr:@supabase/supabase-js@2'

const BUCKET = 'boulder-images'
const BATCH_SIZE = 100

Deno.serve(async (req) => {
  // Zugriffsschutz: gemeinsames Secret prüfen.
  const expected = Deno.env.get('CLEANUP_SECRET')
  const provided = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // service-role-Client (umgeht RLS, darf beliebige Storage-Objekte löschen).
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // DB-Teil: verwaiste Sessions löschen, Bildpfade zurückbekommen.
  const { data: paths, error } = await supabase.rpc('cleanup_stale_sessions')
  if (error) {
    console.error('cleanup_stale_sessions RPC fehlgeschlagen:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const imagePaths: string[] = paths ?? []
  let storageErrors = 0

  // Storage-Teil: zugehörige Fotos batchweise entfernen. Fehler sind nicht fatal –
  // ein verwaistes Objekt im öffentlichen Bucket ist unkritisch (vgl. deleteBoulderImage).
  for (let i = 0; i < imagePaths.length; i += BATCH_SIZE) {
    const batch = imagePaths.slice(i, i + BATCH_SIZE)
    const { error: rmError } = await supabase.storage.from(BUCKET).remove(batch)
    if (rmError) {
      storageErrors += batch.length
      console.error('Storage-remove fehlgeschlagen für Batch:', rmError)
    }
  }

  const summary = { deletedImages: imagePaths.length, storageErrors }
  console.log('cleanup-stale-sessions:', summary)
  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
