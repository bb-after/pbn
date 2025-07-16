import { createTheme, ThemeOptions } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

// Intercom-inspired color palette
const intercomColors = {
  primary: {
    50: '#E8F4FD',
    100: '#C6E2FA',
    200: '#94CBF5',
    300: '#5AAFEF',
    400: '#338DF1', // Intercom's signature blue
    500: '#1F7CE8',
    600: '#1A6BDC',
    700: '#1557CC',
    800: '#1249B8',
    900: '#0D359A',
  },
  secondary: {
    50: '#F7F8FA',
    100: '#EBEEF2',
    200: '#D6DBE1',
    300: '#B8C0CB',
    400: '#9AA4B2',
    500: '#7C8798',
    600: '#5D6B7D',
    700: '#45536B',
    800: '#2D3B52',
    900: '#1C2B3F',
  },
  success: {
    50: '#E8F8F5',
    100: '#C6EDDE',
    200: '#9DDFC3',
    300: '#6BCFA7',
    400: '#4AC494',
    500: '#2DB881',
    600: '#26A876',
    700: '#1E9467',
    800: '#178258',
    900: '#0D633F',
  },
  warning: {
    50: '#FFF8E1',
    100: '#FFECB3',
    200: '#FFE082',
    300: '#FFD54F',
    400: '#FFCA28',
    500: '#FFC107',
    600: '#FFB300',
    700: '#FFA000',
    800: '#FF8F00',
    900: '#FF6F00',
  },
  error: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#F44336',
    600: '#E53935',
    700: '#D32F2F',
    800: '#C62828',
    900: '#B71C1C',
  },
  grey: {
    50: '#FAFBFC',
    100: '#F4F6F8',
    200: '#E4E7EB',
    300: '#D1D6DB',
    400: '#B0B7C3',
    500: '#9DA4AE',
    600: '#6B7684',
    700: '#4A5568',
    800: '#2D3748',
    900: '#1A202C',
  },
};

// Intercom-inspired shadows
const intercomShadows = {
  0: 'none',
  1: '0 1px 2px rgba(0, 0, 0, 0.05)',
  2: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
  3: '0 4px 6px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06)',
  4: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
  5: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
  6: '0 25px 50px rgba(0, 0, 0, 0.15), 0 10px 15px rgba(0, 0, 0, 0.07)',
  7: '0 35px 60px rgba(0, 0, 0, 0.2), 0 15px 20px rgba(0, 0, 0, 0.08)',
  8: '0 40px 70px rgba(0, 0, 0, 0.25), 0 20px 25px rgba(0, 0, 0, 0.1)',
};

// Intercom-inspired typography
const intercomTypography = {
  fontFamily:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
  fontSize: 14,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 600,
  h1: {
    fontSize: '2.5rem',
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.25,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5,
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  body1: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.4,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.4,
    textTransform: 'none' as const,
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 1.4,
  },
  overline: {
    fontSize: '0.625rem',
    fontWeight: 500,
    lineHeight: 1.4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  },
};

// Intercom-inspired spacing
const intercomSpacing = 8;

// Intercom-inspired border radius
const intercomBorderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
};

