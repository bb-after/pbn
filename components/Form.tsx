// components/Form.tsx
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'; // To load the RTE dynamically (client-side)
import { EditorState, ContentState, convertFromHTML } from 'draft-js';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import { Button, Checkbox, FormControl, FormControlLabel, FormLabel, FormGroup, InputLabel, MenuItem, Select, SelectChangeEvent, TextareaAutosize } from '@mui/material';
import Image from 'next/image';
import styles from './styles.module.css'; // Make sure the correct path is used
// import BackIcon from '@mui/icons-material/Back';
import { Send, ArrowBack, Edit, Download, Blender, Undo } from '@mui/icons-material';
import CopyToClipboardButton from './CopyToClipboardButton'; // Replace with the correct path to your component
import { stateToHTML } from 'draft-js-export-html';
import BacklinkInputs from './BacklinkInputs';
import PreviousResponseComponent from './PreviousResponseComponent';
import RemixModal from './RemixModal';
import { processIterations } from '../utils/apiCalls';
import Step1LoadingStateComponent from './Step1LoadingState';
import Step2LoadingStateComponent from './Step2LoadingState';
import FinalLoadingStateComponent from './FinalLoadingState';
import ArticleForm from './ArticleForm'; // Adjust the path as needed

// Dynamically load the RTE component (client-side) to prevent server-side rendering issues
const Editor = dynamic(
  () => import('react-draft-wysiwyg').then((module) => module.Editor),
  { ssr: false }
);
const skipOpenAiRevision = process.env.NEXT_PUBLIC_SKIP_OPENAI_REVISION;
const Form: React.FC = () => {
  const [backlinks, setBacklinks] = useState(['']); // Initial state with one input
  const [responses, setResponses] = useState<string[]>([]); // Store responses for each iteration
  const [previousResponses, setPreviousResponses] = React.useState<string[]>([]);
  const [loadingStates, setLoadingStates] = useState<boolean[]>([]); // Loading state
  const [isLoadingFirstRequest, setLoadingFirstRequest] = useState(false);
  const [isLoadingSecondRequest, setLoadingSecondRequest] = useState(false);
  const [isLoadingThirdRequest, setLoadingThirdRequest] = useState(false);
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

  const handleRemixModalSubmit = async (iterations: number) => {
    debugger;
    setRemixModalOpen(false); // Close the modal
  
    // Your API calls logic
    // ...
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

  const handleBackState = () => {
    if (response !== '') {
      setPreviousResponses(prevResponses => [...prevResponses, response]);
    }
    setResponse('');
    setEditingState(false);
  }

  const handleGoBackToLastResponse = () => {
    const lastResponse = previousResponses[previousResponses.length - 1];
    setResponse(lastResponse);
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

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    // setLoadingFirstRequest(true); // Set loading state to true before the API call
    const inputData = {
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

    const numberOfIterations = 1; // Set the desired number of iterations

    try {
      const { responses, loadingStates } = await processIterations(inputData, numberOfIterations);
      setResponses(responses);
      setLoadingStates(loadingStates);
    } catch (error) {
      console.error('Error submitting form:', error);
      // Handle error here
    }
  };
  

  return (
    /****
     *****
     1.  If isLoading is true for a specific index, it shows a loading state component (Step1LoadingStateComponent, Step2LoadingStateComponent, or FinalLoadingStateComponent) based on the index.
    2.  If isLoading is false and response is not empty, it renders the editing components if isEditingState is true, and renders the response display components if isEditingState is false.
    3.  If isLoading is false and response is empty, it renders the ArticleForm component along with the previous responses, if any.
     ****/

      <div className={styles.formWrapper}>
        {loadingStates.map((isLoading, index) => (
        isLoading ? (
          <div key={index}>
            {index === 0 ? (
              <Step1LoadingStateComponent />
            ) : index === 1 ? (
              <Step2LoadingStateComponent />
            ) : (
              <FinalLoadingStateComponent />
            )}
          </div>
        ) : response !== '' ? (
        <div>
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
            <div>
              <Button size="small" variant="outlined" startIcon={<ArrowBack />} onClick={handleBackState}>Back</Button>
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
                  </Button>
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
      ) : (
          // ArticleForm component and previous responses
          <div>
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
      
              {/* Show previous responses */}
              {previousResponses.map((prevResponse, index) => (
                <PreviousResponseComponent key={index} response={prevResponse} />
              ))}
            </div> 
          )}
          </div>
      )
  ))}
  </div>
  );
};

export default Form;