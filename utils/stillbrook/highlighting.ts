export interface SerpApiResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  displayed_link?: string;
}

interface HighlightingKeywordOptions {
  negativeKeywords?: string[];
  positiveKeywords?: string[];
}

const GLOBAL_HIGHLIGHT_CSS = `
<style id="stillbrook-highlight-styles">
  .negative-result-highlight {
    border: 3px solid #f44336 !important;
    border-radius: 8px !important;
    padding: 8px !important;
    margin: 8px 0 !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
  }
  .positive-result-highlight {
    border: 3px solid #4caf50 !important;
    border-radius: 8px !important;
    padding: 8px !important;
    margin: 8px 0 !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
  }
  .result-keyword-highlight {
    background-color: #ffeb3b;
    padding: 2px 4px;
    border-radius: 2px;
  }
  .result-preview-root {
    font-family: arial, sans-serif;
    padding: 15px;
    margin: 0 auto;
    background: white;
  }
  .result-preview-root.standard {
    max-width: 600px;
  }
  .result-preview-root.image {
    max-width: 1200px;
  }
  .result-summary {
    margin-bottom: 25px;
    color: #70757a;
    font-size: 13px;
  }
  .result-container {
    margin: 16px 0;
    border-radius: 8px;
    padding: 12px;
    background: white;
  }
  .result-container.image-card {
    display: inline-block;
    width: 200px;
    margin: 8px;
    vertical-align: top;
    padding: 8px;
  }
  .result-image-frame {
    position: relative;
    width: 100%;
    height: 200px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #e0e0e0;
  }
  .result-container.negative-result-highlight .result-image-frame {
    border: 3px solid #f44336 !important;
  }
  .result-container.positive-result-highlight .result-image-frame {
    border: 3px solid #4caf50 !important;
  }
  .result-image-title {
    padding: 8px 4px;
    font-size: 12px;
    line-height: 1.3;
    color: #202124;
  }
</style>
`;

function ensureHighlightStylesInjected(html: string): string {
  if (html.includes('stillbrook-highlight-styles')) {
    return html;
  }

  if (html.includes('</head>')) {
    return html.replace('</head>', GLOBAL_HIGHLIGHT_CSS + '</head>');
  }

  return GLOBAL_HIGHLIGHT_CSS + html;
}

export function addCombinedHighlighting(
  rawHtml: string,
  negativeMatches: SerpApiResult[],
  positiveMatches: SerpApiResult[],
  isImageSearch = false,
  searchTypeParam?: string,
  highlightOptions?: HighlightingKeywordOptions
): string {
  console.log(
    `🔥 addCombinedHighlighting CALLED with ${negativeMatches.length} negative and ${positiveMatches.length} positive matches`
  );
  console.log('HTML length:', rawHtml?.length || 'undefined');
  console.log('isImageSearch:', isImageSearch);
  console.log('searchTypeParam:', searchTypeParam);
  console.log(
    'First few negative matches:',
    negativeMatches.slice(0, 2).map(match => ({ title: match.title, link: match.link }))
  );

  const { negativeKeywords = [], positiveKeywords = [] } = highlightOptions ?? {};

  let highlightedHtml = ensureHighlightStylesInjected(rawHtml);

  if (negativeMatches.length > 0 || negativeKeywords.length > 0) {
    console.log('Applying negative (red) highlighting...');
    highlightedHtml = applyHighlighting(
      highlightedHtml,
      negativeMatches,
      '#f44336',
      'negative-result-highlight',
      isImageSearch,
      searchTypeParam,
      negativeKeywords
    );
  }

  if (positiveMatches.length > 0 || positiveKeywords.length > 0) {
    console.log('Applying positive (green) highlighting...');
    highlightedHtml = applyHighlighting(
      highlightedHtml,
      positiveMatches,
      '#4caf50',
      'positive-result-highlight',
      isImageSearch,
      searchTypeParam,
      positiveKeywords
    );
  }

  return highlightedHtml;
}

