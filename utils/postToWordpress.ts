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
  author?: string;
};

export async function postToWordpress({ title, content, domain, auth, categoryId, author }: PostToWordPressRequest) {
  try {
    // Log the author being used for debugging
    console.log(`Posting to WordPress with author ID: ${author}`);
    
    // Create the post data
    const postData: any = {
      title,
      content,
      status: 'publish',
      categories: categoryId ? [categoryId] : undefined,
    };

    // Only include author if it's defined and is a valid ID
    if (author && !isNaN(Number(author))) {
      postData.author = Number(author);
      console.log(`Setting author ID to: ${postData.author}`);
    } else {
      console.log(`No valid author ID provided, WordPress will use the default author`);
    }

    // Make the API request
    const response = await axios.post(
      `${domain}/wp-json/wp/v2/posts`,
      postData,
      {
        auth,
      }
    );
    
    // Log the response author for verification
    if (response.data && response.data.author) {
      console.log(`WordPress assigned author ID: ${response.data.author}`);
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Error posting to WordPress:', error?.response?.data || error.message);
    throw new Error(`Failed to post to WordPress: ${error?.response?.data?.message || error.message}`);
  }
}
