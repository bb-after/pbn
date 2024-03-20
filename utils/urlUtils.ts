// This is urlUtils.ts, a utility file for URL-related functions.
import axios from 'axios';
/**
 * Extracts the slug from a given URL.
 * 
 * @param {string} url - The URL from which to extract the slug.
 * @returns {string | null} - The extracted slug or null if it cannot be determined.
 */
export const getSlugFromUrl = (url: string): string | null => {
    // Remove trailing slash if present
    const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;
    
    // Extract the last part of the URL, which should be the slug
    const slug = urlWithoutTrailingSlash.split("/").pop();
    
    // If there are query parameters, remove them
    return slug ? slug.split('?')[0] : null;
};

export const findPostIdBySlug = async (domain: string, slug: string | null, auth: { username: any; password: any; }) => {
    try {
      const response = await axios.get(`${domain}/wp-json/wp/v2/posts`, {
        params: { slug },
        auth,
      });
  
      if (response.data.length > 0) {
        return response.data[0].id;
      }
  
      return null;
    } catch (error) {
      console.error('Error finding post ID by slug:', error);
      throw new Error('Failed to find post ID by slug');
    }
  }
  