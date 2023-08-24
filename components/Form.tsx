// components/Form.tsx
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'; // To load the RTE dynamically (client-side)
import { EditorState, ContentState, convertFromHTML } from 'draft-js';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { Button, SelectChangeEvent } from '@mui/material';
import styles from './styles.module.css'; // Make sure the correct path is used
import { Send, ArrowBack, Edit, Download, Blender, Undo, RestartAlt } from '@mui/icons-material';
import CopyToClipboardButton from './CopyToClipboardButton'; // Replace with the correct path to your component
import { stateToHTML } from 'draft-js-export-html';
import PreviousResponseComponent from './PreviousResponseComponent';
import RemixModal from './RemixModal';
import Step1LoadingStateComponent from './Step1LoadingState';
import Step2LoadingStateComponent from './Step2LoadingState';
import FinalLoadingStateComponent from './FinalLoadingState';
import ArticleForm from './ArticleForm'; // Adjust the path as needed
import {
  callOpenAI,
  callOpenAIToRewriteArticle,
  callOpenAIRevised,
  insertBacklinks,
  getBacklinkArray,
} from '../utils/openai';

// Dynamically load the RTE component (client-side) to prevent server-side rendering issues
const Editor = dynamic(
  () => import('react-draft-wysiwyg').then((module) => module.Editor),
  { ssr: false }
);
const skipOpenAiRevision = process.env.NEXT_PUBLIC_SKIP_OPENAI_REVISION;
const Form: React.FC = () => {
  const [backlinks, setBacklinks] = useState(['']); // Initial state with one input
  const [previousResponses, setPreviousResponses] = React.useState<string[]>([]);
  const [iterationCount, setIterationCount] = useState(0);
  const [iterationTotal, setIterationTotal] = useState(0);
  // const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFirstRequest, setLoadingFirstRequest] = useState(false);
  const [isLoadingSecondRequest, setLoadingSecondRequest] = useState(false);
  const [isLoadingThirdRequest, setLoadingThirdRequest] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [isEditingState, setEditingState] = useState(false);
  const [response, setResponse] = useState<string>(''); // Initialize with an empty string
  const [keywords, setKeywords] = useState('');
  const [gptVersion, setGptVersion] = useState("gpt-3.5-turbo");
  const [language, setLanguage] = useState("English");
  const [wordCount, setWordCount] = useState(300);
  const [keywordsToExclude, setKeywordsToExclude] = useState('');
  const [articleCount, setArticleCount] = useState(1);
  const [tone, setTone] = useState<string[]>([]);
  const [otherInstructions, setOtherInstructions] = useState('');
  const [isRemixModalOpen, setRemixModalOpen] = useState(false);
  
  const handleRemixModalOpen = () => {
    setRemixModalOpen(true);
  };

  const handleRemixModalSubmit = async (iterations: number, remixMode: string) => {

    setRemixModalOpen(false); // Close the modal
  
    // setLoadingFirstRequest(true); // Set loading state to true before the API call
    const inputData = getInputData();
    setIterationTotal(iterations);
    const mode = remixMode;
    try {
      for(let i = 1; i <= iterations; i++) {
          setIterationCount(i);
          setShowForm(false);
          setLoadingFirstRequest(true);    
          
          // if (mode !== 'generate') {
            // Initial call to openAI to write the article
          const firstResponse = (mode !== 'generate') 
            ? await callOpenAIToRewriteArticle(response, inputData)
            : await callOpenAI(inputData);

            // } else {
          //   // Initial call to openAI to write the article
          //   const firstResponse = await callOpenAI(inputData);            
          // } 

          setLoadingFirstRequest(false);      
          
          // Second call to openAI, this time to re-write it as if not written by AI.
          const revisedResponse = await callOpenAIRevised(inputData, firstResponse);

          // Modify hyperlinkedResponse as needed
          setLoadingThirdRequest(true);            
          let hyperlinkedResponse = revisedResponse;
          const backlinkArray = getBacklinkArray(inputData);
          hyperlinkedResponse = await insertBacklinks(backlinkArray.join(', '), hyperlinkedResponse);
          // ...
          setResponse(hyperlinkedResponse);
          addResponseToPreviousResponses(hyperlinkedResponse);

          setLoadingThirdRequest(false);
      }
    } 
    catch (error) {
        setLoadingFirstRequest(true);      
        setLoadingThirdRequest(false);      
    } finally {
      setIterationCount(0);
      setIterationTotal(0);      
    }

  };
  

  const [editorState, setEditorState] = useState<EditorState>(
    // Create an initial EditorState with an empty ContentState
    EditorState.createEmpty()
  );


  // Handle RTE changes
  const handleEditorStateChange = (newState: EditorState) => {
    setEditorState(newState);
  };

  useEffect(() => {
    // When the response changes, update the editorState with the new content
    if (response !== '') {
      const blocksFromHTML = convertFromHTML(response);
      const contentState = ContentState.createFromBlockArray(
        blocksFromHTML.contentBlocks,
        blocksFromHTML.entityMap
      );
      setEditorState(EditorState.createWithContent(contentState));
    }
  }, [response]);

  const handleToneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setTone((prevTone) =>
      prevTone.includes(value)
        ? prevTone.filter((item) => item !== value)
        : [...prevTone, value]
    );
  };

  const addResponseToPreviousResponses = function(response: string) {
    if (response !== '' && !previousResponses.includes(response)) {
      setPreviousResponses(prevResponses => [...prevResponses, response]);
    }
  }

  const handleBackState = () => {
    addResponseToPreviousResponses(response);
    setShowForm(true);
    setEditingState(false);
  }

  const handleStartOver = () => {
    const confirmed = window.confirm("Are you sure you want to start over? This action will clear your current data.");
  
    if (confirmed) {
        setShowForm(true); 
        setEditingState(false);
        setResponse('');
        setPreviousResponses([]);
    }
  }

  const handleGoBackToLastResponse = () => {
    const lastResponse = previousResponses[previousResponses.length - 1];
    setResponse(lastResponse);
    setShowForm(false);
  }

  const openEditor = () => {
    setEditingState(true);
  }
  const closeRTE = () => {
    setEditingState(false);
  }

  const saveEditor = (newContent: string) => {
    setEditingState(false);
    setResponse(newContent); // Update the response state with the new content
  };
  
  function downloadContent(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/html' }); // Create a blob with the content
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); // Create an anchor tag to trigger the download
    a.href = url;
    a.download = filename;
    a.click();
  
    URL.revokeObjectURL(url); // Clean up the object URL
  }
  
  const handleGptVersionChange = (event: SelectChangeEvent) => {
    setGptVersion(event.target.value as string);
  };

  const handleLanguage = (event: SelectChangeEvent) => {
    setLanguage(event.target.value as string);
  };

  const getInputData = function() {
    return {
      keywords: keywords.split(','),
      keywordsToExclude: keywordsToExclude.split(','),
      tone: tone.join(', '),
      wordCount: wordCount,
      gptVersion: gptVersion,
      articleCount: articleCount,
      otherInstructions: otherInstructions,
      language: language,
      // Dynamically generate backlinks properties
      ...backlinks.reduce<Record<string, string>>((acc, _, index) => {
        acc[`backlink${index + 1}`] = backlinks[index];
        return acc;
        }, {}),
    };
  }
  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    // setLoadingFirstRequest(true); // Set loading state to true before the API call
    const inputData = getInputData();
    const numberOfIterations = 1; // Set the desired number of iterations
    
    try {
      setShowForm(false);
      setLoadingFirstRequest(true);      
      // Initial call to openAI to write the article
      const firstResponse = await callOpenAI(inputData);
      // ...
      setLoadingFirstRequest(false);      
      
      // Second call to openAI, this time to re-write it as if not written by AI.
      const revisedResponse = await callOpenAIRevised(inputData, firstResponse);

      // Modify hyperlinkedResponse as needed
      setLoadingThirdRequest(true);            
      let hyperlinkedResponse = revisedResponse;
      const backlinkArray = getBacklinkArray(inputData);
      hyperlinkedResponse = await insertBacklinks(backlinkArray.join(', '), hyperlinkedResponse);
      // ...
      setResponse(hyperlinkedResponse);
      addResponseToPreviousResponses(hyperlinkedResponse);
      setLoadingThirdRequest(false);

    } catch (error) {
      setLoadingFirstRequest(false);      
      setLoadingThirdRequest(false);      
    }
  };
  

  return (
      <div className={styles.formWrapper}>
      {
        showForm ? (
           // ArticleForm component and previous responses
           <div className="formBobby">
           <ArticleForm
           handleSubmit={handleSubmit}
           wordCount={wordCount}
           setWordCount={setWordCount}
           articleCount={articleCount}
           setArticleCount={setArticleCount}
           keywords={keywords}
           setKeywords={setKeywords}
           keywordsToExclude={keywordsToExclude}
           setKeywordsToExclude={setKeywordsToExclude}
           gptVersion={gptVersion}
           handleGptVersionChange={handleGptVersionChange}
           language={language}
           handleLanguage={handleLanguage}
           backlinks={backlinks}
           setBacklinks={setBacklinks}
           tone={tone}
           handleToneChange={handleToneChange}
           otherInstructions={otherInstructions}
           setOtherInstructions={setOtherInstructions}
         />

         { /* Check for Previous Responses and display back button + the responses */ }
         {previousResponses.length > 0 && (
           <div>
             <br />
             <Button size="small" variant="outlined" startIcon={<ArrowBack />} onClick={handleGoBackToLastResponse}>Back to Results</Button>
          </div>
        )}

          </div>
        ) : (
        // Response zone 
        <div className="response">
              { (isLoadingFirstRequest || isLoadingThirdRequest) && iterationCount > 0 ? (
                  <div className={styles.iterationCount}>
                    Remixing {iterationCount} / {iterationTotal}
                  </div>
              ) : '' }
              { isLoadingFirstRequest ? (
                  <Step1LoadingStateComponent />
              ) : isLoadingThirdRequest ? (
                  <FinalLoadingStateComponent />
              ) : (                  
                <div className="allEditing">
                {/* //start display response and response components if not loading */}
                  { isEditingState ? (
                    <div>  
                      <Editor
                        editorState={editorState}
                        onEditorStateChange={handleEditorStateChange}
                        wrapperClassName="rich-editor-wrapper"
                        editorClassName="rich-editor"
                      />

                      <Button size="small" variant="contained" startIcon={<Undo />} color="error" onClick={closeRTE}>Cancel</Button>
                      &nbsp;
                      <Button size="small" variant="contained" startIcon={<Edit />} onClick={() => saveEditor(stateToHTML(editorState.getCurrentContent()))}>Save Content</Button>
                    </div>
                  ) : (
                    // display Response and action bar components
                    <div className='responseAndActions'>
                      <Button size="small" variant="outlined" startIcon={<ArrowBack />} onClick={handleBackState}>Back</Button>
                      &nbsp;&nbsp;
                      <Button size="small" variant="outlined" startIcon={<RestartAlt />} onClick={handleStartOver}>Start Over</Button>

                       {/* Response Start */}
                      <div className={styles.pbnjResults} dangerouslySetInnerHTML={{ __html: response }}>
                      </div>
                      {/* Response End */}

                      {/* Action Bar Start */}
                      <div className={styles.actionBar}>
                        <Button 
                          size="small" 
                          variant="contained" 
                          startIcon={<Download />}
                          onClick={() => downloadContent("response.html", response)}
                        >
                          Download Content
                        </Button>&nbsp;
                        <Button size="small" variant="contained" startIcon={<Edit />} onClick={openEditor}>Edit Content</Button>

                        <Button size="small" variant="contained" startIcon={<Blender />} onClick={handleRemixModalOpen}>Remix</Button>
                        <RemixModal
                          isOpen={isRemixModalOpen}
                          onClose={() => setRemixModalOpen(false)}
                          onSubmit={handleRemixModalSubmit}
                        />  

                        <CopyToClipboardButton text={response} />  

                        <Button size="small" variant="contained" disabled color="success" startIcon={<Send />} type="submit">Post article to PBN (coming soon)</Button> 
                      </div>
                       {/* Action Bar End */}
                    </div>
                  )}
                </div>
              )}
        </div>  
      //end of loading check + response and response components
        )}

        {/* Show previous responses */}
        {previousResponses.slice().reverse().map((prevResponse, index) => (
          <div key={`response-${index}`}>
            <PreviousResponseComponent key={`component-${index}`}  version={previousResponses.length - index} response={prevResponse} />
            <div className={styles.actionBar}>
              <Button 
                size="small" 
                variant="contained" 
                startIcon={<Download />}
                onClick={() => downloadContent("response.html", prevResponse)}
              >
                Download Content
              </Button>
              &nbsp;
              <CopyToClipboardButton text={response} />  

              <Button size="small" variant="contained" disabled color="success" startIcon={<Send />} type="submit">Post article to PBN (coming soon)</Button> 
            </div>
          </div>
        ))}

      </div>
  );
};

export default Form;