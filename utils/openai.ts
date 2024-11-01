// utils/openai.ts
import axios from 'axios';
import { postToSlack } from '../utils/postToSlack';
import OpenAI from 'openai';

const getOpenAIClient: () => OpenAI = (() => {
    let openAIClient: OpenAI | undefined;
  
    return () => {
      if (!openAIClient) {
        const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY is not set');
        }
        const organization = process.env.NEXT_PUBLIC_OPENAI_ORGANIZATION_ID;
        if (!organization) {
          throw new Error('OPENAI_ORGANIZATION_ID is not set');
        }
  
        openAIClient = new OpenAI({
          apiKey,
          organization,
          dangerouslyAllowBrowser: true,
        });
      }
      return openAIClient;
    };
  })();

const modelType = 'gpt-4o';//process.env.NEXT_PUBLIC_GPT_ENGINE;
function trimKeywords(keywords: string[]): string[] {
    return keywords.map(keyword => keyword.trim());
}

const createPromptMessageFromInputs = function(inputData: any) {
    var toneLine = inputData.tone ? `- Write the article with the following tone: ${inputData.tone}.\n\n` : '';
    var promptMessage = `Write an article approximately, but not exactly, ${inputData.wordCount} words in length, incorporating the following keywords: "${trimKeywords(inputData.keywords).join(', ')}".

    **Important:** Use each keyword beteen 2 to 5 times, ensuring you do not exceed this limit.

    Write the article in the following language: ${inputData.language}.

    -Start the article with a title.

    **Important:** Do not include any of the following words: visionary, conclusion, ${trimKeywords(inputData.keywordsToExclude).join(', ')}.

    ${toneLine}
    Ensure the article has paragraphs of varying lengths, including some that are short and direct, while others are longer and more detailed`;

    console.log('prompt...',promptMessage);
    return promptMessage;
}

const createRewritePromptMessageFromInputs = function(response: string, inputData: any) {
    var promptMessage = `Please rewrite the following article to create a unique piece of content while maintaining the essence of the original article.

    Original Article:
    [${response}]

    -Please rewrite the article in a conversational and engaging tone, suitable for a blog post. Introduce variability by rephrasing sentences, replacing words with synonyms, and shuffling paragraphs. Expand on key points and add examples to enrich the content and provide a fresh perspective.

    -Start the article a title.

    -**Important:** Do not include any of the following words: visionary, conclusion, ${trimKeywords(inputData.keywordsToExclude).join(', ')}.`;
    
    return promptMessage;
}

const dummyText = `Title: A Conversation with Darius Fisher: Safeguarding Online Reputations<br><br>In today's fast-paced digital landscape, where information spreads at lightning speed and reputations can be built or torn down in an instant, protecting one's online presence has become paramount. Enter Darius Fisher, a highly regarded entrepreneur and expert in online reputation management, who has emerged as a visionary in this ever-evolving field.<br><br>During a recent discussion, Fisher shared valuable insights into the importance of maintaining a proactive stance in the digital realm and how he helps individuals and businesses safeguard and improve their online image.<br><br>According to Fisher, one's online reputation serves as their digital calling card, preceding them and significantly influencing personal and professional growth.<br><br>Recognizing the significance of helping others overcome the challenges posed by negative online experiences, Fisher co-founded a company in 2011 that has assisted numerous individuals, celebrities, and businesses in effectively managing their online reputation.<br><br>When asked about strategies for protecting one's online presence, Fisher emphasized the need to proactively build a strong digital profile. This involves consistently updating social media profiles, actively engaging with online communities, and sharing high-quality content that showcases expertise.<br><br>Alongside proactive measures, Fisher highlighted the importance of crisis management in preserving reputation. He stressed the need to promptly address any negative content or online attacks, employing a comprehensive plan to swiftly resolve issues. Fisher's company has successfully guided clients through such crises, minimizing damage and promptly restoring their digital reputation.<br><br>Looking ahead, Fisher expressed excitement about the future of online reputation management, foreseeing advancements in artificial intelligence and machine learning. These technologies will revolutionize monitoring and response capabilities, empowering individuals and businesses to effectively manage their reputation in real-time.<br><br>As our lives become increasingly entwined with our online presence, Fisher's insights and dedication serve as a guiding light for navigating the complex realm of online reputation management. With unwavering passion and a commitment to excellence, Darius Fisher has established himself as a thought leader in this critical field. By preserving and enhancing online reputations, both individuals and businesses can confidently face the challenges of the digital era.`;
const mockData=process.env.NEXT_PUBLIC_USE_MOCK_DATA;
const skipOpenAiRevision = process.env.NEXT_PUBLIC_SKIP_OPENAI_REVISION;
console.log('mode: mockData = '+mockData);
console.log('skipRevision: '+skipOpenAiRevision);
export const getBacklinkArray = function(inputData: any) {
    var backlinkArray = [];
    for (var x = 1; x <= 5; x++ ) {
        if (typeof inputData['backlink'+x] !== 'undefined' 
        && inputData['backlink'+x].trim() !== '') {
            backlinkArray.push(inputData['backlink'+x].trim());
        }
    }
    return backlinkArray;
}

