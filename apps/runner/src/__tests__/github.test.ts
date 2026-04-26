import { describe, expect, it, vi } from 'vitest';
import { createDraftPR, type InstallationOctokitFactory, type OctokitLike } from '../github';

function makeFactory(octokit: OctokitLike): InstallationOctokitFactory {
  return {
    forInstallation: async () => octokit,
    getInstallationToken: async () => 'token-stub',
  };
}

describe('createDraftPR', () => {
  it('creates a draft PR with the requested params', async () => {
    const create = vi.fn().mockResolvedValue({
      data: { number: 42, html_url: 'https://github.com/o/r/pull/42', state: 'open' },
    });
    const factory = makeFactory({ rest: { pulls: { create } } });

    const pr = await createDraftPR({
      factory,
      installationId: 1,
      owner: 'octocat',
      repo: 'hello',
      head: 'migrate-bot/app-router-abc',
      base: 'main',
      title: '[migrate-bot] Pages Router → App Router',
      body: 'PR body',
    });

    expect(pr.number).toBe(42);
    expect(create).toHaveBeenCalledWith({
      owner: 'octocat',
      repo: 'hello',
      head: 'migrate-bot/app-router-abc',
      base: 'main',
      title: '[migrate-bot] Pages Router → App Router',
      body: 'PR body',
      draft: true,
    });
  });

  it('does not retry on a 4xx client error (e.g. 404 repo not found)', async () => {
    const create = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('not found'), { status: 404 }));
    const factory = makeFactory({ rest: { pulls: { create } } });
    await expect(
      createDraftPR({
        factory,
        installationId: 1,
        owner: 'o',
        repo: 'r',
        head: 'h',
        base: 'main',
        title: 't',
        body: 'b',
      }),
    ).rejects.toThrow(/not found/);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 rate limit then succeeds', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('rate limit'), { status: 429 }))
      .mockResolvedValue({ data: { number: 7, html_url: 'u', state: 'open' } });
    const factory = makeFactory({ rest: { pulls: { create } } });
    const pr = await createDraftPR({
      factory,
      installationId: 1,
      owner: 'o',
      repo: 'r',
      head: 'h',
      base: 'main',
      title: 't',
      body: 'b',
    });
    expect(pr.number).toBe(7);
    expect(create).toHaveBeenCalledTimes(2);
  }, 30_000);

  it('retries on 5xx server errors', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 503 }))
      .mockResolvedValue({ data: { number: 9, html_url: 'u', state: 'open' } });
    const factory = makeFactory({ rest: { pulls: { create } } });
    const pr = await createDraftPR({
      factory,
      installationId: 1,
      owner: 'o',
      repo: 'r',
      head: 'h',
      base: 'main',
      title: 't',
      body: 'b',
    });
    expect(pr.number).toBe(9);
    expect(create).toHaveBeenCalledTimes(2);
  }, 30_000);
});
