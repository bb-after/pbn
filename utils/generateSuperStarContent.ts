import axios from 'axios';
import { fetchNews } from '../utils/newsApi';
import { callOpenAISuperstarVersion } from '../utils/openai';
import { formatSuperstarContent } from './formatSuperstarContent';
interface SuperStarContent {
  title: string;
  body: string;
}

const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

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

const generateDallEImage = async (topic: string, model: string): Promise<string | null> => {
  const updatedPrompt = `${topic}, textless, ${getRandomStyle()}`;
  const size = getRandomSize();

  console.log('prompt', updatedPrompt);
  console.log('size', size);
  try {
    const response = await axios.post('https://api.openai.com/v1/images/generations', {
      model: model,
      prompt: updatedPrompt,
      n: 1,
      size: size,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('respsone', response)
    return response.data.data[0].url;
  } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
};

export const generateSuperStarContent = async (topic: string, language = 'English'): Promise<SuperStarContent> => {
  console.log('topics', topic);

  // Fetch news summaries related to the topic
  let newsSummaries: any[] = [];
  try {
    newsSummaries = await fetchNews(topic);
    console.log("news!!!", newsSummaries);
  } catch (error) {
    console.error('Failed to fetch news summaries:', error);
  }

  // Check if news summaries are available, if not use OpenAI's general knowledge
  let newsContext = '';
  if (newsSummaries.length > 0) {
    // Combine news summaries into a single string
    //change to a random value
    newsContext = newsSummaries.join('---------------');
  } else {
    // Use OpenAI's general knowledge to write an article given the topics
    newsContext = `Use your general knowledge to write an article about ${topic}.`;
  }

  // Prepare the prompt with the news context
  const prompt = `Write a detailed article, between 200-500 words, about anything of current or general interest related to ${topic}. Context: ${newsContext}. Include one or two hyperlinks to relevant third-party sites somewhere in the middle of the article. Make the use of those hyperlinks feel organic, similar to what you would see on a blog post.`;
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

  let imageURL: string | null = null;
  try {
    imageURL = await generateDallEImage(topic, 'dall-e-3');
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.warn('Rate limited on DALL·E 3, trying DALL·E 2.');
    } else {
      console.error('DALL·E 3 failed:', error);
    }

    try {
      imageURL = await generateDallEImage(topic, 'dall-e-2');
    } catch (fallbackError: any) {
      if (fallbackError.response?.status === 429) {
        console.warn('Rate limited on DALL·E 2, skipping image generation.');
      } else {
        console.error('DALL·E 2 failed:', fallbackError);
      }
    }
  }



  // Insert the image between two random line breaks in the content
  let modifiedContent = content;
  if (imageURL) {
    const lines = modifiedContent.split('\n');
    if (lines.length > 3) {
      const randomIndex = Math.floor(Math.random() * (lines.length - 1)) + 1;
      lines.splice(randomIndex, 0, `<br><br><img src="${imageURL}" alt="${topic} image"><br><br>`);
      modifiedContent = lines.join('\n');
    }
  }

  // Return both the title and the body
  return {
    title,
    body: modifiedContent,
  };
};
