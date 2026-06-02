-- Boulder Challenges – passwortgeschütztes Löschen von Feedback
-- Ausführen im Supabase SQL-Editor. Idempotent.
--
-- Feedback ist öffentlich lesbar (siehe 0006), aber Löschen soll nicht jeder
-- können. Da die App keine Accounts hat, schützt ein geräteübergreifendes
-- Lösch-Passwort: es wird hier in app_config hinterlegt und von der
-- security-definer-Funktion delete_feedback() serverseitig geprüft. Nur mit dem
-- richtigen Passwort wird gelöscht – ein client-seitiger Check wäre umgehbar.

-- Schlüssel-/Konfigurationsspeicher: RLS an, aber KEINE Policy ⇒ für Clients
-- weder lesbar noch schreibbar. Nur Dashboard (Service-Role) und security-
-- definer-Funktionen kommen heran.
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);

alter table public.app_config enable row level security;

-- Feedback löschen – nur mit korrektem Passwort. security definer umgeht die
-- (bewusst fehlende) delete-Policy auf feedback; der Passwortvergleich ist die
-- eigentliche Grenze. Ohne gesetztes Passwort ist Löschen gesperrt.
create or replace function public.delete_feedback(p_id uuid, p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_key is null or p_key <> coalesce(
       (select value from public.app_config where key = 'feedback_admin_key'),
       '\x00-kein-schluessel-gesetzt'
     ) then
    raise exception 'Falsches Passwort' using errcode = '28000';
  end if;
  delete from public.feedback where id = p_id;
end;
$$;

-- Nur Angemeldete dürfen die Funktion aufrufen (anonyme Auth = Rolle authenticated).
revoke execute on function public.delete_feedback(uuid, text) from public;
grant execute on function public.delete_feedback(uuid, text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- EINMALIG ausführen und PASSWORT ersetzen (steht bewusst NICHT fest im Code):
--
--   insert into public.app_config (key, value)
--   values ('feedback_admin_key', 'DEIN-LOESCH-PASSWORT')
--   on conflict (key) do update set value = excluded.value;
--
-- Dieses Passwort wird in der App beim ersten Löschen abgefragt (pro Gerät gemerkt).
-- ────────────────────────────────────────────────────────────────────────────
