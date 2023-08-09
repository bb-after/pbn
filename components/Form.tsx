// components/Form.tsx

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'; // To load the RTE dynamically (client-side)
import { EditorState, ContentState, convertFromHTML } from 'draft-js';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import TextField from '@mui/material/TextField';
import Image from 'next/image';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
// import BackIcon from '@mui/icons-material/Back';
import { Send, ArrowBack, ContentCopy, Edit } from '@mui/icons-material';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormGroup from '@mui/material/FormGroup';
import FormLabel from '@mui/material/FormLabel';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import CopyToClipboardButton from './CopyToClipboardButton'; // Replace with the correct path to your component
import { stateToHTML } from 'draft-js-export-html';

import { callOpenAI, callOpenAIRevised, insertBacklinks, getBacklinkArray } from '../utils/openai';

// Dynamically load the RTE component (client-side) to prevent server-side rendering issues
const Editor = dynamic(
  () => import('react-draft-wysiwyg').then((module) => module.Editor),
  { ssr: false }
);

const Form: React.FC = () => {
  const [isLoadingFirstRequest, setLoadingFirstRequest] = useState(false);
  const [isLoadingSecondRequest, setLoadingSecondRequest] = useState(false);
  const [isLoadingThirdRequest, setLoadingThirdRequest] = useState(false);
  const [isEditingState, setEditingState] = useState(false);
  const [response, setResponse] = useState<string>(''); // Initialize with an empty string
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [wordCount, setWordCount] = useState('');
  const [keywordsToExclude, setKeywordsToExclude] = useState('');
  const [backlink1, setBacklink1] = useState('');
  const [backlink2, setBacklink2] = useState('');
  const [backlink3, setBacklink3] = useState('');
  const [backlink4, setBacklink4] = useState('');
  const [backlink5, setBacklink5] = useState('');
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
  
  
  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    setLoadingFirstRequest(true); // Set loading state to true before the API call

    try {
      const inputData = {
        keywords: keywords.split(','),
        keywordsToExclude: keywordsToExclude.split(','),
        backlink1: backlink1,
        backlink2: backlink2,
        backlink3: backlink3,
        backlink4: backlink4,
        backlink5: backlink5,
        tone: tone.join(', '),
        wordCount: 400,
        otherInstructions: otherInstructions,

      };

      //initial call to openAI to write the article
      const firstResponse = await callOpenAI(inputData);
      setLoadingFirstRequest(false); // Clear loading state after the first request

      
      setLoadingSecondRequest(true); // Set loading state for the second request
      //second call to openAI, this time to re-write it as if not written by AI.  
      const revisedResponse = await callOpenAIRevised(inputData, firstResponse);
      setLoadingSecondRequest(false); // Clear loading state after the second request
      setLoadingThirdRequest(true); // Set loading state for the second request

      const maxBacklinks = 5;
      let hyperlinkedResponse = revisedResponse;
      const backlinkArray = getBacklinkArray(inputData);

      hyperlinkedResponse = await insertBacklinks(backlinkArray.join(', '), hyperlinkedResponse);
      console.log('updated hyperlinked response', hyperlinkedResponse);
      
      setResponse(hyperlinkedResponse);
      
      setLoadingFirstRequest(false);
      setLoadingSecondRequest(false);
      setLoadingThirdRequest(false);
      // setResponse(response);

    } catch (error) {
      setLoadingFirstRequest(false); // Clear loading state on error
      setLoadingSecondRequest(false); // Clear loading state on error
      setLoadingThirdRequest(false);
      console.error('Error submitting form:', error);
      // Handle error here, e.g., display an error message.
    }
  }

  return (
      <div>
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
              Step 1:
              <br></br>
              Churning the (peanut) butter...
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
          Step 3:
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
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleBackState}>Go Back</Button>
          <br /><br />
          { !isEditingState &&
          (
            <div>
            <Button variant="outlined" startIcon={<Edit />} onClick={openEditor}>Edit Content</Button>
            <br /><br />
            <CopyToClipboardButton text={response} />  
            <br />
            <Button variant="contained" color="success" startIcon={<Send />} type="submit">Post article to PBN</Button>
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
                defaultValue="520"
                style={{width: 250}}
                placeholder='Approximate count'
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

              <TextField
                label="Backlink URL 1"
                value={backlink1}
                type={"url"}
                onChange={(e) => setBacklink1(e.target.value)}
                margin="normal"
              />

              <TextField
                label="Backlink URL 2"
                value={backlink2}
                type={"url"}
                onChange={(e) => setBacklink2(e.target.value)}
                margin="normal"
              />

              <TextField
                label="Backlink URL 3"
                value={backlink3}
                type={"url"}
                onChange={(e) => setBacklink3(e.target.value)}
                margin="normal"
              />
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

            </form>
        )
      }
    </div>
  );
};

export default Form;