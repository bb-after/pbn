import puppeteer, { Page } from 'puppeteer';
import type { NextApiRequest, NextApiResponse } from 'next';
import Sentiment from 'sentiment';

interface SearchRequestBody {
  keyword: string;
  url?: string;
  location: string;
  screenshotType: string;
}

interface SearchResponse {
  screenshot?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { keyword, url, location, screenshotType } = req.body as SearchRequestBody;

  // Basic input validation
  if (!keyword || !location || !screenshotType) {
    return res.status(400).json({
      error: 'Invalid input: keyword, location, and screenshotType are required.',
    });
  }

  if (screenshotType === 'exact_url_match' && !url) {
    return res.status(400).json({ error: 'URL is required for Exact URL Match.' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Set viewport size
    await page.setViewport({
      width: 1600,
      height: 1000,
    });

    // Navigate to Google search
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(keyword)}`, {
      waitUntil: 'networkidle2',
    });

    let found = false;
    let pageIndex = 1;

    // For negative sentiment, we'll only consider the first page to optimize performance
    const maxPages = screenshotType === 'negative_sentiment' ? 1 : 3;

    // Extract the domain from the user-provided URL
    let userDomain: string | null = null;
    if (screenshotType === 'exact_url_match') {
      try {
        userDomain = new URL(url!).hostname.replace(/^www\./, '');
      } catch (error) {
        return res.status(400).json({ error: 'Invalid URL provided.' });
      }
    }

    while (pageIndex <= maxPages) {
      // Scroll to the bottom of the page to ensure all results are loaded
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Extract search results
      const searchResults = await page.evaluate(() => {
        const results: { link: string; text: string }[] = [];
        const items = document.querySelectorAll('div.g'); // Google search results
        items.forEach((item) => {
          const linkElement = item.querySelector('a');
          const textElement = item.querySelector('div.IsZvec');
          if (linkElement) {
            const link = (linkElement as HTMLAnchorElement).href;
            const text = textElement?.textContent || '';
            results.push({ link, text });
          }
        });
        return results;
      });

      if (screenshotType === 'exact_url_match') {
        // Domain Match logic
        const matchIndex = searchResults.findIndex((result) => {
          try {
            const resultDomain = new URL(result.link).hostname.replace(/^www\./, '');
            return (
              resultDomain === userDomain ||
              resultDomain.endsWith('.' + userDomain)
            );
          } catch (e) {
            return false;
          }
        });

        if (matchIndex !== -1) {
          // Highlight and scroll to the result
          await highlightResult(page, matchIndex);
          const screenshot = await takeScreenshot(page);
          found = true;
          return res.status(200).json({ screenshot });
        }
      } else if (screenshotType === 'negative_sentiment') {
        // Negative Sentiment logic
        const sentiment = new Sentiment();
        const negativeIndices: number[] = [];

        searchResults.forEach((result, index) => {
          if (result.text) {
            const resultSentiment = sentiment.analyze(result.text);
            if (resultSentiment.score < 0) {
              negativeIndices.push(index);
            }
          }
        });

        if (negativeIndices.length > 0) {
          // Highlight all negative sentiment results
          await page.evaluate((indices: number[]) => {
            const results = document.querySelectorAll('div.g');
            indices.forEach((i: number) => {
              const element = results[i] as HTMLElement;
              element.style.border = '5px solid red';
            });
            // Scroll to the first negative result
            const firstElement = results[indices[0]] as HTMLElement;
            firstElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
          }, negativeIndices);

          await new Promise((resolve) => setTimeout(resolve, 1000));
          const screenshot = await takeScreenshot(page);
          found = true;
          return res.status(200).json({ screenshot });
        }
      } else if (screenshotType === 'keyword_match') {
        // Specific Keyword Match logic
        const matchIndices: number[] = [];

        searchResults.forEach((result, index) => {
          if (result.text.toLowerCase().includes(keyword.toLowerCase())) {
            matchIndices.push(index);
          }
        });

        if (matchIndices.length > 0) {
          // Highlight all keyword matches
          await page.evaluate((indices: number[]) => {
            const results = document.querySelectorAll('div.g');
            indices.forEach((i: number) => {
              const element = results[i] as HTMLElement;
              element.style.border = '5px solid red';
            });
            // Scroll to the first match
            const firstElement = results[matchIndices[0]] as HTMLElement;
            firstElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
          }, matchIndices);

          await new Promise((resolve) => setTimeout(resolve, 1000));
          const screenshot = await takeScreenshot(page);
          found = true;
          return res.status(200).json({ screenshot });
        }
      }

      // Go to the next page if not found and allowed
      const nextPageButton = await page.$('a#pnnext');
      if (!nextPageButton) break;

      await Promise.all([
        nextPageButton.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
      ]);
      pageIndex++;
    }

    if (!found) {
      res.status(404).json({ error: 'No matching results found.' });
    }
  } catch (error) {
    console.error('Error while searching:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (browser) await browser.close();
  }
}

async function highlightResult(page: Page, index: number) {
  await page.evaluate((matchIndex: number) => {
    const results = document.querySelectorAll('div.g');
    const element = results[matchIndex] as HTMLElement;
    element.style.border = '5px solid red';
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  }, index);

  await new Promise((resolve) => setTimeout(resolve, 1000));
}

async function takeScreenshot(page: Page) {
  const screenshot = await page.screenshot({ fullPage: true, encoding: 'base64' });
  return `data:image/png;base64,${screenshot}`;
}
