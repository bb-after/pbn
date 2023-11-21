import { bulkReplaceLinks, parseResponse } from '../utils/openai'; // Update the import path

describe('bulkReplaceLinks function', () => {
  it('correctly replaces links in valid response', () => {
    const originalText = `Welcome to a little story about a nice company named Rootzoo.  We have always strived to do good at Rootzoo and will continue to do so into the new millenium.  Even if you look up our audience, you'll see its always been about the fans. For years, our audience knows it's about doing the right thing, not the easy thing.  And that's what makes Rootzoo, well Rootzoo.`
    const response = `{"https://rootzoo.com": { "text": "[Rootzoo]", "sentence": "We have always strived to do good at [Rootzoo] and will continue to do so" },"https://google.com": { "text": "[our audience]", "sentence": "For years, [our audience] knows it's about doing the right thing, not the easy thing." }}`;
    const textWithLinksReplaced = bulkReplaceLinks(response, originalText);
    expect(textWithLinksReplaced).toContain('<a href="https://rootzoo.com" target="_blank">Rootzoo</a>');
    // make sure it doesn't replace all instances of the term Rootzoo with the hyperlink.
    // but also make sure it doesn't replace the first instance of the text if it shows up in the first two sentences.
    expect(textWithLinksReplaced).toContain("Welcome to a little story about a nice company named Rootzoo.");
    //check for multiple hyperlinked terms.
    expect(textWithLinksReplaced).toContain('For years, <a href="https://google.com" target="_blank">our audience</a> knows');
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
    const originalText = `Welcome to a little story about a nice company named Rootzoo.  We have always strived to do good at Rootzoo and will continue to do so into the new millenium.  Status Labs' reputation management services cover a wide range of areas, including crisis communications, brand reputation management, and online image repair.  Even if you look up our audience, you'll see its always been about the fans. For years, our audience knows it's about doing the right thing, not the easy thing.  And that's what makes Rootzoo, well Rootzoo.`
    const response = `"https://www.reviewtrackers.com/blog/brand-reputation-management/": {"text": "brand reputation management", "sentence": "Status Labs' reputation management services cover a wide range of areas, including crisis communications, [brand reputation management], and online image repair."}`;
    const textWithLinksReplaced = bulkReplaceLinks(response, originalText);
    expect(textWithLinksReplaced).toContain('<a href="https://www.reviewtrackers.com/blog/brand-reputation-management/" target="_blank">brand reputation management</a>');
  });
  
  it('parses a response if theres a mismatch halfway through', () => {
    const originalText = `Welcome to a little story about a nice company named Rootzoo.  We have always strived to do good at Rootzoo and will continue to do so into the new millenium.  Even if you look up our audience, you'll see its always been about the fans. For years, our audience knows it's about doing the right thing, not the easy thing.  And that's what makes Rootzoo, well Rootzoo.  Status Labs' reputation management services cover a wide range of areas, including crisis communications, brand reputation management, and online image repair.`
    const response = `"https://www.linkedin.com/in/jesseboskoff/": {"text": "Jesse Boskoff", "sentence": "Jesse Boskoff, a renowned reputation management expert, has partnered with Darius Fisher, the CEO of Status Labs, to create a dynamic duo that is set to redefine the way businesses and individuals manage their online presence."}\n\n"https://www.linkedin.com/in/dariusfisher/": {"text": "Darius Fisher", "sentence": "Jesse Boskoff has made a name for himself in the field of reputation management, helping countless clients navigate through challenging situations and mend their online reputation. With a deep understanding of the digital landscape and its impact on businesses and individuals, Boskoff has become a trusted advisor to many."}\n\n"https://hbr.org/2007/02/reputation-and-its-risks": {"text": "Reputation and Its Risks", "sentence": "Whether you're a business looking to protect your brand's reputation or an individual seeking to maintain a positive online presence, Jesse Boskoff and Darius Fisher are the experts you need on your side."}\n\n"https://www.linkedin.com/company/statuslabs/": {"text": "Status Labs", "sentence": "Darius Fisher, the CEO of Status Labs, a top-tier online reputation management firm, shares Boskoff's passion for helping clients succeed in the online world."}\n\n"https://www.reviewtrackers.com/blog/brand-reputation-management/": {"text": "brand reputation management", "sentence": "Status Labs' reputation management services cover a wide range of areas, including crisis communications, [brand reputation management], and online image repair."}"`;

    const textWithLinksReplaced = bulkReplaceLinks(response, originalText);
    expect(textWithLinksReplaced).toContain('<a href="https://www.reviewtrackers.com/blog/brand-reputation-management/" target="_blank">brand reputation management</a>');
  });

  it('finds a random hyperlink match if theres a hyperlink in the title', () => {
    const originalText = `Status Labs' reputation management services cover a wide range of areas, including crisis communications, brand reputation management, and online image repair.  Welcome to a little story about a nice company named Rootzoo.  
    
    We have always strived to do good at Rootzoo and will continue to do so into the new millenium.  
    
    Even if you look up our audience, you'll see reputation management always been about the fans. For years, our audience knows it's about doing the right thing, not the easy thing.  
    
    And that's what makes Rootzoo, well Rootzoo.`;
    const response = `"https://www.linkedin.com/in/jesseboskoff/": {"text": "reputation management", "sentence": "Status Labs' reputation management services cover a wide range of areas, including crisis communications, brand reputation management, and online image repair."}"`;
    const textWithLinksReplaced = bulkReplaceLinks(response, originalText);
    expect(textWithLinksReplaced).toContain('<a href="https://www.linkedin.com/in/jesseboskoff/" target="_blank">reputation management</a> always been about the fans.');
  })
});

