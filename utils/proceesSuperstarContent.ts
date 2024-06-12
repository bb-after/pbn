  export const processSuperstarContent = (content: string, seoTitle: string) => {
    // Remove leading and trailing quotes from seoTitle
    let cleanedTitle = seoTitle.replace(/^"|"$/g, '').trim();
  
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
      content = parts.slice(1).join("\n");
    }
  
    // Replace multiple # symbols in a row with <br><br>
    content = content.replace(/#{2,}/g, '<br><br>');

    // Replace [text](url) with <a href="url">text</a>
    content = content.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
      '<a href="$2">$1</a>'
    );
  
    // Add paragraphs
    content = addParagraphs(content);
  
    // Handle double asterisks for bold text
    content = content.replace(/\*\*(.*?)\*\*/g, (match, p1) => {
      return `<b>${p1}</b><br><br>`;
    });
  
    return { content, title: cleanedTitle };
  };
 