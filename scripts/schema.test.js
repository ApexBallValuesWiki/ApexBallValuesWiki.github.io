import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');

describe('supabase/schema.sql', () => {
  it('contains a well-formed admin_users insert (every row comma-separated)', () => {
    const match = schema.match(/insert into public\.admin_users \(email, role\) values([\s\S]*?)on conflict/);
    expect(match, 'admin_users insert block should exist').not.toBeNull();
    const block = match[1];
    const tuples = block.match(/\('[^']+',\s*'[^']+'\)/g);
    expect(tuples.length).toBeGreaterThanOrEqual(12);
  });

  it('seeds team members with correct roles', () => {
    const expected = {
      'gustavo.rb1410@gmail.com': 'owner',
      'bananatempest25@gmail.com': 'admin_plus',
      'treymurphy3rd@gmail.com': 'value_editor',
      'jiteaianis@gmail.com': 'wiki_editor',
      'gloomy302010@gmail.com': 'admin',
      'dakingnub@gmail.com': 'wiki_editor',
      'destroyha3@gmail.com': 'value_editor',
      'johnmustard129@gmail.com': 'wiki_editor',
      'alieldaw6@gmail.com': 'lead_wiki_editor',
      'hungryaistukas@gmail.com': 'value_editor',
      'luquitas290414@gmail.com': 'wiki_editor',
      'hellfiregamingytt@gmail.com': 'value_editor',
    };
    for (const [email, role] of Object.entries(expected)) {
      expect(schema).toContain(`('${email}', '${role}')`);
    }
  });

  it('does NOT define the old public-read policies on the log tables (email leak)', () => {
    expect(schema).not.toMatch(/create policy "public read value logs"/);
    expect(schema).not.toMatch(/create policy "public read wiki logs"/);
  });

  it('defines the email-masking views', () => {
    expect(schema).toContain('value_change_log_public');
    expect(schema).toContain('wiki_change_log_public');
    expect(schema).toContain('case when public.is_owner()');
  });

  it('defines the author-enforcement trigger (no log spoofing)', () => {
    expect(schema).toContain('enforce_change_log_author');
    expect(schema).toContain('NEW.changed_by := auth.uid()');
  });
});
