import { formatSuperstarContent } from './formatSuperstarContent';

describe('formatSuperstarContent', () => {
  const logDifference = (expected: string, received: string) => {
    console.log('Expected Length:', expected.length);
    console.log('Received Length:', received.length);
    for (let i = 0; i < Math.max(expected.length, received.length); i++) {
      const expectedChar = expected[i] || '';
      const receivedChar = received[i] || '';
      if (expectedChar !== receivedChar) {
        console.log(`Difference at index ${i}: Expected '${expectedChar}' (code ${expectedChar.charCodeAt(0)}) but received '${receivedChar}' (code ${receivedChar.charCodeAt(0)})`);
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

  it('should add paragraphs every 3-5 sentences', () => {
    const content = 'Sentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six.';
    const result = formatSuperstarContent(content, 'Title');
    const paragraphs = result.content.split('\n\n');
    expect(paragraphs.length).toBeGreaterThan(1);
  });

  it('should remove "Title" keyword if it is the first word and set it as title', () => {
    const content = 'Title\nThis is the content.';
    const result = formatSuperstarContent(content, 'Title');
    expect(result.content).toBe('This is the content.\n\n');
  });

  it('should replace [text](url) with <a href="url">text</a>', () => {
    const content = 'Check this [link](http://example.com).';
    const result = formatSuperstarContent(content, 'Title');
    expect(result.content).toBe('Check this <a href="http://example.com">link</a>.\n\n');
  });

  it('should replace multiple # symbols in a row with <br><br>', () => {
    const content = 'This is a test. ### This should break.';
    const result = formatSuperstarContent(content, 'Title');
    expect(result.content).toBe('This is a test. <br><br> This should break.\n\n');
  });

  it('should handle double asterisks for bold text', () => {
    const content = 'This is **bold** text.';
    const result = formatSuperstarContent(content, 'Title');
    expect(result.content).toBe('This is <b>bold</b> text.\n\n');
  });

  it('should handle complex content', () => {
    const content = 'Title\nThis is the content. **Bold text**. ### This is a link: [link](http://example.com).';
    const result = formatSuperstarContent(content, 'Title');
    expect(result.content).toContain('<b>Bold text</b>');
    expect(result.content).toContain('<br><br> This is a link: <a href="http://example.com">link</a>.');
  });

  it('should remove "Conclusion" if followed by a capital letter and add a new paragraph', () => {
    const content = 'This is some content. Conclusion This should start immediately.';
    const result = formatSuperstarContent(content, 'Title');
    expect(result.content).toBe('This is some content. <br><br>This should start immediately.\n\n');
  });

  it('should extract title correctly from dynamic title', () => {
    const result = formatSuperstarContent('Some content', '### "CES 2023 Insights: Top Tech Trends and Gadgets Reviewed by Marques Brownlee and Walt Mossberg"This title captures the essence of the content, highlights the authority of the reviewers, and includes relevant keywords like CES 2023, tech trends, and gadgets, which are likely to attract search engine traffic.');
    expect(result.title).toBe('CES 2023 Insights: Top Tech Trends and Gadgets Reviewed by Marques Brownlee and Walt Mossberg');
  });

  it('should remove "##" from the title', () => {
    const result = formatSuperstarContent('Some content', '## Title with hashes');
    expect(result.title).toBe('Title with hashes');
  });

  it('should remove "**" from the title', () => {
    const result = formatSuperstarContent('Some content', '**Title with asterisks**');
    expect(result.title).toBe('Title with asterisks');
  });

  it('should split the title at line breaks and use everything before the first line break', () => {
    const result = formatSuperstarContent('Some content', 'Title with line break\nSecond line');
    expect(result.title).toBe('Title with line break');
  });

  it('should handle a combination of "##", "**", and line breaks in the title', () => {
    const result = formatSuperstarContent('Some content', '## **Complex Title** with line break\nAnd more text');
    expect(result.title).toBe('Complex Title with line break');
  });

});
