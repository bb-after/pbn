import { getOpenAISentiment } from './openai';
import { getClaudeSentiment } from './claude';
import { getGeminiSentiment } from './gemini';
import { searchPerplexity } from './perplexity';
import { getGrokSentiment } from './grok';
import { getAllDataSources } from './dataSource';

const BRAND_INTENT_CATEGORIES = [
  {
    value: 'general_overview',
    label: 'General Overview',
    prompt: 'What is [Brand Name]? Tell me about [Brand Name]',
  },
  { value: 'ownership', label: 'Ownership', prompt: 'Who owns [Brand Name]?' },
  {
    value: 'founding_history',
    label: 'Founding & History',
    prompt: "Who founded [Brand Name] and when? What's the story behind [Brand Name]?",
  },
  { value: 'leadership', label: 'Leadership', prompt: 'Who is the CEO of [Brand Name]?' },
  {
    value: 'reputation',
    label: 'Reputation',
    prompt: 'Does [Brand Name] have a good reputation? What do people think of [Brand Name]?',
  },
  {
    value: 'product_service',
    label: 'Product / Service Details',
    prompt: 'What does [Brand Name] do? What products does [Brand Name] offer?',
  },
  {
    value: 'industry_context',
    label: 'Industry Context',
    prompt: 'How does [Brand Name] compare to [Competitor]? What makes [Brand Name] different?',
  },
  {
    value: 'news_controversy',
    label: 'News & Controversy',
    prompt:
      'Has [Brand Name] been in the news recently? What controversies has [Brand Name] been involved in?',
  },
  {
    value: 'reviews_opinion',
    label: 'Reviews / Public Opinion',
    prompt: 'What are people saying about [Brand Name]? Customer reviews for [Brand Name]?',
  },
  {
    value: 'funding_investors',
    label: 'Funding / Investors',
    prompt: 'Who has invested in [Brand Name]? Is [Brand Name] VC-backed?',
  },
  {
    value: 'employment_culture',
    label: 'Employment / Culture',
    prompt: "Is [Brand Name] a good company to work for? What's the culture at [Brand Name]?",
  },
  {
    value: 'legitimacy_scam',
    label: 'Legitimacy / Scam Check',
    prompt: 'Is [Brand Name] legit or a scam?',
  },
];

const INDIVIDUAL_INTENT_CATEGORIES = [
  { value: 'general_overview', label: 'General Overview', prompt: 'Who is [Full Name]?' },
  {
    value: 'background',
    label: 'Background',
    prompt: 'What is [Full Name] known for? What does [Full Name] do?',
  },
  {
    value: 'reputation',
    label: 'Reputation',
    prompt: 'Does [Full Name] have a good reputation? What do people say about [Full Name]?',
  },
  {
    value: 'employment_leadership',
    label: 'Employment / Leadership',
    prompt: "What is [Full Name]'s role at [Company]? Is [Full Name] the CEO of [Company]?",
  },
  {
    value: 'notable_events',
    label: 'Notable Events',
    prompt: 'Has [Full Name] been in the news recently? What is [Full Name] best known for?',
  },
  {
    value: 'net_worth_influence',
    label: 'Net Worth / Influence',
    prompt: "What is [Full Name]'s net worth? How influential is [Full Name]?",
  },
  {
    value: 'social_media',
    label: 'Social Media Presence',
    prompt: 'Where can I find [Full Name] online?',
  },
  {
    value: 'education_credentials',
    label: 'Education / Credentials',
    prompt: "Where did [Full Name] go to school? What is [Full Name]'s background?",
  },
  {
    value: 'affiliation',
    label: 'Affiliation',
    prompt: 'Is [Full Name] affiliated with [Brand/Org]?',
  },
  {
    value: 'legal_controversy',
    label: 'Legal / Controversy',
    prompt: 'Has [Full Name] been involved in any controversies?',
  },
];

function extractUrlsFromText(text: string): string[] {
  console.log('Extracting URLs from text:', text.substring(0, 200) + '...');

  const urlRegex = /https?:\/\/[^\s\])"']+/gi;
  const urls = text.match(urlRegex) || [];

  console.log('Found URLs:', urls);

  // Clean and deduplicate URLs
  const cleanUrls = urls
    .map(url => url.replace(/[.,;:)}\]]+$/, '')) // Remove trailing punctuation
    .filter((url, index, arr) => arr.indexOf(url) === index) // Remove duplicates
    .filter(url => url.length > 10); // Filter out very short URLs

  console.log('Clean URLs:', cleanUrls);
  return cleanUrls;
}

