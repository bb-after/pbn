import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'; // To load the RTE dynamically (client-side)
import { EditorState, ContentState, convertFromHTML } from 'draft-js';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { stateToHTML } from 'draft-js-export-html';
// Dynamically load the RTE component (client-side) to prevent server-side rendering issues
const Editor = dynamic(
    () => import('react-draft-wysiwyg').then((module) => module.Editor),
    { ssr: false }
  );
  import {
    TextField,
    Modal,
    Backdrop,
    Fade,
    Button,
    FormControl,
    FormLabel,
  } from '@mui/material';
  
import { Label } from '@mui/icons-material';
import { head } from 'lodash';

interface PbnModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleTitle: string; // Pass the article title as a prop
  pbnModalEditorState: EditorState; // Pass the DraftJS editor state as a prop
}

const PbnModal: React.FC<PbnModalProps> = ({
  isOpen,
  onClose,
  articleTitle,
  pbnModalEditorState,
}) => {
    const [editorState, setEditorState] = useState(pbnModalEditorState);
    const [title, setTitle] = useState(articleTitle);
    const handleEditorStateChange = (newEditorState: EditorState) => {
        setEditorState(newEditorState);
    };
    const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
};

///
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
          onClose();
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


///
    
useEffect(() => {
    // Update the editor state and title when props change
    setEditorState(pbnModalEditorState);
    setTitle(articleTitle);
}, [pbnModalEditorState, articleTitle]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{ timeout: 500 }}
    >
      <Fade in={isOpen}>
        <div
          style={{
            backgroundColor: 'white',
            padding: '20px',
            width: '1000px',
            maxWidth: '90%',
            position: 'absolute',
            top: '50%',
            left: '50%',
            overflow: 'scroll',
            maxHeight: '500px',
            zIndex: 10000,
            transform: 'translate(-50%, -50%)',
          }}
        >
        <h2>Post Article to PBN</h2>
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
          &nbsp;
          <Button onClick={onClose} variant="outlined" color="secondary">
            Cancel
          </Button>
        </div>
      </Fade>
    </Modal>
  );
};

export default PbnModal;
