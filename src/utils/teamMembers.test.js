import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROLE_CAPS, TEAM_MEMBERS, getTeamMember, getTeamRole, roleCan } from './teamMembers';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// The app roster (gates Create/Delete/Values) and the worker roster (authorises
// writes) used to drift apart: editors passed login, then every create and
// delete silently did nothing because the two role lists disagreed. These tests
// keep them pinned to the same nine people.

function workerRoster() {
  const src = readFileSync(join(ROOT, 'scripts/cloudflare-proxy-worker.js'), 'utf8');
  const block = src.match(/const TEAM_ROLES = \{([\s\S]*?)\n\};/);
  if (!block) throw new Error('TEAM_ROLES block not found in the worker');
  return Object.fromEntries([...block[1].matchAll(/'([^']+)':\s*'(\w+)'/g)].map((m) => [m[1], m[2]]));
}

describe('APEX team roster', () => {
  it('has exactly the current team', () => {
    expect(Object.keys(TEAM_MEMBERS)).toEqual([
      'gustavo.rb1410@gmail.com',
      'bananatempest25@gmail.com',
      'treymurphy3rd@gmail.com',
      'johnmustard129@gmail.com',
      'destroyha3@gmail.com',
      'gloomy302010@gmail.com',
      'alieldaw6@gmail.com',
      'hungryaistukas@gmail.com',
      'luquitas290414@gmail.com',
    ]);
  });

  it('matches the KV worker roster exactly', () => {
    expect(TEAM_MEMBERS).toEqual(workerRoster());
  });

  it('only uses roles the capability map knows', () => {
    for (const role of Object.values(TEAM_MEMBERS)) {
      expect(ROLE_CAPS[role], `role ${role} has no capability entry`).toBeDefined();
      expect(Array.isArray(ROLE_CAPS[role])).toBe(true);
    }
  });

  it('resolves roles case- and whitespace-insensitively', () => {
    expect(getTeamRole('  GustaVo.Rb1410@gmail.com  ')).toBe('owner');
    expect(getTeamRole('nobody@example.com')).toBeNull();
    expect(getTeamRole('')).toBeNull();
  });

  it('grants owners and admins the full toolset, editors values only', () => {
    expect(ROLE_CAPS.owner).toEqual(['values', 'wiki', 'fanart']);
    expect(ROLE_CAPS.admin).toEqual(['values', 'wiki', 'fanart']);
    expect(ROLE_CAPS.editor).toEqual(['values']);
    expect(roleCan('editor', 'wiki')).toBe(false);
    expect(roleCan('admin', 'wiki')).toBe(true);
  });

  it('never invents a display name for someone off the roster', () => {
    expect(getTeamMember('nobody@example.com').role).toBeNull();
    expect(getTeamMember('gustavo.rb1410@gmail.com').roleLabel).toBe('Owner');
    expect(getTeamMember('gustavo.rb1410@gmail.com').role).toBe('owner');
  });

  it('derives the record every consumer reads (Credits, graph, log)', () => {
    expect(getTeamMember('treymurphy3rd@gmail.com')).toEqual({
      name: 'treymurphy3rd',
      role: 'admin',
      roleLabel: 'Admin',
      icon: '🛡️',
    });
    // An address that left the roster keeps its name for history, but must not
    // be reported as still holding a role.
    expect(getTeamRole('hellfiregamingytt@gmail.com')).toBeNull();
    expect(getTeamMember('hellfiregamingytt@gmail.com').role).toBeNull();
    // Case and stray spaces from hand-typed logins must not change the answer.
    expect(getTeamRole('  Treymurphy3rd@gmail.com ')).toBe('admin');
  });
});

describe('KV worker roster', () => {
  const src = readFileSync(join(ROOT, 'scripts/cloudflare-proxy-worker.js'), 'utf8');

  it('derives TEAM_EMAILS from TEAM_ROLES so the two cannot disagree', () => {
    expect(src).toContain('const TEAM_EMAILS = Object.keys(TEAM_ROLES);');
  });

  it('prunes off-roster passcodes instead of leaving ex-team members authorised', () => {
    expect(src).toContain('const roster = new Set(TEAM_EMAILS.map((e) => e.toLowerCase().trim()));');
    expect(src).toContain('delete map[stored];');
  });

  it('does not carry anyone who left the team', () => {
    expect(src).not.toMatch(/jiteaianis|dakingnub|hellfiregamingytt/);
  });
});
