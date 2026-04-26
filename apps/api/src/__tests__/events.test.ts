import { describe, expect, it } from 'vitest';
import { parseGitHubEvent } from '../webhooks/events';

describe('parseGitHubEvent', () => {
  it('parses installation events', () => {
    const result = parseGitHubEvent('installation', {
      action: 'created',
      installation: { id: 42, account: { login: 'octocat', type: 'User' } },
    });
    expect(result.kind).toBe('installation');
    if (result.kind === 'installation') {
      expect(result.payload.installation.id).toBe(42);
      expect(result.payload.action).toBe('created');
    }
  });

  it('treats installation_repositories as installation kind', () => {
    const result = parseGitHubEvent('installation_repositories', {
      action: 'added',
      installation: { id: 1, account: { login: 'a', type: 'User' } },
      repositories: [{ full_name: 'a/b' }],
    });
    expect(result.kind).toBe('installation');
  });

  it('parses push events', () => {
    const result = parseGitHubEvent('push', {
      ref: 'refs/heads/main',
      installation: { id: 1 },
      repository: { full_name: 'a/b', default_branch: 'main' },
    });
    expect(result.kind).toBe('push');
    if (result.kind === 'push') {
      expect(result.payload.ref).toBe('refs/heads/main');
      expect(result.payload.repository.full_name).toBe('a/b');
    }
  });

  it('returns unsupported for unknown event names', () => {
    const result = parseGitHubEvent('issues', { action: 'opened' });
    expect(result.kind).toBe('unsupported');
    if (result.kind === 'unsupported') {
      expect(result.event).toBe('issues');
    }
  });
});
