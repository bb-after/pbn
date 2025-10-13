interface RampExpense {
  id: string;
  client: string;
  description: string;
  category: string;
  merchant: string;
  amount: number;
  date: string;
}

/**
 * Extracts client name from memo based on specific client patterns
 */
export const extractClientFromMemo = (memo: string, expenseClient: string): string => {
  if (!memo) return '';

  console.log('Extracting client from memo:', { memo, expenseClient });

  // Handle Digital Status Limited with "Client: [ClientName]" pattern
  if (expenseClient === 'Digital Status Limited') {
    // Pattern: "Client: Summit Group" -> extract "Summit Group"
    const clientMatch = memo.match(/Client:\s*([^,\n\r]+)/i);
    if (clientMatch) {
      const clientName = clientMatch[1].trim();
      console.log('Extracted client from Digital Status Limited memo:', clientName);
      return clientName;
    }

    // Fallback: if no "Client:" pattern found, return empty to avoid bad matches
    console.log('No Client: pattern found in Digital Status Limited memo, returning empty');
    return '';
  }

  // Special patterns for Status Labs Deutschland
  if (expenseClient === 'Status Labs Deutschland') {
    // Pattern 1: "Jean-Claude Bastos" -> should map to "ORM Jean-Claude Bastos"
    if (memo.toLowerCase().includes('jean-claude bastos')) {
      return 'ORM Jean-Claude Bastos';
    }

    // Pattern 2: "Läderach Content (German + Swiss)" -> should map to "ORM Läderach"
    if (memo.toLowerCase().includes('läderach')) {
      return 'ORM Läderach';
    }

    // Pattern 3: Extract ORM client names - look for common patterns
    // "ORM [ClientName]" or "[ClientName] ORM" patterns
    const ormMatch = memo.match(/ORM\s+([^\s-\(\)]+)|([^\s-\(\)]+)\s+ORM/i);
    if (ormMatch) {
      const clientName = (ormMatch[1] || ormMatch[2] || '').trim();
      if (clientName && clientName.length > 2) {
        return `ORM ${clientName}`;
      }
    }

    // Pattern 4: Look for specific keywords that indicate client names
    const clientKeywords = [
      'content',
      'reputation',
      'wiki',
      'seo',
      'pr',
      'text',
      'with',
      'client',
      'patterns',
      'random',
    ];
    const words = memo.toLowerCase().split(/[\s\-\(\)]+/);

    for (const word of words) {
      // Skip common words and focus on potential client names
      if (word.length > 3 && !clientKeywords.includes(word) && !word.match(/^\d+$/)) {
        // Capitalize first letter and try as ORM client
        const potentialClient = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        if (
          potentialClient !== 'German' &&
          potentialClient !== 'Swiss' &&
          potentialClient !== 'Random'
        ) {
          console.log('Potential ORM client extracted:', `ORM ${potentialClient}`);
          return `ORM ${potentialClient}`;
        }
      }
    }

    // If no patterns matched for Status Labs Deutschland, return empty
    console.log('No patterns matched for Status Labs Deutschland, returning empty');
    return '';
  }

  // For other cases, return empty to be conservative
  return '';
};

/**
 * Finds the best client match for a Ramp expense
 */
