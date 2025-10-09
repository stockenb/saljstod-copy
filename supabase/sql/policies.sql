-- Enable RLS
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.visit_reports enable row level security;
alter table public.attachments enable row level security;
alter table public.news_items enable row level security;
alter table public.news_reads enable row level security;
alter table public.audit_logs enable row level security;

-- Helper function to check admin
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role = 'ADMIN');
$$;

-- profiles policies
drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
for select
using (public.is_admin(auth.uid()));

-- visit_reports policies
drop policy if exists "reports_owner_crud" on public.visit_reports;
create policy "reports_owner_crud" on public.visit_reports
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "reports_admin_all" on public.visit_reports;
create policy "reports_admin_all" on public.visit_reports
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- customers policies
drop policy if exists "customers_owner_crud" on public.customers;
create policy "customers_owner_crud" on public.customers
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "customers_admin_all" on public.customers;
create policy "customers_admin_all" on public.customers
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- attachments: follow report ownership/admin
drop policy if exists "attachments_rel" on public.attachments;
create policy "attachments_rel" on public.attachments
for all
using (exists (select 1 from public.visit_reports r where r.id = report_id and (r.owner_id = auth.uid() or public.is_admin(auth.uid()))))
with check (exists (select 1 from public.visit_reports r where r.id = report_id and (r.owner_id = auth.uid() or public.is_admin(auth.uid()))));

-- news_items
drop policy if exists "news_read_all" on public.news_items;
create policy "news_read_all" on public.news_items
for select
to authenticated
using (true);

drop policy if exists "news_write_admin" on public.news_items;
create policy "news_write_admin" on public.news_items
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- news_reads (user can read/write own)
drop policy if exists "reads_own" on public.news_reads;
create policy "reads_own" on public.news_reads
for select
using (user_id = auth.uid());

drop policy if exists "reads_upsert_own" on public.news_reads;
create policy "reads_upsert_own" on public.news_reads
for insert with check (user_id = auth.uid());
create policy "reads_update_own" on public.news_reads
for update using (user_id = auth.uid());

-- audit_logs
drop policy if exists "audit_insert_all" on public.audit_logs;
create policy "audit_insert_all" on public.audit_logs
for insert to authenticated with check (true);

drop policy if exists "audit_admin_select" on public.audit_logs;
create policy "audit_admin_select" on public.audit_logs
for select using (public.is_admin(auth.uid()));
