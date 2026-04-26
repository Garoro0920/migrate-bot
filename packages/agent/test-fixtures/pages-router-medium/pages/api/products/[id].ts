import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  const { id } = req.query;
  if (req.method === 'GET') {
    res.status(200).json({ id, name: `Product ${id}` });
    return;
  }
  res.setHeader('Allow', 'GET');
  res.status(405).end();
}
