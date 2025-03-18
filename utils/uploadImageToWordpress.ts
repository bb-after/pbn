import axios from 'axios';

export async function uploadImageToWordpress(imageUrl: string, topic: string, domain: string, auth: { username: string, password: string }) {
  try {
    // Add a timeout to the axios request to prevent hanging
    const imageResponse = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 15000, // 15 second timeout
      headers: {
        'Accept': 'image/*'
      }
    });
    
    console.log(`Image downloaded successfully (${imageResponse.data.byteLength} bytes)`);
    
    // Determine content type from response headers if available
    let contentType = 'image/png';
    const responseContentType = imageResponse.headers['content-type'];
    if (responseContentType && responseContentType.startsWith('image/')) {
      contentType = responseContentType;
      console.log(`Detected content type: ${contentType}`);
    }
    
    // Convert image data to base64 for direct upload
    const base64Image = Buffer.from(imageResponse.data).toString('base64');
    const sanitizedTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const fileExtension = contentType === 'image/jpeg' ? 'jpg' : 'png';
    const fileName = `${sanitizedTopic}-${Date.now()}.${fileExtension}`;
    
    // Use media creation endpoint with the base64 data directly
    console.log(`Uploading image to WordPress at ${domain}/wp-json/wp/v2/media using base64 method`);
    
    try {
      // First try the file upload method (using FormData and Blob)
      const formData = new FormData();
      const blob = new Blob([imageResponse.data], { type: contentType });
      formData.append('file', blob, fileName);
      formData.append('title', fileName);
      formData.append('alt_text', topic);
      
      const response = await axios.post(
        `${domain}/wp-json/wp/v2/media`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Basic ${btoa(`${auth.username}:${auth.password}`)}`,
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      console.log(`Image uploaded successfully to WordPress with ID: ${response.data.id}`);
      return response.data.source_url;
    } catch (uploadError) {
      // If traditional method fails, try alternative method
      console.log('Standard upload failed, trying alternative base64 method:', uploadError.message);
      
      // Try direct JSON payload with base64 data
      // This is an alternative approach that works on some WordPress configurations
      const mediaData = {
        title: fileName,
        alt_text: topic,
        status: 'publish',
        media_type: 'image',
        mime_type: contentType,
        // Use data URI format for the file content
        file_contents: `data:${contentType};base64,${base64Image}`
      };
      
      const altResponse = await axios.post(
        `${domain}/wp-json/wp/v2/media`,
        mediaData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(`${auth.username}:${auth.password}`)}`,
          },
          timeout: 30000
        }
      );
      
      console.log(`Image uploaded successfully using alternative method with ID: ${altResponse.data.id}`);
      return altResponse.data.source_url;
    }
  } catch (error: any) {
    // Log more detailed error information
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
    const statusCode = error.response?.status || 'No status';
    
    console.error('All image upload methods failed:', {
      statusCode,
      errorMessage,
      requestUrl: `${domain}/wp-json/wp/v2/media`,
      imageUrl
    });
    
    // As a last resort, return the original DALL-E URL
    // This allows at least temporary access to the image until it expires
    // User can see this is happening in logs and fix WordPress config
    console.log('Returning original DALL-E URL as fallback');
    return imageUrl;
  }
}