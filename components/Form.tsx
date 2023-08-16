// components/Form.tsx

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'; // To load the RTE dynamically (client-side)
import { EditorState, ContentState, convertFromHTML } from 'draft-js';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import TextField from '@mui/material/TextField';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Image from 'next/image';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
// import BackIcon from '@mui/icons-material/Back';
import { Send, ArrowBack, Edit, Download } from '@mui/icons-material';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import CopyToClipboardButton from './CopyToClipboardButton'; // Replace with the correct path to your component
import { stateToHTML } from 'draft-js-export-html';
import { callOpenAI, callOpenAIRevised, insertBacklinks, getBacklinkArray } from '../utils/openai';
import PeanutButterFactComponent from './PeanutButterFact';
import BacklinkInputs from './BacklinkInputs';
import PreviousResponseComponent from './PreviousResponseComponent';
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
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [gptVersion, setGptVersion] = useState("gpt-3.5-turbo");
  const [wordCount, setWordCount] = useState(300);
  const [keywordsToExclude, setKeywordsToExclude] = useState('');
  const [articleCount, setArticleCount] = useState(1);
  const [tone, setTone] = useState<string[]>([]);
  const [otherInstructions, setOtherInstructions] = useState('');
  const step2Text = "Schmearin' the jam...";

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

  const openEditor = () => {
    setEditingState(true);
  }

  const saveEditor = (newContent: string) => {
    setEditingState(false);
    setResponse(newContent); // Update the response state with the new content
  };

  // const createDownloadLink = () => {
  //   const blob = new Blob([response], { type: 'text/html' });
  //   const url = URL.createObjectURL(blob);
  //   return url;
  // };
  
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

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    setLoadingFirstRequest(true); // Set loading state to true before the API call
    const inputData = {
      keywords: keywords.split(','),
      keywordsToExclude: keywordsToExclude.split(','),
      tone: tone.join(', '),
      wordCount: wordCount,
      gptVersion: gptVersion,
      articleCount: articleCount,
      otherInstructions: otherInstructions,
      // Dynamically generate backlinks properties
      ...backlinks.reduce((acc, _, index) => {
        acc[`backlink${index + 1}`] = backlinks[index];
        return acc;
      }, {}),
    };

      // setLoading(true);
      const numberOfIterations = 1;//inputData.articleCount; // Set the desired number of iterations

      const newResponses = [];
      const newLoadingStates = [];

      for (let i = 0; i < numberOfIterations; i++) {
      
        newLoadingStates.push(true); // Set loading state for this iteration
        console.log('LOOPING THROUGH, ON ARTICLE '+i);
        try {
          //initial call to openAI to write the article
          const firstResponse = await callOpenAI(inputData);
          setLoadingFirstRequest(false); // Clear loading state after the first request
          setLoadingSecondRequest(true); // Set loading state for the second request
          //second call to openAI, this time to re-write it as if not written by AI.  
          const revisedResponse = await callOpenAIRevised(inputData, firstResponse);
          setLoadingSecondRequest(false); // Clear loading state after the second request
          setLoadingThirdRequest(true); // Set loading state for the second request

          let hyperlinkedResponse = revisedResponse;
          const backlinkArray = getBacklinkArray(inputData);

          hyperlinkedResponse = await insertBacklinks(backlinkArray.join(', '), hyperlinkedResponse);
          console.log('updated hyperlinked response', hyperlinkedResponse);
          // setLoadingStates(newLoadingStates);

          // setResponses(prevResponses => [...prevResponses, hyperlinkedResponse]);
          newResponses.push(hyperlinkedResponse);

          setResponse(hyperlinkedResponse);
          
          setLoadingFirstRequest(false);
          setLoadingSecondRequest(false);
          setLoadingThirdRequest(false);
          // setResponse(response);
        }
        catch (error) {
          setLoadingFirstRequest(false); // Clear loading state on error
          setLoadingSecondRequest(false); // Clear loading state on error
          setLoadingThirdRequest(false);
          console.error('Error submitting form:', error);
          newResponses.push('Error occurred'); // Push an error message to responses if needed

          // Handle error here, e.g., display an error message.
        } finally {
          newLoadingStates[i] = false; // Clear loading state after processing
        }
      }

      setResponses(newResponses);
      setLoadingStates(newLoadingStates);

  }

  return (
      <div>

   {/* {responses.map((response, index) => (
          <div key={index}>
            <h2>Iteration {index + 1}:</h2>
            <div dangerouslySetInnerHTML={{ __html: response }} className="pbnj-output" />
            {loadingStates[index] && <p>Loading...</p>}
          </div>
        ))
    } */}
  
        { isLoadingFirstRequest ? (
            <div style={{ textAlign: 'center', padding: 16, margin: 'auto', maxWidth: 750, background: 'rgb(250 250 250)' }}>
              <Image
                priority
                src="/images/pb-animated.gif"
                height={144}
                width={144}
                alt=""
              />
              <br></br>
              <b>Step 1:</b>
              <br></br>
              Churning the (peanut) butter...
              <PeanutButterFactComponent />
            </div>
        ) : isLoadingSecondRequest ? (
            <div style={{ textAlign: 'center', padding: 16, margin: 'auto', maxWidth: 750, background: 'rgb(250 250 250)' }}>
              <Image
              priority
              src="/images/jam.gif"
              height={144}
              width={144}
              alt=""
            />  
            <br></br>
            Step 2:
            <br></br>
            {`${step2Text}`}
            </div>
        ) : isLoadingThirdRequest ? (
          <div style={{ textAlign: 'center', padding: 16, margin: 'auto', maxWidth: 750, background: 'rgb(250 250 250)' }}>
            <Image
            priority
            src="/images/pbj-final.gif"
            height={144}
            width={144}
            alt=""
          />  
          <br></br>
          Step {skipOpenAiRevision ? '2' : '3' }
          <br></br>
          Putting it together...
          </div>
      ) : response !== '' ? (
        <div>
          { isEditingState && 
          ( 
             <Editor
              editorState={editorState}
              onEditorStateChange={handleEditorStateChange}
              wrapperClassName="rich-editor-wrapper"
              editorClassName="rich-editor"
            />
          )}
          { !isEditingState && 
          (
           <div dangerouslySetInnerHTML={{ __html: response }} className="pbnj-output">
            </div>
          )} 
          <br />

          <Button 
            variant="outlined" 
            startIcon={<Download />}
            onClick={() => downloadContent("response.html", response)}
          >
            Download Content
          </Button>
   
          <br /><br />

          <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleBackState}>Go Back</Button>
          <br /><br />
          { !isEditingState &&
          (
            <div>
            <Button variant="outlined" startIcon={<Edit />} onClick={openEditor}>Edit Content</Button>
            <br /><br />
            <CopyToClipboardButton text={response} />  
            <br />
            <Button variant="contained" disabled color="success" startIcon={<Send />} type="submit">Post article to PBN (coming soon)</Button>
            </div>
          )}
          { isEditingState && (
            
    
            <Button variant="outlined" startIcon={<Edit />} onClick={() => saveEditor(stateToHTML(editorState.getCurrentContent()))}>Save Content</Button>
          )}


        </div>
        ) : (
          <form onSubmit={handleSubmit}>

              <TextField
                label="Word Count"
                value={wordCount}
                onChange={(e) => setWordCount(e.target.value)}
                margin="normal"
                type="number"
                defaultValue={520}
                style={{width: 250}}
                placeholder='Approximate count'
                required
              />
              &nbsp;&nbsp;
              <TextField
                label="Article Count"
                value={articleCount}
                onChange={(e) => setArticleCount(e.target.value)}
                margin="normal"
                type="number"
                defaultValue={3}
                InputProps={{
                  inputProps: { 
                      max: 4, min: 1 
                  }
              }}          
                style={{width: 250}}
                placeholder='Number of Articles to be generated'
                required
              />              

              <TextField
                label="Keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                fullWidth
                margin="normal"
                required
                placeholder='Comma separated'
              />

              <TextField
                label="Keywords to Exclude"
                value={keywordsToExclude}
                onChange={(e) => setKeywordsToExclude(e.target.value)}
                fullWidth
                margin="normal"
                placeholder='Comma separated'
              />
              <br /><br />
              
              <Box>
                <FormControl>
                  <InputLabel>GPT Version</InputLabel>
                  <Select
                    autoWidth
                    value={gptVersion}
                    label="GPT Version"
                    onChange={handleGptVersionChange}
                  >
                  <MenuItem value={"gpt-3.5-turbo"}>GPT 3.5 Turbo (faster)</MenuItem>
                  <MenuItem value={"gpt-4"}>GPT 4 (more advanced)</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <br />
              <BacklinkInputs backlinks={backlinks} setBacklinks={setBacklinks} />
              <br></br>
              <br></br>
              <FormControl component="fieldset">
                <FormLabel component="legend">Tone</FormLabel>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={tone.includes('formal')}
                        onChange={handleToneChange}
                        value="formal"
                      />
                    }
                    label="Formal"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={tone.includes('informal')}
                        onChange={handleToneChange}
                        value="informal"
                      />
                    }
                    label="Informal"
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={tone.includes('journalistic')}
                        onChange={handleToneChange}
                        value="journalistic"
                      />
                    }
                    label="Journalistic"
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={tone.includes('joyful')}
                        onChange={handleToneChange}
                        value="joyful"
                      />
                    }
                    label="Joyful"
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={tone.includes('optimistic')}
                        onChange={handleToneChange}
                        value="optimistic"
                      />
                    }
                    label="Optimistic"
                  />

                <FormControlLabel
                    control={
                      <Checkbox
                        checked={tone.includes('sincere')}
                        onChange={handleToneChange}
                        value="sincere"
                      />
                    }
                    label="Sincere"
                  />

                <FormControlLabel
                    control={
                      <Checkbox
                        checked={tone.includes('humorous')}
                        onChange={handleToneChange}
                        value="humorous"
                      />
                    }
                    label="Humorous"
                  />

                </FormGroup>
              </FormControl>

              <TextareaAutosize
                minRows={4}
                placeholder="Other Instructions"
                value={otherInstructions}
                onChange={(e) => setOtherInstructions(e.target.value)}
                style={{ width: '100%', marginTop: 20, fontFamily: 'Roboto', fontWeight: 400, fontSize: '1rem', padding: '0.5rem' }}
              />

              <Button variant="contained" type="submit">Give me the PB and the J</Button>

              {response !== '' ? (
                <div>
                  <Button variant="contained">Go forward</Button>
                </div>
              ) : null}

              {/* Show previous responses */}
              {previousResponses.map((prevResponse, index) => (
             <PreviousResponseComponent key={index} response={prevResponse} />
              ))}

            </form>
        )
      }
    </div>
  );
};

export default Form;