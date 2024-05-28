import axios from 'axios';

type PostToWordPressRequest = {
  title: string;
  content: string;
  auth: {
    username: string;
    password: string;
  };
};

export async function postToWordpress({ title, content, auth }: PostToWordPressRequest) {
  try {
    const response = await axios.post(
      `${process.env.WORDPRESS_SITE_URL}/wp-json/wp/v2/posts`,
      {
        title,
        content,
        status: 'publish',
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
