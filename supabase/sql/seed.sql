-- Seed profiler för definierade användare om de finns i auth.users
insert into public.profiles (id, email, name, role)
select u.id, u.email, split_part(u.email, '@', 1), case u.email
  when 'oliver.bentzer@nilsahlgren.se' then 'ADMIN'
  else 'SELLER'
end
from auth.users u
where u.email in ('oliver.bentzer@nilsahlgren.se', 'info@dovas.se', 'oskar.tylebrink@nilsahlgren.se')
on conflict (id) do nothing;

-- Seed nyheter
insert into public.news_items (slug, title, content, author_id, categories, pinned)
values
('qs1-release', 'Quickstart v1', 'Snabbstart för **Säljstöd NA** är live!', (select id from public.profiles where email='oliver.bentzer@nilsahlgren.se' limit 1), ARRAY['release','uppdatering'], true),
('q3-kampanj', 'Q3 kampanj', 'Nya kampanjer för stängsel är igång.', (select id from public.profiles where email='oliver.bentzer@nilsahlgren.se' limit 1), ARRAY['kampanj'], false),
('tips', 'Säljtips', 'Kom ihåg att logga besök och följ upp i tid.', (select id from public.profiles where email='oliver.bentzer@nilsahlgren.se' limit 1), ARRAY['tips'], false)
on conflict do nothing;

-- Seed rapporter (första SELLER eller ADMIN)
with owner as (
  select id from public.profiles order by role='ADMIN' desc limit 1
)
insert into public.visit_reports (owner_id, title, customer, location, visit_date, attendees, notes, status, next_step, next_step_due, tags)
select owner.id, title, customer, location, now() - (random()*30 || ' days')::interval, attendees, notes, status, next_step, now()::date + (g%4), tags
from owner,
(select * from (values
('Offertmöte', 'SAS', 'Arlanda', 'Anna, Kalle', 'Diskuterade offertens villkor.', 'Öppet', 'Skicka reviderad offert', now()::date + 3, ARRAY['offert']),
('Projektstart', 'Skyllberg Fastening', 'Askersund', 'Oskar', 'Genomgång av projektplan.', 'Öppet', 'Boka uppföljning', now()::date + 7, ARRAY['projekt']),
('Uppföljning', 'Dovas Bygg', 'Södermalm', 'Oliver', 'Avstämning kring leverans.', 'Vann', 'Skicka tackmail', now()::date + 2, ARRAY['uppföljning']),
('Avslut', 'Nils Ahlgren AB', 'Västberga', 'Team', 'Kund valde annan leverantör.', 'Förlorat', 'Stäng ärende', null, ARRAY['retro'])
) as t(title, customer, location, attendees, notes, status, next_step, next_step_due, tags)) s,
generate_series(1, 2) g
on conflict do nothing;
