// utils/apiCalls.ts

import {
  callOpenAI,
  callOpenAIRevised,
  insertBacklinks,
  getBacklinkArray,
} from './openai';


export const processIterations = async (inputData: any, numberOfIterations: number) => {
  const newResponses = [];
  const newLoadingStates = [];

  for (let i = 0; i < numberOfIterations; i++) {
    newLoadingStates.push(true); // Set loading state for this iteration

    try {
      // Initial call to openAI to write the article
      const firstResponse = await callOpenAI(inputData);
      // ...

      // Second call to openAI, this time to re-write it as if not written by AI.
      const revisedResponse = await callOpenAIRevised(inputData, firstResponse);
      // ...

      // Modify hyperlinkedResponse as needed
      let hyperlinkedResponse = revisedResponse;
      const backlinkArray = getBacklinkArray(inputData);
      hyperlinkedResponse = await insertBacklinks(backlinkArray.join(', '), hyperlinkedResponse);
      // ...

      newResponses.push(hyperlinkedResponse);
    } catch (error) {
      newResponses.push('Error occurred');
      // Handle error here
    } finally {
      newLoadingStates[i] = false; // Clear loading state after processing
    }
  }

  return { responses: newResponses };
  
//   return { responses: newResponses, loadingStates: newLoadingStates };
};
