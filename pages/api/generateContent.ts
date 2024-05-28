import type { NextApiRequest, NextApiResponse } from 'next';
import { generateSuperStarContent } from '../../utils/generateSuperStarContent';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // You can accept the topic via query parameters or POST data
    const topic = req.query.topic as string || 'default_topic';

    // Call your function to generate content
    const { title, body } = await generateSuperStarContent(topic);

    // Send the generated content back as a response
    res.status(200).json({ success: true, title, body });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
