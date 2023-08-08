// utils/openai.ts

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
// import { openAIApiKey } from '../config';
// const { Configuration, OpenAIApi } = require("openai");
const { Configuration, OpenAIApi } = require("openai");
const openAIApiKey = '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';//process.env.OPENAI_API_KEY;
const config = new Configuration({
    apiKey: openAIApiKey
  });
const modelType = 'gpt-3.5-turbo';
const openai = new OpenAIApi(config);
const createPromptMessageFromInputs = function(inputData: any) {
    var promptMessage = "Write an article approximately, but not exactly, "+inputData.wordCount+" words in length, using the following keywords between 2 - 5 times each: " + inputData.keywords.join(', ')+'.';
    promptMessage += 'Do not use any of the following words in the article: '+inputData.keywordsToExclude.join(', ')+'.';
    promptMessage += 'Write the article with the following tone: '+inputData.tone+'.';

    return promptMessage;
}
const dummyText = `Title: A Conversation with Darius Fisher: Safeguarding Online Reputations<br><br>In today's fast-paced digital landscape, where information spreads at lightning speed and reputations can be built or torn down in an instant, protecting one's online presence has become paramount. Enter Darius Fisher, a highly regarded entrepreneur and expert in online reputation management, who has emerged as a visionary in this ever-evolving field.<br><br>During a recent discussion, Fisher shared valuable insights into the importance of maintaining a proactive stance in the digital realm and how he helps individuals and businesses safeguard and improve their online image.<br><br>According to Fisher, one's online reputation serves as their digital calling card, preceding them and significantly influencing personal and professional growth.<br><br>Recognizing the significance of helping others overcome the challenges posed by negative online experiences, Fisher co-founded a company in 2011 that has assisted numerous individuals, celebrities, and businesses in effectively managing their online reputation.<br><br>When asked about strategies for protecting one's online presence, Fisher emphasized the need to proactively build a strong digital profile. This involves consistently updating social media profiles, actively engaging with online communities, and sharing high-quality content that showcases expertise.<br><br>Alongside proactive measures, Fisher highlighted the importance of crisis management in preserving reputation. He stressed the need to promptly address any negative content or online attacks, employing a comprehensive plan to swiftly resolve issues. Fisher's company has successfully guided clients through such crises, minimizing damage and promptly restoring their digital reputation.<br><br>Looking ahead, Fisher expressed excitement about the future of online reputation management, foreseeing advancements in artificial intelligence and machine learning. These technologies will revolutionize monitoring and response capabilities, empowering individuals and businesses to effectively manage their reputation in real-time.<br><br>As our lives become increasingly entwined with our online presence, Fisher's insights and dedication serve as a guiding light for navigating the complex realm of online reputation management. With unwavering passion and a commitment to excellence, Darius Fisher has established himself as a thought leader in this critical field. By preserving and enhancing online reputations, both individuals and businesses can confidently face the challenges of the digital era.`;

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
    // return dummyText;
    // console.log('hmmmm did i make ittttttt', inputData);
    // debugger;

    var promptMessage = createPromptMessageFromInputs(inputData);

    const gpt3prompt = promptMessage;
    const gpt35TurboMessage = [
        { "role": "system", "content": "You are a copywriter for a blog post writing in the voice of Arianna Huffington" },
        { "role": "user", "content": promptMessage },
    ];

    try {
        
        const GPT35Turbo = async (message: Object) => {
            
            const response = await openai.createChatCompletion({
                model: modelType,
                messages: message,
                // stream: true,
            });
            
            // console.log('messsage', gpt35TurboMessageRevised);
            return response;
            // GPT35TurboRevision2(gpt35TurboMessageRevised);            
        };
    
        const response = GPT35Turbo(gpt35TurboMessage);
        return response;
        // console.log(response);

    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw new Error('Failed to fetch response from OpenAI API.');
    }

};


function replaceInOriginalText(text: any, originalText: any, url: any) {
    const bracketRegex = /\[(.*?)\]/g;  // Regular expression to match any content inside brackets
    let matches = [...text.matchAll(bracketRegex)]; // Convert iterable to array
  
    if (matches.length < 1) {
        // Not enough bracket sets in the text for the provided URLs.
        return originalText;
    }
    const maxLinksPerTerm = 2;
    var counter = 1;
    for (let match of matches) {
        if (counter <= maxLinksPerTerm) {
            const contentInsideBrackets = match[1];  // Use captured group
            const hyperlink = `<a href="${url}">${contentInsideBrackets}</a>`;
            originalText = originalText.replace(contentInsideBrackets, hyperlink);
        }
        counter++;
    }
  
    return originalText;
}  

