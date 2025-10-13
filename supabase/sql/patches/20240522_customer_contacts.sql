-- Patch to ensure the customer_contacts table and policies exist

create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.customer_contacts enable row level security;

drop policy if exists "contacts_owner_crud" on public.customer_contacts;
create policy "contacts_owner_crud" on public.customer_contacts
for all
using (
  exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and (c.owner_id = auth.uid() or public.is_admin(auth.uid()))
  )
)
with check (
  exists (
    select 1
    from public.customers c
    where c.id = customer_id
      and (c.owner_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "contacts_admin_all" on public.customer_contacts;
create policy "contacts_admin_all" on public.customer_contacts
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
