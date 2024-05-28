import axios from 'axios';

type Article = {
    title: string;
    description: string;
};
// Fetch current events related to the topic
export const fetchNews = async (topic: string): Promise<string[]> => {
    try {
        const response = await axios.get(`https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&sortBy=publishedAt&language=en&apiKey=${process.env.NEWSAPI_KEY}`);
        // Map each article to a string that combines title and description
        return response.data.articles.map((article: Article) => `${article.title}. ${article.description}`);
    } catch (error) {
        console.error('Failed to fetch news:', error);
        return [];
    }
}

