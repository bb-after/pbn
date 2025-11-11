import {
  DEFAULT_HIGHLIGHT_SELECTORS,
  EXCLUDED_CONTAINER_WRAPPER_CLASS,
  HighlightSelectors,
  getHighlightSelectors,
} from './selectors';

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

export const NEGATIVE_HIGHLIGHT_CLASS = 'negative-result-highlight';
export const POSITIVE_HIGHLIGHT_CLASS = 'positive-result-highlight';

export { EXCLUDED_CONTAINER_WRAPPER_CLASS };

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
  // console.log(
  //   'First few negative matches:',
  //   negativeMatches.slice(0, 2).map(match => ({ title: match.title, link: match.link }))
  // );

  const { negativeKeywords = [], positiveKeywords = [] } = highlightOptions ?? {};

  let highlightedHtml = ensureHighlightStylesInjected(rawHtml);

  if (negativeMatches.length > 0 || negativeKeywords.length > 0) {
    console.log('Applying negative (red) highlighting...');
    highlightedHtml = applyHighlighting(
      highlightedHtml,
      negativeMatches,
      '#f44336',
      NEGATIVE_HIGHLIGHT_CLASS,
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
      POSITIVE_HIGHLIGHT_CLASS,
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
    highlightedHtml = applyEnhancedWebSearchHighlighting(
      highlightedHtml,
      matches,
      color,
      className,
      keywords,
      searchTypeParam
    );
    return highlightedHtml;
  }

  return highlightedHtml;
}

function applyEnhancedWebSearchHighlighting(
  html: string,
  matches: SerpApiResult[],
  _color: string,
  className: string,
  keywords?: string[],
  searchTypeParam?: string
): string {
  let highlightedHtml = html;

  const selectors = getHighlightSelectors(searchTypeParam);
  const containerClass = selectors.containerClass ?? DEFAULT_HIGHLIGHT_SELECTORS.containerClass;
  const linkClass = selectors.linkClass ?? DEFAULT_HIGHLIGHT_SELECTORS.linkClass;

  console.log(`🚀 Using enhanced highlighting for ${matches.length} matches`, {
    searchTypeParam,
    containerClass,
    linkClass,
  });

  matches.forEach((result, index) => {
    try {
      if (!result?.link) {
        console.warn(`Result ${index + 1} is missing a link. Skipping URL-based highlighting.`);
        return;
      }

      const candidateLinks = new Set<string>();
      candidateLinks.add(result.link);

      const resultData = result as { redirect_link?: string };
      if (typeof resultData.redirect_link === 'string') {
        candidateLinks.add(resultData.redirect_link);
      }

      let highlightAdded = false;

      for (const candidateLink of candidateLinks) {
        const attempt = highlightUsingStrategies({
          html: highlightedHtml,
          className,
          selectors,
          result,
          candidateLink,
          matchIndex: index,
        });

        if (attempt.success) {
          highlightedHtml = attempt.html;
          highlightAdded = true;
          break;
        }
      }

      if (!highlightAdded) {
        console.error(`❌ All highlighting strategies failed for result ${index + 1}: ${result.link}`);
        console.log('Result data:', {
          position: result.position,
          title: result.title?.substring(0, 50) + '...',
          link: result.link,
          displayed_link: result.displayed_link,
          searchTypeParam,
          containerClass,
          linkClass,
        });
      }
    } catch (error) {
      console.error(`Error in enhanced highlighting for result ${index + 1}:`, error);
    }
  });

  if (keywords && keywords.length > 0) {
    highlightedHtml = highlightAdditionalKeywordMatches(highlightedHtml, keywords, className, selectors);
  }

  return highlightedHtml;
}

