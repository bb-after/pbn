// utils/openai.ts

import axios from 'axios';
import dotenv from 'dotenv';
import { mock } from 'node:test';
dotenv.config();
// import { openAIApiKey } from '../config';
// const { Configuration, OpenAIApi } = require("openai");
const { Configuration, OpenAIApi } = require("openai");
// const openAIApiKey = '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';//process.env.OPENAI_API_KEY;
const openAIApiKey = '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';
const config = new Configuration({
    apiKey: openAIApiKey
  });
const modelType = 'gpt-4';
const openai = new OpenAIApi(config);
const createPromptMessageFromInputs = function(inputData: any) {
    var promptMessage = "Write an article approximately, but not exactly, "+inputData.wordCount+" words in length, using the following keywords between 2 - 5 times each: " + inputData.keywords.join(', ')+'.';
    promptMessage += 'Do not use any of the following words in the article: '+inputData.keywordsToExclude.join(', ')+'.';
    promptMessage += 'Write the article with the following tone: '+inputData.tone+'.';

    return promptMessage;
}
const dummyText = `Title: A Conversation with Darius Fisher: Safeguarding Online Reputations<br><br>In today's fast-paced digital landscape, where information spreads at lightning speed and reputations can be built or torn down in an instant, protecting one's online presence has become paramount. Enter Darius Fisher, a highly regarded entrepreneur and expert in online reputation management, who has emerged as a visionary in this ever-evolving field.<br><br>During a recent discussion, Fisher shared valuable insights into the importance of maintaining a proactive stance in the digital realm and how he helps individuals and businesses safeguard and improve their online image.<br><br>According to Fisher, one's online reputation serves as their digital calling card, preceding them and significantly influencing personal and professional growth.<br><br>Recognizing the significance of helping others overcome the challenges posed by negative online experiences, Fisher co-founded a company in 2011 that has assisted numerous individuals, celebrities, and businesses in effectively managing their online reputation.<br><br>When asked about strategies for protecting one's online presence, Fisher emphasized the need to proactively build a strong digital profile. This involves consistently updating social media profiles, actively engaging with online communities, and sharing high-quality content that showcases expertise.<br><br>Alongside proactive measures, Fisher highlighted the importance of crisis management in preserving reputation. He stressed the need to promptly address any negative content or online attacks, employing a comprehensive plan to swiftly resolve issues. Fisher's company has successfully guided clients through such crises, minimizing damage and promptly restoring their digital reputation.<br><br>Looking ahead, Fisher expressed excitement about the future of online reputation management, foreseeing advancements in artificial intelligence and machine learning. These technologies will revolutionize monitoring and response capabilities, empowering individuals and businesses to effectively manage their reputation in real-time.<br><br>As our lives become increasingly entwined with our online presence, Fisher's insights and dedication serve as a guiding light for navigating the complex realm of online reputation management. With unwavering passion and a commitment to excellence, Darius Fisher has established himself as a thought leader in this critical field. By preserving and enhancing online reputations, both individuals and businesses can confidently face the challenges of the digital era.`;
const mockData=true;

