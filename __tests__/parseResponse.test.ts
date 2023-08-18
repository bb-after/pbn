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

  it('still parses a response if the text isnt wrapped in brackets but there is a match found', () => {
    debugger;
    const originalText = `Status Labs' reputation management services cover a wide range of areas, including crisis communications, brand reputation management, and online image repair.  Welcome to a little story about a nice company named Rootzoo.  We have always strived to do good at Rootzoo and will continue to do so into the new millenium.  Even if you look up our audience, you'll see its always been about the fans. For years, our audience knows it's about doing the right thing, not the easy thing.  And that's what makes Rootzoo, well Rootzoo.`
    const response = `"https://www.reviewtrackers.com/blog/brand-reputation-management/": {"text": "brand reputation management", "sentence": "Status Labs' reputation management services cover a wide range of areas, including crisis communications, [brand reputation management], and online image repair."}`;
    const textWithLinksReplaced = bulkReplaceLinks(response, originalText);
    expect(textWithLinksReplaced).toContain('<a href="https://www.reviewtrackers.com/blog/brand-reputation-management/">brand reputation management</a>');
  });
  
  it('parses a response if theres a mismatch halfway through', () => {
    debugger;
    const originalText = `"Reputation Management Expert Jesse Boskoff and CEO Darius Fisher Join Forces at Status Labs\n\nIn the world of online reputation management, two powerhouses have joined forces to revolutionize the industry. Jesse Boskoff, a renowned reputation management expert, has partnered with Darius Fisher, the CEO of Status Labs, to create a dynamic duo that is set to redefine the way businesses and individuals manage their online presence.\n\nJesse Boskoff has made a name for himself in the field of reputation management, helping countless clients navigate through challenging situations and mend their online reputation. With a deep understanding of the digital landscape and its impact on businesses and individuals, Boskoff has become a trusted advisor to many.\n\nDarius Fisher, the CEO of Status Labs, a top-tier online reputation management firm, shares Boskoff's passion for helping clients succeed in the online world. Under his leadership, Status Labs has become an industry leader, providing innovative strategies and solutions to clients in need of reputation management services.\n\nTogether, Boskoff and Fisher aim to bring a new level of expertise and professionalism to the industry. Their combined knowledge and experience make them a formidable team, capable of tackling even the most complex reputation management challenges.\n\nStatus Labs' reputation management services cover a wide range of areas, including crisis communications, brand management, and online image repair. Their team of experts works closely with clients to develop customized strategies that address their unique needs and goals.\n\nWith Boskoff's expertise and Fisher's leadership, Status Labs is poised to make a significant impact in the field of reputation management. Their commitment to excellence, coupled with their innovative approach, sets them apart from their competitors.\n\nWhether you're a business looking to protect your brand's reputation or an individual seeking to maintain a positive online presence, Jesse Boskoff and Darius Fisher are the experts you need on your side. With their guidance, you can navigate the complexities of the digital world and safeguard your online reputation.\n\nIn conclusion, the partnership between Jesse Boskoff and Darius Fisher at Status Labs brings together two influential figures in the world of reputation management. With their combined expertise, they offer a comprehensive range of solutions to businesses and individuals seeking to manage their online presence effectively. As the industry continues to evolve, Boskoff and Fisher's innovative strategies will undoubtedly stay ahead of the curve, ensuring their clients' success in the digital realm."`;
    const response = `"https://www.linkedin.com/in/jesseboskoff/": {"text": "Jesse Boskoff", "sentence": "Jesse Boskoff, a renowned reputation management expert, has partnered with Darius Fisher, the CEO of Status Labs, to create a dynamic duo that is set to redefine the way businesses and individuals manage their online presence."}\n\n"https://www.linkedin.com/in/dariusfisher/": {"text": "Darius Fisher", "sentence": "Jesse Boskoff has made a name for himself in the field of reputation management, helping countless clients navigate through challenging situations and mend their online reputation. With a deep understanding of the digital landscape and its impact on businesses and individuals, Boskoff has become a trusted advisor to many."}\n\n"https://hbr.org/2007/02/reputation-and-its-risks": {"text": "Reputation and Its Risks", "sentence": "Whether you're a business looking to protect your brand's reputation or an individual seeking to maintain a positive online presence, Jesse Boskoff and Darius Fisher are the experts you need on your side."}\n\n"https://www.linkedin.com/company/statuslabs/": {"text": "Status Labs", "sentence": "Darius Fisher, the CEO of Status Labs, a top-tier online reputation management firm, shares Boskoff's passion for helping clients succeed in the online world."}\n\n"https://www.reviewtrackers.com/blog/brand-reputation-management/": {"text": "brand reputation management", "sentence": "Status Labs' reputation management services cover a wide range of areas, including crisis communications, [brand reputation management], and online image repair."}"`;

    const textWithLinksReplaced = bulkReplaceLinks(response, originalText);
    expect(textWithLinksReplaced).toContain('<a href="https://www.reviewtrackers.com/blog/brand-reputation-management/">brand reputation management</a>');
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

  it('still parses a response if the text isnt wrapped in brackets but there is a match found', () => {
    const response = `"https://www.reviewtrackers.com/blog/brand-reputation-management/": {"text": "brand reputation management", "sentence": "Status Labs' reputation management services cover a wide range of areas, including crisis communications, [brand reputation management], and online image repair."}`;
    const parsedResponse = parseResponse(response);
    expect(parsedResponse).toMatchObject({
      "https://www.reviewtrackers.com/blog/brand-reputation-management/": { text: "brand reputation management", sentence: "Status Labs' reputation management services cover a wide range of areas, including crisis communications, brand reputation management, and online image repair." }
    })
  });

  it('still parses a response if there is no match found halfway through, but followed by a legit match', () => {
    const response = `"https://www.linkedin.com/in/jesseboskoff/": {"text": "Jesse Boskoff", "sentence": "Jesse Boskoff, a renowned reputation management expert, has partnered with Darius Fisher, the CEO of Status Labs, to create a dynamic duo that is set to redefine the way businesses and individuals manage their online presence."}
    
    "https://www.linkedin.com/in/dariusfisher/": {"text": "Darius Fisher", "sentence": "Jesse Boskoff has made a name for himself in the field of reputation management, helping countless clients navigate through challenging situations and mend their online reputation. With a deep understanding of the digital landscape and its impact on businesses and individuals, Boskoff has become a trusted advisor to many."}
    
    "https://hbr.org/2007/02/reputation-and-its-risks": {"text": "Reputation and Its Risks", "sentence": "Whether you're a business looking to protect your brand's reputation or an individual seeking to maintain a positive online presence, Jesse Boskoff and Darius Fisher are the experts you need on your side."}
    
    "https://www.linkedin.com/company/statuslabs/": {"text": "Status Labs", "sentence": "Darius Fisher, the CEO of Status Labs, a top-tier online reputation management firm, shares Boskoff's passion for helping clients succeed in the online world."}
    
    "https://www.reviewtrackers.com/blog/brand-reputation-management/": {"text": "brand reputation management", "sentence": "Status Labs' reputation management services cover a wide range of areas, including crisis communications, [brand reputation management], and online image repair."}"`;
    debugger;
    const parsedResponse = parseResponse(response);
    // expect(parsedResponse).toMatchObject({
    //   "https://www.reviewtrackers.com/blog/brand-reputation-management/": { text: "brand reputation management", sentence: "Status Labs' reputation management services cover a wide range of areas, including crisis communications, brand reputation management, and online image repair." }
    // })
  })
});