import { callOpenAISuperstarVersion } from '../utils/openai';
import { formatSuperstarContent } from './formatSuperstarContent';
import { uploadImageToWordpress } from './uploadImageToWordpress';
import { generateDalleImage } from './generateDalleImage'; // Import the generateDalleImage function
import { fetchNews, NewsArticle } from './newsApi'; // Import the fetchNews function and type

interface SuperStarContent {
  title: string;
  body: string;
}

export const generateSuperStarContent = async (topic: string, site: any): Promise<SuperStarContent> => {
  const language = 'English';
  console.log('Generating content for topic:', topic);

  // Fetch recent news about the topic
  console.log('Fetching news for topic:', topic);
  const newsArticles = await fetchNews(topic);
  
  // Prepare the prompt for OpenAI
  let prompt = site.custom_prompt 
    ? `${site.custom_prompt} The topic is: ${topic}.` 
    : `Write a detailed article, between 400-700 words, about anything of current or general interest related to ${topic}.`;
  
  // Add recent news context if available
  if (newsArticles.length > 0) {
    console.log(`Found ${newsArticles.length} news articles related to the topic`, newsArticles);
    
    // Select random articles (between 2-4 articles) if we have enough
    let selectedArticles: NewsArticle[] = [];
    if (newsArticles.length <= 4) {
      selectedArticles = newsArticles;
    } else {
      // Shuffle the array using Fisher-Yates algorithm
      const shuffledArticles = [...newsArticles];
      for (let i = shuffledArticles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledArticles[i], shuffledArticles[j]] = [shuffledArticles[j], shuffledArticles[i]];
      }
      
      // Take 2-4 random articles
      const numArticles = Math.floor(Math.random() * 3) + 2; // Random number between 2-4
      selectedArticles = shuffledArticles.slice(0, numArticles);
    }
    
    // Format articles in a structured way
    const formattedArticles = selectedArticles.map((article, index) => {
      const date = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'recent';
      return `Article ${index + 1}:
Title: ${article.title}
Date: ${date}
Summary: ${article.description}
${article.url ? `Source: ${article.url}` : ''}`;
    }).join('\n\n');
    
    prompt += `\n\nHere are some recent news about this topic that you can reference or incorporate into your article:\n\n${formattedArticles}`;
  } else {
    console.log('No recent news found for the topic');
  }
  
  const initialGptMessage = [
    { role: "system", content: `Write content in the style of a proficient SEO and copywriter who speaks and writes fluent ${language}. 
Today's date is ${new Date().toLocaleDateString()}. Write with current, up-to-date information relevant to today.

IMPORTANT: 
- Avoid explicitly mentioning years (past, current, or future) in the content
- Use timeless phrasing like "currently," "recently," or "today" instead of specific year references
- Focus on evergreen content that doesn't date itself quickly
- Never mention your role or identity in the content (e.g., do not say "As a proficient SEO copywriter" or similar phrases)
- Never mention AI, writing models, or content generation in the article
- Don't introduce yourself or explain your capabilities
- Write naturally as if a human expert wrote the content directly
` },
    { role: "user", content: prompt },
  ];

  const inputData = {
    promptMessage: initialGptMessage,
  };

  // Call OpenAI to write the article
  const response = await callOpenAISuperstarVersion(inputData);
  if (!response || !response.content || !response.seoTitle) {
    throw new Error('Failed to generate content or title from OpenAI.');
  }

  const { content, title } = formatSuperstarContent(response.content, response.seoTitle);

  let uploadedImageUrl: string | null = null;
  try {
    // Generate a DALL·E image
    const imageUrl = await generateDalleImage(topic, 'dall-e-3');
    if (imageUrl) {
      const auth = { username: site.login, password: site.password };
      
      // uploadImageToWordpress now returns null on failure instead of throwing
      uploadedImageUrl = await uploadImageToWordpress(imageUrl, topic, site.domain, auth);
      if (uploadedImageUrl) {
        console.log('Image successfully uploaded and ready to use in content');
      } else {
        console.log('Image upload failed, continuing without image');
      }
    }
  } catch (error: any) {
    console.error('Failed to generate image:', error);
  }

  // Insert the image into the content
  let modifiedContent = content;
  if (uploadedImageUrl) {  
    const lines = modifiedContent.split('<br>');
    if (lines.length > 3) {
        //choose a width between 50 - 100%
        const randomWidth = Math.floor(Math.random() * 50) + 50;
        const randomIndex = Math.floor(Math.random() * (lines.length - 1)) + 1;
        lines.splice(randomIndex, 0, `<br><br><img width="${randomWidth}%" src="${uploadedImageUrl}" alt="${topic} image"><br><br>`);
        modifiedContent = lines.join('<br>');
    }
  }

  return {
    title,
    body: modifiedContent,
  };
};