export const callOpenAIRevised = async (inputData: any, openAIResponse: object) => {
    // return dummyText;
    var promptMessage = createPromptMessageFromInputs(inputData);
    const gpt35TurboMessageRevised = [
        { "role": "system", "content": "I want you to act as a very proficient SEO and high-end copy writer that speaks and writes fluent English.  Randomly choose one of the following bloggers and emulate that person's writing style.  Here is your list of authors to reference for all your articles: Arianna Huffington, Neil Patel, Rand Fishkin, Brian Clarke, Christene Barberich, Pete Cashmore, Stephen Totilo, Peter Rojas, Vani Hari, Leon Ho, Johnathan Van Ness, and Mitch Ratcliffe.  Always state which blogger's style you are emulating before writing an article." },
        // { "role": "user", "content": "Randomly choose one of the following bloggers and emulate that person's writing style.  Here is your list of authors to reference for all your articles: Arianna Huffington, Neil Patel, Rand Fishkin, Brian Clarke, Christene Barberich, Pete Cashmore, Stephen Totilo, Peter Rojas, Vani Hari, Leon Ho, Johnathan Van Ness, and Mitch Ratcliffe." },
        // { "role": "user", "content": "Always state which blogger's style you are emulating before writing an article."},
        { "role": "user", "content": "Assume the reader is already somewhat familiar with the keyword as a subject matter. Do not spend too much time defining or introducing the keyword as a concept or entity"},
        { "role": "user", "content": promptMessage },
        { "role": "assistant", "content": openAIResponse.data.choices[0].message.content },
        { "role": "user", "content": "Rewrite the above content so that it is not detected as AI content by AI content detectors."}
    ];

    if (inputData.otherInstructions !== '')
    {
        gpt35TurboMessageRevised.push({"role": "user", "content": inputData.otherInstructions});
    }

    try {
        const GPT35TurboRevision2 = async (gpt35TurboMessageRevised: Object) => {
            const response2 = await openai.createChatCompletion({
                model: modelType,
                messages: gpt35TurboMessageRevised,
                // stream: true,
            });

            return response2;
    
        };

        const response2 = await GPT35TurboRevision2(gpt35TurboMessageRevised);
        //add line breaks
        response2.data.choices[0].message.content =
        response2.data.choices[0].message.content.replace(/\n/g, '<br>');
        console.log("!!!!!SECOND iteration!!!", response2.data.choices[0].message.content);
        return response2.data.choices[0].message.content;        
        // return response2;

    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw new Error('Failed to fetch response from OpenAI API.');
    }

};

export const insertBacklinks = async (backlinkValue: URL, openAIResponse: Text) => {
    const prompt = [
        { "role": "user", "content": openAIResponse },
        { "role": "user", "content": "Given the following content, please identify three distinct and contextually relevant phrases or sections within the provided text where I should embed a clickable hyperlink to the following URL: "+backlinkValue+".  Encapsulate the specific words to be hyperlinked within square brackets.  Ensure that no single phrase or section is suggested more than once and and not already wrapped in an <a> HTML tag." },
    ];

    try {

        const gptRequest = async () => {
            const response = await openai.createChatCompletion({
                model: modelType,
                messages: prompt,
                // stream: true,
            });

            return response;

        };

        const response = await gptRequest();
        console.log('matches to replace for url: '+backlinkValue, response);
        const hyperLinkReplacementText = replaceInOriginalText(response.data.choices[0].message.content, openAIResponse, backlinkValue)
        //now add the hyperlinks
        return hyperLinkReplacementText;
        //add line breaks
        // response.data.choices[0].message.content = 
        // response.data.choices[0].message.content.replace(/\n/g, '<br>');
        // console.log("!!!!!SECOND iteration!!!", response2.data.choices[0].message.content);
        // return response2.data.choices[0].message.content;        

    } catch (error) {
        console.error('OpenAI API Error:', error);
        throw new Error('Failed to fetch response from OpenAI API.');
    }

}
/**** openapi code end */