function buildIntentPrompt(
  keyword: string,
  analysisType: 'brand' | 'individual',
  intentCategory: string,
  additionalInstructions?: string
): string {
  const categories =
    analysisType === 'brand' ? BRAND_INTENT_CATEGORIES : INDIVIDUAL_INTENT_CATEGORIES;
  const category = categories.find(cat => cat.value === intentCategory);

  if (!category) {
    throw new Error(
      `Intent category '${intentCategory}' not found for analysis type '${analysisType}'`
    );
  }

  let prompt = category.prompt;

  // Replace placeholders with actual keyword
  if (analysisType === 'brand') {
    prompt = prompt.replace(/\[Brand Name\]/g, keyword);
    prompt = prompt.replace(/\[Competitor\]/g, 'competitors'); // Generic replacement for competitor placeholder
  } else {
    prompt = prompt.replace(/\[Full Name\]/g, keyword);
    prompt = prompt.replace(/\[Company\]/g, 'their company'); // Generic replacement
    prompt = prompt.replace(/\[Brand\/Org\]/g, 'any organization'); // Generic replacement
  }

  if (additionalInstructions && additionalInstructions.trim()) {
    prompt += `\n\nAdditional specific instructions: ${additionalInstructions.trim()}`;
  }

  // Add instruction for sources
  prompt += ' Include any links to sources.';

  return prompt;
}

export interface AIEngineResult {
  engine: string;
  summary: string;
  model: string;
  error?: string;
  sources?: string[];
}

export interface TagFrequency {
  tag: string;
  count: number;
  engines: string[];
}

export interface SourceInfo {
  source: string;
  count: number;
  engines: string[];
  url?: string;
  urls?: string[];
  excerpts?: string[];
}

export interface SentimentBreakdown {
  positive: { count: number; engines: string[]; highlights: string[] };
  negative: { count: number; engines: string[]; highlights: string[] };
  neutral: { count: number; engines: string[]; highlights: string[] };
  mixed: { count: number; engines: string[]; highlights: string[] };
}

export interface GeoAnalysisResult {
  keyword: string;
  clientName: string;
  results: AIEngineResult[];
  aggregatedInsights: {
    overallSentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    keyThemes: string[];
    commonInsights: string[];
    competitiveAdvantages: string[];
    recommendations: string[];
    topTags: TagFrequency[];
    sources: SourceInfo[];
    urlSources: SourceInfo[];
    sentimentBreakdown: SentimentBreakdown;
    mainSentimentHighlights: {
      positive: string[];
      negative: string[];
    };
  };
  timestamp: Date;
}

const engineFunctions = {
  1: getOpenAISentiment, // GPT-4o
  2: getClaudeSentiment, // Claude 3.5 Sonnet
  3: getGeminiSentiment, // Gemini 2.5 Flash
  4: searchPerplexity, // Perplexity
  5: getGrokSentiment, // Grok 4 Latest
  6: getOpenAISentiment, // GPT-5
  7: getGrokSentiment, // Grok 2.5
  8: getClaudeSentiment, // Claude 3.5 Haiku
  10: getOpenAISentiment, // o1 Preview
  11: getOpenAISentiment, // o1 Mini
};

