import { fetchNews } from '../utils/newsApi';
import { callOpenAISuperstarVersion } from '../utils/openai';

interface SuperStarContent {
  title: string;
  body: string;
}

export const generateSuperStarContent = async (topic: string, language = 'English'): Promise<SuperStarContent> => {
  
    const processContent = (content: string, seoTitle: string) => {
        // Remove leading and trailing quotes from seoTitle
        let cleanedTitle = seoTitle.replace(/^"|"$/g, '').trim();
    
        // Handle multiple title suggestions
        if (/^\d+\.\s*".*"$/.test(seoTitle)) {
        const titles = seoTitle.match(/\d+\.\s*"([^"]+)"/g);
        if (titles && titles.length > 0) {
          cleanedTitle = titles[0].replace(/^\d+\.\s*"|"$/g, '').trim();
        }
      }

      console.log('did i make it here');
        // Function to add line breaks within the article every 3-5 sentences
        const addParagraphs = (text: string) => {
          const sentences = text.split('. ');
          let paragraph = '';
          let formattedText = '';
    
          for (let i = 0; i < sentences.length; i++) {
            paragraph += sentences[i] + (i < sentences.length - 1 ? '. ' : '');
            if (Math.random() < 0.25 || i === sentences.length - 1) { // Approx every 3-5 sentences
              formattedText += paragraph + '\n\n';
              paragraph = '';
            }
          }
    
          return formattedText.trim();
        };
    
        // Remove "Title" keyword if it is the first word and set it as title
        if (content.startsWith("Title")) {
          const parts = content.split("\n");
          content = parts.slice(1).join("\n");
        }
    
        // Replace [text](url) with <a href="url">text</a>
        content = content.replace(
          /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
          '<a href="$2">$1</a>'
        );
    
        // Add paragraphs
        content = addParagraphs(content);
    
        return { content, title: cleanedTitle };
      };
    
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

  const { content, title } = processContent(response.content, response.seoTitle);

  // Return both the title and the body
  return {
    title,
    body: content,
  };
};
