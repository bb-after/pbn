import { fetchSerpResults } from '../../services/serpApiClient';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('serpApiClient', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    // Set up environment variable for tests
    process.env.SERP_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.SERP_API_KEY;
  });

  it('should throw error when SERP_API_KEY is not configured', async () => {
    delete process.env.SERP_API_KEY;

    await expect(fetchSerpResults({ keyword: 'test' })).rejects.toThrow(
      'SerpAPI key not configured. Please set SERPAPI_KEY environment variable.'
    );
  });

  it('should construct correct URL and fetch organic results', async () => {
    const mockResponse = {
      search_metadata: {
        id: 'test-id',
        raw_html_file: 'https://test.html'
      },
      organic_results: [
        {
          position: 1,
          title: 'Test Result',
          link: 'https://example.com',
          snippet: 'Test snippet',
          displayed_link: 'example.com'
        }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const result = await fetchSerpResults({
      keyword: 'test query',
      location: 'New York',
      googleDomain: 'google.com',
      language: 'en',
      searchType: undefined,
      countryCode: 'us'
    });

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('serpapi.com/search'));
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('q=test+query'));
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('location=New+York'));
    
    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('Test Result');
    expect(result.searchMetadata?.id).toBe('test-id');
    expect(result.searchMetadata?.rawHtmlUrl).toBe('https://test.html');
  });

  it('should map news results correctly', async () => {
    const mockResponse = {
      search_metadata: { id: 'test-id' },
      news_results: [
        {
          position: 1,
          title: 'News Title',
          link: 'https://news.com',
          snippet: 'News snippet',
          source: 'News Source'
        }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const result = await fetchSerpResults({
      keyword: 'test',
      searchType: 'nws'
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].displayed_link).toBe('News Source');
  });

  it('should map shopping results correctly', async () => {
    const mockResponse = {
      search_metadata: { id: 'test-id' },
      shopping_results: [
        {
          position: 1,
          title: 'Product Title',
          link: 'https://shop.com',
          price: '$99.99',
          source: 'Shop Source'
        }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const result = await fetchSerpResults({
      keyword: 'test',
      searchType: 'shop'
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].snippet).toBe('$99.99');
    expect(result.results[0].displayed_link).toBe('Shop Source');
  });

  it('should handle API errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request'
    } as Response);

    await expect(fetchSerpResults({ keyword: 'test' })).rejects.toThrow(
      'SerpAPI error: 400 - Bad Request'
    );
  });

  it('should handle SerpAPI response errors', async () => {
    const mockResponse = {
      error: 'Invalid API key'
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    await expect(fetchSerpResults({ keyword: 'test' })).rejects.toThrow(
      'SerpAPI error: Invalid API key'
    );
  });

  it('should handle page 2 requests', async () => {
    const mockResponse = {
      search_metadata: { id: 'test-id-page2' },
      organic_results: []
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    await fetchSerpResults({
      keyword: 'test',
      startPage: 1
    });

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('start=10'));
  });
});