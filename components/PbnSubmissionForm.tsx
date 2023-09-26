// PbnSubmissionForm.tsx (Reusable Form Component)
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { EditorState } from 'draft-js';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { stateToHTML } from 'draft-js-export-html';
import {
  TextField,
  Button,
  FormControl,
  FormLabel,
} from '@mui/material';

// Dynamically load the RTE component (client-side) to prevent server-side rendering issues
const Editor = dynamic(
  () => import('react-draft-wysiwyg').then((module) => module.Editor),
  { ssr: false }
);

///

interface PbnFormProps {
    articleTitle: string; // Add articleTitle prop
    pbnModalEditorState: EditorState; // Add pbnModalEditorState prop
  }
  
  const PbnSubmissionForm: React.FC<PbnFormProps> = ({
    articleTitle, // Receive articleTitle as a prop
    pbnModalEditorState, // Receive pbnModalEditorState as a prop
  }) => {
    const [editorState, setEditorState] = useState(pbnModalEditorState); // Use pbnModalEditorState as initial state
    const [title, setTitle] = useState(articleTitle); // Use articleTitle as initial state

    const postContentToPbn = async () => {
        const contentHTML = stateToHTML(editorState.getCurrentContent());
        const urlParams = new URLSearchParams(window.location.search);
        const userToken = urlParams.get('token');
    
          try {
            const response = await fetch('/api/postToWordPress', {
              method: 'POST',
              body: JSON.stringify({
                title: title,
                content: contentHTML,
                userToken: userToken,
                categories: [],
                tags: [],
              }),
              headers: {
                'Content-Type': 'application/json',
              },
            });
            console.log('rrr',response);
            if (response.status === 201) {
              // Article posted successfully
              // You can redirect the user or show a success message here.
              alert('article posted successfully!');
            } else if (response.status == 400) {
                alert('Article already uploaded to PBN');
            } else if (response.status == 404) {
                alert('No active blogs found in database');
            } else {
                alert('Failed to post article to PBN');
            } 
          } catch (error: any) {
                alert('Request error: ' + error.message);
          }
    };
    

  const handleEditorStateChange = (newEditorState: EditorState) => {
    setEditorState(newEditorState);
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  return (
    <div>
      <FormControl component="fieldset" fullWidth>
        <TextField
          label="Article Title"
          value={title}
          fullWidth
          margin="normal"
          required
          placeholder="Article Title"
          onChange={handleTitleChange}
        />
      </FormControl>

      <br /> <br />

      <FormControl component="fieldset">
        <FormLabel>Content</FormLabel>
        {/* Render the DraftJS editor */}
        <Editor
          readOnly={false}
          onEditorStateChange={handleEditorStateChange}
          editorState={editorState}
          wrapperClassName="rich-editor-wrapper"
          editorClassName="rich-editor"
        />
      </FormControl>

      <br /> <br />

      <Button onClick={postContentToPbn} variant="contained" color="primary">
        Submit
      </Button>
    </div>
  );
};

export default PbnSubmissionForm;
