interface DataSource {
  id: number;
  name: string;
  model: string;
  prompt: string;
  isActive: boolean;
}

// Mock data source for GEO checking - you can extend this to use a real database if needed
export async function getDataSourceById(dataSourceId: number): Promise<DataSource> {
  const dataSources: Record<number, DataSource> = {
    1: {
      id: 1,
      name: 'OpenAI GPT-4o',
      model: 'gpt-4o',
      prompt:
        'Analyze the local search and geo-targeted content for "{keyword}". Provide a comprehensive sentiment analysis including: 1) Overall sentiment (positive/negative/neutral), 2) Key themes and topics mentioned, 3) Local market trends, 4) Geographic relevance, 5) Competitive landscape insights. Focus on how this term performs in local search results.',
      isActive: true,
    },
    6: {
      id: 6,
      name: 'OpenAI GPT-5',
      model: 'gpt-5',
      prompt:
        'Analyze the local search and geo-targeted content for "{keyword}". Provide a comprehensive sentiment analysis including: 1) Overall sentiment (positive/negative/neutral), 2) Key themes and topics mentioned, 3) Local market trends, 4) Geographic relevance, 5) Competitive landscape insights. Focus on how this term performs in local search results.',
      isActive: true,
    },
    2: {
      id: 2,
      name: 'Claude 4 Sonnet',
      model: 'claude-4-sonnet-20250109',
      prompt:
        'Perform a geo-targeted analysis of "{keyword}" including local search sentiment, regional variations, and market positioning. Analyze: 1) Local search volume implications, 2) Geographic sentiment patterns, 3) Competitive positioning, 4) Regional market opportunities, 5) Local SEO potential. Provide actionable insights for local market penetration.',
      isActive: true,
    },
    3: {
      id: 3,
      name: 'Gemini 2.5 Flash',
      model: 'gemini-2.5-flash-002',
      prompt:
        'Evaluate "{keyword}" from a geographic and local market perspective with the latest multimodal capabilities. Analyze: 1) Local search trends and sentiment, 2) Geographic distribution of interest, 3) Regional competitive landscape, 4) Local market opportunities, 5) Geographic SEO considerations. Focus on actionable geo-targeting insights.',
      isActive: true,
    },
    4: {
      id: 4,
      name: 'Perplexity',
      model: 'llama-3.1-sonar-large-128k-online',
      prompt:
        'Research and analyze "{keyword}" with focus on geographic and local search patterns. Provide insights on: 1) Current local search trends, 2) Geographic market sentiment, 3) Regional competition analysis, 4) Local SEO opportunities, 5) Geographic targeting recommendations. Include recent data and market intelligence.',
      isActive: true,
    },
    5: {
      id: 5,
      name: 'Grok 4',
      model: 'grok-4',
      prompt:
        'Analyze "{keyword}" for geo-targeted marketing insights. Focus on: 1) Local search behavior patterns, 2) Geographic sentiment analysis, 3) Regional market dynamics, 4) Local competition assessment, 5) Geographic opportunity identification. Provide practical recommendations for local market success.',
      isActive: true,
    },
    // 7: {
    //   id: 7,
    //   name: 'Grok 2.5',
    //   model: 'grok-2-1212',
    //   prompt: 'Analyze "{keyword}" for geo-targeted marketing insights with real-time data access. Focus on: 1) Current local search behavior patterns, 2) Geographic sentiment analysis, 3) Regional market dynamics, 4) Local competition assessment, 5) Geographic opportunity identification. Provide practical recommendations for local market success.',
    //   isActive: false,
    // },
    8: {
      id: 8,
      name: 'Claude 4 Opus',
      model: 'claude-4-opus-20250109',
      prompt:
        'Perform a geo-targeted analysis of "{keyword}" including local search sentiment, regional variations, and market positioning. Analyze: 1) Local search volume implications, 2) Geographic sentiment patterns, 3) Competitive positioning, 4) Regional market opportunities, 5) Local SEO potential. Provide actionable insights for local market penetration.',
      isActive: true,
    },
    10: {
      id: 10,
      name: 'o1 Preview',
      model: 'o1-preview',
      prompt:
        'Analyze the local search and geo-targeted content for "{keyword}" with deep reasoning. Provide a comprehensive sentiment analysis including: 1) Overall sentiment (positive/negative/neutral), 2) Key themes and topics mentioned, 3) Local market trends, 4) Geographic relevance, 5) Competitive landscape insights. Focus on how this term performs in local search results.',
      isActive: true,
    },
    11: {
      id: 11,
      name: 'o1 Mini',
      model: 'o1-mini',
      prompt:
        'Analyze the local search and geo-targeted content for "{keyword}" with focused reasoning. Provide a comprehensive sentiment analysis including: 1) Overall sentiment (positive/negative/neutral), 2) Key themes and topics mentioned, 3) Local market trends, 4) Geographic relevance, 5) Competitive landscape insights. Focus on how this term performs in local search results.',
      isActive: true,
    },
  };

  const dataSource = dataSources[dataSourceId];

  if (!dataSource) {
    throw new Error(`Data source with ID ${dataSourceId} not found`);
  }

  return dataSource;
}

