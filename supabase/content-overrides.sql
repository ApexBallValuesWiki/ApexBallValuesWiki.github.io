-- APEX WIKI content overrides: maps and crates
-- Run this after schema.sql in the Supabase SQL editor.
-- The role helper public.is_wiki_editor() is created by schema.sql.

create table if not exists public.map_wiki_overrides (
  slug text primary key,
  name text,
  description text,
  difficulty text,
  unlock_requirement text,
  image_url text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.crate_wiki_overrides (
  slug text primary key,
  name text,
  description text,
  image_url text,
  chances jsonb not null default '{}'::jsonb,
  obtain text,
  effect text,
  base_value numeric,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.map_wiki_overrides enable row level security;
alter table public.crate_wiki_overrides enable row level security;

-- Public visitors can read published content. WIKI editors can manage it.
drop policy if exists "public read map overrides" on public.map_wiki_overrides;
create policy "public read map overrides" on public.map_wiki_overrides
for select to anon, authenticated using (true);
drop policy if exists "wiki editors insert map overrides" on public.map_wiki_overrides;
create policy "wiki editors insert map overrides" on public.map_wiki_overrides
for insert to authenticated with check (public.is_wiki_editor());
drop policy if exists "wiki editors update map overrides" on public.map_wiki_overrides;
create policy "wiki editors update map overrides" on public.map_wiki_overrides
for update to authenticated using (public.is_wiki_editor()) with check (public.is_wiki_editor());
drop policy if exists "wiki editors delete map overrides" on public.map_wiki_overrides;
create policy "wiki editors delete map overrides" on public.map_wiki_overrides
for delete to authenticated using (public.is_wiki_editor());

drop policy if exists "public read crate overrides" on public.crate_wiki_overrides;
create policy "public read crate overrides" on public.crate_wiki_overrides
for select to anon, authenticated using (true);
drop policy if exists "wiki editors insert crate overrides" on public.crate_wiki_overrides;
create policy "wiki editors insert crate overrides" on public.crate_wiki_overrides
for insert to authenticated with check (public.is_wiki_editor());
drop policy if exists "wiki editors update crate overrides" on public.crate_wiki_overrides;
create policy "wiki editors update crate overrides" on public.crate_wiki_overrides
for update to authenticated using (public.is_wiki_editor()) with check (public.is_wiki_editor());
drop policy if exists "wiki editors delete crate overrides" on public.crate_wiki_overrides;
create policy "wiki editors delete crate overrides" on public.crate_wiki_overrides
for delete to authenticated using (public.is_wiki_editor());

alter table public.map_wiki_overrides replica identity full;
alter table public.crate_wiki_overrides replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'map_wiki_overrides') then
    alter publication supabase_realtime add table public.map_wiki_overrides;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crate_wiki_overrides') then
    alter publication supabase_realtime add table public.crate_wiki_overrides;
  end if;
end $$;

-- Reuse the existing public unit-images bucket for all WIKI imagery.
-- Object paths are namespaced as maps/<slug>.webp and crates/<slug>.webp.
