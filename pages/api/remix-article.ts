import { NextApiRequest, NextApiResponse } from 'next';
import { callOpenAI, callOpenAIToRewriteArticle } from 'utils/openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { mode, inputData, response } = req.body;

  try {
    let content;

    if (mode !== "generate") {
      // Use OpenAI or Claude to rewrite the article
      content = await callOpenAIToRewriteArticle(response, inputData);
    } else {
      // Use OpenAI or Claude to generate a new article
      content = await callOpenAI(inputData);
    }

    res.status(200).json({ content });
  } catch (error) {
    console.error("Error in remix-article endpoint:", error);
    res.status(500).json({ error: "Failed to process remix request." });
  }
}

