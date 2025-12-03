import { addCombinedHighlighting, SerpApiResult } from '../../../utils/stillbrook/highlighting';

describe('addCombinedHighlighting', () => {
  const baseHtml = `
    <html>
      <head></head>
      <body>
        <div class="MjjYud">
          <a href="https://example.com/test">Example</a>
          <span>Sample result content</span>
        </div>
      </body>
    </html>
  `;

  const baseResult: SerpApiResult = {
    position: 1,
    title: 'Example',
    link: 'https://example.com/test',
    snippet: 'Sample result content',
  };

  function getContainerClass(html: string): string {
    const match = html.match(/<div[^>]*class="([^"]*MjjYud[^"]*)"[^>]*>/);
    if (!match) {
      throw new Error('Result container not found in HTML');
    }
    return match[1];
  }

  it('keeps negative highlight when result is matched by both positive and negative sets', () => {
    const highlightedHtml = addCombinedHighlighting(
      baseHtml,
      [baseResult],
      [baseResult],
      false,
      ''
    );

    const classAttr = getContainerClass(highlightedHtml);
    expect(classAttr).toContain('negative-result-highlight');
    expect(classAttr).not.toContain('positive-result-highlight');
  });

  it('replaces an existing positive highlight with a negative highlight', () => {
    const preHighlightedHtml = baseHtml.replace(
      'class="MjjYud"',
      'class="MjjYud positive-result-highlight"'
    );

    const highlightedHtml = addCombinedHighlighting(
      preHighlightedHtml,
      [baseResult],
      [],
      false,
      ''
    );

    const classAttr = getContainerClass(highlightedHtml);
    expect(classAttr).toContain('negative-result-highlight');
    expect(classAttr).not.toContain('positive-result-highlight');
  });

  it('applies highlighting to news containers using SoaBEf and WlydOe selectors', () => {
    const newsHtml = `
      <html>
        <head></head>
        <body>
          <div class="SoaBEf">
            <a href="https://news.example.com/article" class="WlydOe">News Article</a>
            <span>Breaking story content</span>
          </div>
        </body>
      </html>
    `;

    const newsResult: SerpApiResult = {
      position: 1,
      title: 'News Article',
      link: 'https://news.example.com/article',
      snippet: 'Breaking story content',
    };

    const highlightedHtml = addCombinedHighlighting(
      newsHtml,
      [newsResult],
      [],
      false,
      'nws'
    );

    const newsClassMatch = highlightedHtml.match(/<div[^>]*class="([^"]*SoaBEf[^"]*)"[^>]*>/);
    expect(newsClassMatch?.[1]).toContain('negative-result-highlight');
  });
});

