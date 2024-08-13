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

  it('should add paragraphs every 3-5 sentences when there are no double line breaks', () => {
    const content = 'Sentence one. Sentence two. Sentence three. Sentence four. Sentence five. Sentence six.';
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

  it('should remove multiple # symbols with spaces from content', () => {
    const content = 'Data privacy is another area where AI is making substantial contributions. ### This should be removed.';
    const result = formatSuperstarContent(content, 'Title');
    expect(result.content).toBe('Data privacy is another area where AI is making substantial contributions. This should be removed.<br><br>');
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
    expect(result.content).toBe('This is a test.<br><br>This should have a break after it.<br><br>Another break here.<br><br>');
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
    Data privacy is another area where AI is making substantial contributions. <br>Challenges and Ethical Considerations<br>While the integration of AI in cybersecurity offers numerous benefits, <br>The Future of AI in Cybersecurity<br>Looking ahead, the role of AI in cybersecurity is set to expand.<br><br>In conclusion, AI is transforming the cybersecurity landscape.<br><br>`;
    expect(result.content).toBe(expectedContent.trim());
  });
});