export function getAllDataSources(): DataSource[] {
  return [
    {
      id: 1,
      name: 'OpenAI GPT-4o',
      model: 'gpt-4o',
      prompt:
        'Analyze the local search and geo-targeted content for "{keyword}". Provide a comprehensive sentiment analysis including: 1) Overall sentiment (positive/negative/neutral), 2) Key themes and topics mentioned, 3) Local market trends, 4) Geographic relevance, 5) Competitive landscape insights. Focus on how this term performs in local search results.',
      isActive: true,
    },
    {
      id: 6,
      name: 'OpenAI GPT-5',
      model: 'gpt-5',
      prompt:
        'Analyze the local search and geo-targeted content for "{keyword}". Provide a comprehensive sentiment analysis including: 1) Overall sentiment (positive/negative/neutral), 2) Key themes and topics mentioned, 3) Local market trends, 4) Geographic relevance, 5) Competitive landscape insights. Focus on how this term performs in local search results.',
      isActive: true,
    },
    {
      id: 2,
      name: 'Claude 4 Sonnet',
      model: 'claude-4-sonnet-20250109',
      prompt:
        'Perform a geo-targeted analysis of "{keyword}" including local search sentiment, regional variations, and market positioning. Analyze: 1) Local search volume implications, 2) Geographic sentiment patterns, 3) Competitive positioning, 4) Regional market opportunities, 5) Local SEO potential. Provide actionable insights for local market penetration.',
      isActive: true,
    },
    {
      id: 3,
      name: 'Gemini 2.5 Flash',
      model: 'gemini-2.5-flash-002',
      prompt:
        'Evaluate "{keyword}" from a geographic and local market perspective with the latest multimodal capabilities. Analyze: 1) Local search trends and sentiment, 2) Geographic distribution of interest, 3) Regional competitive landscape, 4) Local market opportunities, 5) Geographic SEO considerations. Focus on actionable geo-targeting insights.',
      isActive: true,
    },
    {
      id: 4,
      name: 'Perplexity',
      model: 'llama-3.1-sonar-large-128k-online',
      prompt:
        'Research and analyze "{keyword}" with focus on geographic and local search patterns. Provide insights on: 1) Current local search trends, 2) Geographic market sentiment, 3) Regional competition analysis, 4) Local SEO opportunities, 5) Geographic targeting recommendations. Include recent data and market intelligence.',
      isActive: true,
    },
    {
      id: 5,
      name: 'Grok 4',
      model: 'grok-4',
      prompt:
        'Analyze "{keyword}" for geo-targeted marketing insights. Focus on: 1) Local search behavior patterns, 2) Geographic sentiment analysis, 3) Regional market dynamics, 4) Local competition assessment, 5) Geographic opportunity identification. Provide practical recommendations for local market success.',
      isActive: true,
    },
    // {
    //   id: 7,
    //   name: 'Grok 2.5',
    //   model: 'grok-2-1212',
    //   prompt: 'Analyze "{keyword}" for geo-targeted marketing insights with real-time data access. Focus on: 1) Current local search behavior patterns, 2) Geographic sentiment analysis, 3) Regional market dynamics, 4) Local competition assessment, 5) Geographic opportunity identification. Provide practical recommendations for local market success.',
    //   isActive: false,
    // },
    {
      id: 8,
      name: 'Claude 4 Opus',
      model: 'claude-4-opus-20250109',
      prompt:
        'Perform a geo-targeted analysis of "{keyword}" including local search sentiment, regional variations, and market positioning. Analyze: 1) Local search volume implications, 2) Geographic sentiment patterns, 3) Competitive positioning, 4) Regional market opportunities, 5) Local SEO potential. Provide actionable insights for local market penetration.',
      isActive: true,
    },
    // {
    //   id: 10,
    //   name: 'o1 Preview',
    //   model: 'o1-preview',
    //   prompt: 'Analyze the local search and geo-targeted content for "{keyword}" with deep reasoning. Provide a comprehensive sentiment analysis including: 1) Overall sentiment (positive/negative/neutral), 2) Key themes and topics mentioned, 3) Local market trends, 4) Geographic relevance, 5) Competitive landscape insights. Focus on how this term performs in local search results.',
    //   isActive: true,
    // },
    // {
    //   id: 11,
    //   name: 'o1 Mini',
    //   model: 'o1-mini',
    //   prompt: 'Analyze the local search and geo-targeted content for "{keyword}" with focused reasoning. Provide a comprehensive sentiment analysis including: 1) Overall sentiment (positive/negative/neutral), 2) Key themes and topics mentioned, 3) Local market trends, 4) Geographic relevance, 5) Competitive landscape insights. Focus on how this term performs in local search results.',
    //   isActive: true,
    // },
  ];
}