const getBacklinkArray = function(inputData: any) {
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
    if (mockData) {
        return dummyText;
    }

    
    var promptMessage = createPromptMessageFromInputs(inputData);

    const gptMessage = [
        { "role": "system", "content": "I want you to act as a very proficient SEO and high-end copy writer that speaks and writes fluent English." },
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

export const callOpenAIRevised = async (inputData: any, openAIResponse: object) => {
    if (mockData) {
        return dummyText;
    }
    var promptMessage = createPromptMessageFromInputs(inputData);
    const gptMessageRevised = [
        { "role": "system", "content": "I want you to act as a very proficient SEO and high-end copy writer that speaks and writes fluent English." },
        // { "role": "system", "content": "I want you to act as a very proficient SEO and high-end copy writer that speaks and writes fluent English.  Randomly choose one of the following bloggers and emulate that person's writing style.  Here is your list of authors to reference for all your articles: Arianna Huffington, Neil Patel, Rand Fishkin, Brian Clarke, Christene Barberich, Pete Cashmore, Stephen Totilo, Peter Rojas, Vani Hari, Leon Ho, Johnathan Van Ness, and Mitch Ratcliffe.  Always state which blogger's style you are emulating before writing an article." },
        // { "role": "user", "content": "Randomly choose one of the following bloggers and emulate that person's writing style.  Here is your list of authors to reference for all your articles: Arianna Huffington, Neil Patel, Rand Fishkin, Brian Clarke, Christene Barberich, Pete Cashmore, Stephen Totilo, Peter Rojas, Vani Hari, Leon Ho, Johnathan Van Ness, and Mitch Ratcliffe." },
        // { "role": "user", "content": "Always state which blogger's style you are emulating before writing an article."},
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

// function bulkReplaceLinks(response: any, originalText: Text) {
//     // Sample response from the OpenAI API
//     // const response = `"'https://statuslabs.com': {'text': 'Darius Fisher', 'start_index': 83, 'end_index': 96},\n'https://www.linkedin.com/in/dariusfisher/': {'text': 'co-founded a company', 'start_index': 508, 'end_index': 529}"`
//     // Convert single quotes to double quotes for valid JSON parsing
//     let correctedResponse = response.replace(/'/g, '"');
//     // Convert the response into a JavaScript object
//     // Convert the corrected response into a JavaScript object
//     correctedResponse = correctedResponse.replace(/\}./g, '},');
//     correctedResponse = correctedResponse.replace(/,(\s)*$/, "");

//     let parsedResponse: Record<string, {text: string, start_index: number, end_index: number}>;

//     try {
//         parsedResponse = JSON.parse(`{${correctedResponse}}`);
//     } catch (error) {
//         // if for whatever reason we can't parse the pseudo-json, return the original text.
//         console.error("Error parsing the response:", error);
//         return originalText;
//     }

//     // Sample content (for demonstration purposes)
//     let content = originalText;

//     // Convert the object to an array, sort by 'end_index' in descending order to start replacements from the end
//     const sortedReplacements = Object.entries(parsedResponse).sort(([, a], [, b]) => b.end_index - a.end_index);

//     for (const [url, {text, start_index, end_index}] of sortedReplacements) {
//         const substringFromContent = content.substring(start_index, end_index);
    
//         // Check if the substring matches the provided text
//         if (substringFromContent === text) {
//             // Constructing the replacement with actual URL
//             const hyperlink = `<a href="${url}">${text}</a>`;
    
//             // Replacing in the content
//             content = content.slice(0, start_index) + hyperlink + content.slice(end_index);
//         } else {

//             console.error(`Mismatch at indices ${start_index}-${end_index}: expected "${text}", found "${substringFromContent}"`);
//             // Fallback logic: Replace the first occurrence of the `text` in the content
//             const position = content.indexOf(text);
//             if (position !== -1) {
//                 content = content.slice(0, position) + `<a href="${url}">${text}</a>` + content.slice(position + text.length);
//             }

//         }
    
//     }

//     // Now 'content' has the hyperlinks embedded at the right places
//     console.log('content!!! ', content);
//     return content;
// }

function bulkReplaceLinks(response: any, originalText: string) {
    // Replace single quotes but not ones inside the actual content
    let correctedResponse = response.replace(/(?<!\w)'(?!w)/g, '"');
    correctedResponse = correctedResponse.replace(/\}./g, '},');
    correctedResponse = correctedResponse.replace(/,(\s)*$/, "");

    let parsedResponse: Record<string, {text: string, sentence: string}>;

    try {
        parsedResponse = JSON.parse(`{${correctedResponse}}`);
    } catch (error) {
        console.error("Error parsing the response:", error);
        return originalText;
    }

    let content = originalText;
    for (const [url, {text, sentence}] of Object.entries(parsedResponse)) {
        // Remove square brackets from the text
        const cleanedText = text.replace(/^\[|\]$/g, "");
        
        const hyperlink = `<a href="${url}">${cleanedText}</a>`;
        
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

    console.log('content!!! ', content);
    return content;
}

export const insertBacklinks = async (backlinkValues: any, openAIResponse: Text) => {
    // const prompt = [
    //     { "role": "user", "content": openAIResponse },
    //     // { "role": "user", "content": "Given the following content, please identify three distinct and contextually relevant phrases or sections within the provided text where I should embed a clickable hyperlink to the following URL: "+backlinkValue+".  Encapsulate the specific words to be hyperlinked within square brackets.  Ensure that no single phrase or section is suggested more than once and and not already wrapped in an <a> HTML tag." },
    //     // { "role": "user", "content": "Given the following content, please identify three distinct and contextually relevant phrases or sections within the provided text where I should embed a clickable hyperlink to the following URL: "+backlinkValue+".  Encapsulate the specific words to be hyperlinked within square brackets.  Ensure that no single phrase or section is suggested more than once and and not already wrapped in an <a> HTML tag." },
    //     { "role": "user", "content": "From the provided text, identify distinct, contextually relevant phrases or sections for each of the following URLs.  Ensure each phrase is unique and non-repetitive.  Do not make any phrase more than 5 words.  Encapsulate the specific words to be hyperlinked within square brackets."},
    //     { "role": "user", "content": "Additionally, provide the starting and ending character indices of each selected phrase within the original text.  Each selected phrase should have its unique start and end character indices in the original text. Avoid overlapping or repeating the same character indices for multiple URLs."},
    //     { "role": "user", "content": "Format the response as follows: \n\n'URL_PLACEHOLDER_1': {'text': 'selected text', 'start_index': start_position, 'end_index': end_position},'URL_PLACEHOLDER_2': {'text': 'selected text', 'start_index': start_position, 'end_index': end_position},... and so on.  For each URL, replace the placeholder 'URL_PLACEHOLDER' with the actual URL in the response format."},
    //     { "role": "user", "content": "the URLs are the following: "+ backlinkValue },
    // ];

    const prompt2 = [
        { "role": "user", "content": `${openAIResponse}` },
        // { "role": "user", "content": `Using the provided text, hyperlink distinct, contextually relevant phrases or sections for the following URLs: ${backlinkValue}. Each selected phrase should: 
        
        // - Be unique and non-repetitive.
        // - Not exceed 5 words.
        // - Have its unique start and end character indices in the original text, with no overlaps.
        // - Please ensure the start_position and end_position are based on the exact content provided.
        // Provide the response in this format: 
        
        // 'URL_PLACEHOLDER': {'text': 'selected text', 'start_index': start_position, 'end_index': end_position}.
        
        // Note: For each URL, replace the word 'URL_PLACEHOLDER' with the actual URL in the response format.`
        // },
        /*{ "role": "user", "content": `Given the exact text provided, identify distinct and contextually relevant phrases to hyperlink for the following URLs: ${backlinkValue}.
        
        Your selections should adhere to these strict criteria:
    
        - The phrase must be unique within the text and not repeat elsewhere.
        - It should be concise, no more than 5 words in length.
        - You must provide accurate start and end character indices for each selected phrase from the original text. No overlaps allowed. These indices should reflect the exact position within the provided content.
        
        Example Format: 
        'https://example.com': {'text': 'relevant phrase', 'start_index': 10, 'end_index': 25}.
        
        Note: Please replace 'https://example.com' with the corresponding URL from the list provided. Ensure accuracy in the character indices.` 
        },*/
        {
            "role": "user",
            "content": `Using the provided text, identify distinct, contextually relevant phrases or sections for the following URLs: ${backlinkValues}. For each URL:
        
        - Select a unique and non-repetitive phrase.
        - Ensure the phrase does not exceed 5 words.
        - Provide the entire sentence in which the phrase occurs, ensuring clarity of context.
        - Identify and encapsulate the specific words to be hyperlinked within square brackets within the sentence.
        
        Provide the response in this format: 
        
        'URL_PLACEHOLDER': {'text': '[selected text]', 'sentence': 'full sentence containing the selected text'}.
        
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

        const response = await gptRequest();
        console.log('ALL matches to replace for url: '+backlinkValues, response);
        const hyperLinkReplacementText = bulkReplaceLinks(response.data.choices[0].message.content, openAIResponse);//, backlinkValues);
        //now add the hyperlinks
        return hyperLinkReplacementText;
    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw new Error('Failed to fetch response from OpenAI API.');
    }

}
/**** openapi code end */
