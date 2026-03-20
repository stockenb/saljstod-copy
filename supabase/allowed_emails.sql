-- ─── Whitelist-tabell för godkända användare ─────────────────────────────────
-- Kör detta i Supabase → SQL Editor

create table if not exists public.allowed_emails (
  id   uuid primary key default gen_random_uuid(),
  email text not null unique,
  note  text,                          -- valfri kommentar, t.ex. "Säljare Stockholm"
  created_at timestamptz default now()
);

-- Aktivera Row Level Security
alter table public.allowed_emails enable row level security;

-- Tillåt inloggade användare att läsa sin egen post (används av middleware)
create policy "Authenticated users can read allowed_emails"
  on public.allowed_emails
  for select
  to authenticated
  using (true);

-- Exempel: Lägg till godkända e-postadresser
-- insert into public.allowed_emails (email, note) values
--   ('fornamn@nilsahlgren.se', 'Säljare'),
--   ('chef@nilsahlgren.se', 'Säljchef');

-- Godkända användare
insert into public.allowed_emails (email, note) values
  ('oliver.bentzer@nilsahlgren.se', 'Whitelist')
on conflict (email) do nothing;