function highlightAdditionalKeywordMatches(
  html: string,
  keywords: string[],
  className: string,
  selectors: HighlightSelectors
): string {
  const normalizedKeywords = keywords
    .map(keyword => keyword?.trim().toLowerCase())
    .filter((keyword): keyword is string => Boolean(keyword));

  if (normalizedKeywords.length === 0) {
    return html;
  }

  let updatedHtml = html;
  const containerBounds = findAllResultContainerBounds(updatedHtml, selectors.containerClass, selectors.dataAttributes, selectors.additionalClasses);

  for (let i = containerBounds.length - 1; i >= 0; i--) {
    const { start, end } = containerBounds[i];

    if (isWithinExcludedWrapper(updatedHtml, start)) {
      continue;
    }

    const containerHtml = updatedHtml.slice(start, end);
    if (containerHtml.includes(className)) {
      continue;
    }
    if (!containerHasMeaningfulContent(containerHtml)) {
      continue;
    }

    const textContent = normalizeHtmlText(containerHtml);
    if (!textContent) {
      continue;
    }

    const matched = normalizedKeywords.some(keyword => textContent.includes(keyword));
    if (!matched) {
      continue;
    }

    const updated = addClassToContainerHtml(containerHtml, className, selectors.containerClass, selectors.dataAttributes, selectors.additionalClasses);
    if (!updated.applied) {
      continue;
    }

    updatedHtml = replaceRange(updatedHtml, start, end, updated.html);
  }

  return updatedHtml;
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

function applyClassToContainerAtOffset(
  html: string,
  offset: number,
  className: string,
  containerClass: string,
  searchWindowEnd?: number,
  dataAttributes?: string[],
  additionalClasses?: string[]
): { html: string; success: boolean } {
  const containerStart = findContainerStartNearOffset(html, offset, containerClass, searchWindowEnd, dataAttributes, additionalClasses);
  if (containerStart === -1) {
    return { html, success: false };
  }

  const bounds = findContainerBounds(html, containerStart, containerClass);
  if (!bounds) {
    return { html, success: false };
  }

  if (isWithinExcludedWrapper(html, bounds.start)) {
    return { html, success: false };
  }

  const containerHtml = html.slice(bounds.start, bounds.end);
  if (!containerHasMeaningfulContent(containerHtml)) {
    return { html, success: false };
  }
  if (containerHtml.includes(className)) {
    return { html, success: false };
  }

  const updated = addClassToContainerHtml(containerHtml, className, containerClass, dataAttributes, additionalClasses);
  if (!updated.applied) {
    return { html, success: false };
  }

  const updatedHtml = replaceRange(html, bounds.start, bounds.end, updated.html);
  return { html: updatedHtml, success: true };
}

function findAllResultContainerBounds(
  html: string,
  containerClass: string,
  dataAttributes?: string[],
  additionalClasses?: string[]
): Array<{ start: number; end: number }> {
  const bounds: Array<{ start: number; end: number }> = [];
  
  // Find containers by class
  const containerRegex = new RegExp(
    `<div[^>]*class="[^"]*${containerClass}[^"]*"[^>]*>`,
    'gi'
  );
  let match: RegExpExecArray | null;

  while ((match = containerRegex.exec(html)) !== null) {
    const containerBounds = findMatchingDivBounds(html, match.index);
    if (containerBounds) {
      bounds.push(containerBounds);
    }
  }

  // Find containers by data attributes
  if (dataAttributes && dataAttributes.length > 0) {
    dataAttributes.forEach(dataAttr => {
      const dataAttrRegex = new RegExp(
        `<div[^>]*${dataAttr}="[^"]*"[^>]*>`,
        'gi'
      );
      let dataMatch: RegExpExecArray | null;

      while ((dataMatch = dataAttrRegex.exec(html)) !== null) {
        const containerBounds = findMatchingDivBounds(html, dataMatch.index);
        if (containerBounds) {
          // Check if this bound is already included to avoid duplicates
          const isDuplicate = bounds.some(
            existing => existing.start === containerBounds.start && existing.end === containerBounds.end
          );
          if (!isDuplicate) {
            bounds.push(containerBounds);
          }
        }
      }
    });
  }

  // Find containers by additional classes
  if (additionalClasses && additionalClasses.length > 0) {
    additionalClasses.forEach(className => {
      const classRegex = new RegExp(
        `<[^>]*class="[^"]*${className}[^"]*"[^>]*>`,
        'gi'
      );
      let classMatch: RegExpExecArray | null;

      while ((classMatch = classRegex.exec(html)) !== null) {
        const containerBounds = findMatchingElementBounds(html, classMatch.index);
        if (containerBounds) {
          // Check if this bound is already included to avoid duplicates
          const isDuplicate = bounds.some(
            existing => existing.start === containerBounds.start && existing.end === containerBounds.end
          );
          if (!isDuplicate) {
            bounds.push(containerBounds);
          }
        }
      }
    });
  }

  return bounds;
}

function findContainerStartNearOffset(
  html: string,
  offset: number,
  containerClass: string,
  searchWindowEnd?: number,
  dataAttributes?: string[],
  additionalClasses?: string[]
): number {
  const containerRegex = new RegExp(
    `<div[^>]*class="[^"]*${containerClass}[^"]*"[^>]*>`,
    'gi'
  );

  if (searchWindowEnd !== undefined) {
    containerRegex.lastIndex = offset;
    const forwardMatch = containerRegex.exec(html);
    if (forwardMatch && forwardMatch.index <= searchWindowEnd) {
      return forwardMatch.index;
    }
  }

  // Try data attributes if available
  if (dataAttributes && dataAttributes.length > 0) {
    for (const dataAttr of dataAttributes) {
      const dataAttrRegex = new RegExp(
        `<div[^>]*${dataAttr}="[^"]*"[^>]*>`,
        'gi'
      );
      
      if (searchWindowEnd !== undefined) {
        dataAttrRegex.lastIndex = offset;
        const forwardMatch = dataAttrRegex.exec(html);
        if (forwardMatch && forwardMatch.index <= searchWindowEnd) {
          return forwardMatch.index;
        }
      }
      
      const beforeMatch = findContainerStartBeforeOffset(html, offset, containerClass, dataAttr);
      if (beforeMatch !== -1) {
        return beforeMatch;
      }
    }
  }

  // Try additional classes if available
  if (additionalClasses && additionalClasses.length > 0) {
    for (const className of additionalClasses) {
      const classRegex = new RegExp(
        `<[^>]*class="[^"]*${className}[^"]*"[^>]*>`,
        'gi'
      );
      
      if (searchWindowEnd !== undefined) {
        classRegex.lastIndex = offset;
        const forwardMatch = classRegex.exec(html);
        if (forwardMatch && forwardMatch.index <= searchWindowEnd) {
          return forwardMatch.index;
        }
      }
      
      const beforeMatch = findContainerStartBeforeOffset(html, offset, containerClass, className);
      if (beforeMatch !== -1) {
        return beforeMatch;
      }
    }
  }

  return findContainerStartBeforeOffset(html, offset, containerClass);
}

function findContainerStartBeforeOffset(
  html: string,
  offset: number,
  containerClass: string,
  fallbackSelector?: string
): number {
  // Try by class first
  const containerRegex = new RegExp(
    `<div[^>]*class="[^"]*${containerClass}[^"]*"[^>]*>`,
    'gi'
  );
  let match: RegExpExecArray | null;
  let candidateIndex = -1;

  while ((match = containerRegex.exec(html)) !== null && match.index <= offset) {
    candidateIndex = match.index;
  }

  // Try by fallback selector if provided and no class match found
  // This could be a data attribute or an additional class
  if (candidateIndex === -1 && fallbackSelector) {
    let fallbackRegex: RegExp;
    
    if (fallbackSelector.startsWith('data-')) {
      // It's a data attribute
      fallbackRegex = new RegExp(
        `<div[^>]*${fallbackSelector}="[^"]*"[^>]*>`,
        'gi'
      );
    } else {
      // It's a class
      fallbackRegex = new RegExp(
        `<[^>]*class="[^"]*${fallbackSelector}[^"]*"[^>]*>`,
        'gi'
      );
    }
    
    let fallbackMatch: RegExpExecArray | null;

    while ((fallbackMatch = fallbackRegex.exec(html)) !== null && fallbackMatch.index <= offset) {
      candidateIndex = fallbackMatch.index;
    }
  }

  return candidateIndex;
}

function findContainerBounds(
  html: string,
  containerStart: number,
  _containerClass: string
): { start: number; end: number } | null {
  return findMatchingDivBounds(html, containerStart);
}

function findMatchingDivBounds(
  html: string,
  startIndex: number
): { start: number; end: number } | null {
  const tagRegex = /<\/?div\b[^>]*>/gi;
  tagRegex.lastIndex = startIndex;

  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    if (match.index < startIndex) {
      continue;
    }

    const isOpening = !match[0].startsWith('</');
    depth += isOpening ? 1 : -1;

    if (depth === 0) {
      return { start: startIndex, end: match.index + match[0].length };
    }
  }

  return null;
}

