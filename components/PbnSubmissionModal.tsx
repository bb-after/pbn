import React from 'react';
import { Modal, Backdrop, Fade, Button } from '@mui/material';
import PbnSubmissionForm from './PbnSubmissionForm';

interface PbnModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleTitle: string;
  content: string; // Accept content as a string instead of EditorState
}

const PbnSubmissionModal: React.FC<PbnModalProps> = ({ isOpen, onClose, articleTitle, content }) => {
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
            articleTitle={articleTitle}
            content={content} // Pass content as a string
            onSubmit={(title: string, content: string) => {
              console.log("Submitted:", title, content); // Implement actual submit function here
            }}
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