export function generateCombinedPagePreview(
  allResults: SerpApiResult[],
  negativeMatchedPositions: Set<number>,
  positiveMatchedPositions: Set<number>,
  keyword: string,
  isImageSearch = false
): string {
  const highlightKeyword = (text: string, term: string) => {
    if (!text) return '';
    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(
      regex,
      '<mark class="result-keyword-highlight">$1</mark>'
    );
  };

  if (!allResults || allResults.length === 0) {
    const emptyHtml = `
      <div class="result-preview-root standard">
        <p class="result-summary" style="text-align:center;">No results found</p>
      </div>
    `;
    return ensureHighlightStylesInjected(emptyHtml);
  }

  const resultsHtml = allResults
    .map(result => {
      const isNegativeMatch = negativeMatchedPositions.has(result.position);
      const isPositiveMatch = positiveMatchedPositions.has(result.position);

      const containerClasses = ['result-container'];
      if (isNegativeMatch) {
        containerClasses.push('negative-result-highlight');
      } else if (isPositiveMatch) {
        containerClasses.push('positive-result-highlight');
      }

      if (isImageSearch && result.title) {
        const imageUrl = `https://via.placeholder.com/300x200/f0f0f0/666?text=${encodeURIComponent(
          result.title.substring(0, 20)
        )}`;

        if (!containerClasses.includes('image-card')) {
          containerClasses.push('image-card');
        }

        return `
        <div class="${containerClasses.join(' ')}">
          <div class="result-image-frame">
            <img src="${imageUrl}"
                 alt="${result.title || 'Image'}"
                 style="width: 100%; height: 100%; object-fit: cover; display: block;">
          </div>
          <div class="result-image-title">
            ${highlightKeyword(result.title || '', keyword)}
          </div>
        </div>
      `;
      }

      return `
      <div class="${containerClasses.join(' ')}">
        <div style="margin-bottom: 4px;">
          <div style="font-size: 14px; line-height: 1.3;">
            <a href="${result.link}" style="color: #1a0dab; text-decoration: none; font-size: 20px; font-weight: normal; line-height: 1.3; display: block; margin-bottom: 3px;">
              ${highlightKeyword(result.title, keyword)}
            </a>
          </div>
          <div style="font-size: 14px; color: #006621; margin-bottom: 3px;">
            ${result.displayed_link || new URL(result.link).hostname}
          </div>
        </div>
        <div style="font-size: 14px; color: #4d5156; line-height: 1.58; max-width: 600px;">
          ${highlightKeyword(result.snippet || '', keyword)}
        </div>
      </div>
    `;
    })
    .join('');

  const rootClass = isImageSearch ? 'result-preview-root image' : 'result-preview-root standard';

  const previewHtml = `
    <div class="${rootClass}">
      <div style="margin-bottom: 25px;">
        <div class="result-summary">
          About ${allResults.length.toLocaleString()} results
        </div>
        <div style="${
          isImageSearch ? 'display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-start;' : ''
        }">
          ${resultsHtml}
        </div>
      </div>
    </div>
  `;

  return ensureHighlightStylesInjected(previewHtml);
}

function applyHighlighting(
  html: string,
  matches: SerpApiResult[],
  color: string,
  className: string,
  isImageSearch: boolean,
  searchTypeParam?: string,
  keywords?: string[]
): string {
  console.log(
    `🎯 applyHighlighting CALLED with ${matches.length} matches, color: ${color}, className: ${className}`
  );
  console.log('searchTypeParam:', searchTypeParam, 'isImageSearch:', isImageSearch);
  console.log('HTML length:', html?.length || 'undefined');

  let highlightedHtml = html;

  if (searchTypeParam === 'isch') {
    matches.forEach((result, index) => {
      try {
        console.log(`Adding image highlight for result ${index + 1}: ${result.title}`);

        const titleText = result.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const patterns = [
          new RegExp(`(<img[^>]*alt="[^"]*${titleText}[^"]*"[^>]*>)`, 'gi'),
          new RegExp(`(<div[^>]*>[^<]*${titleText}[^<]*</div>)`, 'gi'),
        ];

        let highlightAdded = false;
        patterns.forEach(pattern => {
          if (!highlightAdded) {
            highlightedHtml = highlightedHtml.replace(pattern, match => {
              highlightAdded = true;
              console.log(`Added image highlight style to result ${index + 1}`);
              return `<div class="${className}" style="border: 3px solid ${color} !important; border-radius: 8px !important; padding: 8px !important; margin: 8px !important; background: rgba(255, 235, 59, 0.05) !important; display: inline-block !important;">${match}</div>`;
            });
          }
        });
      } catch (error) {
        console.error(`Error highlighting image result ${index + 1}:`, error);
      }
    });
  } else if (searchTypeParam === 'shop') {
    matches.forEach((result, index) => {
      try {
        console.log(`Adding shopping highlight for result ${index + 1}: "${result.title}"`);

        const titleText = result.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const patterns = [
          new RegExp(`(<li[^>]*class="[^"]*I8iMf[^"]*"[^>]*>[\s\S]*?${titleText}[\s\S]*?</li>)`, 'gi'),
          new RegExp(`(<div[^>]*class="[^"]*(?:MtXiu|gkQHve|SsM98d|RmEs5b)[^"]*"[^>]*>[\s\S]*?${titleText}[\s\S]*?</div>)`, 'gi'),
        ];

        let highlightAdded = false;
        patterns.forEach(pattern => {
          if (!highlightAdded) {
            highlightedHtml = highlightedHtml.replace(pattern, match => {
              highlightAdded = true;
              console.log(`Added shopping highlight style to result ${index + 1}`);
              return `<div class="${className}" style="border: 3px solid ${color} !important; border-radius: 8px !important; padding: 8px !important; margin: 8px !important; background: rgba(255, 235, 59, 0.05) !important; display: block !important;">${match}</div>`;
            });
          }
        });
      } catch (error) {
        console.error(`Error highlighting shopping result ${index + 1}:`, error);
      }
    });
  } else {
    highlightedHtml = applyEnhancedWebSearchHighlighting(highlightedHtml, matches, color, className, keywords);
    return highlightedHtml;
  }

  return highlightedHtml;
}

