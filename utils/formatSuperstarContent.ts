/**
 * Clean up AI-generated titles by removing unwanted formatting patterns
 */
function cleanTitle(title: string): string {
  console.log('Raw title before cleaning:', title);

  let cleaned = title;

  // Pattern 0: Handle multiple title suggestions - extract first actual title
  // Match patterns like "Here are X title options:" or "Primary SEO-friendly title:"
  const multiTitlePatterns = [
    /Here are \w+ SEO-friendly title options[^:]*:\s*\n*\s*(?:\d+[.)]\s*)?(.+?)(?:\n|$)/i,
    /Here are \w+ title options[^:]*:\s*\n*\s*(?:\d+[.)]\s*)?(.+?)(?:\n|$)/i,
    /Primary SEO-friendly title:\s*\n*\s*(.+?)(?:\n|$)/i,
    /Recommendation:\s*\d+[.)]\s*(.+?)(?:\n|$)/i,
    /(?:pick one|choose|select)[^:]*:\s*\n*\s*(?:\d+[.)]\s*)?(.+?)(?:\n|$)/i,
  ];

  for (const pattern of multiTitlePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      cleaned = match[1].trim();
      break;
    }
  }

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

  console.log('Cleaned title:', cleaned);
  return cleaned;
}

export const formatSuperstarContent = (content: string, seoTitle: string) => {
  console.log('content before formatting', content);

  // Use the enhanced title cleaning function
  let cleanedTitle = cleanTitle(seoTitle);

  // Function to add line breaks within the article every 3-5 sentences
  const addParagraphs = (text: string) => {
    const sentences = text.split('. ');
    let paragraph = '';
    let formattedText = '';

    for (let i = 0; i < sentences.length; i++) {
      paragraph += sentences[i] + (i < sentences.length - 1 ? '. ' : '');
      if (Math.random() < 0.25 || i === sentences.length - 1) {
        // Approx every 3-5 sentences
        formattedText += paragraph + '\n\n';
        paragraph = '';
      }
    }

    return formattedText.trim();
  };

  // Remove "Title" keyword if it is the first word and set it as title
  if (content.startsWith('Title')) {
    const parts = content.split('\n');
    content = parts.slice(1).join('\n').trim();
  }

  // Replace multiple # symbols in a row with <br><br>
  // Remove instances of multiple # symbols with spaces and trim the trailing space if one exists
  content = content.replace(/#+\s*(\S[^\n]*)\n/g, '<b>$1</b>\n');
  // Handle # symbols followed by a word and a line break
  content = content.replace(/#{2,}\s*(.+)/g, '<b>$1</b>\n');

  // Remove any instance of "# " from the body
  content = content.replace(/#\s/g, '');

  // Replace [text](url) with <a href="url">text</a>
  content = content.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2">$1</a>');

  // Handle double asterisks for bold text
  content = content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

  // Remove "Conclusion" or "<b>Conclusion</b>" if followed by a word starting with a capital letter or a line break
  content = content.replace(/(?:<b>)?Conclusion(?:<\/b>)?(?:\s+|\n)/g, '\n');

  // Add paragraphs
  content = addParagraphs(content);

  // Remove any instances of multiple line breaks (more than double spaced) with a single line break
  content = content.replace(/\n{3,}/g, '\n');

  // Remove leading spaces from the start of each line
  content = content
    .split('\n')
    .map(line => line.trimStart())
    .join('\n');

  // Ensure the final content ends with double newline characters if not already present
  if (!content.endsWith('\n\n')) {
    content += '\n\n';
  }

  // Replace all instances of double newlines with <br><br>
  content = content.replace(/\n/g, '<br>');

  return { content, title: cleanedTitle };
};
