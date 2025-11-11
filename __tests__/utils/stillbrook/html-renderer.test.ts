import { renderHtmlWithBrowser, HtmlRenderOptions } from '../../../utils/stillbrook/html-renderer';
import puppeteer from 'puppeteer';

// Mock Puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
const mockPuppeteer = puppeteer as jest.Mocked<typeof puppeteer>;

describe('html-renderer', () => {
  let mockBrowser: any;
  let mockPage: any;

  const mockRenderedHtml = `
    <html>
    <head><title>Test Page</title></head>
    <body>
      <div class="search-results">
        <img src="https://example.com/image1.jpg" alt="Test Image">
        <img src="data:image/gif;base64,placeholder" alt="Placeholder">
        <div class="result">
          <h3>Test Result</h3>
          <p>Test snippet</p>
        </div>
      </div>
    </body>
    </html>
  `;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Puppeteer mocks
    mockPage = {
      setViewport: jest.fn(),
      setUserAgent: jest.fn(),
      goto: jest.fn(),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      $$eval: jest.fn().mockImplementation(async (_selector: string, pageFunction: (elements: any[]) => any) =>
        pageFunction(new Array(3).fill({}))
      ),
      content: jest.fn().mockResolvedValue(mockRenderedHtml),
      evaluate: jest.fn(),
    };

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn(),
    };

    mockPuppeteer.launch.mockResolvedValue(mockBrowser);

    // Setup fetch mock for fallback
    mockFetch.mockResolvedValue({
      ok: true,
      text: async () => '<html><body>Fallback HTML</body></html>',
    } as Response);
  });

  describe('renderHtmlWithBrowser', () => {
    const testUrl = 'https://serpapi.com/searches/test/test.html';

    it('should render HTML using headless browser with default options', async () => {
      const result = await renderHtmlWithBrowser(testUrl);

      expect(mockPuppeteer.launch).toHaveBeenCalledWith({
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

      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: 1280,
        height: 800,
      });

      expect(mockPage.setUserAgent).toHaveBeenCalledWith(
        expect.stringContaining('Mozilla/5.0')
      );

      expect(mockPage.goto).toHaveBeenCalledWith(testUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      expect(mockPage.waitForSelector).toHaveBeenCalledWith('[data-rpos]', { timeout: 12000 });
      expect(mockPage.$$eval).toHaveBeenCalledWith('[data-rpos]', expect.any(Function));

      expect(mockBrowser.close).toHaveBeenCalled();
      expect(result).toBe(mockRenderedHtml);
    });

    it('should use custom options when provided', async () => {
      const customOptions: HtmlRenderOptions = {
        viewport: { width: 1920, height: 1080 },
        timeout: 60000,
        userAgent: 'Custom User Agent',
        waitForImages: false,
        scrollForLazyLoad: false,
      };

      await renderHtmlWithBrowser(testUrl, customOptions);

      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: 1920,
        height: 1080,
      });

      expect(mockPage.setUserAgent).toHaveBeenCalledWith('Custom User Agent');

      expect(mockPage.goto).toHaveBeenCalledWith(testUrl, {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });
    });

    it('should handle Google Images search with lazy loading', async () => {
      const googleImagesUrl = 'https://serpapi.com/searches/test/test.html?tbm=isch';
      
      mockPage.evaluate.mockResolvedValue(undefined);

      await renderHtmlWithBrowser(googleImagesUrl, { 
        imageLoadDelay: 100,
        scrollDelay: 100
      });

      expect(mockPage.evaluate).toHaveBeenCalledWith(expect.any(Function));
    }, 15000);

    it('should detect Google Images URL patterns', async () => {
      const testUrls = [
        'https://serpapi.com/searches/test/test.html?tbm=isch',
        'https://google.com/search?q=test&tbm=images',
        'https://regular-url.com/test.html'
      ];

      const fastOptions = { imageLoadDelay: 10, scrollDelay: 10 };

      // Test first URL (should trigger scrolling)
      mockPage.evaluate.mockResolvedValue(undefined);
      await renderHtmlWithBrowser(testUrls[0], fastOptions);
      expect(mockPage.evaluate).toHaveBeenCalled();

      // Reset and test second URL (should also trigger scrolling)
      mockPage.evaluate.mockClear();
      mockPage.waitForSelector.mockClear();
      mockPage.$$eval.mockClear();
      mockBrowser.newPage.mockClear();
      mockBrowser.close.mockClear();
      mockPuppeteer.launch.mockClear();
      mockPage.evaluate.mockResolvedValue(undefined);
      await renderHtmlWithBrowser(testUrls[1], fastOptions);
      expect(mockPage.evaluate).toHaveBeenCalled();

      // Reset and test third URL (should NOT trigger scrolling)
      mockPage.evaluate.mockClear();
      mockPage.waitForSelector.mockClear();
      mockPage.$$eval.mockClear();
      mockBrowser.newPage.mockClear();
      mockBrowser.close.mockClear();
      mockPuppeteer.launch.mockClear();
      await renderHtmlWithBrowser(testUrls[2], fastOptions);
      expect(mockPage.evaluate).not.toHaveBeenCalled();
    }, 20000);

    it('should analyze image URLs and log statistics', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await renderHtmlWithBrowser(testUrl);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rendered HTML has 1 real images and 1 placeholders')
      );

      consoleLogSpy.mockRestore();
    });

    it('should fall back to fetch when browser fails', async () => {
      mockPuppeteer.launch.mockRejectedValue(new Error('Browser launch failed'));

      const result = await renderHtmlWithBrowser(testUrl);

      expect(mockFetch).toHaveBeenCalledWith(testUrl);
      expect(result).toBe('<html><body>Fallback HTML</body></html>');
    });

    it('should handle browser navigation errors gracefully', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      const result = await renderHtmlWithBrowser(testUrl);

      expect(mockBrowser.close).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(testUrl);
      expect(result).toBe('<html><body>Fallback HTML</body></html>');
    });

    it('should handle page content errors gracefully', async () => {
      mockPage.content.mockRejectedValue(new Error('Content extraction failed'));

      const result = await renderHtmlWithBrowser(testUrl);

      expect(mockBrowser.close).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(testUrl);
      expect(result).toBe('<html><body>Fallback HTML</body></html>');
    });

    it('should throw error when both browser and fallback fail', async () => {
      mockPuppeteer.launch.mockRejectedValue(new Error('Browser launch failed'));
      mockFetch.mockRejectedValue(new Error('Fetch failed'));

      await expect(renderHtmlWithBrowser(testUrl)).rejects.toThrow(
        'Both browser rendering and fallback failed'
      );
    });

    it('should throw error when browser fails and fallback returns non-ok response', async () => {
      mockPuppeteer.launch.mockRejectedValue(new Error('Browser launch failed'));
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(renderHtmlWithBrowser(testUrl)).rejects.toThrow(
        'Both browser rendering and fallback failed'
      );
    });

    it('should always close browser even if errors occur', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      await renderHtmlWithBrowser(testUrl);

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle browser close errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockBrowser.close.mockRejectedValue(new Error('Failed to close browser'));

      // Should not throw an error even if browser.close() fails
      const result = await renderHtmlWithBrowser(testUrl, { imageLoadDelay: 10 });

      expect(result).toBe(mockRenderedHtml);
      consoleErrorSpy.mockRestore();
    }, 15000);
  });

  describe('edge cases', () => {
    it('should handle empty HTML content', async () => {
      mockPage.content.mockResolvedValue('');

      const result = await renderHtmlWithBrowser('https://test.com');

      expect(result).toBe('');
    });

    it('should handle HTML with no images', async () => {
      const htmlWithoutImages = '<html><body><p>No images here</p></body></html>';
      mockPage.content.mockResolvedValue(htmlWithoutImages);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await renderHtmlWithBrowser('https://test.com');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rendered HTML has 0 real images and 0 placeholders')
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle malformed image tags gracefully', async () => {
      const htmlWithMalformedImages = `
        <html><body>
          <img>
          <img alt="no src">
          <img src="">
          <img src="https://example.com/image.jpg" alt="valid">
        </body></html>
      `;
      mockPage.content.mockResolvedValue(htmlWithMalformedImages);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await renderHtmlWithBrowser('https://test.com');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rendered HTML has 1 real images and 0 placeholders')
      );

      consoleLogSpy.mockRestore();
    });
  });
});