export const findBestClientMatch = (expense: RampExpense, clientOptions: string[]): string => {
  if (clientOptions.length === 0) return '';

  console.log('Client mapping debug:', {
    expenseId: expense.id,
    originalClient: expense.client,
    memo: expense.description,
  });

  // Special case: Status Labs always maps to **Special Projects
  if (expense.client === 'Status Labs') {
    const specialProjectsMatch = clientOptions.find(option =>
      option.includes('**Special Projects')
    );
    if (specialProjectsMatch) {
      console.log('Status Labs mapped to Special Projects:', specialProjectsMatch);
      return specialProjectsMatch;
    }
  }

  // Special cases for memo-based mapping (excluding Status Labs)
  const memoBasedSpecialCases = ['Digital Status Limited', 'Status Labs Deutschland'];

  let searchTerm: string;
  if (memoBasedSpecialCases.includes(expense.client)) {
    // For memo-based special cases, extract client name from memo
    searchTerm = extractClientFromMemo(expense.description, expense.client);
    console.log('Extracted search term from memo:', searchTerm);

    // If extraction failed or returned the full memo, return empty to avoid bad matches
    if (!searchTerm || searchTerm === expense.description || searchTerm.length < 3) {
      console.log('Memo extraction failed, returning empty to avoid bad matches');
      return '';
    }
  } else {
    searchTerm = expense.client;
  }

  if (!searchTerm || searchTerm === 'No client') {
    console.log('No search term, checking for **Special Projects fallback');
    const specialProjectsMatch = clientOptions.find(option =>
      option.includes('**Special Projects')
    );
    return specialProjectsMatch || '';
  }

  // Try exact match first
  const exactMatch = clientOptions.find(
    option => option.toLowerCase() === searchTerm.toLowerCase()
  );
  if (exactMatch) {
    console.log('Found exact match:', exactMatch);
    return exactMatch;
  }

  // For memo-based special cases, try a more targeted contains match
  if (memoBasedSpecialCases.includes(expense.client)) {
    // Look for options that contain the search term (case-insensitive)
    const containsMatch = clientOptions.find(option => {
      const optionLower = option.toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      return optionLower.includes(searchLower);
    });

    if (containsMatch) {
      console.log('Found memo-based contains match:', containsMatch);
      return containsMatch;
    }

    // If no contains match found for memo-based cases, leave unmapped (return empty)
    // This prevents bad auto-mapping and lets user manually select
    console.log('No contains match for memo-based case, leaving unmapped for manual selection');
    return '';
  }

  // For regular client names (not memo-based), try fuzzy matching
  const containsMatch = clientOptions.find(
    option =>
      option.toLowerCase().includes(searchTerm.toLowerCase()) ||
      searchTerm.toLowerCase().includes(option.toLowerCase())
  );
  if (containsMatch) {
    console.log('Found contains match:', containsMatch);
    return containsMatch;
  }

  // Try word-based matching for regular clients only (not memo-based special cases)
  const searchWords = searchTerm
    .toLowerCase()
    .split(' ')
    .filter(
      word =>
        word.length > 3 &&
        ![
          'the',
          'and',
          'for',
          'with',
          'from',
          'that',
          'this',
          'have',
          'will',
          'been',
          'were',
        ].includes(word)
    );

  if (searchWords.length === 0) {
    console.log('No valid search words, using **Special Projects fallback');
    const specialProjectsMatch = clientOptions.find(option =>
      option.includes('**Special Projects')
    );
    return specialProjectsMatch || '';
  }

  let bestMatch = '';
  let bestScore = 0;

  for (const option of clientOptions) {
    const optionWords = option.toLowerCase().split(' ');
    let score = 0;

    // Count exact word matches only
    for (const searchWord of searchWords) {
      if (optionWords.some(optionWord => optionWord === searchWord)) {
        score += 1;
      }
    }

    // Bonus points if the option starts with the search term
    if (option.toLowerCase().startsWith(searchTerm.toLowerCase())) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = option;
    }
  }

  // Require at least one exact word match to prevent weak matches
  const result = bestScore >= 1 ? bestMatch : '';

  console.log('Word-based matching result:', {
    searchWords,
    bestMatch,
    bestScore,
    result,
  });

  // If no match found, fallback to **Special Projects
  if (!result) {
    console.log('No match found, falling back to **Special Projects');
    const specialProjectsMatch = clientOptions.find(option =>
      option.includes('**Special Projects')
    );
    return specialProjectsMatch || '';
  }

  return result;
};

/**
 * Auto-maps clients for a list of expenses
 */
export const autoMapClients = (
  expenses: RampExpense[],
  clientOptions: string[],
  existingMappings: Map<string, string> = new Map()
): Map<string, string> => {
  if (clientOptions.length === 0 || expenses.length === 0) {
    return new Map(existingMappings);
  }

  const newSelectedClients = new Map(existingMappings);

  for (const expense of expenses) {
    // Only auto-map if not already mapped
    if (!newSelectedClients.has(expense.id)) {
      const bestMatch = findBestClientMatch(expense, clientOptions);
      console.log(
        `Auto-mapping expense ${expense.id}: "${expense.client}" with memo "${expense.description}" -> "${bestMatch}"`
      );

      // Only set the mapping if we found a valid match (not empty string)
      if (bestMatch && bestMatch.trim()) {
        // Verify the bestMatch actually exists in clientOptions to prevent invalid selections
        if (clientOptions.includes(bestMatch)) {
          newSelectedClients.set(expense.id, bestMatch);
        } else {
          console.warn(
            `Best match "${bestMatch}" not found in client options. Available options:`,
            clientOptions
          );
        }
      }
    }
  }

  return newSelectedClients;
};
