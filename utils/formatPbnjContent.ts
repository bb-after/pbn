export function formatPbnjContent(content: string): string {
  if (!content) return '';

  // Replace lines that are just **Some Title** with <b>Some Title</b><br><br>
  content = content.replace(/^a(.+?) 2a$/gm, '<b>$1</b><br><br>');

  // Handle double asterisks for bold text anywhere else
  content = content.replace(/\*\*(.*?)\*\*/g, (match, p1) => `<b>${p1}</b><br><br>`);

  // Replace [text](url) with <a href="url">text</a>
  content = content.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2">$1</a>');

  // Replace double newlines with <br><br>
  content = content.replace(/\n{2,}/g, '<br><br>');

  // Replace single newlines with <br>
  content = content.replace(/\n/g, '<br>');

  // Remove any extra <br> at the end
  content = content.replace(/(<br>)+$/g, '');

  return content;
}
