import { processContent } from './contentProcessor';

describe('processContent', () => {
  it('should remove leading and trailing quotes from seoTitle', () => {
    const result = processContent('Some content', '"Title with quotes"');
    expect(result.title).toBe('Title with quotes');
  });

  it('should handle multiple title suggestions', () => {
    const result = processContent('Some content', '1. "First title" 2. "Second title"');
    expect(result.title).toBe('First title');
  });

  it('should add paragraphs every 3-5 sentences', () => {
    const content = 'Sentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six.';
    const result = processContent(content, 'Title');
    const paragraphs = result.content.split('\n\n');
    expect(paragraphs.length).toBeGreaterThan(1);
  });

  it('should remove "Title" keyword if it is the first word and set it as title', () => {
    const content = 'Title\nThis is the content.';
    const result = processContent(content, 'Title');
    expect(result.content).toBe('This is the content.');
  });

  it('should replace [text](url) with <a href="url">text</a>', () => {
    const content = 'Check this [link](http://example.com).';
    const result = processContent(content, 'Title');
    expect(result.content).toBe('Check this <a href="http://example.com">link</a>.\n\n');
  });

  it('should replace multiple # symbols in a row with <br><br>', () => {
    const content = 'This is a test. ### This should break.';
    const result = processContent(content, 'Title');
    expect(result.content).toBe('This is a test. <br><br> This should break.\n\n');
  });

  it('should handle double asterisks for bold text', () => {
    const content = 'This is **bold** text.';
    const result = processContent(content, 'Title');
    expect(result.content).toBe('This is <b>bold</b><br><br> text.\n\n');
  });

  it('should handle complex content', () => {
    const content = 'Title\nThis is the content. **Bold text**. ### This is a link: [link](http://example.com).';
    const result = processContent(content, 'Title');
    expect(result.content).toContain('<b>Bold text</b><br><br>');
    expect(result.content).toContain('<br><br> This is a link: <a href="http://example.com">link</a>.');
  });
});
