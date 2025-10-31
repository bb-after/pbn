import dotenv from 'dotenv';
dotenv.config();

// OpenAI Configuration
export const openAIApiKey: string = process.env.OPENAI_API_KEY || 'none';
export const openAIOrganizationId: string = process.env.OPENAI_ORGANIZATION_ID || '';

// Anthropic Configuration
export const anthropicApiKey: string = process.env.ANTHROPIC_API_KEY || '';

// Google Gemini Configuration
export const geminiApiKey: string = process.env.GOOGLE_GEMINI_API_KEY || '';

// Perplexity Configuration
export const perplexityApiKey: string = process.env.PERPLEXITY_API_KEY || '';

// Grok/XAI Configuration
export const grokApiKey: string = process.env.XAI_API_KEY || process.env.GROK_API_KEY || '';

// Ahrefs Configuration
export const ahrefsApiKey: string = process.env.AHREFS_API_KEY || '';
