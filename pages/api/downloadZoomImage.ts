// pages/api/downloadImage.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { imageUrl, clientName } = req.query;
  
  try {
    const response = await fetch(imageUrl as string);
    const imageBlob = await response.blob();
    const buffer = await imageBlob.arrayBuffer();
    
    const filename = `zoom-background-${clientName || 'default'}.png`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'image/png');
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ error: 'Failed to download image' });
  }
}