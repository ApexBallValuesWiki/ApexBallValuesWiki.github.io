-- Run this once if Supabase still has policies from an older/partial schema.
-- This removes every policy on the tables managed by schema.sql.

begin;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where (schemaname = 'public' and tablename in (
      'admin_users', 'value_entries', 'value_change_log',
      'unit_wiki_overrides', 'wiki_change_log', 'fanart_entries',
      'bug_reports', 'map_wiki_overrides', 'crate_wiki_overrides'
    ))
       or (schemaname = 'storage' and tablename = 'objects')
  loop
    execute format('drop policy if exists %I on %I.%I',
      policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end $$;

commit;

-- Then run the corrected schema.sql once.