export async function analyzeKeywordWithEngines(
  keyword: string,
  clientName: string,
  selectedEngineIds: number[],
  customPrompt?: string,
  analysisType?: 'brand' | 'individual',
  intentCategory?: string
): Promise<GeoAnalysisResult> {
  const results: AIEngineResult[] = [];
  const dataSources = getAllDataSources();

  const enginePromises = selectedEngineIds.map(async engineId => {
    try {
      const engineFunction = engineFunctions[engineId as keyof typeof engineFunctions];
      if (!engineFunction) {
        throw new Error(`Engine with ID ${engineId} not found`);
      }

      const result = await engineFunction(
        keyword,
        engineId,
        undefined,
        analysisType,
        intentCategory,
        customPrompt
      );

      // Extract URLs from the response
      if (result) {
        (result as any).sources = extractUrlsFromText(result.summary);
      }

      return result;
    } catch (error) {
      console.error(`Engine ${engineId} failed:`, error);
      const dataSource = dataSources.find(ds => ds.id === engineId);
      return {
        engine: dataSource?.name || `Engine ${engineId}`,
        summary: '',
        model: dataSource?.model || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  const engineResults = await Promise.all(enginePromises);
  results.push(...engineResults);

  // Aggregate insights from all successful results
  const successfulResults = results.filter(r => !r.error && r.summary.length > 0);
  const aggregatedInsights = aggregateInsights(successfulResults, keyword);

  return {
    keyword,
    clientName,
    results,
    aggregatedInsights,
    timestamp: new Date(),
  };
}

function aggregateInsights(
  results: AIEngineResult[],
  keyword: string
): GeoAnalysisResult['aggregatedInsights'] {
  if (results.length === 0) {
    return {
      overallSentiment: 'neutral' as const,
      keyThemes: [],
      commonInsights: [],
      competitiveAdvantages: [],
      recommendations: [],
      topTags: [],
      sources: [],
      urlSources: [],
      sentimentBreakdown: {
        positive: { count: 0, engines: [], highlights: [] },
        negative: { count: 0, engines: [], highlights: [] },
        neutral: { count: 0, engines: [], highlights: [] },
        mixed: { count: 0, engines: [], highlights: [] },
      },
      mainSentimentHighlights: {
        positive: [],
        negative: [],
      },
    };
  }

  // Extract and analyze sentiment by engine
  const sentimentBreakdown = extractSentimentBreakdown(results);
  const overallSentiment = determineOverallSentiment(sentimentBreakdown);

  // Extract tags from all content
  const topTags = extractTopTags(results);

  // Extract sources mentioned across engines
  const sources = extractSources(results);

  // Extract URL sources from all results
  const urlSources = extractUrlSources(results);

  // Extract key themes
  const keyThemes = extractKeyThemes(results, keyword);

  // Get main sentiment highlights
  const mainSentimentHighlights = extractMainSentimentHighlights(results);

  return {
    overallSentiment,
    keyThemes,
    commonInsights: [
      `Analysis completed across ${results.length} AI engine${results.length === 1 ? '' : 's'}`,
      `Overall sentiment: ${overallSentiment} for "${keyword}"`,
      `${sentimentBreakdown.positive.count} positive, ${sentimentBreakdown.negative.count} negative, ${sentimentBreakdown.neutral.count} neutral responses`,
      topTags.length > 0
        ? `Top ${Math.min(5, topTags.length)} tags identified across engines`
        : 'No common tags identified',
    ],
    competitiveAdvantages: extractCompetitiveAdvantages(results),
    recommendations: extractRecommendations(results, keyword),
    topTags,
    sources,
    urlSources,
    sentimentBreakdown,
    mainSentimentHighlights,
  };
}

function extractSentimentBreakdown(results: AIEngineResult[]) {
  const breakdown: SentimentBreakdown = {
    positive: { count: 0, engines: [], highlights: [] },
    negative: { count: 0, engines: [], highlights: [] },
    neutral: { count: 0, engines: [], highlights: [] },
    mixed: { count: 0, engines: [], highlights: [] },
  };

  const positiveWords = [
    'positive',
    'good',
    'excellent',
    'strong',
    'opportunity',
    'growth',
    'advantage',
    'beneficial',
    'favorable',
    'promising',
  ];
  const negativeWords = [
    'negative',
    'poor',
    'weak',
    'challenge',
    'difficult',
    'problem',
    'decline',
    'issue',
    'concern',
    'risk',
  ];

  results.forEach(result => {
    if (result.error) return;

    const text = result.summary.toLowerCase();
    const sentences = result.summary.split(/[.!?]+/);

    const positiveCount = positiveWords.reduce(
      (count, word) => count + (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length,
      0
    );
    const negativeCount = negativeWords.reduce(
      (count, word) => count + (text.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length,
      0
    );

    let sentiment: keyof SentimentBreakdown;
    if (positiveCount > negativeCount * 1.5) {
      sentiment = 'positive';
    } else if (negativeCount > positiveCount * 1.5) {
      sentiment = 'negative';
    } else if (positiveCount > 0 && negativeCount > 0) {
      sentiment = 'mixed';
    } else {
      sentiment = 'neutral';
    }

    breakdown[sentiment].count++;
    breakdown[sentiment].engines.push(result.engine);

    // Extract relevant sentences for highlights
    const relevantSentences = sentences
      .filter(sentence => {
        const lowerSentence = sentence.toLowerCase();
        return (
          positiveWords.some(word => lowerSentence.includes(word)) ||
          negativeWords.some(word => lowerSentence.includes(word))
        );
      })
      .slice(0, 2);

    breakdown[sentiment].highlights.push(...relevantSentences.map(s => s.trim()));
  });

  return breakdown;
}

function determineOverallSentiment(
  breakdown: SentimentBreakdown
): 'positive' | 'negative' | 'neutral' | 'mixed' {
  const { positive, negative, neutral, mixed } = breakdown;
  const total = positive.count + negative.count + neutral.count + mixed.count;

  if (total === 0) return 'neutral';

  const positiveRatio = (positive.count + mixed.count * 0.5) / total;
  const negativeRatio = (negative.count + mixed.count * 0.5) / total;

  if (positiveRatio > 0.6) return 'positive';
  if (negativeRatio > 0.6) return 'negative';
  if (mixed.count > 0 || (positive.count > 0 && negative.count > 0)) return 'mixed';
  return 'neutral';
}

function extractTopTags(results: AIEngineResult[]): TagFrequency[] {
  const tagCounts = new Map<string, { count: number; engines: Set<string> }>();

  // Common marketing/SEO/business tags to extract
  const targetTags = [
    'SEO',
    'local search',
    'Google',
    'ranking',
    'visibility',
    'competition',
    'market',
    'brand',
    'reputation',
    'customer',
    'review',
    'rating',
    'organic',
    'traffic',
    'keywords',
    'content',
    'website',
    'mobile',
    'social media',
    'advertising',
    'conversion',
    'ROI',
    'analytics',
    'optimization',
    'strategy',
    'growth',
    'digital marketing',
    'online presence',
    'search results',
    'SERP',
    'local business',
    'geographic',
    'regional',
    'location',
    'directory',
  ];

  results.forEach(result => {
    if (result.error) return;

    const text = result.summary.toLowerCase();

    targetTags.forEach(tag => {
      const regex = new RegExp(`\\b${tag.toLowerCase()}\\b`, 'g');
      const matches = text.match(regex);
      if (matches) {
        const existing = tagCounts.get(tag) || { count: 0, engines: new Set() };
        existing.count += matches.length;
        existing.engines.add(result.engine);
        tagCounts.set(tag, existing);
      }
    });
  });

  return Array.from(tagCounts.entries())
    .map(([tag, data]) => ({
      tag,
      count: data.count,
      engines: Array.from(data.engines),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function extractSources(results: AIEngineResult[]): SourceInfo[] {
  const sourceCounts = new Map<string, { count: number; engines: Set<string> }>();

  // Common sources that might be mentioned
  const sourcePatterns = [
    /Google/gi,
    /Bing/gi,
    /Yahoo/gi,
    /Facebook/gi,
    /Instagram/gi,
    /LinkedIn/gi,
    /Twitter/gi,
    /X\.com/gi,
    /YouTube/gi,
    /TikTok/gi,
    /Yelp/gi,
    /Google My Business/gi,
    /Reviews/gi,
    /Citations/gi,
    /Directories/gi,
    /Wikipedia/gi,
    /Local listings/gi,
    /Industry reports/gi,
    /Market research/gi,
    /Competitor analysis/gi,
    /Third-party sites/gi,
  ];

  results.forEach(result => {
    if (result.error) return;

    sourcePatterns.forEach(pattern => {
      const matches = result.summary.match(pattern);
      if (matches) {
        const source = matches[0];
        const normalized = source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();

        const existing = sourceCounts.get(normalized) || { count: 0, engines: new Set() };
        existing.count += matches.length;
        existing.engines.add(result.engine);
        sourceCounts.set(normalized, existing);
      }
    });
  });

  return Array.from(sourceCounts.entries())
    .map(([source, data]) => ({
      source,
      count: data.count,
      engines: Array.from(data.engines),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function extractKeyThemes(results: AIEngineResult[], keyword: string): string[] {
  const commonThemes = [
    'local search',
    'seo optimization',
    'market competition',
    'brand visibility',
    'customer engagement',
    'online presence',
    'search rankings',
    'digital marketing',
    'geographic targeting',
    'regional opportunities',
    'content strategy',
    'user experience',
  ];

  const allText = results.map(r => r.summary.toLowerCase()).join(' ');

  return commonThemes
    .filter(
      theme =>
        allText.includes(theme.toLowerCase()) &&
        results.filter(r => r.summary.toLowerCase().includes(theme.toLowerCase())).length >=
          Math.max(1, results.length * 0.25)
    )
    .slice(0, 6);
}

function extractMainSentimentHighlights(results: AIEngineResult[]) {
  const positive: string[] = [];
  const negative: string[] = [];

  const positiveWords = [
    'excellent',
    'strong',
    'opportunity',
    'advantage',
    'beneficial',
    'promising',
    'favorable',
  ];
  const negativeWords = [
    'poor',
    'weak',
    'challenge',
    'difficult',
    'problem',
    'concern',
    'risk',
    'decline',
  ];

  results.forEach(result => {
    if (result.error) return;

    const sentences = result.summary.split(/[.!?]+/);

    sentences.forEach(sentence => {
      const cleanSentence = sentence.trim();
      if (cleanSentence.length < 20 || cleanSentence.length > 150) return;

      const lowerSentence = cleanSentence.toLowerCase();

      if (positiveWords.some(word => lowerSentence.includes(word)) && positive.length < 3) {
        positive.push(cleanSentence);
      } else if (negativeWords.some(word => lowerSentence.includes(word)) && negative.length < 3) {
        negative.push(cleanSentence);
      }
    });
  });

  return { positive, negative };
}

function extractCompetitiveAdvantages(results: AIEngineResult[]): string[] {
  const advantages: string[] = [];
  const advantageKeywords = [
    'advantage',
    'opportunity',
    'strength',
    'potential',
    'leverage',
    'capitalize',
  ];

  results.forEach(result => {
    const sentences = result.summary.split(/[.!?]+/);
    sentences.forEach(sentence => {
      if (advantageKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length > 10 && cleanSentence.length < 200) {
          advantages.push(cleanSentence);
        }
      }
    });
  });

  return advantages.slice(0, 5); // Limit to top 5
}

function extractRecommendations(results: AIEngineResult[], keyword: string): string[] {
  const recommendations: string[] = [];
  const recommendationKeywords = [
    'recommend',
    'should',
    'consider',
    'suggest',
    'focus',
    'optimize',
    'improve',
  ];

  results.forEach(result => {
    const sentences = result.summary.split(/[.!?]+/);
    sentences.forEach(sentence => {
      if (recommendationKeywords.some(recKeyword => sentence.toLowerCase().includes(recKeyword))) {
        const cleanSentence = sentence.trim();
        if (cleanSentence.length > 10 && cleanSentence.length < 200) {
          recommendations.push(cleanSentence);
        }
      }
    });
  });

  return recommendations.slice(0, 5); // Limit to top 5
}

function extractUrlSources(results: AIEngineResult[]): SourceInfo[] {
  const urlCounts = new Map<
    string,
    { count: number; engines: Set<string>; fullTexts: Set<string>; urls: Set<string> }
  >();

  results.forEach(result => {
    if (result.error || !result.sources || result.sources.length === 0) return;

    result.sources.forEach(url => {
      // Extract domain name for display
      let domain;
      try {
        domain = new URL(url).hostname.replace('www.', '');
      } catch {
        domain = url; // Fallback to full URL if parsing fails
      }

      const existing = urlCounts.get(domain) || {
        count: 0,
        engines: new Set(),
        fullTexts: new Set(),
        urls: new Set(),
      };
      existing.count += 1;
      existing.engines.add(result.engine);
      existing.fullTexts.add(result.summary); // Store full text
      existing.urls.add(url); // Store actual URLs
      urlCounts.set(domain, existing);
    });
  });

  return Array.from(urlCounts.entries())
    .map(([domain, data]) => ({
      source: domain,
      count: data.count,
      engines: Array.from(data.engines),
      excerpts: Array.from(data.fullTexts), // Now contains full texts
      urls: Array.from(data.urls), // Add URLs array
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export { getAllDataSources } from './dataSource';
