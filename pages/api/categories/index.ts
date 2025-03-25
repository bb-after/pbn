import { NextApiRequest, NextApiResponse } from 'next';

// This is a compatibility endpoint that forwards requests to the new /api/industries endpoint
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Simply redirect the request to the new /api/industries endpoint
  return res.redirect(307, '/api/industries');
}