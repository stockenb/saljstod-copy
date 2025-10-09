-- Extensions
create extension if not exists "pgcrypto";

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  role text check (role in ('ADMIN','SELLER')) not null default 'SELLER',
  created_at timestamptz default now()
);

-- visit_reports
create table if not exists public.visit_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  title text not null,
  customer text not null,
  location text,
  visit_date timestamptz not null,
  attendees text,
  notes text,
  status text check (status in ('Öppet','Vann','Förlorat')) default 'Öppet',
  next_step text,
  next_step_due date,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- attachments
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.visit_reports(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  mime_type text,
  size int,
  created_at timestamptz default now()
);

-- news_items
create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  content text not null,
  author_id uuid references public.profiles(id),
  published_at timestamptz not null default now(),
  categories text[] default '{}',
  pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- news_reads
create table if not exists public.news_reads (
  user_id uuid references public.profiles(id) on delete cascade,
  news_id uuid references public.news_items(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (user_id, news_id)
);

-- audit_logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  created_at timestamptz default now()
);
