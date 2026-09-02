create extension if not exists pgcrypto;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  diagram_url text not null,
  diagram_width integer not null check (diagram_width > 0),
  diagram_height integer not null check (diagram_height > 0),
  created_at timestamptz not null default now()
);

create table public.defects (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  x double precision not null check (x >= 0),
  y double precision not null check (y >= 0),
  defect_type text not null check (defect_type in (
    'scratch','crack','misalignment','solder_bridge','missing_component','unknown'
  )),
  severity text check (severity in ('low','med','high')),
  note text,
  resolved boolean not null default false,
  source text not null default 'human' check (source in ('human','agent')),
  suggested_defect_type text check (suggested_defect_type in (
    'scratch','crack','misalignment','solder_bridge','missing_component','unknown'
  )),
  suggested_severity text check (suggested_severity in ('low','med','high')),
  suggestion_note text,
  suggestion_status text not null default 'none' check (suggestion_status in ('none','pending','accepted','rejected')),
  created_at timestamptz not null default now()
);

create index defects_product_id_idx on public.defects(product_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('product','shift','batch')),
  product_id uuid references public.products(id) on delete set null,
  shift_id text,
  product_ids uuid[],
  summary jsonb not null,
  pass_fail text check (pass_fail in ('pass','fail')),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.defects  enable row level security;
alter table public.reports  enable row level security;

create policy "public read products"   on public.products for select using (true);
create policy "public insert products" on public.products for insert with check (true);
create policy "public update products" on public.products for update using (true) with check (true);

create policy "public read defects"    on public.defects for select using (true);
create policy "public insert defects"  on public.defects for insert with check (true);
create policy "public update defects"  on public.defects for update using (true) with check (true);

create policy "public read reports"    on public.reports for select using (true);
create policy "public insert reports"  on public.reports for insert with check (true);
