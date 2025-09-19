import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../../lib/db';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    brandOrName,
    analysisType = 'brand',
    topics = [],
  } = req.body as {
    brandOrName: string;
    analysisType: 'brand' | 'individual';
    topics: string[];
  };

  if (!brandOrName || !analysisType) {
    return res.status(400).json({ error: 'brandOrName and analysisType are required' });
  }

  try {
    const topicNames = topics && topics.length > 0 ? topics : ['general'];

    // Ensure topics exist
    for (const name of topicNames) {
      await query('INSERT IGNORE INTO geo_topics(name) VALUES (?)', [name]);
    }

    // Generate 5 prompts per topic
    const generated: { topic: string; prompts: { prompt_id: number; base_text: string }[] }[] = [];
    for (const name of topicNames) {
      const prompt = `Generate 5 distinct research prompts for a ${analysisType} competitive analysis about "${brandOrName}" under the topic "${name}". Output as a numbered list without explanations.`;

      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You generate high-quality concise research prompts.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
      });

      const text = resp.choices[0]?.message?.content || '';
      const prompts = text
        .split(/\n+/)
        .map(s => s.replace(/^\d+\.?\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 5);

      // Persist base prompts
      const [rows] = await query<any[]>('SELECT topic_id FROM geo_topics WHERE name = ? LIMIT 1', [
        name,
      ]);
      const topicId = rows[0]?.topic_id;

      const saved: { prompt_id: number; base_text: string }[] = [];
      for (const p of prompts) {
        const [insertRes]: any = await query(
          'INSERT INTO geo_prompts (topic_id, analysis_type, base_text) VALUES (?,?,?)',
          [topicId, analysisType, p]
        );
        const promptId: number = insertRes?.insertId;
        saved.push({ prompt_id: promptId, base_text: p });
      }

      generated.push({ topic: name, prompts: saved });
    }

    return res.status(200).json({ generated });
  } catch (error: any) {
    console.error('Error generating prompts:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate prompts' });
  }
}
