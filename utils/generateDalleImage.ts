// utils/generateDalleImage.ts
import axios from 'axios';

function getRandomStyle() {
  const styles = [
    'cartoon style',
    'black and white',
    'sketch',   
    'watercolor',
    'surreal',
    'abstract',
    'synthwave',
    'impressionist',
    'minimalist',
    'vintage',
    'popart',
    'fantasy',
    'pixel art',
    'line art',
    'steampunk'
  ];

  const randomIndex = Math.floor(Math.random() * styles.length);
  return styles[randomIndex];
}

function getRandomSize() {
  const sizes = [
    '1024x1024',
    '1792x1024',
    '1024x1792',
  ];
  const randomIndex = Math.floor(Math.random() * sizes.length);
  return sizes[randomIndex];
}

export async function generateDalleImage(topic: string, dalleVersion: 'dall-e-2' | 'dall-e-3'): Promise<string> {
  const style = getRandomStyle();
  const size = getRandomSize();
  const prompt = `${topic}, textless, ${getRandomStyle()}`;
  
  const requestData = {
    prompt: prompt,
    n: 1,
    size: size,
    model: dalleVersion,
  };

  try {
    const response = await axios.post(
      `https://api.openai.com/v1/images/generations`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0].url; // Return the URL of the generated image
    } else {
      throw new Error('No image URL returned from DALL·E');
    }
  } catch (error: any) {
    console.error(`Failed to generate image with DALL·E ${dalleVersion}:`, error);
    throw new Error('DALL·E image generation failed');
  }
}
