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
  Select,
  SelectChangeEvent,
  MenuItem,
  InputLabel,
} from '@mui/material';
import CopyToClipboardButton from './CopyToClipboardButton'; // Replace with the correct path to your component

// Dynamically load the RTE component (client-side) to prevent server-side rendering issues
const Editor = dynamic(
  () => import('react-draft-wysiwyg').then((module) => module.Editor),
  { ssr: false }
);

///

interface PbnFormProps {
    articleTitle: string; // Add articleTitle prop
    pbnModalEditorState: EditorState; // Add pbnModalEditorState prop
    onSubmit: (title: string, content: string) => void;
  }
  
  const PbnSubmissionForm: React.FC<PbnFormProps> = ({
    articleTitle, // Receive articleTitle as a prop
    pbnModalEditorState, // Receive pbnModalEditorState as a prop
  }) => {
    const [copyButtonText, setCopyButtonText] = useState('Copy URL');
    const [editorState, setEditorState] = useState(pbnModalEditorState); // Use pbnModalEditorState as initial state
    const [title, setTitle] = useState(articleTitle); // Use articleTitle as initial state
    const [clientName, setClientName] = useState(''); // Use '' as initial state
    const [category, setCategory] = useState(''); // State for tracking the selected category
    const [submissionUrl, setSubmissionUrl] = useState('');
    const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState(false);
    const handleCategoryChange = (event: SelectChangeEvent) => {
      setCategory(event.target.value as string);
    };    

    const postContentToPbn = async () => {
        const contentHTML = stateToHTML(editorState.getCurrentContent());
        const urlParams = new URLSearchParams(window.location.search);
        const userToken = urlParams.get('token');
    
          try {
            const response = await fetch('/api/postToWordPress', {
              method: 'POST',
              body: JSON.stringify({
                title: title,
                clientName: clientName,
                content: contentHTML,
                userToken: userToken,
                category: category,
                tags: [],
              }),
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (response.status === 201) {
                const responseData = await response.json();
                // Article posted successfully
                  // alert('article posted successfully! \n' + responseData.link);
                setSubmissionUrl(responseData.link); // Assuming responseData.link contains the URL
                setIsSubmissionSuccessful(true);
            } else if (response.status == 400) {
                alert('Article already uploaded to PBN');
                setIsSubmissionSuccessful(false);
              } else if (response.status == 404) {
                alert('No active blogs found in database');
                setIsSubmissionSuccessful(false);
              } else {
                alert('Failed to post article to PBN');
                setIsSubmissionSuccessful(false);
            } 
          } catch (error: any) {
                alert('Request error: ' + error.message);
                setIsSubmissionSuccessful(false);
          }
    };
    

  const handleEditorStateChange = (newEditorState: EditorState) => {
    setEditorState(newEditorState);
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };
  
  const handleClientChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setClientName(event.target.value);
  };

  return (
    <div>
      {isSubmissionSuccessful && submissionUrl ? (
        <div>
          <TextField
            fullWidth
            margin="normal"
            value={submissionUrl}
            InputProps={{
              readOnly: true,
            }}
            variant="outlined"
          />
          <CopyToClipboardButton text={submissionUrl} />  
        </div>
      ) : (
        <>
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

        <TextField
          label="Client Name"
          value={clientName}
          fullWidth
          margin="normal"
          required
          placeholder="Client Name"
          onChange={handleClientChange}
        />
      </FormControl>
      <br /><br />

      <FormControl>
        <InputLabel id="category-select-label">Category</InputLabel>
        <Select
          labelId="category-select-label"
          id="category-select"
          value={category}
          label="Category"
          onChange={handleCategoryChange}
          fullWidth
          style={{ minWidth: 120 }}
        >
          {['Business', 'Finance', 'Health', 'Lifestyle', 'Technology', 'News', 'Education', 'Entrepreneurship', 'Sports', 'General'].map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat}
            </MenuItem>
          ))}
        </Select>


        
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
      </>
      )}
    </div>    
  );
};

export default PbnSubmissionForm;