function applyEnhancedWebSearchHighlighting(
  html: string,
  matches: SerpApiResult[],
  color: string,
  className: string,
  keywords?: string[]
): string {
  let highlightedHtml = html;

  console.log(`🚀 Using enhanced position-based highlighting for ${matches.length} matches`);

  matches.forEach((result, index) => {
    try {
      console.log(`🎯 Processing result ${index + 1} - Position: ${result.position}, Link: ${result.link}`);

      const linkExistsInHtml = highlightedHtml.includes(result.link);
      const linkExistsPartial = highlightedHtml.includes(result.link.substring(0, 50));
      console.log(`🔗 Link exists in HTML: ${linkExistsInHtml}, Partial exists: ${linkExistsPartial}`);

      const resultData = result as { redirect_link?: string };
      if (typeof resultData.redirect_link === 'string') {
        const redirectLink = resultData.redirect_link;
        const redirectExists = highlightedHtml.includes(redirectLink);
        console.log(
          `🔀 Redirect link exists: ${redirectExists}, Redirect: ${redirectLink.substring(0, 100)}...`
        );
        if (!linkExistsInHtml && redirectExists) {
          result = { ...result, link: redirectLink };
        }
      }

      const urlDomain = result.link.match(/https?:\/\/([^\/]+)/)?.[1] || '';
      const domainExists = urlDomain && highlightedHtml.includes(urlDomain);
      console.log(`🌐 Domain exists in HTML: ${domainExists}, Domain: ${urlDomain}`);

      let highlightAdded = false;

      const escapedLink = escapeForRegex(result.link);

      const positionBasedPatterns = [
        new RegExp(`(<[^>]*data-rpos="[^"]*"[^>]*>[\\s\\S]*?</[^>]*>)`, 'gi'),
        new RegExp(`(<[^>]*data-result-index="${result.position - 1}"[^>]*>[\\s\\S]*?</[^>]*>)`, 'gi'),
        new RegExp(`(<div[^>]*>[\\s\\S]*?href="${escapedLink}"[\\s\\S]*?</div>)`, 'gi'),
        new RegExp(`(<article[^>]*>[\\s\\S]*?href="${escapedLink}"[\\s\\S]*?</article>)`, 'gi'),
        new RegExp(`(<li[^>]*>[\\s\\S]*?href="${escapedLink}"[\\s\\S]*?</li>)`, 'gi'),
        new RegExp(`(<section[^>]*>[\\s\\S]*?href="${escapedLink}"[\\s\\S]*?</section>)`, 'gi'),
        new RegExp(`(<[^>]+>[\\s\\S]*?href="${escapedLink}"[\\s\\S]*?</[^>]+>)`, 'gi'),
        new RegExp(`([\\s\\S]{0,200}href="${escapedLink}"[\\s\\S]{0,200})`, 'gi'),
        urlDomain ? new RegExp(`([\\s\\S]{0,300}${escapeForRegex(urlDomain)}[\\s\\S]{0,300})`, 'gi') : null,
      ].filter(Boolean) as RegExp[];

      for (let patternIndex = 0; patternIndex < positionBasedPatterns.length && !highlightAdded; patternIndex++) {
        const pattern = positionBasedPatterns[patternIndex];
        pattern.lastIndex = 0;

        let patternMatch: RegExpExecArray | null;
        while (!highlightAdded && (patternMatch = pattern.exec(highlightedHtml))) {
          const matchStart = patternMatch.index;

          console.log(
            `🔍 Pattern ${patternIndex + 1} found match for result ${index + 1} at offset ${matchStart}`
          );

          const classResult = addHighlightClassNearOffset(highlightedHtml, matchStart, className);
          if (classResult.success) {
            highlightedHtml = classResult.html;
            highlightAdded = true;
            console.log(
              `✅ Applied class-based highlight to result ${index + 1} using pattern ${patternIndex + 1}`
            );
          }
        }
      }

      if (!highlightAdded && result.title) {
        console.log(`🔍 Trying content-based targeting for result ${index + 1}`);
        const titleText = escapeForRegex(result.title).substring(0, 50);

        const contentPattern = new RegExp(
          `(<div[^>]*>[\\s\\S]*?${titleText}[\\s\\S]*?href="${escapedLink}"[\\s\\S]*?</div>)`,
          'gi'
        );

        let contentMatch: RegExpExecArray | null;
        while (!highlightAdded && (contentMatch = contentPattern.exec(highlightedHtml))) {
          const matchStart = contentMatch.index;

          const classResult = addHighlightClassNearOffset(highlightedHtml, matchStart, className);
          if (classResult.success) {
            highlightedHtml = classResult.html;
            highlightAdded = true;
            console.log(`✅ Applied content-based class highlight to result ${index + 1}`);
          }
        }
      }

      if (!highlightAdded) {
        console.log(`🔄 Trying reverse DOM traversal for result ${index + 1}`);
        const linkPattern = new RegExp(`<a[^>]*href="${escapedLink}"[^>]*>([\\s\\S]*?)</a>`, 'gi');
        const linkMatches = highlightedHtml.match(linkPattern);

        if (linkMatches && linkMatches.length > 0) {
          const containerPatterns = [
            new RegExp(
              `(<div[^>]*class="[^"]*(?:MjjYud|tF2Cxc|Wt5Tfe)[^"]*"[^>]*>[\\s\\S]*?${escapedLink}[\\s\\S]*?</div>)`,
              'gi'
            ),
            new RegExp(`(<div[^>]*data-[^>]*>[\\s\\S]*?${escapedLink}[\\s\\S]*?</div>)`, 'gi'),
            new RegExp(`(<div[^>]*>[\\s\\S]*?${escapedLink}[\\s\\S]*?</div>)`, 'gi'),
          ];

          for (const containerPattern of containerPatterns) {
            containerPattern.lastIndex = 0;
            let containerMatch: RegExpExecArray | null;

            while (!highlightAdded && (containerMatch = containerPattern.exec(highlightedHtml))) {
              const matchStart = containerMatch.index;

              const classResult = addHighlightClassNearOffset(highlightedHtml, matchStart, className);
              if (classResult.success) {
                highlightedHtml = classResult.html;
                highlightAdded = true;
                console.log(`✅ Applied reverse DOM class highlight to result ${index + 1}`);
              }
            }

            if (highlightAdded) {
              break;
            }
          }
        }
      }

      if (!highlightAdded && result.displayed_link) {
        console.log(`🌐 Trying domain-based targeting for result ${index + 1}`);
        try {
          const url = new URL(result.link);
          const domain = escapeForRegex(url.hostname);

          const domainPattern = new RegExp(
            `(<div[^>]*>[\\s\\S]*?${domain}[\\s\\S]*?href="${escapedLink}"[\\s\\S]*?</div>)`,
            'gi'
          );

          let domainMatch: RegExpExecArray | null;
          while (!highlightAdded && (domainMatch = domainPattern.exec(highlightedHtml))) {
            const matchStart = domainMatch.index;

            const classResult = addHighlightClassNearOffset(highlightedHtml, matchStart, className);
            if (classResult.success) {
              highlightedHtml = classResult.html;
              highlightAdded = true;
              console.log(`✅ Applied domain-based class highlight to result ${index + 1}`);
            }
          }
        } catch (error) {
          console.log(`Failed to parse URL for domain targeting: ${result.link}`);
        }
      }

      if (!highlightAdded) {
        console.log(`🚨 Using fallback link highlighting for result ${index + 1}`);
        const linkPattern = new RegExp(`(<a[^>]*href="${escapedLink}"[^>]*>[\\s\\S]*?</a>)`, 'gi');

        let linkMatch: RegExpExecArray | null;
        while (!highlightAdded && (linkMatch = linkPattern.exec(highlightedHtml))) {
          const matchStart = linkMatch.index;

          const classResult = addHighlightClassNearOffset(highlightedHtml, matchStart, className);
          if (classResult.success) {
            highlightedHtml = classResult.html;
            highlightAdded = true;
            console.log(`⚠️ Applied fallback class highlight to result ${index + 1}`);
          }
        }
      }

      if (!highlightAdded) {
        console.error(`❌ All highlighting strategies failed for result ${index + 1}: ${result.link}`);
        console.log('Result data:', {
          position: result.position,
          title: result.title?.substring(0, 50) + '...',
          link: result.link,
          displayed_link: result.displayed_link,
        });
      }
    } catch (error) {
      console.error(`Error in enhanced highlighting for result ${index + 1}:`, error);
    }
  });

  if (keywords && keywords.length > 0) {
    highlightedHtml = highlightAdditionalKeywordMatches(highlightedHtml, keywords, className, color);
  }

  return highlightedHtml;
}

