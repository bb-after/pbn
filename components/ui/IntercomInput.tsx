import React, { forwardRef, useState } from 'react';
import {
  TextField,
  TextFieldProps,
  InputAdornment,
  IconButton,
  Box,
  Typography,
  FormHelperText,
} from '@mui/material';
import { Visibility, VisibilityOff, Search as SearchIcon } from '@mui/icons-material';
import { tokens } from '../../theme/intercom-theme';

export interface IntercomInputProps extends Omit<TextFieldProps, 'variant'> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
  isSearch?: boolean;
  errorMessage?: string;
  successMessage?: string;
  hint?: string;
}

export const IntercomInput = forwardRef<HTMLDivElement, IntercomInputProps>(
  (
    {
      leftIcon,
      rightIcon,
      showPasswordToggle = false,
      isSearch = false,
      errorMessage,
      successMessage,
      hint,
      type = 'text',
      sx,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const handlePasswordToggle = () => {
      setShowPassword(!showPassword);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    const getInputType = () => {
      if (showPasswordToggle) {
        return showPassword ? 'text' : 'password';
      }
      return type;
    };

    const getBorderColor = () => {
      if (errorMessage) return tokens.colors.error[400];
      if (successMessage) return tokens.colors.success[400];
      if (isFocused) return tokens.colors.primary[400];
      return tokens.colors.grey[300];
    };

    const getHelperTextColor = () => {
      if (errorMessage) return 'error.main';
      if (successMessage) return 'success.main';
      return 'text.secondary';
    };

    const startAdornment =
      leftIcon || isSearch ? (
        <InputAdornment position="start">
          {isSearch ? (
            <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          ) : (
            <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
              {leftIcon}
            </Box>
          )}
        </InputAdornment>
      ) : undefined;

    const endAdornment =
      rightIcon || showPasswordToggle ? (
        <InputAdornment position="end">
          {showPasswordToggle ? (
            <IconButton
              onClick={handlePasswordToggle}
              edge="end"
              size="small"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          ) : (
            <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
              {rightIcon}
            </Box>
          )}
        </InputAdornment>
      ) : undefined;

    return (
      <Box sx={{ width: '100%' }}>
        <TextField
          ref={ref}
          type={getInputType()}
          onFocus={handleFocus}
          onBlur={handleBlur}
          error={!!errorMessage}
          InputProps={{
            startAdornment,
            endAdornment,
            sx: {
              backgroundColor: 'background.paper',
              color: 'text.primary',
              borderRadius: tokens.borderRadius.md,
              fontSize: '0.875rem',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: errorMessage
                  ? 'error.main'
                  : successMessage
                    ? 'success.main'
                    : 'divider',
                borderWidth: isFocused ? 2 : 1,
                transition: 'all 0.2s ease',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: errorMessage
                  ? 'error.main'
                  : successMessage
                    ? 'success.main'
                    : 'text.secondary',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: errorMessage
                  ? 'error.main'
                  : successMessage
                    ? 'success.main'
                    : 'primary.main',
                borderWidth: 2,
              },
              '& input': {
                padding: '12px 14px',
                color: 'text.primary',
                '&::placeholder': {
                  color: 'text.secondary',
                  opacity: 1,
                },
              },
            },
          }}
          InputLabelProps={{
            sx: {
              fontSize: '0.875rem',
              color: 'text.secondary',
              '&.Mui-focused': {
                color: errorMessage
                  ? 'error.main'
                  : successMessage
                    ? 'success.main'
                    : 'primary.main',
              },
              '&.Mui-error': {
                color: 'error.main',
              },
            },
          }}
          sx={{
            '& .MuiFormHelperText-root': {
              display: 'none', // We'll handle helper text separately
            },
            ...sx,
          }}
          {...props}
        />

        {(errorMessage || successMessage || hint) && (
          <FormHelperText
            sx={{
              color: getHelperTextColor(),
              fontSize: '0.75rem',
              marginTop: 0.5,
              marginLeft: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {errorMessage || successMessage || hint}
          </FormHelperText>
        )}
      </Box>
    );
  }
);

IntercomInput.displayName = 'IntercomInput';

// Pre-configured input variants
export const IntercomSearchInput: React.FC<Omit<IntercomInputProps, 'isSearch'>> = props => (
  <IntercomInput isSearch placeholder="Search..." {...props} />
);

export const IntercomPasswordInput: React.FC<
  Omit<IntercomInputProps, 'showPasswordToggle' | 'type'>
> = props => <IntercomInput showPasswordToggle type="password" {...props} />;

export const IntercomTextarea: React.FC<IntercomInputProps> = props => (
  <IntercomInput multiline rows={4} {...props} />
);
