import { processHighlightMatches } from '../../services/stillbrookService';
import { SerpApiResult } from '../../utils/stillbrook/highlighting';
import type { SearchRequestBody, AuthenticatedUser } from '../../types/stillbrook';

// Mock Sentiment since it's used internally
jest.mock('sentiment', () => {
  return jest.fn().mockImplementation(() => ({
    analyze: jest.fn((text: string) => {
      const lowerText = text.toLowerCase();
      
      // Count positive and negative words
      const positiveWords = ['good', 'great', 'excellent', 'outstanding', 'amazing'];
      const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing'];
      
      let positiveCount = 0;
      let negativeCount = 0;
      
      positiveWords.forEach(word => {
        if (lowerText.includes(word)) positiveCount++;
      });
      
      negativeWords.forEach(word => {
        if (lowerText.includes(word)) negativeCount++;
      });
      
      // Calculate net sentiment score
      const score = positiveCount - negativeCount;
      return { score };
    })
  }));
});

describe('processHighlightMatches', () => {
  const mockResults: SerpApiResult[] = [
    {
      position: 1,
      title: 'React Tutorial for Beginners',
      link: 'https://example.com/react-tutorial',
      snippet: 'Learn React with this comprehensive tutorial',
      displayed_link: 'example.com'
    },
    {
      position: 2,
      title: 'Advanced React Patterns',
      link: 'https://reactjs.org/advanced-patterns',
      snippet: 'Explore advanced React patterns and techniques',
      displayed_link: 'reactjs.org'
    },
    {
      position: 3,
      title: 'Vue vs React Comparison',
      link: 'https://developer.com/vue-vs-react',
      snippet: 'Comparing Vue and React frameworks for modern development',
      displayed_link: 'developer.com'
    },
    {
      position: 4,
      title: 'Node.js Backend Development',
      link: 'https://nodejs.org/backend-guide',
      snippet: 'Build scalable backend applications with Node.js',
      displayed_link: 'nodejs.org'
    },
    {
      position: 5,
      title: 'JavaScript Best Practices',
      link: 'https://example.com/js-practices',
      snippet: 'Follow these JavaScript best practices for clean code',
      displayed_link: 'example.com'
    }
  ];

  describe('sentiment thresholds', () => {
    it('only flags results with sufficiently negative sentiment', () => {
      const results: SerpApiResult[] = [
        {
          position: 10,
          title: 'Overwhelmingly negative article',
          link: 'https://neg.example.com/strong',
          snippet: 'This review is bad and terrible in every way',
        },
        {
          position: 11,
          title: 'Mildly negative article',
          link: 'https://neg.example.com/weak',
          snippet: 'This review is bad but has some redeeming qualities',
        },
      ];

      const { uniqueNegativeMatches } = processHighlightMatches({
        organicResults: results,
        enableNegativeSentiment: true,
      });

      expect(uniqueNegativeMatches.map(match => match.position)).toEqual([10]);
    });

    it('only flags results with sufficiently positive sentiment', () => {
      const results: SerpApiResult[] = [
        {
          position: 20,
          title: 'Extremely positive experience',
          link: 'https://pos.example.com/strong',
          snippet: 'This product is good and great for everyone',
        },
        {
          position: 21,
          title: 'Slightly positive experience',
          link: 'https://pos.example.com/weak',
          snippet: 'This product is good but has some trade-offs',
        },
      ];

      const { uniquePositiveMatches } = processHighlightMatches({
        organicResults: results,
        enablePositiveSentiment: true,
      });

      expect(uniquePositiveMatches.map(match => match.position)).toEqual([20]);
    });
  });

  describe('negative keyword matching', () => {
    it('should return multiple results when keyword appears in multiple search results', () => {
      const result = processHighlightMatches({
        organicResults: mockResults,
        keywords: ['react'],
        enableNegativeKeywords: true,
      });

      expect(result.uniqueNegativeMatches).toHaveLength(3);
      expect(result.uniqueNegativeMatches.map(r => r.position)).toEqual([1, 2, 3]);
      expect(result.allMatches).toHaveLength(3);
    });

    it('should return ALL instances when the same keyword appears in multiple different results', () => {
      // This test specifically ensures we don't just return the first match
      const keywordTestResults: SerpApiResult[] = [
        {
          position: 1,
          title: 'First tutorial about JavaScript',
          link: 'https://site1.com/js1',
          snippet: 'Learn JavaScript fundamentals',
          displayed_link: 'site1.com'
        },
        {
          position: 2,
          title: 'Second tutorial about Python',
          link: 'https://site2.com/python',
          snippet: 'Python basics for beginners',
          displayed_link: 'site2.com'
        },
        {
          position: 3,
          title: 'Third tutorial about JavaScript',
          link: 'https://site3.com/js2',
          snippet: 'Advanced JavaScript concepts',
          displayed_link: 'site3.com'
        },
        {
          position: 4,
          title: 'Fourth tutorial about Go',
          link: 'https://site4.com/go',
          snippet: 'Go programming language tutorial',
          displayed_link: 'site4.com'
        },
        {
          position: 5,
          title: 'Fifth tutorial covers JavaScript',
          link: 'https://site5.com/js3',
          snippet: 'JavaScript tips and tricks',
          displayed_link: 'site5.com'
        }
      ];

      const result = processHighlightMatches({
        organicResults: keywordTestResults,
        keywords: ['javascript', 'tutorial'],
        enableNegativeKeywords: true,
      });

      // Should match:
      // - Position 1: has both "javascript" and "tutorial"
      // - Position 2: has "tutorial" 
      // - Position 3: has both "javascript" and "tutorial"
      // - Position 4: has "tutorial"
      // - Position 5: has both "javascript" and "tutorial"
      expect(result.uniqueNegativeMatches).toHaveLength(5);
      expect(result.uniqueNegativeMatches.map(r => r.position)).toEqual([1, 2, 3, 4, 5]);
      
      // Verify specific results contain the keywords
      const positions1And3And5 = result.uniqueNegativeMatches.filter(r => [1, 3, 5].includes(r.position));
      positions1And3And5.forEach(match => {
        const text = `${match.title} ${match.snippet}`.toLowerCase();
        expect(text).toMatch(/javascript/);
        expect(text).toMatch(/tutorial/);
      });

      const positions2And4 = result.uniqueNegativeMatches.filter(r => [2, 4].includes(r.position));
      positions2And4.forEach(match => {
        const text = `${match.title} ${match.snippet}`.toLowerCase();
        expect(text).toMatch(/tutorial/);
      });
    });

    it('should match keywords case-insensitively', () => {
      const result = processHighlightMatches({
        organicResults: mockResults,
        keywords: ['REACT', 'JavaScript'],
        enableNegativeKeywords: true,
      });

      expect(result.uniqueNegativeMatches).toHaveLength(4); // 3 React matches + 1 JavaScript match
      expect(result.uniqueNegativeMatches.map(r => r.position).sort()).toEqual([1, 2, 3, 5]);
    });

    it('should match keywords in both title and snippet', () => {
      const testResults: SerpApiResult[] = [
        {
          position: 1,
          title: 'Tutorial contains keyword',
          link: 'https://example.com/1',
          snippet: 'This snippet does not contain the search term',
          displayed_link: 'example.com'
        },
        {
          position: 2,
          title: 'This title has no matches',
          link: 'https://example.com/2',
          snippet: 'But this snippet contains keyword here',
          displayed_link: 'example.com'
        },
        {
          position: 3,
          title: 'No matches anywhere',
          link: 'https://example.com/3',
          snippet: 'Nothing to see here',
          displayed_link: 'example.com'
        }
      ];

      const result = processHighlightMatches({
        organicResults: testResults,
        keywords: ['keyword'],
        enableNegativeKeywords: true,
      });

      expect(result.uniqueNegativeMatches).toHaveLength(2);
      expect(result.uniqueNegativeMatches.map(r => r.position)).toEqual([1, 2]);
    });

    it('should handle multiple keywords and return results with any keyword match', () => {
      const result = processHighlightMatches({
        organicResults: mockResults,
        keywords: ['react', 'node', 'vue'],
        enableNegativeKeywords: true,
      });

      expect(result.uniqueNegativeMatches).toHaveLength(4); // positions 1, 2, 3, 4
      expect(result.uniqueNegativeMatches.map(r => r.position).sort()).toEqual([1, 2, 3, 4]);
    });

    it('should return empty array when no keywords match', () => {
      const result = processHighlightMatches({
        organicResults: mockResults,
        keywords: ['python', 'django'],
        enableNegativeKeywords: true,
      });

      expect(result.uniqueNegativeMatches).toHaveLength(0);
      expect(result.allMatches).toHaveLength(0);
    });

    it('should handle empty keywords array', () => {
      const result = processHighlightMatches({
        organicResults: mockResults,
        keywords: [],
        enableNegativeKeywords: true,
      });

      expect(result.uniqueNegativeMatches).toHaveLength(0);
    });

    it('should not match when enableNegativeKeywords is false', () => {
      const result = processHighlightMatches({
        organicResults: mockResults,
        keywords: ['react'],
        enableNegativeKeywords: false,
      });

      expect(result.uniqueNegativeMatches).toHaveLength(0);
    });
  });

  describe('positive keyword matching', () => {
    it('should return multiple results when positive keyword appears in multiple search results', () => {
      const result = processHighlightMatches({
        organicResults: mockResults,
        positiveKeywords: ['react'],
        enablePositiveKeywords: true,
      });

      expect(result.uniquePositiveMatches).toHaveLength(3);
      expect(result.uniquePositiveMatches.map(r => r.position)).toEqual([1, 2, 3]);
      expect(result.allMatches).toHaveLength(3);
    });

    it('should handle multiple positive keywords', () => {
      const result = processHighlightMatches({
        organicResults: mockResults,
        positiveKeywords: ['tutorial', 'patterns', 'practices'],
        enablePositiveKeywords: true,
      });

      expect(result.uniquePositiveMatches).toHaveLength(3); // positions 1, 2, 5
      expect(result.uniquePositiveMatches.map(r => r.position).sort()).toEqual([1, 2, 5]);
    });
  });

  describe('URL matching', () => {
    it('should return multiple results when domain appears in multiple search results', () => {
      const result = processHighlightMatches({
        organicResults: mockResults,
        urls: ['https://example.com'],
        enableNegativeUrls: true,
      });

      expect(result.uniqueNegativeMatches).toHaveLength(2); // positions 1, 5
      expect(result.uniqueNegativeMatches.map(r => r.position)).toEqual([1, 5]);
    });

    it('should return ALL instances when the same domain appears in multiple search results', () => {
      // Create test data with the same domain appearing multiple times
      const urlTestResults: SerpApiResult[] = [
        {
          position: 1,
          title: 'First article on TechCorp',
          link: 'https://techcorp.com/article1',
          snippet: 'First article about technology',
          displayed_link: 'techcorp.com'
        },
        {
          position: 2,
          title: 'Different site content',
          link: 'https://otherdomain.com/content',
          snippet: 'Content from different domain',
          displayed_link: 'otherdomain.com'
        },
        {
          position: 3,
          title: 'Second article on TechCorp',
          link: 'https://techcorp.com/article2',
          snippet: 'Second article about innovation',
          displayed_link: 'techcorp.com'
        },
        {
          position: 4,
          title: 'Another different site',
          link: 'https://anotherdomain.com/page',
          snippet: 'Content from another domain',
          displayed_link: 'anotherdomain.com'
        },
        {
          position: 5,
          title: 'Third article on TechCorp',
          link: 'https://www.techcorp.com/article3', // with www prefix
          snippet: 'Third article about future tech',
          displayed_link: 'www.techcorp.com'
        },
        {
          position: 6,
          title: 'Subdomain on TechCorp',
          link: 'https://blog.techcorp.com/post1',
          snippet: 'Blog post on TechCorp subdomain',
          displayed_link: 'blog.techcorp.com'
        }
      ];

      const result = processHighlightMatches({
        organicResults: urlTestResults,
        urls: ['https://techcorp.com'],
        enableNegativeUrls: true,
      });

      // Should match positions 1, 3, 5 (exact domain) and 6 (subdomain)
      // Position 5 should match despite www prefix
      // Position 6 should match as subdomain
      expect(result.uniqueNegativeMatches).toHaveLength(4);
      expect(result.uniqueNegativeMatches.map(r => r.position)).toEqual([1, 3, 5, 6]);
      
      // Verify the matched results actually contain the expected domain
      result.uniqueNegativeMatches.forEach(match => {
        const hostname = new URL(match.link).hostname.replace(/^www\./, '');
        expect(hostname === 'techcorp.com' || hostname.endsWith('.techcorp.com')).toBe(true);
      });
    });

    it('should handle multiple URLs and return all matches across different domains', () => {
      const multiDomainResults: SerpApiResult[] = [
        {
          position: 1,
          title: 'GitHub Repository',
          link: 'https://github.com/user/repo1',
          snippet: 'First GitHub repository',
          displayed_link: 'github.com'
        },
        {
          position: 2,
          title: 'Stack Overflow Question',
          link: 'https://stackoverflow.com/questions/123',
          snippet: 'Programming question and answer',
          displayed_link: 'stackoverflow.com'
        },
        {
          position: 3,
          title: 'Another GitHub Repository',
          link: 'https://github.com/user/repo2',
          snippet: 'Second GitHub repository',
          displayed_link: 'github.com'
        },
        {
          position: 4,
          title: 'Random Blog Post',
          link: 'https://randomsite.com/post',
          snippet: 'Unrelated content',
          displayed_link: 'randomsite.com'
        },
        {
          position: 5,
          title: 'Another Stack Overflow',
          link: 'https://stackoverflow.com/questions/456',
          snippet: 'Another programming question',
          displayed_link: 'stackoverflow.com'
        }
      ];

      const result = processHighlightMatches({
        organicResults: multiDomainResults,
        urls: ['https://github.com', 'https://stackoverflow.com'],
        enableNegativeUrls: true,
      });

      // Should match all GitHub (1, 3) and Stack Overflow (2, 5) results
      expect(result.uniqueNegativeMatches).toHaveLength(4);
      expect(result.uniqueNegativeMatches.map(r => r.position)).toEqual([1, 2, 3, 5]);
      
      // Verify domains
      const githubMatches = result.uniqueNegativeMatches.filter(m => m.link.includes('github.com'));
      const stackoverflowMatches = result.uniqueNegativeMatches.filter(m => m.link.includes('stackoverflow.com'));
      expect(githubMatches).toHaveLength(2);
      expect(stackoverflowMatches).toHaveLength(2);
    });

    it('should handle multiple URLs and return all matches', () => {
      const result = processHighlightMatches({
        organicResults: mockResults,
        urls: ['https://example.com', 'https://reactjs.org'],
        enableNegativeUrls: true,
      });

      expect(result.uniqueNegativeMatches).toHaveLength(3); // positions 1, 2, 5
      expect(result.uniqueNegativeMatches.map(r => r.position).sort()).toEqual([1, 2, 5]);
    });

    it('should match domains without www prefix', () => {
      const testResults: SerpApiResult[] = [
        {
          position: 1,
          title: 'Test 1',
          link: 'https://www.example.com/page1',
          snippet: 'Test snippet 1',
          displayed_link: 'www.example.com'
        },
        {
          position: 2,
          title: 'Test 2',
          link: 'https://example.com/page2',
          snippet: 'Test snippet 2',
          displayed_link: 'example.com'
        }
      ];

      const result = processHighlightMatches({
        organicResults: testResults,
        urls: ['https://example.com'],
        enableNegativeUrls: true,
      });

      expect(result.uniqueNegativeMatches).toHaveLength(2); // Both should match
      expect(result.uniqueNegativeMatches.map(r => r.position)).toEqual([1, 2]);
    });

    it('should handle invalid URLs gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = processHighlightMatches({
        organicResults: mockResults,
        urls: ['invalid-url', 'https://example.com'],
        enableNegativeUrls: true,
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Invalid URL provided:/),
        'invalid-url',
        expect.objectContaining({
          name: 'TypeError',
          message: expect.stringContaining('Invalid URL')
        })
      );
      expect(result.uniqueNegativeMatches).toHaveLength(2); // Should still match valid URL
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('sentiment analysis', () => {
    const sentimentResults: SerpApiResult[] = [
      {
        position: 1,
        title: 'This is a great product',
        link: 'https://example.com/great',
        snippet: 'Excellent quality and good value',
        displayed_link: 'example.com'
      },
      {
        position: 2,
        title: 'Bad experience with this service',
        link: 'https://example.com/bad',
        snippet: 'Terrible customer support and awful quality',
        displayed_link: 'example.com'
      },
      {
        position: 3,
        title: 'Neutral review',
        link: 'https://example.com/neutral',
        snippet: 'This is okay, nothing special',
        displayed_link: 'example.com'
      }
    ];

    it('should identify multiple positive sentiment results', () => {
      const result = processHighlightMatches({
        organicResults: sentimentResults,
        enablePositiveSentiment: true,
      });

      expect(result.uniquePositiveMatches).toHaveLength(1); // Only position 1 has positive words
      expect(result.uniquePositiveMatches[0].position).toBe(1);
    });

    it('should return ALL instances when multiple search results have positive sentiment', () => {
      const multiPositiveSentimentResults: SerpApiResult[] = [
        {
          position: 1,
          title: 'Excellent service and great support',
          link: 'https://reviews.com/review1',
          snippet: 'This company provides excellent and great customer service',
          displayed_link: 'reviews.com'
        },
        {
          position: 2,
          title: 'Average product review',
          link: 'https://reviews.com/review2',
          snippet: 'This product is okay, not amazing but functional',
          displayed_link: 'reviews.com'
        },
        {
          position: 3,
          title: 'Outstanding quality and good value',
          link: 'https://reviews.com/review3',
          snippet: 'Great product with excellent build quality',
          displayed_link: 'reviews.com'
        },
        {
          position: 4,
          title: 'Bad experience overall',
          link: 'https://reviews.com/review4',
          snippet: 'Terrible service and awful support staff',
          displayed_link: 'reviews.com'
        },
        {
          position: 5,
          title: 'Good product with great features',
          link: 'https://reviews.com/review5',
          snippet: 'Excellent functionality and good performance',
          displayed_link: 'reviews.com'
        },
        {
          position: 6,
          title: 'Amazing experience with this company',
          link: 'https://reviews.com/review6',
          snippet: 'Great customer service and excellent product',
          displayed_link: 'reviews.com'
        }
      ];

      const result = processHighlightMatches({
        organicResults: multiPositiveSentimentResults,
        enablePositiveSentiment: true,
      });

      // Should match positions 1, 3, 5, 6 (all have at least two positive sentiment words)
      // Position 2 is only mildly positive (one keyword), Position 4 is negative
      expect(result.uniquePositiveMatches).toHaveLength(4);
      expect(result.uniquePositiveMatches.map(r => r.position)).toEqual([1, 3, 5, 6]);
      
      // Verify each match contains positive sentiment words
      result.uniquePositiveMatches.forEach(match => {
        const text = `${match.title} ${match.snippet}`.toLowerCase();
        const hasPositiveWords = ['excellent', 'great', 'good', 'outstanding', 'amazing'].some(word => 
          text.includes(word)
        );
        expect(hasPositiveWords).toBe(true);
      });
    });

    it('should identify multiple negative sentiment results', () => {
      const result = processHighlightMatches({
        organicResults: sentimentResults,
        enableNegativeSentiment: true,
      });

      expect(result.uniqueNegativeMatches).toHaveLength(1); // Only position 2 has negative words
      expect(result.uniqueNegativeMatches[0].position).toBe(2);
    });

    it('should return ALL instances when multiple search results have negative sentiment', () => {
      const multiNegativeSentimentResults: SerpApiResult[] = [
        {
          position: 1,
          title: 'Terrible experience with this company',
          link: 'https://complaints.com/complaint1',
          snippet: 'Bad customer service and awful product quality',
          displayed_link: 'complaints.com'
        },
        {
          position: 2,
          title: 'Great service and support',
          link: 'https://complaints.com/complaint2',
          snippet: 'Excellent customer service and good product',
          displayed_link: 'complaints.com'
        },
        {
          position: 3,
          title: 'Horrible experience and bad support',
          link: 'https://complaints.com/complaint3',
          snippet: 'Terrible service representative and awful handling',
          displayed_link: 'complaints.com'
        },
        {
          position: 4,
          title: 'Neutral review of the service',
          link: 'https://complaints.com/complaint4',
          snippet: 'This service is okay, nothing particularly noteworthy',
          displayed_link: 'complaints.com'
        },
        {
          position: 5,
          title: 'Disappointing product and bad value',
          link: 'https://complaints.com/complaint5',
          snippet: 'Terrible build quality and awful customer support',
          displayed_link: 'complaints.com'
        }
      ];

      const result = processHighlightMatches({
        organicResults: multiNegativeSentimentResults,
        enableNegativeSentiment: true,
      });

      // Should match positions 1, 3, 5 (all with negative sentiment words)
      // Position 2 is positive, Position 4 is neutral
      expect(result.uniqueNegativeMatches).toHaveLength(3);
      expect(result.uniqueNegativeMatches.map(r => r.position)).toEqual([1, 3, 5]);
      
      // Verify each match contains negative sentiment words
      result.uniqueNegativeMatches.forEach(match => {
        const text = `${match.title} ${match.snippet}`.toLowerCase();
        const hasNegativeWords = ['terrible', 'bad', 'awful', 'horrible', 'disappointing'].some(word => 
          text.includes(word)
        );
        expect(hasNegativeWords).toBe(true);
      });
    });

    it('should handle mixed sentiment scenarios and return all positive and negative matches', () => {
      const mixedSentimentResults: SerpApiResult[] = [
        {
          position: 1,
          title: 'Great product but bad support',
          link: 'https://mixed.com/review1',
          snippet: 'Excellent product quality but terrible customer service',
          displayed_link: 'mixed.com'
        },
        {
          position: 2,
          title: 'Good experience overall',
          link: 'https://mixed.com/review2',
          snippet: 'Great service and excellent support staff',
          displayed_link: 'mixed.com'
        },
        {
          position: 3,
          title: 'Neutral review',
          link: 'https://mixed.com/review3',
          snippet: 'This product works as expected, nothing more',
          displayed_link: 'mixed.com'
        },
        {
          position: 4,
          title: 'Bad experience with good outcome',
          link: 'https://mixed.com/review4',
          snippet: 'Awful initial service but great final resolution',
          displayed_link: 'mixed.com'
        }
      ];

      const positiveResult = processHighlightMatches({
        organicResults: mixedSentimentResults,
        enablePositiveSentiment: true,
      });

      const negativeResult = processHighlightMatches({
        organicResults: mixedSentimentResults,
        enableNegativeSentiment: true,
      });

      // Position 2 has net positive sentiment (good, great, excellent)
      // Positions 1 and 4 have mixed sentiment (equal positive and negative words = score 0)
      expect(positiveResult.uniquePositiveMatches).toHaveLength(1);
      expect(positiveResult.uniquePositiveMatches.map(r => r.position)).toEqual([2]);

      // No results should have net negative sentiment in this mixed scenario
      // (Position 1 and 4 have equal positive and negative words = score 0)  
      expect(negativeResult.uniqueNegativeMatches).toHaveLength(0);
    });

    it('should handle sentiment analysis on titles when snippets are empty', () => {
      const titleOnlyResults: SerpApiResult[] = [
        {
          position: 1,
          title: 'Excellent and great product review',
          link: 'https://example.com/1',
          snippet: '',
          displayed_link: 'example.com'
        },
        {
          position: 2,
          title: 'Terrible and awful service complaint',
          link: 'https://example.com/2',
          snippet: '',
          displayed_link: 'example.com'
        },
        {
          position: 3,
          title: 'Regular product information',
          link: 'https://example.com/3',
          snippet: '',
          displayed_link: 'example.com'
        }
      ];

      const positiveResult = processHighlightMatches({
        organicResults: titleOnlyResults,
        enablePositiveSentiment: true,
      });

      const negativeResult = processHighlightMatches({
        organicResults: titleOnlyResults,
        enableNegativeSentiment: true,
      });

      expect(positiveResult.uniquePositiveMatches).toHaveLength(1);
      expect(positiveResult.uniquePositiveMatches[0].position).toBe(1);

      expect(negativeResult.uniqueNegativeMatches).toHaveLength(1);
      expect(negativeResult.uniqueNegativeMatches[0].position).toBe(2);
    });
  });

  describe('combined matching and deduplication', () => {
    it('should combine negative and positive matches without duplicates', () => {
      const result = processHighlightMatches({
        organicResults: mockResults,
        keywords: ['react'],
        positiveKeywords: ['react', 'tutorial'],
        enableNegativeKeywords: true,
        enablePositiveKeywords: true,
      });

      expect(result.uniqueNegativeMatches).toHaveLength(3); // react matches
      expect(result.uniquePositiveMatches).toHaveLength(3); // react + tutorial matches
      expect(result.allMatches).toHaveLength(3); // Deduplicated total (positions 1, 2, 3)
      expect(result.allMatches.map(r => r.position)).toEqual([1, 2, 3]);
    });

    it('should deduplicate by position correctly', () => {
      const result = processHighlightMatches({
        organicResults: mockResults,
        urls: ['https://example.com'],
        keywords: ['tutorial'],
        enableNegativeUrls: true,
        enableNegativeKeywords: true,
      });

      // Position 1 matches both URL (example.com) and keyword (tutorial)
      // Should only appear once in results
      expect(result.uniqueNegativeMatches).toHaveLength(2); // positions 1, 5 (URL matches)
      expect(result.allMatches).toHaveLength(2); // Should be deduplicated
    });

    it('should handle empty organic results', () => {
      const result = processHighlightMatches({
        organicResults: [],
        keywords: ['react'],
        enableNegativeKeywords: true,
      });

      expect(result.uniqueNegativeMatches).toHaveLength(0);
      expect(result.uniquePositiveMatches).toHaveLength(0);
      expect(result.allMatches).toHaveLength(0);
    });
  });
});
describe('runSearch no-match fallback', () => {
  const baseRequest: SearchRequestBody & {
    country: string;
    countryCode: string;
  } = {
    keyword: 'test',
    url: '',
    urls: [],
    keywords: [],
    positiveUrls: [],
    positiveKeywords: [],
    location: '',
    googleDomain: 'google.com',
    language: 'en',
    searchType: '',
    screenshotType: 'combined',
    savedSearchId: undefined,
    includePage2: false,
    enableNegativeUrls: false,
    enableNegativeSentiment: false,
    enableNegativeKeywords: false,
    enablePositiveUrls: false,
    enablePositiveSentiment: false,
    enablePositiveKeywords: false,
    country: 'us',
    countryCode: 'us',
  };

  const user: AuthenticatedUser = {
    id: 1,
    username: 'tester',
    email: 'tester@example.com',
  };

  beforeEach(() => {
    jest.resetModules();
  });

  it('returns rendered HTML when both positive and negative matches are empty', async () => {
    jest.doMock('../../services/serpApiClient', () => ({
      fetchSerpResults: jest.fn().mockResolvedValue({
        results: [
          {
            position: 1,
            title: 'Example result',
            link: 'https://example.com',
            snippet: 'An example snippet',
          },
        ],
        searchMetadata: { rawHtmlUrl: 'https://example.com/html' },
      }),
    }));

    jest.doMock('../../utils/stillbrook/html-renderer', () => ({
      renderHtmlWithBrowser: jest.fn().mockResolvedValue('<div class="MjjYud">Rendered</div>'),
    }));

    const createSubmissionMock = jest.fn().mockReturnValue({ id: 123 });
    jest.doMock('../../utils/stillbrook/submission', () => {
      const actual = jest.requireActual('../../utils/stillbrook/submission');
      return {
        ...actual,
        createSubmission: createSubmissionMock,
      };
    });

    const { runSearch } = await import('../../services/stillbrookService');

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const startTime = Date.now();
    const result = await runSearch({
      user,
      request: baseRequest,
      startTime,
    });

    expect(result.statusCode).toBe(200);
    expect(result.response.matchedResults).toEqual([]);
    expect(result.response.noMatches).toBe(true);
    expect(result.response.htmlPreview).toContain('Rendered');
    expect(result.response.page2HtmlPreview).toBeUndefined();

    const { fetchSerpResults } = await import('../../services/serpApiClient');
    const { renderHtmlWithBrowser } = await import('../../utils/stillbrook/html-renderer');

    expect(fetchSerpResults).toHaveBeenCalledTimes(1);
    expect(renderHtmlWithBrowser).toHaveBeenCalledTimes(1);

    jest.spyOn(console, 'log').mockRestore();
    jest.spyOn(console, 'warn').mockRestore();
  });

  it('returns page 2 preview when includePage2 is true', async () => {
    jest.doMock('../../services/serpApiClient', () => ({
      fetchSerpResults: jest.fn()
        .mockResolvedValueOnce({
          results: [
            {
              position: 1,
              title: 'Example result page 1',
              link: 'https://example.com/page1',
              snippet: 'Page 1 snippet',
            },
          ],
          searchMetadata: { rawHtmlUrl: 'https://example.com/html1' },
        })
        .mockResolvedValueOnce({
          results: [
            {
              position: 11,
              title: 'Example result page 2',
              link: 'https://example.com/page2',
              snippet: 'Page 2 snippet',
            },
          ],
          searchMetadata: { rawHtmlUrl: 'https://example.com/html2' },
        }),
    }));

    jest.doMock('../../utils/stillbrook/html-renderer', () => ({
      renderHtmlWithBrowser: jest
        .fn()
        .mockResolvedValueOnce('<div class="MjjYud">Rendered Page 1</div>')
        .mockResolvedValueOnce('<div class="MjjYud">Rendered Page 2</div>'),
    }));

    const { runSearch } = await import('../../services/stillbrookService');
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await runSearch({
      user,
      request: { ...baseRequest, includePage2: true },
      startTime: Date.now(),
    });

    expect(result.statusCode).toBe(200);
    expect(result.response.htmlPreview).toContain('Rendered');
    expect(result.response.page2HtmlPreview).toBeDefined();

    const { fetchSerpResults } = await import('../../services/serpApiClient');
    const { renderHtmlWithBrowser } = await import('../../utils/stillbrook/html-renderer');

    expect(fetchSerpResults).toHaveBeenCalledTimes(2);
    expect(fetchSerpResults).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        keyword: baseRequest.keyword,
        startPage: 1,
      })
    );
    expect(renderHtmlWithBrowser).toHaveBeenCalledTimes(2);
    expect(renderHtmlWithBrowser).toHaveBeenNthCalledWith(1, 'https://example.com/html2');
    expect(renderHtmlWithBrowser).toHaveBeenNthCalledWith(2, 'https://example.com/html1');

    jest.spyOn(console, 'log').mockRestore();
    jest.spyOn(console, 'warn').mockRestore();
  });
});