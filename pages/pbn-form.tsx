// pages/pbn-form.tsx
import React from 'react';
import PbnSubmissionForm from '../components/PbnSubmissionForm'; // Adjust the import path
import { EditorState, ContentState, convertFromHTML } from 'draft-js';
import {
    Typography,
    Link
  } from '@mui/material';
  
const PbnFormPage: React.FC = () => {
  // Define any initial values for the props if needed
  const initialArticleTitle = '';
  const initialEditorState = EditorState.createEmpty();

  return (
    <div>
        <style jsx global>
        {`
        body {
            background: #eee;
        }
        `}
    </style>

        <div style={{padding: '2rem', borderRadius: '3px', margin: '2rem', background: '#fff'}}>
        <Typography variant="h5" gutterBottom>
        <Link href="/">Portal</Link> &raquo; 
        Post an Article to the PBN
        </Typography>
        <PbnSubmissionForm
            articleTitle={initialArticleTitle}
            pbnModalEditorState={initialEditorState}
        />
        </div>
    </div>
  );
};

export default PbnFormPage;
