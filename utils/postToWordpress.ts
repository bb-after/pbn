import axios from 'axios';

type PostToWordPressRequest = {
  title: string;
  content: string;
  domain: string;
  auth: {
    username: string;
    password: string;
  };
  categoryId?: number;
};

export async function postToWordpress({ title, content, domain, auth, categoryId }: PostToWordPressRequest) {
  try {
    console.log(`Posting to WordPress ${domain} with auth user ${auth.username}`);
    
    // Create the post data with minimal fields
    const postData: Record<string, any> = {};
    
    // Ensure title is properly formatted (string or object with rendered property)
    if (typeof title === 'string') {
      postData.title = title;
    } else if (typeof title === 'object') {
      postData.title = title;
    }
    
    // Set content
    postData.content = content;
    
    // Set status to publish
    postData.status = 'publish';

    // Only include categories if defined
    if (categoryId) {
      postData.categories = [categoryId];
      console.log(`Using category ID: ${categoryId}`);
    }

    // Log the request URL
    const url = `${domain}/wp-json/wp/v2/posts`;
    console.log(`Sending post to ${url}`);
    
    // Create the authorization header manually
    const base64Auth = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
    
    // Make the post request with explicit headers
    const response = await axios({
      method: 'post',
      url: url,
      data: postData,
      headers: {
        'Authorization': `Basic ${base64Auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
    
    console.log(`WordPress post created successfully with ID: ${response.data.id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error posting to WordPress:');
    
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, JSON.stringify(error.response.data));
      
      if (error.response.status === 401) {
        throw new Error(`WordPress authentication failed. Check credentials.`);
      } else if (error.response.status === 403) {
        throw new Error(`WordPress permission denied. User cannot create posts. Check if REST API is properly configured and user has author/editor role.`);
      } else if (error.response.data && error.response.data.message) {
        throw new Error(`WordPress error: ${error.response.data.message}`);
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error(`WordPress request timed out or no response received.`);
    }
    
    throw new Error(`Failed to post to WordPress: ${error.message}`);
  }
}