-- Seed profiler för definierade användare om de finns i auth.users
insert into public.profiles (id, email, name, role)
select u.id, u.email, split_part(u.email, '@', 1), case u.email
  when 'oliver.bentzer@nilsahlgren.se' then 'ADMIN'
  when 'info@dovas.se' then 'STANGSEL'
  else 'SKRUV'
end
from auth.users u
where u.email in ('oliver.bentzer@nilsahlgren.se', 'info@dovas.se', 'oskar.tylebrink@nilsahlgren.se')
on conflict (id) do nothing;

-- Seed kunder
with owner as (
  select id from public.profiles where role = 'SKRUV' limit 1
)
insert into public.customers (owner_id, name, org_number, address_line, postal_code, city, email, phone, notes)
select owner.id,
       name,
       org_number,
       address_line,
       postal_code,
       city,
       email,
       phone,
       notes
from owner,
(values
  ('SAS', '556606-8499', 'Frösundaviks allé 1', '169 70', 'Solna', 'inkop@sas.se', '+46 8 797 00 00', 'Flygbolag – behov av specialskruv.'),
  ('Skyllberg Fastening', '556041-3781', 'Industrigatan 4', '696 74', 'Skyllberg', 'info@skyfast.se', '+46 582 120 10', 'Prioriterad kund med regelbundna beställningar.'),
  ('Dovas Bygg', '559102-3947', 'Hornsgatan 72', '118 21', 'Stockholm', 'info@dovas.se', '+46 8 555 55 555', 'Stängselprojekt planerat till hösten.'),
  ('Nils Ahlgren AB', '556045-0667', 'Västberga Allé 61', '126 30', 'Hägersten', 'info@nilsahlgren.se', '+46 8 19 25 00', 'Moderbolag.')
) as c(name, org_number, address_line, postal_code, city, email, phone, notes)
on conflict do nothing;

-- Seed nyheter
insert into public.news_items (slug, title, content, author_id, categories, pinned)
values
('qs1-release', 'Quickstart v1', 'Snabbstart för **Säljstöd NA** är live!', (select id from public.profiles where email='oliver.bentzer@nilsahlgren.se' limit 1), ARRAY['release','uppdatering'], true),
('q3-kampanj', 'Q3 kampanj', 'Nya kampanjer för stängsel är igång.', (select id from public.profiles where email='oliver.bentzer@nilsahlgren.se' limit 1), ARRAY['kampanj'], false),
('tips', 'Säljtips', 'Kom ihåg att logga besök och följ upp i tid.', (select id from public.profiles where email='oliver.bentzer@nilsahlgren.se' limit 1), ARRAY['tips'], false)
on conflict do nothing;

-- Seed rapporter kopplade till kunder
with owner as (
  select id from public.profiles where role = 'SKRUV' limit 1
)
insert into public.visit_reports (owner_id, customer_id, title, customer, customer_address, customer_postal_code, customer_city, customer_email, customer_phone, location, visit_date, attendees, notes, status, next_step, next_step_due, tags)
select owner.id,
       customer_id,
       title,
       customer_name,
       address_line,
       postal_code,
       city,
       email,
       phone,
       address_line,
       now() - (random()*30 || ' days')::interval,
       attendees,
       notes,
       status,
       next_step,
       now()::date + (g%4),
       tags
from owner,
(select * from (
  values
    ((select id from public.customers where name='SAS' limit 1), 'Offertmöte', 'SAS', 'Anna, Kalle', 'Diskuterade offertens villkor.', 'Öppet', 'Skicka reviderad offert', ARRAY['offert']),
    ((select id from public.customers where name='Skyllberg Fastening' limit 1), 'Projektstart', 'Skyllberg Fastening', 'Oskar', 'Genomgång av projektplan.', 'Öppet', 'Boka uppföljning', ARRAY['projekt']),
    ((select id from public.customers where name='Dovas Bygg' limit 1), 'Uppföljning', 'Dovas Bygg', 'Oliver', 'Avstämning kring leverans.', 'Vann', 'Skicka tackmail', ARRAY['uppföljning']),
    ((select id from public.customers where name='Nils Ahlgren AB' limit 1), 'Avslut', 'Nils Ahlgren AB', 'Team', 'Kund valde annan leverantör.', 'Förlorat', 'Stäng ärende', ARRAY['retro'])
) as t(customer_id, title, customer_name, attendees, notes, status, next_step, tags)) s,
generate_series(1, 2) g
cross join lateral (
  select address_line, postal_code, city, email, phone
  from public.customers c where c.id = s.customer_id limit 1
) customer_details
on conflict do nothing;