const fetchDataFromURLNew = async (url: string): Promise<string> => {
    try {
        const response = await axios.get(`/api/fetchData?url=${encodeURIComponent(url)}`);

        // Remove <script>...</script>, <script type="text/javascript">...</script>, <style type="text/css">...</style>
        let cleanedData = response.data
            .replace(/<script.*?>.*?<\/script>/gs, '')
            .replace(/<style.*?>.*?<\/style>/gs, '')
            .replace(/<form.*?>.*?<\/form>/gs, '');

        // Remove any remaining HTML tags
        cleanedData = cleanedData.replace(/<[^>]*>?/gm, '');

        // Replace double newlines with single newline
        cleanedData = cleanedData.replace(/\n\t+/g, '\n');
        cleanedData = cleanedData.replace(/\n+/g, '\n');
        cleanedData = cleanedData.replace(/\t+/g, '\t');
        // cleanedData = he.decode(cleanedData);
        console.log('Cleaned Data:', cleanedData);
        return cleanedData.trim(); // Return the cleaned and trimmed data
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Failed to fetch data from URL.');
    }
};


function splitUrlContentIntoChunks(urlContent: string, maxChunkLength: number = 1000): string[] {
    const chunks = [];
    let currentChunk = '';

    // Split the content into words
    const words = urlContent.split(' ');

    for (const word of words) {
        // Check if adding the next word would exceed the maxChunkLength
        if ((currentChunk + word).length > maxChunkLength) {
            // If it does, add the currentChunk to the chunks array and start a new chunk
            chunks.push(currentChunk);
            currentChunk = word;
        } else {
            // If not, add the word to the current chunk
            currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
        }
    }

    // Add the last chunk if it's not empty
    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
}
const maxTokens = 16000; // Set this to the token limit of your OpenAI model
const estimateTokenCount = (text: string) => {
    return text.split(/\s+/).length; // Roughly splitting by whitespace
};

const trimContentToFitTokenLimit = (contentArray: any, maxTokens: number) => {
    let totalTokens = 0;
    const trimmedContent = [];

    for (const content of contentArray) {
        const tokens = estimateTokenCount(content.content);
        if (totalTokens + tokens <= maxTokens) {
            trimmedContent.push(content);
            totalTokens += tokens;
        } else {
            // Optionally, trim the last piece to fit
            // This part is optional and can be adjusted based on your needs
            const remainingTokens = maxTokens - totalTokens;
            const words = content.content.split(/\s+/).slice(0, remainingTokens).join(' ');
            trimmedContent.push({ ...content, content: words });
            break;
        }
    }

    return trimmedContent;
};



/*** openapi code start */
export const callOpenAI = async (inputData: any) => {
    if (mockData === '1') {
      console.log('mockData = ' + mockData + '.  Returning dummyText');
      return dummyText;
    }
  
    // Use the provided source content or fetch content from URL
    let sourceContent = inputData.sourceContent || "";
    if (!sourceContent && inputData.sourceUrl) {
      sourceContent = await fetchDataFromURLNew(inputData.sourceUrl);
    }
  
    console.log("Source content length: ", sourceContent.length);
    const sourceContentChunks = splitUrlContentIntoChunks(sourceContent);
  
    const promptMessage = createPromptMessageFromInputs(inputData);
    const initialGptMessage = [
      { role: "system", content: `I want you to write as if you are a proficient SEO and copywriter that speaks and writes fluent ${inputData.language}.` },
      ...sourceContentChunks.map(chunk => ({ role: "system", content: chunk })),
      { role: "user", content: promptMessage },
    ];
  
    const gptMessage = trimContentToFitTokenLimit(initialGptMessage, maxTokens);
    try {
      const openai = getOpenAIClient();
      const GPTRequest = async (message: any) => {
        const response = await openai.chat.completions.create({
          model: modelType,
          temperature: 0.8,
          messages: message,
        });
        return response;
      };
  
      const response = GPTRequest(gptMessage);
      return response;
  
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to fetch response from OpenAI API.');
    }
  };
  

