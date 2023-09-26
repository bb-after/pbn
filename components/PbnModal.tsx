import React, { useState } from 'react';
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
}

const PbnModal: React.FC<PbnModalProps> = ({ isOpen, onClose }) => {
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

          <PbnSubmissionForm onClose={onClose} />

          <br /> <br />

          <Button onClick={onClose} variant="outlined" color="secondary">
            Cancel
          </Button>
        </div>
      </Fade>
    </Modal>
  );
};

export default PbnModal;
