import React, { forwardRef } from 'react';
import { Button, ButtonProps, CircularProgress, Box } from '@mui/material';
import { tokens } from '../../theme/intercom-theme';

export interface IntercomButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

export const IntercomButton = forwardRef<HTMLButtonElement, IntercomButtonProps>(
  (
    {
      variant = 'primary',
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      size = 'medium',
      sx,
      ...props
    },
    ref
  ) => {
    const getVariantStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: tokens.colors.primary[400],
            color: '#ffffff',
            '&:hover': {
              backgroundColor: tokens.colors.primary[500],
              boxShadow: tokens.shadows[2],
            },
            '&:active': {
              backgroundColor: tokens.colors.primary[600],
              transform: 'translateY(1px)',
            },
            '&:focus': {
              boxShadow: `0 0 0 3px ${tokens.colors.primary[100]}`,
            },
          };
        case 'secondary':
          return {
            backgroundColor: '#ffffff',
            color: tokens.colors.grey[700],
            border: `1px solid ${tokens.colors.grey[300]}`,
            '&:hover': {
              backgroundColor: tokens.colors.grey[50],
              borderColor: tokens.colors.grey[400],
              boxShadow: tokens.shadows[2],
            },
            '&:active': {
              backgroundColor: tokens.colors.grey[100],
              transform: 'translateY(1px)',
            },
            '&:focus': {
              boxShadow: `0 0 0 3px ${tokens.colors.grey[100]}`,
            },
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            color: tokens.colors.grey[700],
            border: 'none',
            '&:hover': {
              backgroundColor: tokens.colors.grey[100],
            },
            '&:active': {
              backgroundColor: tokens.colors.grey[200],
            },
            '&:focus': {
              boxShadow: `0 0 0 3px ${tokens.colors.grey[100]}`,
            },
          };
        case 'danger':
          return {
            backgroundColor: tokens.colors.error[500],
            color: '#ffffff',
            '&:hover': {
              backgroundColor: tokens.colors.error[600],
              boxShadow: tokens.shadows[2],
            },
            '&:active': {
              backgroundColor: tokens.colors.error[700],
              transform: 'translateY(1px)',
            },
            '&:focus': {
              boxShadow: `0 0 0 3px ${tokens.colors.error[100]}`,
            },
          };
        default:
          return {};
      }
    };

    const getSizeStyles = () => {
      switch (size) {
        case 'small':
          return {
            height: 32,
            padding: '0 12px',
            fontSize: '0.75rem',
            minWidth: 'auto',
          };
        case 'medium':
          return {
            height: 40,
            padding: '0 16px',
            fontSize: '0.875rem',
            minWidth: 64,
          };
        case 'large':
          return {
            height: 48,
            padding: '0 24px',
            fontSize: '1rem',
            minWidth: 80,
          };
        default:
          return {};
      }
    };

    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        sx={{
          ...getVariantStyles(),
          ...getSizeStyles(),
          borderRadius: tokens.borderRadius.md,
          textTransform: 'none',
          fontWeight: 500,
          boxShadow: 'none',
          transition: 'all 0.15s ease',
          '&.Mui-disabled': {
            backgroundColor: tokens.colors.grey[100],
            color: tokens.colors.grey[400],
            border: `1px solid ${tokens.colors.grey[200]}`,
            cursor: 'not-allowed',
          },
          ...sx,
        }}
        {...props}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading && (
            <CircularProgress
              size={size === 'small' ? 12 : size === 'large' ? 16 : 14}
              sx={{
                color: 'currentColor',
                marginRight: children ? 0.5 : 0,
              }}
            />
          )}
          {!loading && leftIcon && (
            <Box
              component="span"
              sx={{
                display: 'flex',
                alignItems: 'center',
                fontSize: size === 'small' ? '1rem' : size === 'large' ? '1.25rem' : '1.125rem',
              }}
            >
              {leftIcon}
            </Box>
          )}
          {children && (
            <Box component="span" sx={{ lineHeight: 1 }}>
              {children}
            </Box>
          )}
          {!loading && rightIcon && (
            <Box
              component="span"
              sx={{
                display: 'flex',
                alignItems: 'center',
                fontSize: size === 'small' ? '1rem' : size === 'large' ? '1.25rem' : '1.125rem',
              }}
            >
              {rightIcon}
            </Box>
          )}
        </Box>
      </Button>
    );
  }
);

IntercomButton.displayName = 'IntercomButton';
