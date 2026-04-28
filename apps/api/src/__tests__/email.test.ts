import { describe, expect, it, vi } from 'vitest';
import {
  createResendClient,
  paymentReceivedEmail,
  prReadyEmail,
  refundedEmail,
  ResendError,
} from '../email';

describe('createResendClient.send', () => {
  it('POSTs to Resend API with bearer auth and JSON body', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'em_123' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = createResendClient({
      apiKey: 're_test',
      fromAddress: 'migrate-bot <noreply@example.com>',
      fetch: fetchSpy as unknown as typeof fetch,
    });
    const result = await client.send({
      to: 'a@example.com',
      subject: 'Hi',
      html: '<p>hi</p>',
      text: 'hi',
    });
    expect(result.id).toBe('em_123');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer re_test');
    expect(headers['content-type']).toBe('application/json');
    const body = JSON.parse(init.body as string) as {
      from: string;
      to: string[];
      subject: string;
    };
    expect(body.from).toBe('migrate-bot <noreply@example.com>');
    expect(body.to).toEqual(['a@example.com']);
    expect(body.subject).toBe('Hi');
  });

  it('throws ResendError on non-2xx', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response('rate limited', { status: 429 }),
    );
    const client = createResendClient({
      apiKey: 're_test',
      fromAddress: 'a@b.com',
      fetch: fetchSpy as unknown as typeof fetch,
    });
    await expect(
      client.send({ to: 'a@example.com', subject: 's', html: 'h', text: 't' }),
    ).rejects.toBeInstanceOf(ResendError);
  });
});

describe('templates', () => {
  it('paymentReceivedEmail mentions repo and plan', () => {
    const tpl = paymentReceivedEmail({ repoFullName: 'octocat/hello', plan: 'medium' });
    expect(tpl.subject).toContain('octocat/hello');
    expect(tpl.subject).toContain('medium');
    expect(tpl.text).toContain('octocat/hello');
    expect(tpl.html).toContain('octocat/hello');
  });

  it('prReadyEmail includes the PR URL', () => {
    const tpl = prReadyEmail({
      repoFullName: 'octocat/hello',
      prUrl: 'https://github.com/octocat/hello/pull/1',
    });
    expect(tpl.text).toContain('https://github.com/octocat/hello/pull/1');
    expect(tpl.html).toContain('https://github.com/octocat/hello/pull/1');
    expect(tpl.subject).toContain('octocat/hello');
  });

  it('refundedEmail formats amount as USD with cents->dollars', () => {
    const tpl = refundedEmail({
      repoFullName: 'octocat/hello',
      reason: 'verify failed: typecheck',
      amountUsdCents: 24900,
    });
    expect(tpl.text).toContain('$249.00');
    expect(tpl.text).toContain('verify failed: typecheck');
  });
});
