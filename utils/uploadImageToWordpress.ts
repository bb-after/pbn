import axios from 'axios';

export async function uploadImageToWordpress(imageUrl: string, topic: string, domain: string, auth: { username: string, password: string }) {
  try {
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });

    const formData = new FormData();
    const sanitizedTopic = topic.toLowerCase().replace(/\s+/g, '-');
    const fileName = `${sanitizedTopic}-${Date.now()}.png`;
    const altText = `${topic}`;
    formData.append('file', new Blob([imageResponse.data], { type: 'image/png' }), fileName);
    formData.append('title', fileName);
    formData.append('alt_text', altText);
    
    const response = await axios.post(
      `${domain}/wp-json/wp/v2/media`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Basic ${btoa(`${auth.username}:${auth.password}`)}`,
        },
      }
    );

    return response.data.source_url;
  } catch (error: any) {
    console.error('Failed to upload image to WordPress:', error);
    throw new Error('Image upload failed');
  }
}