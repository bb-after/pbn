import { formatSuperstarContent } from './formatSuperstarContent';

describe('formatSuperstarContent', () => {
  const logDifference = (expected: string, received: string) => {
    console.log('Expected Length:', expected.length);
    console.log('Received Length:', received.length);
    for (let i = 0; i < Math.max(expected.length, received.length); i++) {
      const expectedChar = expected[i] || '';
      const receivedChar = received[i] || '';
      if (expectedChar !== receivedChar) {
        console.log(
          `Difference at index ${i}: Expected '${expectedChar}' (code ${expectedChar.charCodeAt(0)}) but received '${receivedChar}' (code ${receivedChar.charCodeAt(0)})`
        );
      }
    }
  };

  it('should remove leading and trailing quotes from seoTitle', () => {
    const result = formatSuperstarContent('Some content', '"Title with quotes"');
    expect(result.title).toBe('Title with quotes');
  });

  it('should handle multiple title suggestions', () => {
    const result = formatSuperstarContent('Some content', '1. "First title" 2. "Second title"');
    expect(result.title).toBe('First title');
  });

  it('should add paragraphs every 3-5 sentences when there are no double line breaks', () => {
    const content =
      'Sentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six.';
    const result = formatSuperstarContent(content, 'Title');
    const paragraphs = result.content.split('<br><br>');
    expect(paragraphs.length).toBeGreaterThan(1);
  });

  it('should remove "Title" keyword if it is the first word and set it as title', () => {
    const content = 'Title\nThis is the content.';
    const result = formatSuperstarContent(content, 'Title');
    expect(result.content).toBe('This is the content.<br><br>');
  });

  it('should replace [text](url) with <a href="url">text</a>', () => {
    const content = 'Check this [link](http://example.com).';
    const result = formatSuperstarContent(content, 'Title');
    expect(result.content).toBe('Check this <a href="http://example.com">link</a>.<br><br>');
  });

  it('should replace multiple # symbols with spaces from content with bolded text', () => {
    const content =
      'Data privacy is another area where AI is making substantial contributions. ### This should be bolded.';
    const result = formatSuperstarContent(content, 'Title');
    expect(result.content).toBe(
      'Data privacy is another area where AI is making substantial contributions. <b>This should be bolded.</b><br><br>'
    );
  });

  it('should handle double asterisks for bold text', () => {
    const content = 'This is **bold** text.';
    const result = formatSuperstarContent(content, 'Title');
    expect(result.content).toBe('This is <b>bold</b> text.<br><br>');
  });

  it('should remove "Conclusion" if followed by a capital letter and add a new paragraph', () => {
    const content = 'This is some content. Conclusion This should start immediately.';
    const result = formatSuperstarContent(content, 'Title');
    expect(result.content).toBe('This is some content. <br>This should start immediately.<br><br>');
  });

  it('should replace all instances of double newlines with <br><br>', () => {
    const content = `This is a test.\n\nThis should have a break after it.\n\nAnother break here.`;
    const result = formatSuperstarContent(content, 'Title');
    expect(result.content).toBe(
      'This is a test.<br><br>This should have a break after it.<br><br>Another break here.<br><br>'
    );
  });

  it('should remove leading and trailing quotes from the title', () => {
    const result = formatSuperstarContent('Some content', '"Title with quotes"');
    expect(result.title).toBe('Title with quotes');
  });

  it('should not alter quotes in the middle of the title', () => {
    const result = formatSuperstarContent('Some content', 'Title with "quotes" in the middle');
    expect(result.title).toBe('Title with "quotes" in the middle');
  });

  it('should correctly format content with complex structure', () => {
    const content = `
    Data privacy is another area where AI is making substantial contributions. 
    #### Challenges and Ethical Considerations
    While the integration of AI in cybersecurity offers numerous benefits, 
    #### The Future of AI in Cybersecurity
    Looking ahead, the role of AI in cybersecurity is set to expand.
    #### Conclusion
    In conclusion, AI is transforming the cybersecurity landscape.
    `;
    const result = formatSuperstarContent(content, 'Title');
    const expectedContent = `
    Data privacy is another area where AI is making substantial contributions. <br><b>Challenges and Ethical Considerations</b><br>While the integration of AI in cybersecurity offers numerous benefits, <br><b>The Future of AI in Cybersecurity</b><br>Looking ahead, the role of AI in cybersecurity is set to expand.<br><br>In conclusion, AI is transforming the cybersecurity landscape.<br><br>`;
    expect(result.content).toBe(expectedContent.trim());
  });
});

