// components/RemixModal.tsx

import React, { useState } from 'react';
import {
  Modal,
  Backdrop,
  Fade,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  InputLabel,
  Input,
  InputAdornment,
} from '@mui/material';

interface RemixModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (iterations: number, remixMode: string) => void;
}
  
const RemixModal: React.FC<RemixModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [iterations, setIterations] = useState(1);
  const [mode, setMode] = useState('generate');

  const handleIterationsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setIterations(value);
  };

  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMode(event.target.value);
  };

  const handleSubmit = () => {
    onSubmit(iterations, mode);
  };

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
            width: '400px',
            maxWidth: '90%',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <h2>Remix Article</h2>
          <FormControl component="fieldset">
            <RadioGroup value={mode} onChange={handleModeChange}>
            <FormControlLabel
                value="rewrite"
                control={<Radio />}
                label="Rewrite Existing Article"
              />
              <FormControlLabel
                value="generate"
                control={<Radio />}
                label="Generate New Seed Content"
              />

            </RadioGroup>
          </FormControl>
          <br /> <br />
          <FormControl fullWidth>
            <InputLabel>Number of Revisions</InputLabel>
            <Input
              type="number"
              value={iterations}
              onChange={handleIterationsChange}
              inputProps={{ min: 1, max: 10 }}
              startAdornment={<InputAdornment position="start">#</InputAdornment>}
            />
          </FormControl>
          <br /><br />
          <Button onClick={handleSubmit} variant="contained" color="primary">
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

export default RemixModal;
