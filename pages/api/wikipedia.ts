// pages/api/wikipedia.js
import axios from 'axios';

export default async function handler(req: { query: { companyName: any; }; }, res: { setHeader: (arg0: string, arg1: string) => void; status: (arg0: number) => { (): any; new(): any; send: { (arg0: any): void; new(): any; }; end: { (arg0: string): void; new(): any; }; }; }) {
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
