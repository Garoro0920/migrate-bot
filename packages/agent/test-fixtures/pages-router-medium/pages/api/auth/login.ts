import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end();
    return;
  }
  const { username } = req.body ?? {};
  res.setHeader('Set-Cookie', `session=demo-${username}; Path=/; HttpOnly`);
  res.status(200).json({ ok: true, username });
}
