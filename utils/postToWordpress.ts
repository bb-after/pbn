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
    console.log(`Posting to WordPress ${domain}`);
    
    // Create the post data
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

    console.log(`Sending post to WordPress: ${domain}/wp-json/wp/v2/posts`);
    
    // Try application password approach - first get user's own ID from WordPress
    try {
      // First try to get the current user info (for application passwords)
      const meResponse = await axios.get(
        `${domain}/wp-json/wp/v2/users/me`,
        {
          auth: {
            username: auth.username,
            password: auth.password,
          },
        }
      );
      
      // If we get the user ID, use it explicitly
      if (meResponse.data && meResponse.data.id) {
        console.log(`Found user ID: ${meResponse.data.id}, using for post author`);
        postData.author = meResponse.data.id;
      }
    } catch (userError) {
      // If we can't get the user ID, just continue without it
      console.log('Could not get current user ID, continuing without author ID');
    }
    
    // Make the API request
    const response = await axios.post(
      `${domain}/wp-json/wp/v2/posts`,
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
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
      
      if (error.response.data && error.response.data.message) {
        throw new Error(`WordPress error: ${error.response.data.message}`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      throw new Error(`WordPress request timed out or no response received.`);
    }
    
    // Generic error
    throw new Error(`Failed to post to WordPress: ${error.message}`);
  }
}