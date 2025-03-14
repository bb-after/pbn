import { callOpenAISuperstarVersion } from '../utils/openai';
import { formatSuperstarContent } from './formatSuperstarContent';
import { uploadImageToWordpress } from './uploadImageToWordpress';
import { generateDalleImage } from './generateDalleImage'; // Import the generateDalleImage function

interface SuperStarContent {
  title: string;
  body: string;
}

export const generateSuperStarContent = async (topic: string, site: any): Promise<SuperStarContent> => {
  const language = 'English';
  console.log('Generating content for topic:', topic);

  // Prepare the prompt for OpenAI
  const prompt = site.custom_prompt 
    ? `${site.custom_prompt} The topic is: ${topic}.`
    : `Write a detailed article, between 200-500 words, about anything of current or general interest related to ${topic}.`;
  const initialGptMessage = [
    { role: "system", content: `I want you to write as if you are a proficient SEO and copywriter who speaks and writes fluent ${language}.` },
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

      uploadedImageUrl = await uploadImageToWordpress(imageUrl, topic, site.domain, auth);
    }
  } catch (error: any) {
    console.error('Failed to generate or upload image:', error);
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
