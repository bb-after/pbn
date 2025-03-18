import axios from 'axios';

export type NewsArticle = {
    title: string;
    description: string;
    url?: string;
    publishedAt?: string;
};

// Fetch current events related to the topic
export const fetchNews = async (topic: string): Promise<NewsArticle[]> => {
    try {
        const response = await axios.get(`https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&sortBy=publishedAt&language=en&apiKey=${process.env.NEWSAPI_KEY}`);
        
        // Extract relevant data from each article
        const articles = response.data.articles.map((article: any) => ({
            title: article.title || '',
            description: article.description || '',
            url: article.url,
            publishedAt: article.publishedAt
        })).filter((article: NewsArticle) => article.title && article.description);
        
        return articles;
    } catch (error) {
        console.error('Failed to fetch news:', error);
        return [];
    }
}

