import React, { useState } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';

interface BacklinkInputsProps {
    backlinks: string[];  // Replace `YourBacklinksType` with the actual type of `backlinks`
    setBacklinks: (newBacklinks: string[]) => void;  // Assuming `setBacklinks` is a state setter function
  }
  
const BacklinkInputs: React.FC<BacklinkInputsProps> = ({ backlinks, setBacklinks }) => {    
    // const BacklinkInputs = ({ backlinks, setBacklinks }): React.JSX.Element => {
const addBacklink = () => {
    if (backlinks.length < 20) {
    setBacklinks([...backlinks, '']);
    }
};

const removeBacklink = (index: number) => {
    const updatedBacklinks = [...backlinks];
    updatedBacklinks.splice(index, 1);
    setBacklinks(updatedBacklinks);
};

const updateBacklink = (index: number, value: string) => {
    const updatedBacklinks = [...backlinks];
    updatedBacklinks[index] = value;
    setBacklinks(updatedBacklinks);
};

  return (
    <div>
      {backlinks.map((backlink, index) => (
        <div key={index}>
          <TextField
            label={`Backlink URL ${index + 1}`}
            value={backlink}
            type="url"
            onChange={(e) => updateBacklink(index, e.target.value)}
            margin="normal"
          />
          {index > 0 && <IconButton style={{ marginTop: '1.3rem', marginLeft: '0.5rem' }}aria-label="delete"  onClick={() => removeBacklink(index)}><DeleteIcon /></IconButton>}
        </div>
      ))}
      <Button variant="text" onClick={addBacklink}>Add Another</Button>
    </div>
  );
};

export default BacklinkInputs;
