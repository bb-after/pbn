// pages/pbn-form.tsx
import React from 'react';
import PbnSubmissionForm from '../components/PbnSubmissionForm'; // Adjust the import path
import { EditorState, ContentState, convertFromHTML } from 'draft-js';

const PbnFormPage: React.FC = () => {
  // Define any initial values for the props if needed
  const initialArticleTitle = 'Initial Article Title';
  const initialEditorState = EditorState.createEmpty();

  return (
    <div>
      <h1>Standalone PBN Form</h1>
      <PbnSubmissionForm
        articleTitle={initialArticleTitle}
        pbnModalEditorState={initialEditorState}
      />
    </div>
  );
};

export default PbnFormPage;