function findMatchingElementBounds(
  html: string,
  startIndex: number
): { start: number; end: number } | null {
  // First try to find the tag name of the starting element
  const openingTagMatch = html.slice(startIndex).match(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/);
  if (!openingTagMatch) {
    return null;
  }

  const tagName = openingTagMatch[1];
  const tagRegex = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  tagRegex.lastIndex = startIndex;

  let depth = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    if (match.index < startIndex) {
      continue;
    }

    const isOpening = !match[0].startsWith('</');
    depth += isOpening ? 1 : -1;

    if (depth === 0) {
      return { start: startIndex, end: match.index + match[0].length };
    }
  }

  return null;
}

function isWithinExcludedWrapper(html: string, containerStart: number): boolean {
  return findEnclosingDivBounds(html, containerStart, EXCLUDED_CONTAINER_WRAPPER_CLASS) !== null;
}

function findEnclosingDivBounds(
  html: string,
  childStart: number,
  className: string
): { start: number; end: number } | null {
  const wrapperRegex = new RegExp(`<div[^>]*class="[^"]*${className}[^"]*"[^>]*>`, 'gi');
  let match: RegExpExecArray | null;
  let candidateBounds: { start: number; end: number } | null = null;

  while ((match = wrapperRegex.exec(html)) !== null && match.index <= childStart) {
    const bounds = findMatchingDivBounds(html, match.index);
    if (bounds && bounds.start <= childStart && childStart < bounds.end) {
      candidateBounds = bounds;
    }
  }

  return candidateBounds;
}

