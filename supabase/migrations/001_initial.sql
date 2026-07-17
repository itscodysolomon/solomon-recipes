-- The Solomons Cook — initial schema
-- Run in Supabase SQL editor (or via CLI migration).

create extension if not exists "pgcrypto";

-- Households
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'The Solomons',
  created_at timestamptz not null default now()
);

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  household_id uuid references public.households (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Recipes (unified model)
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  notes text not null default '',
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  cook_time_minutes integer,
  servings integer default 4,
  photo_path text,
  favorite boolean not null default false,
  times_cooked integer not null default 0,
  last_cooked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_household_id_idx on public.recipes (household_id);
create index if not exists recipes_title_idx on public.recipes using gin (to_tsvector('english', title));

-- Meal plan entries (rolling days)
create table if not exists public.plan_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date date not null,
  recipe_id uuid references public.recipes (id) on delete set null,
  label text,
  created_at timestamptz not null default now(),
  unique (household_id, date)
);

create index if not exists plan_entries_household_date_idx
  on public.plan_entries (household_id, date);

-- Shopping list
create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  section text not null default 'Other',
  checked boolean not null default false,
  source_note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists shopping_items_household_id_idx
  on public.shopping_items (household_id);

-- Storage bucket for recipe photos
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict (id) do nothing;

-- Helpers
create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  -- First user creates the household; later users join the same household if only one exists.
  select id into hid from public.households order by created_at asc limit 1;
  if hid is null then
    insert into public.households (name) values ('The Solomons') returning id into hid;
  end if;

  insert into public.profiles (id, display_name, household_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Cook'),
    hid
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- RLS
alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.recipes enable row level security;
alter table public.plan_entries enable row level security;
alter table public.shopping_items enable row level security;

-- Profiles
create policy "Profiles: read own household"
  on public.profiles for select
  using (
    id = auth.uid()
    or household_id = public.current_household_id()
  );

create policy "Profiles: update own"
  on public.profiles for update
  using (id = auth.uid());

-- Households
create policy "Households: read own"
  on public.households for select
  using (id = public.current_household_id());

-- Recipes
create policy "Recipes: select household"
  on public.recipes for select
  using (household_id = public.current_household_id());

create policy "Recipes: insert household"
  on public.recipes for insert
  with check (household_id = public.current_household_id());

create policy "Recipes: update household"
  on public.recipes for update
  using (household_id = public.current_household_id());

create policy "Recipes: delete household"
  on public.recipes for delete
  using (household_id = public.current_household_id());

-- Plan
create policy "Plan: select household"
  on public.plan_entries for select
  using (household_id = public.current_household_id());

create policy "Plan: insert household"
  on public.plan_entries for insert
  with check (household_id = public.current_household_id());

create policy "Plan: update household"
  on public.plan_entries for update
  using (household_id = public.current_household_id());

create policy "Plan: delete household"
  on public.plan_entries for delete
  using (household_id = public.current_household_id());

-- Shopping
create policy "Shopping: select household"
  on public.shopping_items for select
  using (household_id = public.current_household_id());

create policy "Shopping: insert household"
  on public.shopping_items for insert
  with check (household_id = public.current_household_id());

create policy "Shopping: update household"
  on public.shopping_items for update
  using (household_id = public.current_household_id());

create policy "Shopping: delete household"
  on public.shopping_items for delete
  using (household_id = public.current_household_id());

-- Storage policies for recipe photos
create policy "Recipe photos: public read"
  on storage.objects for select
  using (bucket_id = 'recipe-photos');

create policy "Recipe photos: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'recipe-photos');

create policy "Recipe photos: authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'recipe-photos');

create policy "Recipe photos: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'recipe-photos');
