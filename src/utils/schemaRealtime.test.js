import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Supabase schema realtime publication', () => {
  it('adds Values and WIKI tables to supabase_realtime idempotently', () => {
    const schema = readFileSync('supabase/schema.sql', 'utf8');

    expect(schema).toMatch(/pg_publication_tables/i);
    expect(schema).toMatch(/pubname\s*=\s*'supabase_realtime'/i);
    expect(schema).toMatch(/alter publication supabase_realtime add table public\.value_entries/i);
    expect(schema).toMatch(/alter publication supabase_realtime add table public\.unit_wiki_overrides/i);
  });
});
