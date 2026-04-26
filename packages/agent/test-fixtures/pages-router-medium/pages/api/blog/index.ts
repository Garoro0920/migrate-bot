import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse): void {
  res.status(200).json([
    { slug: 'hello', title: 'Hello world' },
    { slug: 'second', title: 'Second post' },
  ]);
}
