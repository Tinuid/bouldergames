-- Boulder Challenges – Lösch-Passwort gehasht statt Klartext speichern
-- Ausführen im Supabase SQL-Editor. Idempotent.
--
-- Bisher (0007) lag das Lösch-Passwort als KLARTEXT in app_config.value und die
-- RPG verglich per Stringgleichheit. Diese Migration stellt auf einen bcrypt-Hash
-- (pgcrypto crypt/gen_salt) um: in app_config steht künftig nur noch der Hash, der
-- Vergleich läuft über crypt(p_key, hash) = hash. Der Client schickt weiterhin das
-- Klartext-Passwort an die security-definer-RPC (Signatur unverändert).

-- pgcrypto stellt crypt()/gen_salt() bereit. Auf Supabase liegt es im Schema
-- "extensions"; das if-not-exists macht den erneuten Lauf zum No-Op.
create extension if not exists pgcrypto with schema extensions;

-- Feedback löschen – nur mit korrektem Passwort. Vergleich jetzt gegen den in
-- app_config hinterlegten bcrypt-HASH. Ohne gesetztes Passwort (stored is null)
-- bleibt Löschen gesperrt. search_path enthält "extensions", damit crypt()
-- innerhalb der security-definer-Funktion auflösbar ist.
create or replace function public.delete_feedback(p_id uuid, p_key text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  stored text;
begin
  select value into stored from public.app_config where key = 'feedback_admin_key';
  if p_key is null or stored is null or crypt(p_key, stored) <> stored then
    raise exception 'Falsches Passwort' using errcode = '28000';
  end if;
  delete from public.feedback where id = p_id;
end;
$$;

-- Nur Angemeldete dürfen die Funktion aufrufen (anonyme Auth = Rolle authenticated).
revoke execute on function public.delete_feedback(uuid, text) from public;
grant execute on function public.delete_feedback(uuid, text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- WICHTIG: Ein evtl. aus 0007 noch im KLARTEXT gespeichertes Passwort matcht nach
-- dieser Umstellung NICHT mehr. Passwort daher einmalig GEHASHT (neu) setzen –
-- PASSWORT ersetzen:
--
--   insert into public.app_config (key, value)
--   values ('feedback_admin_key', extensions.crypt('DEIN-LOESCH-PASSWORT', extensions.gen_salt('bf')))
--   on conflict (key) do update set value = excluded.value;
--
-- Dieses Passwort wird in der App beim ersten Löschen abgefragt (pro Sitzung im
-- Speicher gemerkt, NICHT auf dem Gerät persistiert).
-- ────────────────────────────────────────────────────────────────────────────
