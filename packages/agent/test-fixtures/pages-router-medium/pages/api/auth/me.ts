import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  const cookie = req.headers.cookie ?? '';
  const match = /session=([^;]+)/.exec(cookie);
  if (!match) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }
  res.status(200).json({ session: match[1] });
}
