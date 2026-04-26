import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  if (req.method === 'GET') {
    res.status(200).json([{ id: 'p1', name: 'Widget' }]);
    return;
  }
  res.setHeader('Allow', 'GET');
  res.status(405).end();
}