/*** openapi code start */
export const callOpenAIToRewriteArticle = async (content: string, inputData: any) => {
    if (mockData === '1') {
        console.log('mockData = '+content+'.  Returning dummyText');
        return content;
    }

    var promptMessage = createRewritePromptMessageFromInputs(content, inputData);

    const gptMessage = [
        { "role": "system", "content": `I want you to act as a very proficient SEO and high-end copy writer that speaks and writes fluent ${inputData.language}.` },
        { "role": "user", "content": promptMessage },
    ];

    try {
        
        const GPTRequest = async (message: any) => {
            const openai = getOpenAIClient();
            const response = await openai.chat.completions
                .create({
                    model: modelType,
                    temperature: 0.8,
                    messages: message,
                });

            return response;
        };
    
        const response = GPTRequest(gptMessage);
        return response;
        // console.log(response);

    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw new Error('Failed to fetch response from OpenAI API.');
    }
};

export const callOpenAIRevised = async (inputData: any, openAIResponse: any) => {
    if (mockData === '1') {
        console.log('mockData = '+mockData+'.  Returning dummyText for openAiRevised');
        return dummyText;
    }
    if (skipOpenAiRevision) {     
        console.log('skipping revision!', openAIResponse);
        return openAIResponse.choices[0].message.content.replace(/\n/g, '<br>');
    }

    var promptMessage = createPromptMessageFromInputs(inputData);
    const gptMessageRevised = [
        { "role": "system", "content": `I want you to act as a very proficient SEO and high-end copy writer that speaks and writes fluent ${inputData.language}.` },
        { "role": "user", "content": "Assume the reader is already somewhat familiar with the keyword as a subject matter. Do not spend too much time defining or introducing the keyword as a concept or entity"},
        { "role": "user", "content": promptMessage },
        { "role": "assistant", "content": openAIResponse.choices[0].message.content },
        { "role": "user", "content": "Rewrite the above content so that it is not detected as AI content by AI content detectors."}
    ];

    if (inputData.otherInstructions !== '')
    {
        gptMessageRevised.push({"role": "user", "content": inputData.otherInstructions});
    }

    try {
        const GPTRequestRevision2 = async (gptMessageRevised: any) => {
            const openai = getOpenAIClient();
            const response2 = await openai.chat.completions
            .create({
                model: modelType,
                messages: gptMessageRevised,
                // stream: true,
            });
            return response2;  
        };

        const response2 = await GPTRequestRevision2(gptMessageRevised);
        console.log("!!!!!SECOND iteration!!!", response2.choices[0].message.content);

        //add line breaks
        if (response2.choices[0].message.content) {
            response2.choices[0].message.content =
            response2.choices[0].message.content.replace(/\n/g, '<br>');     
        } else {
            return null;
        }

        return response2.choices[0].message.content;        

    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw new Error('Failed to fetch response from OpenAI API.');
    }

};