export const createIntercomTheme = (mode: PaletteMode = 'light'): ThemeOptions => {
  const isDark = mode === 'dark';

  return {
    palette: {
      mode,
      primary: {
        main: intercomColors.primary[400],
        light: intercomColors.primary[300],
        dark: intercomColors.primary[600],
        contrastText: '#ffffff',
      },
      secondary: {
        main: intercomColors.secondary[500],
        light: intercomColors.secondary[300],
        dark: intercomColors.secondary[700],
        contrastText: '#ffffff',
      },
      success: {
        main: intercomColors.success[500],
        light: intercomColors.success[300],
        dark: intercomColors.success[700],
        contrastText: '#ffffff',
      },
      warning: {
        main: intercomColors.warning[500],
        light: intercomColors.warning[300],
        dark: intercomColors.warning[700],
        contrastText: '#ffffff',
      },
      error: {
        main: intercomColors.error[500],
        light: intercomColors.error[300],
        dark: intercomColors.error[700],
        contrastText: '#ffffff',
      },
      grey: intercomColors.grey,
      background: {
        default: isDark ? intercomColors.grey[900] : intercomColors.grey[50],
        paper: isDark ? intercomColors.grey[800] : '#ffffff',
      },
      text: {
        primary: isDark ? intercomColors.grey[50] : intercomColors.grey[900],
        secondary: isDark ? intercomColors.grey[400] : intercomColors.grey[600],
        disabled: isDark ? intercomColors.grey[600] : intercomColors.grey[400],
      },
      divider: isDark ? intercomColors.grey[700] : intercomColors.grey[200],
    },
    typography: intercomTypography,
    spacing: intercomSpacing,
    shape: {
      borderRadius: intercomBorderRadius.md,
    },
    shadows: intercomShadows as any,
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: intercomBorderRadius.md,
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: intercomShadows[2],
            },
            '&:focus': {
              boxShadow: `0 0 0 3px ${intercomColors.primary[100]}`,
            },
          },
          contained: {
            backgroundColor: intercomColors.primary[400],
            color: '#ffffff',
            '&:hover': {
              backgroundColor: intercomColors.primary[500],
            },
            '&:active': {
              backgroundColor: intercomColors.primary[600],
            },
          },
          outlined: {
            borderColor: intercomColors.grey[300],
            color: intercomColors.grey[700],
            '&:hover': {
              borderColor: intercomColors.grey[400],
              backgroundColor: intercomColors.grey[50],
            },
          },
          text: {
            color: intercomColors.grey[700],
            '&:hover': {
              backgroundColor: intercomColors.grey[100],
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: intercomBorderRadius.lg,
            boxShadow: intercomShadows[3],
            border: `1px solid ${intercomColors.grey[200]}`,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: intercomBorderRadius.md,
              backgroundColor: isDark ? intercomColors.grey[800] : '#ffffff',
              color: isDark ? intercomColors.grey[50] : intercomColors.grey[900],
              '& fieldset': {
                borderColor: isDark ? intercomColors.grey[600] : intercomColors.grey[300],
              },
              '&:hover fieldset': {
                borderColor: isDark ? intercomColors.grey[500] : intercomColors.grey[400],
              },
              '&.Mui-focused fieldset': {
                borderColor: intercomColors.primary[400],
                borderWidth: '2px',
              },
            },
            '& .MuiInputLabel-root': {
              color: intercomColors.grey[600],
              fontSize: '0.875rem',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: intercomBorderRadius.md,
            boxShadow: intercomShadows[2],
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#ffffff',
            color: intercomColors.grey[800],
            boxShadow: intercomShadows[1],
            borderBottom: `1px solid ${intercomColors.grey[200]}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? intercomColors.grey[800] : '#ffffff',
            borderRight: `1px solid ${intercomColors.grey[200]}`,
            boxShadow: intercomShadows[3],
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            borderRadius: intercomBorderRadius.md,
            margin: '2px 8px',
            '&:hover': {
              backgroundColor: intercomColors.grey[100],
            },
            '&.Mui-selected': {
              backgroundColor: intercomColors.primary[50],
              color: intercomColors.primary[700],
              '&:hover': {
                backgroundColor: intercomColors.primary[100],
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: intercomBorderRadius.xl,
            fontSize: '0.75rem',
            fontWeight: 500,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: intercomBorderRadius.md,
            boxShadow: intercomShadows[2],
          },
        },
      },
    },
  };
};

export const intercomTheme = createTheme(createIntercomTheme());
export const intercomDarkTheme = createTheme(createIntercomTheme('dark'));

// Custom design tokens for use throughout the app
export const tokens = {
  colors: intercomColors,
  shadows: intercomShadows,
  borderRadius: intercomBorderRadius,
  spacing: intercomSpacing,
};
