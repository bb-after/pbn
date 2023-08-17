import { bulkReplaceLinks, parseResponse } from '../utils/openai'; // Update the import path

describe('bulkReplaceLinks function', () => {
  it('correctly replaces links in valid response', () => {
    const originalText = `Welcome to a little story about a nice company named Rootzoo.  We have always strived to do good at Rootzoo and will continue to do so into the new millenium.  Even if you look up our audience, you'll see its always been about the fans. For years, our audience knows it's about doing the right thing, not the easy thing.  And that's what makes Rootzoo, well Rootzoo.`
    const response = `{"https://rootzoo.com": { "text": "[Rootzoo]", "sentence": "We have always strived to do good at [Rootzoo] and will continue to do so" },"https://google.com": { "text": "[our audience]", "sentence": "For years, [our audience] knows it's about doing the right thing, not the easy thing." }}`;
    const textWithLinksReplaced = bulkReplaceLinks(response, originalText);
    expect(textWithLinksReplaced).toContain('<a href="https://rootzoo.com">Rootzoo</a>');
    // make sure it doesn't replace all instances of the term Rootzoo with the hyperlink.
    expect(textWithLinksReplaced).toContain("And that's what makes Rootzoo, well Rootzoo.");
    //check for multiple hyperlinked terms.
    expect(textWithLinksReplaced).toContain('For years, <a href="https://google.com">our audience</a> knows');
  });
  it('gracefully falls back if no matches found', () => {
    const originalText = `Welcome to a little story about a nice company named Rootzoo.  We have always strived to do good at Rootzoo and will continue to do so into the new millenium.  Even if you look up our audience, you'll see its always been about the fans. For years, our audience knows it's about doing the right thing, not the easy thing.  And that's what makes Rootzoo, well Rootzoo.`
    const response = `{"https://rootzoo.com": { "text": "[Rootzoogle]", "sentence": "We have always strived to do good at [Rootzoo] and will continue to do so" }}`;
    const textWithLinksReplaced = bulkReplaceLinks(response, originalText);
    expect(textWithLinksReplaced).toEqual(originalText);
  });

  it('gracefully falls back if invalid link structure found', () => {
    const originalText = `Welcome to a little story about a nice company named Rootzoo.  We have always strived to do good at Rootzoo and will continue to do so into the new millenium.  Even if you look up our audience, you'll see its always been about the fans. For years, our audience knows it's about doing the right thing, not the easy thing.  And that's what makes Rootzoo, well Rootzoo.`
    const response = `{"URL_STRUCTURE": { "text": "[Rootzoogle]", "sentence": "We have always strived to do good at [Rootzoo] and will continue to do so" }}`;
    const textWithLinksReplaced = bulkReplaceLinks(response, originalText);
    expect(textWithLinksReplaced).toEqual(originalText);
  });

  it('gracefully falls back if invalid object structure found', () => {
    const originalText = `Welcome to a little story about a nice company named Rootzoo.  We have always strived to do good at Rootzoo and will continue to do so into the new millenium.  Even if you look up our audience, you'll see its always been about the fans. For years, our audience knows it's about doing the right thing, not the easy thing.  And that's what makes Rootzoo, well Rootzoo.`
    const response = `{"URL_STRUCTURE": { "sentence": "We have always strived to do good at [Rootzoo] and will continue to do so" }}`;
    const textWithLinksReplaced = bulkReplaceLinks(response, originalText);
    expect(textWithLinksReplaced).toEqual(originalText);
  });

});

