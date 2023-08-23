import React, { useState, useEffect } from 'react';
import { callOpenAI, callOpenAIRevised, insertBacklinks, getBacklinkArray } from '../utils/openai';

const IterativeResponseRenderer = () => {
  const [responses, setResponses] = useState<string[]>([]); // Store responses for each iteration
  const [isLoading, setLoading] = useState<boolean>(true); // Loading state

  const numberOfIterations = 3; // Set the desired number of iterations

  useEffect(() => {
    const fetchResponses = async () => {
      setLoading(true);
      const input = 'Your input data'; // Replace with your actual input data

      for (let i = 0; i < numberOfIterations; i++) {
        const firstResponse = await callOpenAI(input);
        const revisedResponse = await callOpenAIRevised(input, firstResponse);
        
        const backlinkArray = getBacklinkArray(input);
        let hyperlinkedResponse = revisedResponse;
        hyperlinkedResponse = await insertBacklinks(backlinkArray.join(', '), hyperlinkedResponse);
        
        setResponses(prevResponses => [...prevResponses, hyperlinkedResponse]);
      }

      setLoading(false);
    };

    fetchResponses();
  }, []);

  return (
    <div>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        responses.map((response, index) => (
          <div key={index}>
            <h2>Iteration {index + 1}:</h2>
            <div dangerouslySetInnerHTML={{ __html: response }} className="pbnj-output" />
          </div>
        ))
      )}
    </div>
  );
};

export default IterativeResponseRenderer;