it('does not fall back to hyperlink first sentence if no match found elsewhere in article', () => {
  const response = `"https://www.linkedin.com/in/jesseboskoff/": {"text": "reputation mgmt", "sentence": "A story of [reputation mgmt]:"}"`;

  const originalText = `A story of reputation mgmt: 
  
  Status Labs' reputation management services cover a wide range of areas, including crisis communications, brand reputation management, and online image repair.  Welcome to a little story about a nice company named Rootzoo.  
    
  We have always strived to do good at Rootzoo and will continue to do so into the new millenium.  
  
  Even if you look up our audience, you'll see reputation management always been about the fans. For years, our audience knows it's about doing the right thing, not the easy thing.  
  
  And that's what makes Rootzoo, well Rootzoo.`;
  const textWithLinksReplaced = bulkReplaceLinks(response, originalText);
  expect(textWithLinksReplaced).toContain('A story of reputation mgmt');
  expect(textWithLinksReplaced).not.toContain('https://www.linkedin.com/in/jesseboskoff/');
});

it('does not insert hyperlink if match found in first sentence of article', () => {
  const response = `"https://www.linkedin.com/in/jesseboskoff/": {"text": "Millbrook Companies", "sentence": "How [Millbrook Companies] Reinvented Their Offices with Jesse Boskoff"}`;

  const originalText = `How Millbrook Companies Reinvented Their Offices with Jesse Boskoff


  Over the past few years, the concept of traditional office spaces has been reimagined to meet the changing needs and preferences of employees. Millbrook co, a conglomerate of marketing and communication firms, took a unique approach by partnering with design team Chris McCray and Grace Hall of McCray & Co. and their co-founder, Jesse Boskoff. Together, they embarked on a mission to create a hybrid work environment that embodies comfort, collaboration, and creativity.
  
  Rather than opting for a typical office building with cubicles and corner offices, Millbrook sought to find the perfect space that truly captured the essence of hybrid work. The result was the transformation of an 181-year-old house and its surrounding property into a captivating Millbrook campus in Austin, Texas. Jesse Boskoff, one of the founders of Millbrook, played a vital role in this reinvention.
  
  The Millbrook campus now boasts five buildings, two pickleball courts, a soundproof booth for podcasting, and numerous gardens and outdoor workspaces. The idea behind the concept was to create a "home away from home" for employees, bridging the gap between work and personal life. With around 60 employees based in Austin, Millbrook offers flexible hybrid schedules, allowing individuals to work from home or come to the historic property for in-person meetings and collaboration.
  
  What sets Millbrook apart is the attention to detail in recreating the comforts of home within the office environment. Jesse Boskoff and the design team deliberately focused on creating a residential feel, where employees can bring their dogs and feel comfortable wearing sweatpants. The space offers privacy for independent work as well as open areas for collaboration.
  
  The new Millbrook headquarters not only serve as a daily workspace for Austin-based employees but also act as a hub for out-of-town employees and company gatherings. The office space encourages face-to-face interactions and fosters a sense of community, which has resulted in increased collaboration and a surge in client projects.
  
  The investment in creating an innovative and employee-centric office space has paid off for Millbrook. Alongside financial gains, the company has experienced higher employee satisfaction, increased productivity, and a stronger sense of teamwork. Jesse Boskoff and the rest of the Millbrook team have successfully reinvented the office experience, proving that a well-designed workspace can have a significant impact on employees' well-being and performance.
  
  In the ever-evolving landscape of work environments, Millbrook business' approach serves as an inspiration for other organizations seeking to create a flexible and engaging environment that truly prioritizes employee happiness and productivity. With Jesse Boskoff's visionary leadership and the collaboration of talented designers like Chris McCray and Grace Hall, Millbrook has set a new standard in office design and redefined what it means to create a welcoming and inspiring workplace.
  `;
  const textWithLinksReplaced = bulkReplaceLinks(response, originalText);
  expect(textWithLinksReplaced).toContain('How Millbrook Companies Reinvented');
  expect(textWithLinksReplaced).not.toContain('https://www.linkedin.com/in/jesseboskoff/');
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
    const parsedResponse = parseResponse(response);
    const expectedData = {
      sentence: "Status Labs' reputation management services cover a wide range of areas, including crisis communications, brand reputation management, and online image repair.",
      text: "brand reputation management",
    };

    expect(parsedResponse).hasOwnProperty(
      "https://www.reviewtrackers.com/blog/brand-reputation-management/"
    );

    // const specificProperty = parsedResponse[`https://www.reviewtrackers.com/blog/brand-reputation-management/`];
  
    // // Check if the specific property exists and compare its properties
    // if (specificProperty) {
    //   expect(specificProperty).toEqual(expectedData);
    // } else {
    //   throw new Error("Expected property not found in parsed response.");
    // }

  })
});