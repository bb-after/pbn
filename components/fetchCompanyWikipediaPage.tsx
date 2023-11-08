import axios from 'axios';
import cheerio from 'cheerio';

async function fetchCompanyWikipediaText(companyName: string): Promise<string | null> {
  try {
    // Encode the company name for the Wikipedia URL
    const encodedCompanyName = encodeURIComponent(companyName);

    // Construct the Wikipedia URL
    const wikipediaURL = `https://en.wikipedia.org/wiki/${encodedCompanyName}`;

    // Make an HTTP GET request to the Wikipedia page
    const response = await axios.get(wikipediaURL);

    // Check if the response status is OK
    if (response.status === 200) {
      // Load the HTML content into Cheerio for parsing
      const $ = cheerio.load(response.data);

      // Extract the main text content from the page (you may need to customize this based on the Wikipedia page structure)
      const mainText = $('#mw-content-text').text();

      // Return the parsed text
      return mainText.trim();
    } else {
      console.error(`Failed to retrieve Wikipedia page for ${companyName}`);
      return null;
    }
  } catch (error: any) {
    console.error(`Error while fetching Wikipedia page: ${error.message}`);
    return null;
  }
}

// Example usage:
const companyName = 'Google';
fetchCompanyWikipediaText(companyName)
  .then((text) => {
    if (text) {
      console.log(`Wikipedia Text for ${companyName}:\n${text}`);
    } else {
      console.log(`Wikipedia page not found for ${companyName}`);
    }
  })
  .catch((error) => {
    console.error(`Error: ${error.message}`);
  });