function highlightAdditionalKeywordMatches(
  html: string,
  keywords: string[],
  className: string,
  color: string
): string {
  const normalizedKeywords = keywords
    .map(keyword => keyword?.trim().toLowerCase())
    .filter((keyword): keyword is string => Boolean(keyword));

  if (normalizedKeywords.length === 0) {
    return html;
  }

  const containerRegex = /<div[^>]*data-rpos="[^"]*"[^>]*>[\s\S]*?(?=<div[^>]*data-rpos="|$)/gi;

  return html.replace(containerRegex, containerHtml => {
    if (containerHtml.includes(className)) {
      return containerHtml;
    }

    const textContent = normalizeHtmlText(containerHtml);
    if (!textContent) {
      return containerHtml;
    }

    const matched = normalizedKeywords.some(keyword => textContent.includes(keyword));
    if (!matched) {
      return containerHtml;
    }

    const result = addClassToDataRposContainer(containerHtml, className, color);
    return result.applied ? result.html : containerHtml;
  });
}

function normalizeHtmlText(fragment: string): string | null {
  if (!fragment) {
    return null;
  }

  const text = fragment
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  return text || null;
}

function addClassToDataRposContainer(
  containerHtml: string,
  className: string,
  color: string
): { html: string; applied: boolean } {
  const dataRposTagRegex = /<div[^>]*data-rpos="[^"]*"[^>]*>/i;
  const tagMatch = containerHtml.match(dataRposTagRegex);

  if (!tagMatch) {
    return { html: containerHtml, applied: false };
  }

  const originalTag = tagMatch[0];
  const updatedTag = injectClassIntoTag(originalTag, className);

  if (updatedTag !== originalTag) {
    return { html: containerHtml.replace(originalTag, updatedTag), applied: true };
  }

  if (originalTag.includes(className)) {
    return { html: containerHtml, applied: true };
  }

  return { html: containerHtml, applied: false };
}

