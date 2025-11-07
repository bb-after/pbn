import puppeteer, { Page } from 'puppeteer';

export interface HtmlRenderOptions {
  viewport?: {
    width: number;
    height: number;
  };
  timeout?: number;
  userAgent?: string;
  waitForImages?: boolean;
  imageLoadDelay?: number;
  scrollForLazyLoad?: boolean;
  scrollDelay?: number;
  waitForSelectors?: string[];
  waitForSelectorTimeout?: number;
}

const DEFAULT_OPTIONS: HtmlRenderOptions = {
  viewport: {
    width: 1280,
    height: 800,
  },
  timeout: 30000,
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  waitForImages: true,
  imageLoadDelay: 8000,
  scrollForLazyLoad: true,
  scrollDelay: 4000,
  waitForSelectorTimeout: 12000,
};

/**
 * Renders HTML using a headless browser to execute JavaScript and load images properly
 */
export async function renderHtmlWithBrowser(
  rawHtmlUrl: string, 
  options: HtmlRenderOptions = {}
): Promise<string> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  console.log('Starting headless browser to render HTML with JavaScript execution...');

  let browser;
  try {
    // Launch headless browser with settings optimized for image loading
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--allow-running-insecure-content',
        '--disable-web-security',
        '--allow-running-insecure-content',
        '--disable-features=VizDisplayCompositor',
      ],
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport(config.viewport!);

    // Set user agent to look like a real browser
    await page.setUserAgent(config.userAgent!);

    console.log(`Navigating to: ${rawHtmlUrl}`);

    // Navigate to the raw HTML file URL
    await page.goto(rawHtmlUrl, {
      waitUntil: 'networkidle0', // Wait until no network requests for 500ms
      timeout: config.timeout,
    });

    await waitForDynamicSelectorsIfNeeded(
      page,
      rawHtmlUrl,
      config.waitForSelectors,
      config.waitForSelectorTimeout
    );

    // Wait for images to load if enabled
    if (config.waitForImages) {
      await new Promise<void>(resolve => setTimeout(resolve, config.imageLoadDelay));
    }
    
    // Handle lazy loading by scrolling if this appears to be a Google Images search
    if (config.scrollForLazyLoad && isGoogleImagesSearch(rawHtmlUrl)) {
      console.log('Detected Google Images search, scrolling to load images...');
      await scrollPageToLoadImages(page);
      // Wait longer after scrolling for images to fully load
      await new Promise<void>(resolve => setTimeout(resolve, config.scrollDelay));
    }

    // Get the fully rendered HTML after JavaScript execution
    const renderedHtml = await page.content();

    console.log(`Successfully rendered HTML with JavaScript. Length: ${renderedHtml.length}`);

    // Debug: Check how many images have real URLs vs placeholders
    const imageStats = analyzeImageUrls(renderedHtml);
    console.log(
      `Rendered HTML has ${imageStats.realImages} real images and ${imageStats.placeholders} placeholders`
    );

    return renderedHtml;
  } catch (error) {
    console.error('Error rendering HTML with browser:', error);

    // Fallback: fetch the raw HTML without JavaScript execution
    console.log('Falling back to raw HTML without JavaScript...');
    console.log('Raw HTML URL:', rawHtmlUrl);
    try {
      const response = await fetch(rawHtmlUrl);
      
      if (response.ok) {
        const fallbackHtml = await response.text();
        console.log('Fallback HTML fetched successfully');
        return fallbackHtml;
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }

    throw new Error('Both browser rendering and fallback failed');
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.warn('Warning: Failed to close browser:', closeError);
      }
    }
  }
}

/**
 * Scrolls the page to trigger lazy loading of images
 */
async function scrollPageToLoadImages(page: Page): Promise<void> {
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if(totalHeight >= scrollHeight){
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

/**
 * Checks if the URL appears to be a Google Images search
 */
function isGoogleImagesSearch(url: string): boolean {
  return url.includes('tbm=isch') || (url.includes('google') && url.includes('images'));
}

function isGoogleSearchResult(url: string): boolean {
  return /google\./i.test(url) || url.includes('serpapi.com/searches');
}

function getSelectorsToWaitFor(url: string, configuredSelectors?: string[]): string[] {
  if (configuredSelectors && configuredSelectors.length > 0) {
    return configuredSelectors;
  }

  if (isGoogleSearchResult(url)) {
    return ['[data-rpos]'];
  }

  return [];
}

async function waitForDynamicSelectorsIfNeeded(
  page: Page,
  url: string,
  configuredSelectors?: string[],
  timeoutOverride?: number
): Promise<void> {
  const selectorsToCheck = getSelectorsToWaitFor(url, configuredSelectors);
  if (selectorsToCheck.length === 0) {
    return;
  }

  const timeout = timeoutOverride ?? DEFAULT_OPTIONS.waitForSelectorTimeout ?? 12000;

  console.log(
    `Waiting for dynamic selectors to appear before capturing HTML: ${selectorsToCheck.join(', ')}`
  );

  for (const selector of selectorsToCheck) {
    try {
      await page.waitForSelector(selector, { timeout });
      const matchCount = await page.$$eval(selector, elements => elements.length);
      console.log(`Selector "${selector}" appeared with ${matchCount} element(s).`);
      return;
    } catch (error) {
      console.warn(
        `Selector "${selector}" did not appear within ${timeout}ms. Error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  console.warn('No dynamic selectors appeared before timeout. Proceeding with captured HTML.');
}

/**
 * Analyzes HTML content to count real images vs placeholders
 */
function analyzeImageUrls(html: string): { realImages: number; placeholders: number } {
  const images = html.match(/<img[^>]*>/gi) || [];
  let realImages = 0;
  let placeholders = 0;

  images.forEach(imgTag => {
    const srcMatch = imgTag.match(/src="([^"]*)"/);
    const src = srcMatch ? srcMatch[1] : '';
    if (src.startsWith('http')) {
      realImages++;
    } else if (src.includes('data:image/gif;base64')) {
      placeholders++;
    }
  });

  return { realImages, placeholders };
}