import axios from 'axios';

export default async function handler(req, res) {
    // Get the URL from the request query or body
    const { url } = req.query; // or req.body, depending on how you send the data

    if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
    }

    try {
        const response = await axios.get(url);
        // Respond with the fetched data
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching URL:', url, error);
        res.status(500).json({ error: 'Failed to fetch data from URL.' });
    }
}
