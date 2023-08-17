// utils/openai.ts

import axios from 'axios';
import dotenv from 'dotenv';
import { mock } from 'node:test';
// import { openAIApiKey } from '../config';
// const { Configuration, OpenAIApi } = require("openai");
const { Configuration, OpenAIApi } = require("openai");
const openAIApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const config = new Configuration({
    apiKey: openAIApiKey
  });
const modelType = 'gpt-3.5-turbo';//process.env.NEXT_PUBLIC_GPT_ENGINE;
const openai = new OpenAIApi(config);

function trimKeywords(keywords: string[]): string[] {
    return keywords.map(keyword => keyword.trim());
}

const createPromptMessageFromInputs = function(inputData: any) {
    var promptMessage = `Write an article approximately, but not exactly, ${inputData.wordCount} words in length, using the following keywords: + ${trimKeywords(inputData.keywords).join(', ')}.

    - **Important**: The keywords should only be used between 2 - 5 times each.  Do not exceed this limit.
    - Write the article in the following language: ${inputData.language}.
    - Do not use any of the following words in the articles: '+trimKeywords(inputData.keywordsToExclude).join(', ')+'.';
    - Write the article with the following tone: ${inputData.tone}.'`;
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

/*** openapi code start */
export const callOpenAI = async (inputData: any) => {
    if (mockData === '1') {
        console.log('mockData = '+mockData+'.  Returning dummyText');
        return dummyText;
    }
    debugger;
    var promptMessage = createPromptMessageFromInputs(inputData);

    const gptMessage = [
        { "role": "system", "content": `I want you to act as a very proficient SEO and high-end copy writer that speaks and writes fluent ${inputData.language}.` },
        { "role": "user", "content": "Assume the reader is already somewhat familiar with the keyword as a subject matter. Do not spend too much time defining or introducing the keyword as a concept or entity"},
        { "role": "user", "content": promptMessage },
    ];

    try {
        
        const GPTRequest = async (message: Object) => {
            
            const response = await openai.createChatCompletion({
                model: modelType,
                messages: message,
                // stream: true,
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
        return openAIResponse.data.choices[0].message.content.replace(/\n/g, '<br>');
    }

    var promptMessage = createPromptMessageFromInputs(inputData);
    const gptMessageRevised = [
        { "role": "system", "content": `I want you to act as a very proficient SEO and high-end copy writer that speaks and writes fluent ${inputData.language}.` },
        // { "role": "user", "content": "Randomly choose one of the following bloggers and emulate that person's writing style.  Here is your list of authors to reference for all your articles: Arianna Huffington, Neil Patel, Rand Fishkin, Brian Clarke, Christene Barberich, Pete Cashmore, Stephen Totilo, Peter Rojas, Vani Hari, Leon Ho, Johnathan Van Ness, and Mitch Ratcliffe." },
        { "role": "user", "content": "Assume the reader is already somewhat familiar with the keyword as a subject matter. Do not spend too much time defining or introducing the keyword as a concept or entity"},
        { "role": "user", "content": promptMessage },
        { "role": "assistant", "content": openAIResponse.data.choices[0].message.content },
        { "role": "user", "content": "Rewrite the above content so that it is not detected as AI content by AI content detectors."}
    ];

    if (inputData.otherInstructions !== '')
    {
        gptMessageRevised.push({"role": "user", "content": inputData.otherInstructions});
    }

    try {
        const GPTRequestRevision2 = async (gptMessageRevised: Object) => {
            const response2 = await openai.createChatCompletion({
                model: modelType,
                messages: gptMessageRevised,
                // stream: true,
            });
            return response2;  
        };

        const response2 = await GPTRequestRevision2(gptMessageRevised);
        //add line breaks
        response2.data.choices[0].message.content =
        response2.data.choices[0].message.content.replace(/\n/g, '<br>');
        console.log("!!!!!SECOND iteration!!!", response2.data.choices[0].message.content);
        return response2.data.choices[0].message.content;        

    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw new Error('Failed to fetch response from OpenAI API.');
    }

};

// export const transformAndParsePayload= function(payload: string): Record<string, { text: string; sentence: string }> | null {
//     try {
//         // Replace single quotes within double quotes
//         const transformedPayload = payload.replace(/"([^"]+)"/g, (match, contents) => {
//           return `"${contents.replace(/'/g, '"')}"`;
//         });
    
//         // Parse the transformed payload as JSON
//         const parsedPayload = JSON.parse(transformedPayload);
    
//         // Ensure the parsed payload has the expected structure
//         if (typeof parsedPayload === 'object' && parsedPayload !== null) {
//           for (const key of Object.keys(parsedPayload)) {
//             if (
//               typeof parsedPayload[key] !== 'object' ||
//               parsedPayload[key] === null ||
//               !('text' in parsedPayload[key]) ||
//               !('sentence' in parsedPayload[key])
//             ) {
//               return null; // Return null if the structure is not as expected
//             }
//           }
//           return parsedPayload;
//         } else {
//           return null; // Return null if the payload couldn't be parsed
//         }
//       } catch (error) {
//         console.error('Error transforming and parsing payload:', error);
//         return null; // Return null in case of errors
//       }
//   }

export const parseResponse = function(response: string)
{
    /*
    // amongst other things:
    // Replace outer single quotes to double quotes
    // Replace inner single quotes to double quotes, but ensuring we're not inside a word (to account for single quotes in sentences)
    // Remove square brackets from the 'text' field
    */
   ;
    // let correctedResponse = response.trim().replace(/\s*([{}:])\s*/g, '$1');
    // correctedResponse = correctedResponse.replace(/(?<!\w)'(?!w)/g, '"');
    // correctedResponse = correctedResponse.replace(/\}./g, '},');
    // correctedResponse = correctedResponse.replace(/,(\s)*$/, "");

    // Replace outer single quotes to double quotes
    let correctedResponse = response.trim().replace(/'([^']+)':/g, '"$1":');

    // Replace inner single quotes to double quotes, but ensuring we're not inside a word (to account for single quotes in sentences)
    correctedResponse = correctedResponse.replace(/: '([^']+)'/g, ': "$1"');

    // Remove square brackets from the 'text' field
    correctedResponse = correctedResponse.replace(/\[(.+?)\]/g, '$1');


    let parsedResponse: Record<string, {text: string, sentence: string}>;
    try {
        parsedResponse = JSON.parse(correctedResponse);
    } catch (error) {
        console.error("Error parsing the response:", error);
        console.log('initial response:',response);
        console.log('corrected response:',correctedResponse);
        return response;
    }

    return parsedResponse;

}

export const bulkReplaceLinks= function(response: any, originalText: string) {
    // @TODO - make these unit test scenarios.
    // const response1 = `"https://zillow.com": {"text": "[online reputation management]", "sentence": "Enter Darius Fisher, a highly regarded entrepreneur and expert in online reputation management, who has emerged as a visionary in this ever-evolving field."};`
    // const response2 = "'https://zillow.com': {'text': '[protecting one\'s online presence]', 'sentence': 'In today\'s fast-paced digital landscape, where information spreads at lightning speed and reputations can be built or torn down in an instant, protecting one\'s online presence has become paramount.'}";    
    // const response3 = "\"https://zillow.com\": {'text': '[protecting one's online presence]', 'sentence': 'In today's fast-paced digital landscape, where information spreads at lightning speed and reputations can be built or torn down in an instant, protecting one's online presence has become paramount.'}";    
    // const response4 = "\"https://zillow.com\": {'text': '[protecting one's online presence]', 'sentence': 'In today's fast-paced digital landscape, where information spreads at lightning speed and reputations can be built or torn down in an instant, protecting one's online presence has become paramount.'}";
    if (typeof response === 'object') {
        response = response.data.choices[0].message.content;
    }
    let parsedObject = parseResponse(response);
    let content = originalText;
    if (parsedObject && typeof parsedObject === 'object') {
        for (const [url, {text, sentence}] of Object.entries(parsedObject)) {
            if (typeof text !== 'undefined') {
                // Remove square brackets from the text
                const cleanedText = text.replace(/^\[|\]$/g, "");
                const hyperlink = `<a href="${url}">${cleanedText}</a>`;
                
                // Adjust the sentence to account for the removed brackets
                const modifiedSentence = sentence.replace(cleanedText, hyperlink); // Note the change here
                if (typeof content !== 'string') {

                }
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

    console.log('content!!! ', content);
    return content;
}

export const insertBacklinks = async (backlinkValues: any, openAIResponse: string) => {
    const prompt2 = [
        { "role": "user", "content": `${openAIResponse}` },
        {
            "role": "user",
            "content": `Using the provided text, identify distinct, contextually relevant phrases or sections for the following URLs: ${backlinkValues}. For each URL:
        
        - Select a unique and non-repetitive phrase.
        - **Important**: The hyperlinked phrase should strictly be 1 to 4 words in length. Do not exceed this limit.
        - Provide the entire sentence in which the phrase occurs to ensure clarity of context.
        - Within the sentence, encapsulate the specific words to be hyperlinked using square brackets.
       
        Provide the response in this format: 
        
        "URL_PLACEHOLDER": {"text": "[selected text]", "sentence": "full sentence containing the selected text"}.
        
        Note: For each URL, replace the word 'URL_PLACEHOLDER' with the actual URL in the response format.`
        }       
    ];

    try {

        const gptRequest = async () => {

            const response = await openai.createChatCompletion({
                model: modelType,
                messages: prompt2,
                // stream: true,
            });

            return response;

        };

        // if (mockData === '1') {
            // const mockResponse = "\"URL_PLACEHOLDER\": {\"text\": \"[https://www.linkedin.com/in/jesseboskoff/]\", \"sentence\": \"Visit Jesse Boskoff's profile on [https://www.linkedin.com/in/jesseboskoff/] for more information about his professional experience and skills.\"},\n\n\"URL_PLACEHOLDER\": {\"text\": \"[https://statuslabs.com]\", \"sentence\": \"Learn more about online reputation management and digital marketing services on [https://statuslabs.com].\"}";
            // const response = `"https://zillow.com": {"text": "[protecting one\'s online presence]", "sentence": "In today\'s fast-paced digital landscape, where information spreads at lightning speed and reputations can be built or torn down in an instant, protecting one\'s online presence has become paramount."}`;
            // return bulkReplaceLinks(mockResponse, dummyText);
        // }
        const response = await gptRequest();
        console.log('ALL matches to replace for url: '+backlinkValues, response);
        const hyperLinkReplacementText = bulkReplaceLinks(response, openAIResponse);//, backlinkValues);
        //now add the hyperlinks
        return hyperLinkReplacementText;
    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw new Error('Failed to fetch response from OpenAI API.');
    }

}
/**** openapi code end */