import type { NextApiRequest, NextApiResponse } from 'next';
import { ImageGenerationService } from '../../../utils/imageGenerationService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get current configuration from the service
    const config = ImageGenerationService.getCurrentConfig();

    // Check environment variables directly
    const envVars = {
      PREFERRED_IMAGE_GENERATOR: process.env.PREFERRED_IMAGE_GENERATOR || 'not set',
      ENABLE_IMAGE_FALLBACK: process.env.ENABLE_IMAGE_FALLBACK || 'not set',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
      FAL_KEY: process.env.FAL_KEY ? 'configured' : 'missing',
    };

    // Determine what will actually be used
    const effectiveConfig = {
      willUseFlux: config.preferredGenerator === 'flux' && config.availableServices.flux,
      willUseDalle: config.preferredGenerator === 'dalle' && config.availableServices.dalle,
      fallbackEnabled: config.enableFallback,
      primaryChoice: config.preferredGenerator,
    };

    res.status(200).json({
      message: 'Image generation configuration',
      currentConfig: config,
      environmentVariables: envVars,
      effectiveConfig,
      recommendations: generateRecommendations(config, envVars),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'Error checking image configuration',
      error: error.message,
    });
  }
}

function generateRecommendations(config: any, envVars: any): string[] {
  const recommendations = [];

  if (config.preferredGenerator === 'dalle' && envVars.PREFERRED_IMAGE_GENERATOR !== 'not set') {
    recommendations.push(
      '⚠️ PREFERRED_IMAGE_GENERATOR is set to "dalle" - remove this env var to use Flux by default'
    );
  }

  if (!config.availableServices.flux && envVars.FAL_KEY === 'missing') {
    recommendations.push('❌ FAL_KEY is missing - Flux will not work, falling back to DALL-E');
  }

  if (!config.availableServices.dalle && envVars.OPENAI_API_KEY === 'missing') {
    recommendations.push('❌ OPENAI_API_KEY is missing - DALL-E will not work');
  }

  if (config.availableServices.flux && config.preferredGenerator === 'flux') {
    recommendations.push('✅ Flux is properly configured and will be used as primary generator');
  }

  if (!config.availableServices.flux && !config.availableServices.dalle) {
    recommendations.push('🚨 Neither Flux nor DALL-E are configured - image generation will fail');
  }

  return recommendations;
}
