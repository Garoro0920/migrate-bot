import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end();
    return;
  }
  res.setHeader('Set-Cookie', 'session=; Path=/; Max-Age=0');
  res.status(200).json({ ok: true });
}
