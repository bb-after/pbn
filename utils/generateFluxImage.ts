import { fal } from '@fal-ai/client';

// Configure fal.ai with API key
if (typeof window === 'undefined' && process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY,
  });
}

function getRandomStyle() {
  const styles = [
    'photorealistic',
    'digital art',
    'oil painting',
    'watercolor',
    'pencil sketch',
    'vintage photograph',
    'modern illustration',
    'abstract art',
    'minimalist design',
    'cinematic style',
    'artistic rendering',
    'documentary style',
    'editorial illustration',
    'concept art',
    'professional photography',
  ];

  const randomIndex = Math.floor(Math.random() * styles.length);
  return styles[randomIndex];
}

function getRandomAspectRatio() {
  const ratios = [
    'square', // 1:1
    'landscape', // 16:9
    'portrait', // 9:16
    '4:3', // Standard
    '3:4', // Standard portrait
  ];
  const randomIndex = Math.floor(Math.random() * ratios.length);
  return ratios[randomIndex];
}

function getRandomSeed(): number {
  return Math.floor(Math.random() * 1000000);
}

interface FluxImageOptions {
  model?: 'flux-pro' | 'flux-dev' | 'flux-schnell' | 'flux-realism';
  aspectRatio?: string;
  seed?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  output_format?: 'jpeg' | 'png' | 'webp';
  image_size?:
    | 'square_hd'
    | 'square'
    | 'portrait_4_3'
    | 'portrait_16_9'
    | 'landscape_4_3'
    | 'landscape_16_9';
}

export async function generateFluxImage(
  topic: string,
  options: FluxImageOptions = {}
): Promise<string> {
  const {
    model = 'flux-schnell', // Default to fastest model
    aspectRatio = getRandomAspectRatio(),
    seed = getRandomSeed(),
    num_inference_steps,
    guidance_scale = 7.5,
    output_format = 'jpeg',
    image_size,
  } = options;

  const style = getRandomStyle();
  const prompt = `${topic}, ${style}, high quality, detailed, textless, no text overlay`;

  console.log(`Generating Flux image with fal.ai`);
  console.log(`Model: ${model}, Aspect Ratio: ${aspectRatio}, Seed: ${seed}`);
  console.log(`Prompt: "${prompt}"`);

  // Check if FAL_KEY is configured
  if (!process.env.FAL_KEY) {
    throw new Error(
      'FAL_KEY environment variable is not set. Please configure your fal.ai API key.'
    );
  }

  try {
    // Get the fal.ai model endpoint
    const modelEndpoint = getFalModelEndpoint(model);

    // Prepare input data based on the model
    const inputData: any = {
      prompt: prompt,
      seed: seed,
    };

    // Add model-specific parameters
    if (model === 'flux-schnell') {
      // Flux Schnell is optimized and doesn't need many parameters
      if (image_size) {
        inputData.image_size = image_size;
      } else {
        inputData.image_size = mapAspectRatioToImageSize(aspectRatio);
      }
    } else {
      // Flux Dev and Pro models support more parameters
      inputData.image_size = image_size || mapAspectRatioToImageSize(aspectRatio);
      inputData.num_inference_steps = num_inference_steps || (model === 'flux-dev' ? 28 : 25);
      inputData.guidance_scale = guidance_scale;
    }

    console.log('fal.ai input data:', inputData);

    // Call fal.ai API
    const result = await fal.subscribe(modelEndpoint, {
      input: inputData,
    });

    console.log('fal.ai result:', result);

    // Extract image URL from result
    const resultData = result as any; // Type assertion for fal.ai result

    // Check for new response format with data wrapper
    const images = resultData?.data?.images || resultData?.images;

    if (images && images.length > 0) {
      const imageUrl = images[0].url;
      console.log('Flux image generated successfully with fal.ai:', imageUrl);
      return imageUrl;
    } else {
      console.error('Unexpected fal.ai response structure:', JSON.stringify(resultData, null, 2));
      throw new Error('No image URL returned from fal.ai');
    }
  } catch (error: any) {
    console.error(`Failed to generate image with Flux ${model} on fal.ai:`, error);

    // Provide helpful error context
    if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
      throw new Error(
        'Flux image generation failed: Invalid API key. Check FAL_KEY environment variable.'
      );
    } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      throw new Error('Flux image generation failed: Rate limit exceeded. Try again later.');
    } else if (error.message?.includes('quota') || error.message?.includes('credits')) {
      throw new Error(
        'Flux image generation failed: Insufficient credits. Please check your fal.ai account.'
      );
    } else {
      throw new Error(`Flux image generation failed: ${error.message}`);
    }
  }
}

function getFalModelEndpoint(model: string): string {
  const endpoints = {
    'flux-pro': 'fal-ai/flux-pro',
    'flux-dev': 'fal-ai/flux/dev',
    'flux-schnell': 'fal-ai/flux/schnell',
    'flux-realism': 'fal-ai/flux-realism',
  };

  return endpoints[model as keyof typeof endpoints] || endpoints['flux-schnell'];
}

function mapAspectRatioToImageSize(aspectRatio: string): string {
  const mapping: { [key: string]: string } = {
    square: 'square_hd',
    '1:1': 'square_hd',
    landscape: 'landscape_16_9',
    '16:9': 'landscape_16_9',
    portrait: 'portrait_16_9',
    '9:16': 'portrait_16_9',
    '4:3': 'landscape_4_3',
    '3:4': 'portrait_4_3',
  };

  return mapping[aspectRatio] || 'square_hd';
}

// Alternative function with same interface as generateDalleImage for easy replacement
export async function generateFluxImageCompat(
  topic: string,
  model: 'flux-pro' | 'flux-dev' | 'flux-schnell' = 'flux-schnell',
  useCustomAspectRatio: boolean = false
): Promise<string> {
  const aspectRatio = useCustomAspectRatio ? getRandomAspectRatio() : 'square';

  return generateFluxImage(topic, {
    model: model,
    aspectRatio: aspectRatio,
  });
}

// Enhanced function with fal.ai specific optimizations
export async function generateFluxImageFast(
  topic: string,
  imageSize: 'square_hd' | 'landscape_16_9' | 'portrait_16_9' = 'square_hd'
): Promise<string> {
  return generateFluxImage(topic, {
    model: 'flux-schnell',
    image_size: imageSize,
  });
}
