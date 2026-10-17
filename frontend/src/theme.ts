import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7C3AED', // Vibrant purple
      light: '#9F67FF',
      dark: '#5B21B6',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#10B981', // Emerald green
      light: '#34D399',
      dark: '#059669',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#EF4444', // Bright red
      light: '#F87171',
      dark: '#DC2626',
    },
    warning: {
      main: '#F59E0B', // Amber
      light: '#FBBF24',
      dark: '#D97706',
    },
    success: {
      main: '#10B981', // Emerald
      light: '#34D399',
      dark: '#059669',
    },
    background: {
      default: '#0F172A', // Dark blue-gray
      paper: '#1E293B', // Slightly lighter
    },
    text: {
      primary: '#F1F5F9',
      secondary: '#94A3B8',
    },
    divider: 'rgba(148, 163, 184, 0.12)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E293B',
          borderRadius: 16,
          border: '1px solid rgba(148, 163, 184, 0.12)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 24,
          '&:last-child': {
            paddingBottom: 24,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#0F172A',
            borderRadius: 10,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: '#1E293B',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#7C3AED',
              },
            },
            '&.Mui-focused': {
              backgroundColor: '#1E293B',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#7C3AED',
                borderWidth: 2,
              },
            },
          },
          '& .MuiInputLabel-root': {
            color: '#94A3B8',
            '&.Mui-focused': {
              color: '#7C3AED',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: '#0F172A',
          borderRadius: 10,
          '&:hover': {
            backgroundColor: '#1E293B',
          },
          '&.Mui-focused': {
            backgroundColor: '#1E293B',
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(124, 58, 237, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(124, 58, 237, 0.16)',
            '&:hover': {
              backgroundColor: 'rgba(124, 58, 237, 0.24)',
            },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 24px',
          fontSize: '1rem',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px rgba(124, 58, 237, 0.3)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #7C3AED 0%, #9F67FF 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #9F67FF 0%, #7C3AED 100%)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          padding: 0,
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          color: '#94A3B8',
          '&.Mui-active': {
            color: '#7C3AED',
            fontWeight: 600,
          },
          '&.Mui-completed': {
            color: '#10B981',
          },
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: '#334155',
          '&.Mui-active': {
            color: '#7C3AED',
          },
          '&.Mui-completed': {
            color: '#10B981',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: '#334155',
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(148, 163, 184, 0.12)',
        },
        standardSuccess: {
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          color: '#34D399',
        },
        standardWarning: {
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: '#FBBF24',
        },
        standardError: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#F87171',
        },
        standardInfo: {
          backgroundColor: 'rgba(124, 58, 237, 0.1)',
          color: '#9F67FF',
        },
      },
    },
  },
});