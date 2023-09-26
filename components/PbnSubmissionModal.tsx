import React, { useState } from 'react';
import { EditorState } from 'draft-js'; // Import EditorState from draft-js

import {
  Modal,
  Backdrop,
  Fade,
  Button,
} from '@mui/material';

// Import your PbnForm component
import PbnSubmissionForm from './PbnSubmissionForm';

interface PbnModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleTitle: string; // Pass the article title as a prop
  pbnModalEditorState: EditorState; // Pass the DraftJS editor state as a prop
}

const PbnSubmissionModal: React.FC<PbnModalProps> = ({ isOpen, onClose, articleTitle, pbnModalEditorState }) => {
  // You can define any modal-specific state or props here

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


        <PbnSubmissionForm 
            articleTitle={articleTitle} // Pass articleTitle as a prop
            pbnModalEditorState={pbnModalEditorState} // Pass pbnModalEditorState as a prop
        />

          <br /> <br />

          <Button onClick={onClose} variant="outlined" color="secondary">
            Cancel
          </Button>
        </div>
      </Fade>
    </Modal>
  );
};

export default PbnSubmissionModal;
