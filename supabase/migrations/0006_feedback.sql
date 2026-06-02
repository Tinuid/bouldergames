-- Boulder Challenges – Feedback der Nutzer
-- Ausführen im Supabase SQL-Editor. Idempotent.
--
-- Sammelt freies Feedback (Name + Text), das über den Knopf auf der Startseite
-- abgeschickt wird. Bewusst eigenständig: keine Bindung an eine Session.
-- Sichtbarkeit: jeder Angemeldete darf EINFÜGEN und LESEN (öffentliche Liste in
-- der App). LÖSCHEN geht NICHT direkt – nur über die passwortgeschützte RPC
-- delete_feedback (siehe 0007_feedback_admin.sql), darum hier keine delete-Policy.

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id),
  name       text not null default 'Anonym',
  message    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_created on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Einfügen für alle Angemeldeten; user_id muss die eigene Identität sein.
drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback
  for insert to authenticated with check (user_id = auth.uid());

-- Lesen für alle Angemeldeten (öffentliche Feedback-Liste in der App).
drop policy if exists feedback_select on public.feedback;
create policy feedback_select on public.feedback
  for select to authenticated using (true);
