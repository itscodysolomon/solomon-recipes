-- Per-day notes on meal plan entries (e.g. which side to serve)
alter table public.plan_entries
  add column if not exists notes text not null default '';
