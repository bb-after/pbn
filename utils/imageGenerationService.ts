import { generateDalleImage } from './generateDalleImage';
import { generateFluxImageCompat } from './generateFluxImage';

export type ImageGenerator = 'dalle' | 'flux' | 'auto';

export interface ImageGenerationOptions {
  preferredGenerator?: ImageGenerator;
  enableFallback?: boolean;
  dalleModel?: 'dall-e-3' | 'dall-e-2';
  fluxModel?: 'flux-pro' | 'flux-dev' | 'flux-schnell';
  useCustomAspectRatio?: boolean;
}

export interface ImageGenerationResult {
  imageUrl: string;
  generatedBy: 'dalle' | 'flux';
  attempted: string[];
  errors: string[];
}

/**
 * Comprehensive image generation service with multi-provider support
 * Handles DALLE, Flux, and intelligent fallback logic
 */
export class ImageGenerationService {
  private static getConfiguration(): {
    preferredGenerator: ImageGenerator;
    enableFallback: boolean;
  } {
    const preferredGenerator = (process.env.PREFERRED_IMAGE_GENERATOR as ImageGenerator) || 'flux';
    const enableFallback = process.env.ENABLE_IMAGE_FALLBACK !== 'false';

    return { preferredGenerator, enableFallback };
  }

  private static validateApiKeys(): { dalleAvailable: boolean; fluxAvailable: boolean } {
    const dalleAvailable = !!process.env.OPENAI_API_KEY;
    const fluxAvailable = !!process.env.FAL_KEY;

    return { dalleAvailable, fluxAvailable };
  }

  private static determineGeneratorOrder(
    preferredGenerator: ImageGenerator,
    dalleAvailable: boolean,
    fluxAvailable: boolean
  ): string[] {
    // Filter out unavailable generators
    const availableGenerators = [];
    if (dalleAvailable) availableGenerators.push('dalle');
    if (fluxAvailable) availableGenerators.push('flux');

    if (availableGenerators.length === 0) {
      throw new Error(
        'No image generation APIs are available. Please configure OPENAI_API_KEY or FAL_KEY.'
      );
    }

    // Determine order based on preference
    if (preferredGenerator === 'dalle' && dalleAvailable) {
      return fluxAvailable ? ['dalle', 'flux'] : ['dalle'];
    } else if (preferredGenerator === 'flux' && fluxAvailable) {
      return dalleAvailable ? ['flux', 'dalle'] : ['flux'];
    } else {
      // Auto mode or preferred generator not available: randomly choose or use what's available
      if (availableGenerators.length === 1) {
        return availableGenerators;
      }
      return Math.random() > 0.5 ? ['dalle', 'flux'] : ['flux', 'dalle'];
    }
  }

  private static async generateWithDalle(
    topic: string,
    options: ImageGenerationOptions
  ): Promise<string> {
    const model = options.dalleModel || 'dall-e-3';
    console.log(`Generating image with DALL-E (${model})...`);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found');
    }

    return await generateDalleImage(topic, model);
  }

  private static async generateWithFlux(
    topic: string,
    options: ImageGenerationOptions
  ): Promise<string> {
    const model = options.fluxModel || 'flux-schnell';
    const useCustomAspectRatio = options.useCustomAspectRatio ?? true;

    console.log(`Generating image with Flux (${model})...`);

    if (!process.env.FAL_KEY) {
      throw new Error('FAL_KEY not found');
    }

    return await generateFluxImageCompat(topic, model, useCustomAspectRatio);
  }

  /**
   * Generate an image with smart fallback logic
   */
  public static async generateImage(
    topic: string,
    options: ImageGenerationOptions = {}
  ): Promise<ImageGenerationResult> {
    const config = this.getConfiguration();
    const preferredGenerator = options.preferredGenerator || config.preferredGenerator;
    const enableFallback = options.enableFallback ?? config.enableFallback;

    console.log(
      `Image generation - Preference: ${preferredGenerator}, Fallback: ${enableFallback}`
    );

    const { dalleAvailable, fluxAvailable } = this.validateApiKeys();
    console.log(`API availability - DALL-E: ${dalleAvailable}, Flux: ${fluxAvailable}`);

    const generatorOrder = this.determineGeneratorOrder(
      preferredGenerator,
      dalleAvailable,
      fluxAvailable
    );
    console.log(`Generator order: ${generatorOrder.join(' -> ')}`);

    const attempted: string[] = [];
    const errors: string[] = [];

    // Try each generator in order
    for (let i = 0; i < generatorOrder.length; i++) {
      const generator = generatorOrder[i];
      const isLastAttempt = i === generatorOrder.length - 1;

      attempted.push(generator);

      try {
        console.log(`Attempting image generation with ${generator}...`);

        let imageUrl: string;

        if (generator === 'dalle') {
          imageUrl = await this.generateWithDalle(topic, options);
        } else if (generator === 'flux') {
          imageUrl = await this.generateWithFlux(topic, options);
        } else {
          throw new Error(`Unknown generator: ${generator}`);
        }

        if (imageUrl) {
          console.log(`✅ Image successfully generated with ${generator}`);
          return {
            imageUrl,
            generatedBy: generator as 'dalle' | 'flux',
            attempted,
            errors,
          };
        } else {
          throw new Error(`${generator} returned empty image URL`);
        }
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        console.error(`❌ ${generator} failed:`, errorMessage);
        errors.push(`${generator}: ${errorMessage}`);

        // If this is the last attempt or fallback is disabled, throw error
        if (isLastAttempt || !enableFallback) {
          throw new Error(
            `All image generation attempts failed. Attempted: ${attempted.join(', ')}. Last error: ${errorMessage}`
          );
        }

        // Otherwise, continue to the next generator
        console.log(`⏭️ Trying next generator...`);
      }
    }

    throw new Error('No image generators were configured or available');
  }

  /**
   * Simple wrapper for backward compatibility
   */
  public static async generateImageWithFallback(topic: string): Promise<string> {
    const result = await this.generateImage(topic);
    return result.imageUrl;
  }

  /**
   * Generate image with specific generator (no fallback)
   */
  public static async generateWithSpecificProvider(
    topic: string,
    generator: 'dalle' | 'flux',
    options: ImageGenerationOptions = {}
  ): Promise<string> {
    if (generator === 'dalle') {
      return await this.generateWithDalle(topic, options);
    } else {
      return await this.generateWithFlux(topic, options);
    }
  }

  /**
   * Check which image generation services are available
   */
  public static getAvailableServices(): { dalle: boolean; flux: boolean } {
    const { dalleAvailable, fluxAvailable } = this.validateApiKeys();
    return { dalle: dalleAvailable, flux: fluxAvailable };
  }

  /**
   * Get current configuration
   */
  public static getCurrentConfig(): {
    preferredGenerator: ImageGenerator;
    enableFallback: boolean;
    availableServices: { dalle: boolean; flux: boolean };
  } {
    const { preferredGenerator, enableFallback } = this.getConfiguration();
    const availableServices = this.getAvailableServices();

    return {
      preferredGenerator,
      enableFallback,
      availableServices,
    };
  }
}