// Helper function to extract just the title cleaning logic for testing
function cleanTitle(title: string): string {
  let cleaned = title;

  // Pattern 1: Remove numbered list format like "1. "Title""
  cleaned = cleaned.replace(/^\d+\.\s*"(.+)"$/, '$1');

  // Pattern 2: Remove numbered list format like "1. Title" (without quotes)
  cleaned = cleaned.replace(/^\d+\.\s*(.+)$/, '$1');

  // Pattern 3: Remove leading and trailing quotes
  cleaned = cleaned.replace(/^"(.+)"$/, '$1');

  // Pattern 4: Remove markdown headers (###, ##, etc.)
  cleaned = cleaned.replace(/^#+\s*/, '');

  // Pattern 5: Remove bold markers (**text**)
  cleaned = cleaned.replace(/^\*\*(.+)\*\*$/, '$1');

  // Pattern 6: Handle titles that start with "Title:" or similar
  cleaned = cleaned.replace(/^(Title|Heading|Header):\s*/i, '');

  // Pattern 7: Remove any remaining formatting characters
  cleaned = cleaned.replace(/[*#`_]/g, '');

  // Clean up whitespace and line breaks
  cleaned = cleaned.split('\n')[0].trim();

  return cleaned;
}

describe('cleanTitle function', () => {
  describe('Pattern 1: Numbered list with quotes', () => {
    test('should remove "1. "Title"" format', () => {
      const input = '1. "Digital Transformation: How Technology is Reshaping the Rental Market"';
      const expected = 'Digital Transformation: How Technology is Reshaping the Rental Market';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should remove "2. "Title"" format', () => {
      const input = '2. "Exploring the Future of Flight: Innovations Shaping Aviation"';
      const expected = 'Exploring the Future of Flight: Innovations Shaping Aviation';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should remove "10. "Title"" format (double digits)', () => {
      const input =
        '10. "Eco-Tourism Adventures: Exploring the Hidden Wonders of the World Responsibly"';
      const expected =
        'Eco-Tourism Adventures: Exploring the Hidden Wonders of the World Responsibly';
      expect(cleanTitle(input)).toBe(expected);
    });
  });

  describe('Pattern 2: Numbered list without quotes', () => {
    test('should remove "1. Title" format', () => {
      const input = '1. The Future of Renewable Energy';
      const expected = 'The Future of Renewable Energy';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should remove "5. Title" format', () => {
      const input = '5. Artificial Intelligence in Healthcare';
      const expected = 'Artificial Intelligence in Healthcare';
      expect(cleanTitle(input)).toBe(expected);
    });
  });

  describe('Pattern 3: Quoted titles', () => {
    test('should remove surrounding quotes', () => {
      const input = '"Breaking News in Technology"';
      const expected = 'Breaking News in Technology';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should preserve internal quotes', () => {
      const input = '"The CEO said "Innovation is key" in today\'s market"';
      const expected = 'The CEO said "Innovation is key" in today\'s market';
      expect(cleanTitle(input)).toBe(expected);
    });
  });

  describe('Pattern 4: Markdown headers', () => {
    test('should remove ### headers', () => {
      const input = '### Climate Change Solutions';
      const expected = 'Climate Change Solutions';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should remove ## headers', () => {
      const input = '## Business Strategy Insights';
      const expected = 'Business Strategy Insights';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should remove # headers', () => {
      const input = '# The Ultimate Guide';
      const expected = 'The Ultimate Guide';
      expect(cleanTitle(input)).toBe(expected);
    });
  });

  describe('Pattern 5: Bold markers', () => {
    test('should remove **bold** markers', () => {
      const input = '**Revolutionary Technology Trends**';
      const expected = 'Revolutionary Technology Trends';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should preserve internal bold markers', () => {
      const input = 'The **New** Era of Computing';
      const expected = 'The New Era of Computing';
      expect(cleanTitle(input)).toBe(expected);
    });
  });

  describe('Pattern 6: Title prefixes', () => {
    test('should remove "Title:" prefix', () => {
      const input = 'Title: Market Analysis Report';
      const expected = 'Market Analysis Report';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should remove "Heading:" prefix', () => {
      const input = 'Heading: Financial Forecast';
      const expected = 'Financial Forecast';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should remove "Header:" prefix', () => {
      const input = 'Header: Industry News';
      const expected = 'Industry News';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should be case insensitive', () => {
      const input = 'TITLE: Space Exploration Updates';
      const expected = 'Space Exploration Updates';
      expect(cleanTitle(input)).toBe(expected);
    });
  });

  describe('Pattern 7: Formatting characters', () => {
    test('should remove scattered formatting characters', () => {
      const input = 'Tech*nology** Inno#vation_ Report';
      const expected = 'Technology Innovation Report';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should remove backticks', () => {
      const input = '`Code Review` Best Practices';
      const expected = 'Code Review Best Practices';
      expect(cleanTitle(input)).toBe(expected);
    });
  });

  describe('Line breaks and whitespace', () => {
    test('should take only first line', () => {
      const input = 'Main Title\nSubtitle here\nMore content';
      const expected = 'Main Title';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should trim whitespace', () => {
      const input = '   Spaced Title   ';
      const expected = 'Spaced Title';
      expect(cleanTitle(input)).toBe(expected);
    });
  });

  describe('Complex combinations', () => {
    test('should handle multiple patterns together', () => {
      const input = '1. **"### Title: The Future of AI"**';
      const expected = 'The Future of AI';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should handle numbered quote with markdown', () => {
      const input = '3. "## Revolutionary Healthcare Solutions"';
      const expected = 'Revolutionary Healthcare Solutions';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should handle title prefix with formatting', () => {
      const input = 'Title: **Climate Change** and _Sustainability_';
      const expected = 'Climate Change and Sustainability';
      expect(cleanTitle(input)).toBe(expected);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty string', () => {
      const input = '';
      const expected = '';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should handle just whitespace', () => {
      const input = '   ';
      const expected = '';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should handle just formatting characters', () => {
      const input = '***###';
      const expected = '';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should handle normal title without formatting', () => {
      const input = 'Clean Title Without Any Formatting';
      const expected = 'Clean Title Without Any Formatting';
      expect(cleanTitle(input)).toBe(expected);
    });

    test('should handle numbers in middle of title', () => {
      const input = 'Top 10 Technology Trends for 2024';
      const expected = 'Top 10 Technology Trends for 2024';
      expect(cleanTitle(input)).toBe(expected);
    });
  });

  describe('Real-world examples from production', () => {
    test('should clean the actual problematic titles mentioned', () => {
      const examples = [
        {
          input: '1. "Digital Transformation: How Technology is Reshaping the Rental Market"',
          expected: 'Digital Transformation: How Technology is Reshaping the Rental Market',
        },
        {
          input: '1. "Exploring the Future of Flight: Innovations Shaping Aviation"',
          expected: 'Exploring the Future of Flight: Innovations Shaping Aviation',
        },
        {
          input:
            '1. "Eco-Tourism Adventures: Exploring the Hidden Wonders of the World Responsibly"',
          expected: 'Eco-Tourism Adventures: Exploring the Hidden Wonders of the World Responsibly',
        },
      ];

      examples.forEach(({ input, expected }) => {
        expect(cleanTitle(input)).toBe(expected);
      });
    });
  });
});

describe('formatSuperstarContent integration', () => {
  test('should clean title when used in formatSuperstarContent', () => {
    const content = 'This is some test content for the article.';
    const dirtyTitle = '1. "Sample Article Title"';

    const result = formatSuperstarContent(content, dirtyTitle);

    expect(result.title).toBe('Sample Article Title');
  });

  test('should handle content formatting while cleaning title', () => {
    const content = 'This is test content.';
    const dirtyTitle = '2. "**Important News Update**"';

    const result = formatSuperstarContent(content, dirtyTitle);

    expect(result.title).toBe('Important News Update');
    expect(result.content).toContain('This is test content.');
  });
});
