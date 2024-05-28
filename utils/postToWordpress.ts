import axios from 'axios';

type PostToWordPressRequest = {
  title: string;
  content: string;
  domain: string;
  auth: {
    username: string;
    password: string;
  };
  author?: string;
};

export async function postToWordpress({ title, content, domain, auth, author }: PostToWordPressRequest) {
  try {
    const response = await axios.post(
      `${domain}/wp-json/wp/v2/posts`,
      {
        title,
        content,
        status: 'publish',
        author,
      },
      {
        auth,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error posting to WordPress:', error);
    throw new Error('Failed to post to WordPress');
  }
}
