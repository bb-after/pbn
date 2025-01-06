import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const IDEOGRAM_API_KEY = process.env.IDEOGRAM_API_KEY;

  if (!IDEOGRAM_API_KEY) {
    return res.status(500).json({ error: 'IDEOGRAM_API_KEY is not set' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { company, clientName, prompt } = req.body;

    // Validate the incoming data
    if (!prompt || !clientName || !company) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // const enhancedPrompt = `${prompt} The client's name is "${clientName}".`;

    // Call the Ideogram API
    const response = await fetch('https://api.ideogram.ai/generate', {
      method: 'POST',
      headers: {
        'Api-Key': IDEOGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_request: {
          prompt: prompt,
          style: 'photographic',
          aspect_ratio: 'ASPECT_9_16',
          model: 'V_2',
        //   height: 576,
        },
      }),
    });

    // Log the full response to debug
    const responseBody = await response.json();
    console.log('API Response:', responseBody);

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: responseBody.error || 'Ideogram API error' 
      });
    }


    return res.status(200).json({ imageUrl: responseBody.data[0].url });

  } catch (error) {
    console.error('Error generating background:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
