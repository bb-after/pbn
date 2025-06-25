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
    'steampunk',
  ];

  const randomIndex = Math.floor(Math.random() * styles.length);
  return styles[randomIndex];
}

function getRandomSize() {
  const sizes = [
    '1024x1024', // Square
    '1792x1024', // Landscape/Horizontal
    '1024x1792', // Portrait/Vertical
  ];
  const randomIndex = Math.floor(Math.random() * sizes.length);
  return sizes[randomIndex];
}

function getRandomCustomSize(): string {
  // Define min and max dimensions while keeping aspect ratios
  const aspectRatios = [
    { type: 'square', ratio: 1 }, // 1:1
    { type: 'landscape', ratio: 1.75 }, // 1792:1024 ≈ 1.75:1
    { type: 'portrait', ratio: 0.57 }, // 1024:1792 ≈ 1:1.75
  ];

  // Random width between 512 and 2048 (must be multiple of 8 for most image processors)
  const getRandomDimension = (min: number, max: number) => {
    const dimension = Math.floor(Math.random() * (max - min + 1) + min);
    return Math.round(dimension / 8) * 8; // Round to nearest multiple of 8
  };

  const selectedRatio = aspectRatios[Math.floor(Math.random() * aspectRatios.length)];

  let width: number;
  let height: number;

  switch (selectedRatio.type) {
    case 'square':
      width = getRandomDimension(512, 2048);
      height = width;
      break;
    case 'landscape':
      width = getRandomDimension(1024, 2048);
      height = Math.round(width / selectedRatio.ratio);
      break;
    case 'portrait':
      height = getRandomDimension(1024, 2048);
      width = Math.round(height * selectedRatio.ratio);
      break;
    default:
      width = 1024;
      height = 1024;
  }

  return `${width}x${height}`;
}

export async function generateDalleImage(
  topic: string,
  dalleVersion: 'dall-e-2' | 'dall-e-3',
  useCustomSize: boolean = false
): Promise<string> {
  const style = getRandomStyle();
  const size = useCustomSize ? getRandomCustomSize() : getRandomSize();
  const prompt = `${topic}, textless, ${getRandomStyle()}`;

  const requestData = {
    prompt: prompt,
    n: 1,
    size: size,
    model: dalleVersion,
  };

  try {
    const response = await axios.post(`https://api.openai.com/v1/images/generations`, requestData, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data && response.data.data && response.data.data.length > 0) {
      return response.data.data[0].url;
    } else {
      throw new Error('No image URL returned from DALL·E');
    }
  } catch (error: any) {
    console.error(`Failed to generate image with DALL·E ${dalleVersion}:`, error);
    throw new Error('DALL·E image generation failed');
  }
}
