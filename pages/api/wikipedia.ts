// pages/api/wikipedia.js
import axios from 'axios';

export default async function handler(req, res) {
  const { companyName } = req.query;

  try {
    const response = await axios.get(`https://en.wikipedia.org/wiki/${encodeURIComponent(companyName)}`);
    const html = response.data;

    // Set appropriate headers to enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    res.status(200).send(html);
  } catch (error) {
    console.error(error);
    res.status(500).end('Internal Server Error');
  }
}