function addClassToContainerHtml(
  containerHtml: string,
  className: string,
  containerClass: string,
  dataAttributes?: string[],
  additionalClasses?: string[]
): { html: string; applied: boolean } {
  const containerTagRegex = new RegExp(
    `<div[^>]*class="[^"]*${containerClass}[^"]*"[^>]*>`,
    'i'
  );
  let tagMatch = containerHtml.match(containerTagRegex);

  // If no class match, try data attributes
  if (!tagMatch && dataAttributes && dataAttributes.length > 0) {
    for (const dataAttr of dataAttributes) {
      const dataAttrRegex = new RegExp(
        `<div[^>]*${dataAttr}="[^"]*"[^>]*>`,
        'i'
      );
      tagMatch = containerHtml.match(dataAttrRegex);
      if (tagMatch) break;
    }
  }

  // If no match yet, try additional classes
  if (!tagMatch && additionalClasses && additionalClasses.length > 0) {
    for (const additionalClass of additionalClasses) {
      const classRegex = new RegExp(
        `<[^>]*class="[^"]*${additionalClass}[^"]*"[^>]*>`,
        'i'
      );
      tagMatch = containerHtml.match(classRegex);
      if (tagMatch) break;
    }
  }

  if (!tagMatch) {
    return { html: containerHtml, applied: false };
  }

  const originalTag = tagMatch[0];
  const hasNegative = originalTag.includes(NEGATIVE_HIGHLIGHT_CLASS);
  const hasPositive = originalTag.includes(POSITIVE_HIGHLIGHT_CLASS);

  if (className === POSITIVE_HIGHLIGHT_CLASS && hasNegative) {
    return { html: containerHtml, applied: true };
  }

  let updatedTag = originalTag;

  if (className === NEGATIVE_HIGHLIGHT_CLASS && hasPositive) {
    updatedTag = removeClassFromTag(updatedTag, POSITIVE_HIGHLIGHT_CLASS);
  }

  updatedTag = injectClassIntoTag(updatedTag, className);

  if (updatedTag === originalTag) {
    return { html: containerHtml, applied: originalTag.includes(className) };
  }

  return { html: containerHtml.replace(originalTag, updatedTag), applied: true };
}

