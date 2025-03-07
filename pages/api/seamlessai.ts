import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const seamlessAiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    let companyName = req.query.companyName;

    if (!companyName) {
      return res.status(400).json({ error: 'Missing companyName parameter' });
    }

    // Ensure companyName is always treated as a string
    if (Array.isArray(companyName)) {
        companyName = companyName[0];
    }

    // Replace 'YOUR_SEAMLESS_AI_API_KEY' with your actual Seamless AI API key
    const apiKey = 'sk_33690f6907e7c04b770a265251fbfccd';

    // Define the Seamless AI API endpoint URL
    // const apiUrl = `https://api.seamless.ai/v1/company/search?name=${encodeURIComponent(companyName)}`;
    //doing clearbit really quick
    const apiUrl = `https://company.clearbit.com/v2/companies/find?domain=${encodeURIComponent(
      companyName
    )}`;


    // Make a GET request to the Seamless AI API
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    // Check if the request was successful
    if (response.status === 200) {
      const data = response.data;
      return res.status(200).json(data);
    } else {
      return res.status(response.status).json(response.data);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: 'An error occurred while fetching data from Seamless AI' });
  }
};

export default seamlessAiHandler;
