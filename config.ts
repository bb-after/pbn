import dotenv from 'dotenv';
dotenv.config();
export const openAIApiKey: string = process.env.OPENAI_API_KEY || 'none'; // Use a default value if not found