function removeClassFromTag(tag: string, className: string): string {
  const classAttrRegex = /class=["']([^"']*)["']/i;
  const match = tag.match(classAttrRegex);

  if (!match) {
    return tag;
  }

  const remainingClasses = match[1]
    .split(/\s+/)
    .filter(Boolean)
    .filter(existingClass => existingClass !== className);

  if (remainingClasses.length === 0) {
    return tag.replace(classAttrRegex, '').replace(/\s+>/, '>');
  }

  return tag.replace(classAttrRegex, `class="${remainingClasses.join(' ')}"`);
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

function replaceRange(source: string, start: number, end: number, replacement: string): string {
  return source.slice(0, start) + replacement + source.slice(end);
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containerHasMeaningfulContent(containerHtml: string): boolean {
  const text = normalizeHtmlText(containerHtml);
  return Boolean(text && text.trim().length > 0);
}

interface HighlightStrategyParams {
  html: string;
  className: string;
  selectors: HighlightSelectors;
  result: SerpApiResult;
  candidateLink: string;
  matchIndex: number;
}

function highlightUsingStrategies(params: HighlightStrategyParams): { html: string; success: boolean } {
  const { html, className, selectors, result, candidateLink, matchIndex } = params;
  const { containerClass } = selectors;

  let workingHtml = html;

  const linkClassAttempt = highlightByLinkSelector(workingHtml, candidateLink, className, selectors);
  if (linkClassAttempt.success) {
    console.log(`✅ Applied class-based highlight to result ${matchIndex + 1} via link selector`);
    return linkClassAttempt;
  }

  const escapedLink = escapeForRegex(candidateLink);

  const hrefPattern = new RegExp(`<a\\b[^>]*href=["']${escapedLink}["'][^>]*>`, 'gi');
  let hrefMatch: RegExpExecArray | null;
  while ((hrefMatch = hrefPattern.exec(workingHtml)) !== null) {
    const updateResult = applyClassToContainerAtOffset(
      workingHtml,
      hrefMatch.index,
      className,
      containerClass,
      undefined,
      selectors.dataAttributes,
      selectors.additionalClasses
    );

    if (updateResult.success) {
      console.log(`✅ Applied class-based highlight to result ${matchIndex + 1} via href match`);
      return updateResult;
    }
  }

  if (Number.isFinite(result.position)) {
    const positionIndex = result.position - 1;
    const dataIndexPattern = new RegExp(`<[^>]*data-result-index="${positionIndex}"[^>]*>`, 'gi');
    let dataMatch: RegExpExecArray | null;
    while ((dataMatch = dataIndexPattern.exec(workingHtml)) !== null) {
      const updateResult = applyClassToContainerAtOffset(
        workingHtml,
        dataMatch.index,
        className,
        containerClass,
        dataMatch.index + dataMatch[0].length,
        selectors.dataAttributes,
        selectors.additionalClasses
      );

      if (updateResult.success) {
        console.log(
          `✅ Applied class-based highlight to result ${matchIndex + 1} via data-result-index targeting`
        );
        return updateResult;
      }
    }
  }

  try {
    const domain = new URL(candidateLink).hostname.replace(/^www\./, '');
    if (domain) {
      const escapedDomain = escapeForRegex(domain);
      const domainPattern = new RegExp(
        `(<div[^>]*class="[^"]*${containerClass}[^"]*"[^>]*>[\\s\\S]*?${escapedDomain}[\\s\\S]*?href=["']${escapedLink}["'][\\s\\S]*?<\/div>)`,
        'gi'
      );

      let domainMatch: RegExpExecArray | null;
      while ((domainMatch = domainPattern.exec(workingHtml)) !== null) {
        const updateResult = applyClassToContainerAtOffset(
          workingHtml,
          domainMatch.index,
          className,
          containerClass,
          domainMatch.index + domainMatch[0].length,
          selectors.dataAttributes,
          selectors.additionalClasses
        );

        if (updateResult.success) {
          console.log(`✅ Applied class-based highlight to result ${matchIndex + 1} via domain targeting`);
          return updateResult;
        }
      }
    }
  } catch (error) {
    console.log(`Failed to parse URL for domain targeting: ${candidateLink}`);
  }

  return { html, success: false };
}

function highlightByLinkSelector(
  html: string,
  candidateLink: string,
  className: string,
  selectors: HighlightSelectors
): { html: string; success: boolean } {
  const { containerClass, linkClass } = selectors;

  if (!linkClass) {
    return { html, success: false };
  }

  const escapedLink = escapeForRegex(candidateLink);
  const anchorPattern = new RegExp(
    `<a\\b(?=[^>]*href=["']${escapedLink}["'])(?=[^>]*class=["'][^"']*${linkClass}[^"']*["'])[^>]*>`,
    'gi'
  );

  let anchorMatch: RegExpExecArray | null;
  let workingHtml = html;

  while ((anchorMatch = anchorPattern.exec(workingHtml)) !== null) {
    const updateResult = applyClassToContainerAtOffset(
      workingHtml,
      anchorMatch.index,
      className,
      containerClass,
      undefined,
      selectors.dataAttributes,
      selectors.additionalClasses
    );

    if (updateResult.success) {
      console.log(`✅ Applied class-based highlight via link class ${linkClass}`);
      return updateResult;
    }
  }

  return { html, success: false };
}