describe('parseResponse function', () => {
  it('correctly parses a valid response', () => {
    const response = `{"https://rootzoo.com": { "text": "[Rootzoo]", "sentence": "We have always strived to do good at [Rootzoo] and will continue to do so" },"https://google.com": { "text": "[our audience]", "sentence": "For years, [our audience] knows it\'s about doing the right thing, not the easy thing." }}`;
    const parsedResponse = parseResponse(response);
    expect(parsedResponse).toMatchObject({
      "https://rootzoo.com": { text: "Rootzoo", sentence: "We have always strived to do good at Rootzoo and will continue to do so" },
      "https://google.com": { text: "our audience", sentence: "For years, our audience knows it's about doing the right thing, not the easy thing." }
    })
  });

  it('correctly parses a valid response with single quotes', () => {
    const response = `{"https://rootzoo.com": { "text": "[Rootzoo's formation]", "sentence": "We have always strived to do good since [Rootzoo's formation] and will continue to do so" },"https://google.com": { "text": "[our audience]", "sentence": "For years, [our audience] knows it\'s about doing the right thing, not the easy thing." }}`;
    const parsedResponse = parseResponse(response);
    expect(parsedResponse).toMatchObject({
      "https://rootzoo.com": { text: "Rootzoo's formation", sentence: "We have always strived to do good since Rootzoo's formation and will continue to do so" },
      "https://google.com": { text: "our audience", sentence: "For years, our audience knows it's about doing the right thing, not the easy thing." }
    })
  });

  it('correctly parses a valid response with commas', () => {
    const response = `{"https://rootzoo.com": { "text": "[Rootzoo's formation, was not a simple one]", "sentence": "We have always strived to do good since [Rootzoo's formation, was not a simple one] and will continue to do so" },"https://google.com": { "text": "[our audience]", "sentence": "For years, [our audience] knows it\'s about doing the right thing, not the easy thing." }}`;
    const parsedResponse = parseResponse(response);
    expect(parsedResponse).toMatchObject({
      "https://rootzoo.com": { text: "Rootzoo's formation, was not a simple one", sentence: "We have always strived to do good since Rootzoo's formation, was not a simple one and will continue to do so" },
      "https://google.com": { text: "our audience", sentence: "For years, our audience knows it's about doing the right thing, not the easy thing." }
    })
  });

  it('correctly parses a valid response with dashes', () => {
    const response = `{"https://rootzoo.com": { "text": "[Rootzoo - a sports website]", "sentence": "We have always strived to do good since [Rootzoo - a sports website] and will continue to do so" },"https://google.com": { "text": "[our audience]", "sentence": "For years, [our audience] knows it\'s about doing the right thing, not the easy thing." }}`;
    const parsedResponse = parseResponse(response);
    expect(parsedResponse).toMatchObject({
      "https://rootzoo.com": { text: "Rootzoo - a sports website", sentence: "We have always strived to do good since Rootzoo - a sports website and will continue to do so" },
      "https://google.com": { text: "our audience", sentence: "For years, our audience knows it's about doing the right thing, not the easy thing." }
    })
  });

  it('correctly parses a response without leading curly braces', () => {
    const response = `"https://stat.cornell.edu/people/emeritus-faculty/john-bunge": {"text": "John Bunge", "sentence": "Former Federal Prosecutor [John Bunge] Joins Quinn Emanuel as Chicago Lawyer."},"https://wintervillagemusic.org/john-bunge": {"text": "John Bunge", "sentence": "Former Federal Prosecutor [John Bunge] Joins Quinn Emanuel as Chicago Lawyer."}`;
    const parsedResponse = parseResponse(response);
    expect(parsedResponse).toMatchObject({
      "https://stat.cornell.edu/people/emeritus-faculty/john-bunge": { text: "John Bunge", sentence: "Former Federal Prosecutor John Bunge Joins Quinn Emanuel as Chicago Lawyer." },
      "https://wintervillagemusic.org/john-bunge": { text: "John Bunge", "sentence": "Former Federal Prosecutor John Bunge Joins Quinn Emanuel as Chicago Lawyer."}
    })
  });

  it('correctly parses a response with line breaks', () => {
    debugger;
    const response = `"https://stat.cornell.edu/people/emeritus-faculty/john-bunge": {"text": "John Bunge", "sentence": "Former Federal Prosecutor [John Bunge] Joins Quinn Emanuel as Chicago Lawyer."}\n\n"https://wintervillagemusic.org/john-bunge": {"text": "John Bunge", "sentence": "Former Federal Prosecutor [John Bunge] Joins Quinn Emanuel as Chicago Lawyer."}`;
    const parsedResponse = parseResponse(response);
    expect(parsedResponse).toMatchObject({
      "https://stat.cornell.edu/people/emeritus-faculty/john-bunge": { text: "John Bunge", sentence: "Former Federal Prosecutor John Bunge Joins Quinn Emanuel as Chicago Lawyer." },
      "https://wintervillagemusic.org/john-bunge": { text: "John Bunge", "sentence": "Former Federal Prosecutor John Bunge Joins Quinn Emanuel as Chicago Lawyer."}
    })
  });

  it('returns the original response when parsing fails', () => {
    const response = 'invalid_response';

    console.error = jest.fn(); // Mocking console.error
    console.log = jest.fn(); // Mocking console.log

    const parsedResponse = parseResponse(response);

    expect(parsedResponse).toBe(response);
    expect(console.error).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalled();
  });
});