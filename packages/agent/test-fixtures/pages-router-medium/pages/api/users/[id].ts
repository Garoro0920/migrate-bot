import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse): void {
  const { id } = req.query;
  if (req.method === 'GET') {
    res.status(200).json({ id, name: `User ${id}` });
    return;
  }
  if (req.method === 'DELETE') {
    res.status(204).end();
    return;
  }
  res.setHeader('Allow', 'GET, DELETE');
  res.status(405).end('Method Not Allowed');
}
