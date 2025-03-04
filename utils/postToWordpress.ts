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
    
    // Create the post data exactly like the working implementation
    const postData = {
      title: title,
      content: content,
      status: 'publish',
    };

    // Only include categories if defined
    if (categoryId) {
      postData.categories = [categoryId];
      console.log(`Using category ID: ${categoryId}`);
    }

    // Log the request URL
    const url = `${domain}/wp-json/wp/v2/posts`;
    console.log(`Sending post to ${url}`);
    
    // Make the API request exactly like in postToWordPress.ts which works
    const response = await axios.post(
      url,
      postData,
      {
        auth: {
          username: auth.username,
          password: auth.password,
        },
      }
    );
    
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