function injectClassIntoTag(tag: string, className: string): string {
  const classAttrRegex = /class=["']([^"']*)["']/i;

  if (classAttrRegex.test(tag)) {
    return tag.replace(classAttrRegex, (fullMatch, existingClasses) => {
      const classSet = new Set(existingClasses.split(/\s+/).filter(Boolean));
      if (!classSet.has(className)) {
        classSet.add(className);
      }
      return `class="${Array.from(classSet).join(' ')}"`;
    });
  }

  return tag.replace(/<([^\s>]+)/, `<$1 class="${className}"`);
}

function addHighlightClassNearOffset(
  html: string,
  offset: number,
  className: string
): { html: string; success: boolean } {
  const dataRposRegex = /<[^>]*data-rpos="[^"]*"[^>]*>/gi;
  let targetMatch: RegExpExecArray | null = null;
  let currentMatch: RegExpExecArray | null;

  while ((currentMatch = dataRposRegex.exec(html)) !== null) {
    const tagStart = currentMatch.index;
    const tagEnd = tagStart + currentMatch[0].length;

    if (tagStart <= offset) {
      targetMatch = currentMatch;
      if (tagEnd > offset) {
        break;
      }
    } else {
      break;
    }
  }

  if (!targetMatch) {
    return { html, success: false };
  }

  const originalTag = targetMatch[0];
  const updatedTag = injectClassIntoTag(originalTag, className);

  if (updatedTag === originalTag) {
    return { html, success: false };
  }

  const updatedHtml =
    html.slice(0, targetMatch.index) +
    updatedTag +
    html.slice(targetMatch.index + originalTag.length);

  return { html: updatedHtml, success: true };
}

function replaceRange(source: string, start: number, end: number, replacement: string): string {
  return source.slice(0, start) + replacement + source.slice(end);
}

function safeReplaceAnywhere(source: string, search: string, replacement: string): string {
  const index = source.indexOf(search);
  if (index === -1) {
    return source;
  }
  return replaceRange(source, index, index + search.length, replacement);
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


