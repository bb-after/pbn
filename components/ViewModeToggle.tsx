import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ViewModule as CardViewIcon, ViewList as TableViewIcon } from '@mui/icons-material';

interface ViewModeToggleProps {
  value: 'cards' | 'table';
  onChange: (event: React.MouseEvent<HTMLElement>, newValue: 'cards' | 'table') => void;
  size?: 'small' | 'medium' | 'large';
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  value,
  onChange,
  size = 'small',
}) => {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={onChange}
      size={size}
      sx={{
        '& .MuiToggleButton-root': {
          color: 'text.primary',
          border: '1px solid',
          borderColor: 'divider',
          '&.Mui-selected': {
            color: 'text.primary',
            backgroundColor: 'action.selected',
            borderColor: 'divider',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          },
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        },
      }}
    >
      <ToggleButton value="table" aria-label="table view">
        <TableViewIcon />
      </ToggleButton>
      <ToggleButton value="cards" aria-label="card view">
        <CardViewIcon />
      </ToggleButton>
    </ToggleButtonGroup>
  );
};

export default ViewModeToggle;
