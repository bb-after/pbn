import { fetchNews } from '../utils/newsApi';
import { callOpenAISuperstarVersion } from '../utils/openai';
import { formatSuperstarContent } from './formatSuperstarContent';
interface SuperStarContent {
  title: string;
  body: string;
}
 
export const generateSuperStarContent = async (topic: string, language = 'English'): Promise<SuperStarContent> => {
     
  console.log('topics', topic);
  // Fetch news summaries related to the topic
  const newsSummaries = await fetchNews(topic);
  console.log("news!!!", newsSummaries);
  if (newsSummaries.length === 0) {
    throw new Error('No news summaries available to generate content.');
  }

  // Combine news summaries into a single string
  const newsContext = newsSummaries.join(' ');

  // Prepare the prompt with the news context
  const prompt = `Write a detailed blog post, between 2000 - 5000 words, about the latest developments in ${topic}. Context: ${newsContext}. Include one or two hyperlinks to relevant third-party sites somewhere in the middle of the article. Make the use of those hyperlinks feel organic, similar to what you would see on a blog post.`;
  const initialGptMessage = [
    { role: "system", content: `I want you to write as if you are a proficient SEO and copywriter who speaks and writes fluent ${language}.` },
    { role: "user", content: prompt },
  ];

  const inputData = {
    promptMessage: initialGptMessage,
  };

  // Call OpenAI to write the article
  const response = await callOpenAISuperstarVersion(inputData);
  console.log("what does response look like?", response);

  if (!response || !response.content || !response.seoTitle) {
    throw new Error('Failed to generate content or title from OpenAI.');
  }

  const { content, title } = formatSuperstarContent(response.content, response.seoTitle);

  // Return both the title and the body
  return {
    title,
    body: content,
  };
};