export const parseResponse = function(response: string) {
    console.log('response pre formatting?', response);

    // Step 1: Remove any leading/trailing backticks and non-JSON intro text.
    let correctedResponse = response.replace(/```+/g, '');  // Remove multiple backticks.
    correctedResponse = correctedResponse.replace(/^(Sure, here are the URL formats.*?:)/i, '');  // Remove common intros.
    
    // step 1a: check for it starting with the term json.
    if (correctedResponse.startsWith('json')) {
        correctedResponse = correctedResponse.replace(/^json/i,'');
    }

    // Step 2: Replace outer single quotes with double quotes.
    correctedResponse = correctedResponse.trim().replace(/'([^']+)':/g, '"$1":');

    // Step 3: Replace inner single quotes to double quotes, avoiding those within words.
    correctedResponse = correctedResponse.replace(/: '([^']+)'/g, ': "$1"');

    // Step 4: Replace double line breaks or extraneous whitespace with commas.
    correctedResponse = correctedResponse.replace(/\n\n"/g, ',"'); // Double line breaks replaced by commas between JSON objects.
    correctedResponse = correctedResponse.replace(/\s{4,}/g, ''); // Long spaces replaced by nothing to format as JSON-like.

    // Step 5: Remove square brackets around text fields.
    correctedResponse = correctedResponse.replace(/\[(.+?)\]/g, '$1');

    // Step 6: Remove trailing commas and misplaced punctuation (e.g., between key-value pairs).
    // correctedResponse = correctedResponse.replace(/,\s*}/g, '}'); // Remove trailing commas before closing brace.
    // correctedResponse = correctedResponse.replace(/},\s*}/g, '}}'); // Handle cases with misplaced braces and commas.
    // correctedResponse = correctedResponse.replace(/,,/g, ','); // Remove any double commas created during the process.

    // Step 7: Ensure the response starts and ends with curly braces if it's a JSON object.
    if (!correctedResponse.startsWith('{')) {
        correctedResponse = `{${correctedResponse}`;
    }
    if (!correctedResponse.endsWith('}')) {
        correctedResponse = `${correctedResponse}}`;
    }

    // Step 8: Parse the corrected response to JSON.
    let parsedResponse: Record<string, {text: string, sentence: string}>;
    try {
        parsedResponse = JSON.parse(correctedResponse);
    } catch (error) {
        console.error("Error parsing the response:", error);
        console.log('initial response:', response);
        console.log('corrected response:', correctedResponse);
        return response; // Return original response if parsing fails.
    }

    return parsedResponse;
};



export const bulkReplaceLinks = function(response: any, originalText: string) {
    if (typeof response === 'object') {
        response = response.choices[0].message.content;
    }

    let parsedObject = parseResponse(response);
    let content = originalText;
    if (parsedObject && typeof parsedObject === 'object') {

        let sentences = content.split(/[.!?]\s+|\n+/); // Split text into sentences
        let firstTwoSentences = sentences.slice(0, 2).join("."); // Get the first two sentences

        for (const [url, {text, sentence}] of Object.entries(parsedObject)) {
            if (typeof text !== 'undefined') {
                // Remove square brackets from the text
                const cleanedText = text.replace(/^\[|\]$/g, "");
                const hyperlink = `<a href="${url}" target="_blank">${cleanedText}</a>`;
                
                if (firstTwoSentences.includes(sentence)) {
                    console.log("match found in first 2 sentences for :"+cleanedText+" - with URL "+url+".");

                    // Collect all sentences (excluding the first two) containing `cleanedText`.
                    let eligibleSentences = [];
                    for (let i = 2; i < sentences.length; i++) {
                        if (sentences[i].includes(cleanedText)) {
                            eligibleSentences.push(sentences[i]);
                        }
                    }

                    if (eligibleSentences.length > 0) {
                        // If `sentence` is in the first two sentences and there are eligible sentences to replace, choose a random one.
                        const randomIndex = Math.floor(Math.random() * eligibleSentences.length);
                        const randomSentence = eligibleSentences[randomIndex];
                        content = content.replace(randomSentence, randomSentence.replace(cleanedText, hyperlink));
                        console.log("match outside of first 2 sentences! find another match further in the article. linking in the following sentence instead :"+randomSentence);
                    } else {
                        console.log("no match found outside of first 2 sentences. skipping this hyperlink.");
                    }

                } else {

                    // Adjust the sentence to account for the removed brackets
                    const modifiedSentence = sentence.replace(cleanedText, hyperlink); // Note the change here

                    // Attempt to replace the entire sentence with the modifiedSentence
                    if (content.includes(sentence)) {
                        content = content.replace(sentence, modifiedSentence);
                    } else {
                        // Fallback approach: Find an occurrence of the `cleanedText` which isn't wrapped in an <a> tag and replace it
                        const regex = new RegExp(`(?<!<a [^>]+>)${cleanedText}(?!</a>)`, "i");
                        const match = content.match(regex);
                        if (match) {
                            content = content.replace(match[0], hyperlink);
                        } else {
                            console.error(`Failed to hyperlink '${cleanedText}' as it was not found unwrapped in the content.`);
                        }
                    }
                }
            }
        }

        content = replaceHyperLinkInFirstSentenceFallback(content);
        return content;
    } else {
        // return if fails to backlink.
        return content;
    }
}

export const replaceHyperLinkInFirstSentenceFallback = function(content: string) {
     //final check to remove any hyper links in the title
    // Identify the first sentence
    const firstSentenceEnd = content.match(/(\.|\n\n|\n)/); // Match a period, double newline, or single newline
    if (firstSentenceEnd && firstSentenceEnd.index !== undefined) {
        const endPosition = firstSentenceEnd.index + firstSentenceEnd[0].length;
        let firstSentence = content.substring(0, endPosition);

        // Remove hyperlinks from the first sentence
        firstSentence = firstSentence.replace(/<a [^>]+>(.*?)<\/a>/g, "$1");

        // Reconstruct the content with the modified first sentence
        content = firstSentence + content.substring(endPosition);
        postToSlack('Boom! Match found for hyperlink in title: '+content + ' - first sentence afffter '+firstSentence);        
    }

    console.log('content!!! ', content);
    return content;
    
}

export const insertBacklinks = async (backlinkValues: any, openAIResponse: string) => {
    if (backlinkValues.length < 1) {
        console.log('no backlinks for this search!, skipping.');
        return openAIResponse;
    }

    const prompt2 = [
        { "role": "user", "content": `${openAIResponse}` },
        {
            "role": "user",
            "content": `Using the provided text, identify distinct, contextually relevant phrases or sections for the following URLs: ${backlinkValues}. For each URL:
        
        - Select a unique and non-repetitive phrase.
        - **Important**: The hyperlinked phrase should strictly be 1 to 4 words in length. Do not exceed this limit.
        - The hyperlinked phrase can not be in the title or first sentence of the article. 
        - Provide the entire sentence in which the phrase occurs to ensure clarity of context.
        - Within the sentence, encapsulate the specific words to be hyperlinked using square brackets.
       
        ### **Response Format Requirement:**
        Provide the response strictly in **JSON format**. The response must be a valid JSON object, and it should look like this: 
        {
            "URL_PLACEHOLDER": {
                "text": "[selected text]",
                "sentence": "full sentence containing the selected text"
            }
        }
        
        Note: For each URL, replace the word 'URL_PLACEHOLDER' with the actual URL in the response format.`
        }       
    ];

    try {

        const gptRequest = async (prompt2: any) => {
            const openai = getOpenAIClient();
            const response = await openai.chat.completions
            .create({
                model: modelType,
                messages: prompt2,
            });

            return response;
        };

        // Set a maximum timeout of 120 seconds
        const timeoutMillis = 120000; // 120 seconds
        const responsePromise = gptRequest(prompt2);
        const timeoutPromise = new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error('Request timed out'));
                postToSlack('ERROR: Request timeout!');
            }, timeoutMillis);
        });

        // Use Promise.race() to wait for either the response or the timeout
        const response = await Promise.race([responsePromise, timeoutPromise]);

        if (response instanceof Error) {
            throw response; // Rethrow the timeout error
        }

        // const response = await gptRequest();
        console.log('ALL matches to replace for url: '+backlinkValues, response);
        //now add the hyperlinks
        const hyperLinkReplacementText = bulkReplaceLinks(response, openAIResponse);//, backlinkValues);

        return hyperLinkReplacementText;
    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw new Error('Failed to fetch response from OpenAI API.');
    }

}

export const parseTitleFromArticle = function(input: string): string {
    const textWithLineBreaks = input.replace(/<br\s*\/?>/g, '\n');
    let sentences = textWithLineBreaks.split(/[.!?]\s+|\n+/); // Split text into sentences
    let match = sentences.slice(0, 1);
    if (match && match.length > 0) {
      return match[0].replace('Title: ','').trim(); // Remove leading/trailing whitespace
    } else {
      return ''; // No sentence found in the input
    }
  }

  /*** openapi code start */
export const callOpenAISuperstarVersion = async (inputData: any) => {
    var initialGptMessage = inputData.promptMessage;
    
    const gptMessage = trimContentToFitTokenLimit(initialGptMessage, maxTokens);
    console.log('.....',gptMessage);
    try {
        const openai = getOpenAIClient();
        const GPTRequest = async (message: any) => {
            const response = await openai.chat.completions
            .create({
                model: modelType,
                temperature: 0.8,
                messages: message,
            });
        
            return response;
        };
    
        const response = GPTRequest(gptMessage);
        const content = (await response).choices[0].message.content;

        // Second request to generate SEO-friendly blog title
        const seoTitleMessage = [
            { role: 'system', content: 'You are an assistant that generates SEO-friendly blog titles.' },
            { role: 'user', content: `Generate an SEO-friendly blog title for the following content: ${content}` },
        ];
      
        const titleResponse = await GPTRequest(seoTitleMessage);
        const seoTitle = titleResponse.choices[0].message.content;

        return { content, seoTitle };

    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw new Error('Failed to fetch response from OpenAI API.');
    }
};
/**** openapi code end */