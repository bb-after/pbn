export const formatSuperstarContent = (content: string, seoTitle: string) => {
    // Extract the title if it starts with ### and is followed by quoted text
    let cleanedTitle = seoTitle;
    const titleMatch = seoTitle.match(/###\s*"([^"]+)"/);
    if (titleMatch) {
      cleanedTitle = titleMatch[1];
    } else {
      cleanedTitle = seoTitle.replace(/^"|"$/g, '').trim();
    }
  
    // Remove any instance of "###" from the title
    cleanedTitle = cleanedTitle.replace(/###/g, '');
  
    // Handle multiple title suggestions
    if (/^\d+\.\s*".*"$/.test(seoTitle)) {
      const titles = seoTitle.match(/\d+\.\s*"([^"]+)"/g);
      if (titles && titles.length > 0) {
        cleanedTitle = titles[0].replace(/^\d+\.\s*"|"$/g, '').trim();
      }
    }
  
    // Function to add line breaks within the article every 3-5 sentences
    const addParagraphs = (text: string) => {
      const sentences = text.split('. ');
      let paragraph = '';
      let formattedText = '';
  
      for (let i = 0; i < sentences.length; i++) {
        paragraph += sentences[i] + (i < sentences.length - 1 ? '. ' : '');
        if (Math.random() < 0.25 || i === sentences.length - 1) { // Approx every 3-5 sentences
          formattedText += paragraph + '\n\n';
          paragraph = '';
        }
      }
  
      return formattedText.trim();
    };
  
    // Remove "Title" keyword if it is the first word and set it as title
    if (content.startsWith("Title")) {
      const parts = content.split("\n");
      content = parts.slice(1).join("\n").trim();
    }
  
    // Replace multiple # symbols in a row with <br><br>
    content = content.replace(/#{2,}/g, '<br><br>');
  
    // Remove any instance of "# " from the body
    content = content.replace(/#\s/g, '');
  
    // Replace [text](url) with <a href="url">text</a>
    content = content.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
      '<a href="$2">$1</a>'
    );
  
    // Handle double asterisks for bold text
    content = content.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  
    // Remove "Conclusion" if followed by a word starting with a capital letter and add new paragraph
    content = content.replace(/\bConclusion\s+(?=[A-Z])/g, '<br><br>');
  
    // Add paragraphs
    content = addParagraphs(content);
  
    // Remove any instances of multiple line breaks (more than double spaced) with a single line break
    content = content.replace(/\n{3,}/g, '\n\n');
  
    // Remove leading spaces from the start of each line
    content = content.split('\n').map(line => line.trimStart()).join('\n');
  
    // Ensure the final content ends with double newline characters if not already present
    if (!content.endsWith('\n\n')) {
      content += '\n\n';
    }
  
    return { content, title: cleanedTitle };
  };
  