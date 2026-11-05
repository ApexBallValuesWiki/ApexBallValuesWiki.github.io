import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { TEAM_MEMBERS, getTeamMember, getDisplayName } from './teamMembers';

// The worker is the authentication source of truth. This test fails the build
// if the two rosters ever drift again (the exact bug found during the audit).
const workerSource = readFileSync(
  new URL('../../scripts/cloudflare-proxy-worker.js', import.meta.url),
  'utf8',
);

function workerRoster() {
  const match = workerSource.match(/const TEAM_ROLES = \{([\s\S]*?)\n\};/);
  if (!match) throw new Error('TEAM_ROLES block not found in worker');
  const roles = {};
  const entry = /'([^']+@[^']+)'\s*:\s*'([^']+)'/g;
  let found;
  while ((found = entry.exec(match[1]))) roles[found[1]] = found[2];
  return roles;
}

describe('team roster', () => {
  it('mirrors the worker TEAM_ROLES exactly', () => {
    const worker = workerRoster();
    const client = Object.fromEntries(
      Object.entries(TEAM_MEMBERS).map(([email, member]) => [email, member.roleKey]),
    );
    expect(client).toEqual(worker);
  });

  it('registers Moonlight as a least-privilege editor', () => {
    const member = getTeamMember('mnlghtapexhelper@gmail.com');
    expect(member.name).toBe('Moonlight');
    expect(member.roleKey).toBe('editor');
    expect(getDisplayName('mnlghtapexhelper@gmail.com')).toContain('Moonlight');
  });

  it('re-registers Nose as a least-privilege editor', () => {
    const worker = workerRoster();
    expect(worker['destroyha3@gmail.com']).toBe('editor');
    const member = getTeamMember('destroyha3@gmail.com');
    expect(member.name).toBe('Nose');
    expect(member.roleKey).toBe('editor');
  });

  it('keeps credentials out of both rosters', () => {
    const block = workerSource.match(/const TEAM_ROLES = \{([\s\S]*?)\n\};/)?.[1] || '';
    expect(block).not.toMatch(/\b(passcode|password|secret)\s*:/i);
    expect(JSON.stringify(TEAM_MEMBERS)).not.toMatch(/\b(passcode|password|secret)\s*:/i);
  });
});
