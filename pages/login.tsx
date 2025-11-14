import React, { useEffect } from 'react';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useRouter } from 'next/router';
import axios from 'axios';
import { keyframes } from '@mui/system';
import { tokens } from '../theme/intercom-theme';
import { Psychology as BrainIcon } from '@mui/icons-material';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// Fast sprint-like animation for the "AI" label - like a runner stopping abruptly
const aiSprintIn = keyframes`
  0% { opacity: 0; transform: translateX(-60px) scale(0.9); }
  70% { opacity: 1; transform: translateX(3px) scale(1.05); }
  85% { opacity: 1; transform: translateX(-1px) scale(1.02); }
  100% { opacity: 1; transform: translateX(0) scale(1); }
`;

// Logo slide-in from the left after AI has settled
const logoSlideIn = keyframes`
  0% { opacity: 0; transform: scaleX(-1) translateX(30px) scale(0.8); }
  60% { opacity: 1; transform: scaleX(-1) translateX(-2px) scale(1.1); }
  100% { opacity: 1; transform: scaleX(-1) translateX(0) scale(1); }
`;

// Fade in animation for Millbrook text after AI settles
const millbrookFadeIn = keyframes`
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0px); }
`;

// High-tech background animations - smooth continuous rotation without jumping
const continuousRotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const continuousRotateReverse = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
`;

const floatingShape1 = keyframes`
  0% { opacity: 0.3; transform: translateY(0px) translateX(0px); }
  25% { opacity: 0.3; transform: translateY(-30px) translateX(20px); }
  50% { opacity: 0.3; transform: translateY(-20px) translateX(-15px); }
  75% { opacity: 0.3; transform: translateY(10px) translateX(25px); }
  100% { opacity: 0.3; transform: translateY(0px) translateX(0px); }
`;

const floatingShape2 = keyframes`
  0% { opacity: 0.25; transform: translateX(0px) translateY(0px) scale(1); }
  33% { opacity: 0.25; transform: translateX(30px) translateY(-20px) scale(1.1); }
  66% { opacity: 0.25; transform: translateX(-20px) translateY(15px) scale(0.9); }
  100% { opacity: 0.25; transform: translateX(0px) translateY(0px) scale(1); }
`;

const floatingShape3 = keyframes`
  0% { opacity: 0.35; transform: translateX(0px) translateY(0px) scale(0.9); }
  40% { opacity: 0.35; transform: translateX(-25px) translateY(-30px) scale(1.2); }
  70% { opacity: 0.35; transform: translateX(20px) translateY(10px) scale(1.1); }
  100% { opacity: 0.35; transform: translateX(0px) translateY(0px) scale(0.9); }
`;

const floatingShape4 = keyframes`
  0% { opacity: 0.28; transform: translateY(0px) translateX(0px) scale(1); }
  30% { opacity: 0.28; transform: translateY(-15px) translateX(-30px) scale(1.1); }
  60% { opacity: 0.28; transform: translateY(20px) translateX(15px) scale(0.95); }
  100% { opacity: 0.28; transform: translateY(0px) translateX(0px) scale(1); }
`;

const pulsingGlow = keyframes`
  0% { opacity: 0.2; transform: translateX(0px) translateY(0px) scale(1); }
  25% { opacity: 0.2; transform: translateX(10px) translateY(-5px) scale(1.05); }
  50% { opacity: 0.2; transform: translateX(-8px) translateY(8px) scale(1.1); }
  75% { opacity: 0.2; transform: translateX(12px) translateY(-3px) scale(0.95); }
  100% { opacity: 0.2; transform: translateX(0px) translateY(0px) scale(1); }
`;

const floatingShape5 = keyframes`
  0% { opacity: 0.32; transform: translateX(0px) translateY(0px) scale(1); }
  20% { opacity: 0.32; transform: translateX(-40px) translateY(25px) scale(1.15); }
  40% { opacity: 0.32; transform: translateX(35px) translateY(-10px) scale(0.85); }
  60% { opacity: 0.32; transform: translateX(-15px) translateY(-35px) scale(1.25); }
  80% { opacity: 0.32; transform: translateX(20px) translateY(30px) scale(0.95); }
  100% { opacity: 0.32; transform: translateX(0px) translateY(0px) scale(1); }
`;

const floatingShape6 = keyframes`
  0% { opacity: 0.26; transform: translateX(0px) translateY(0px) scaleX(1) scaleY(1); }
  35% { opacity: 0.26; transform: translateX(25px) translateY(-40px) scaleX(1.2) scaleY(0.8); }
  70% { opacity: 0.26; transform: translateX(-30px) translateY(20px) scaleX(0.9) scaleY(1.3); }
  100% { opacity: 0.26; transform: translateX(0px) translateY(0px) scaleX(1) scaleY(1); }
`;

const orbitalMotion = keyframes`
  0% { opacity: 0.24; transform: translateX(0px) translateY(0px); }
  25% { opacity: 0.24; transform: translateX(50px) translateY(0px); }
  50% { opacity: 0.24; transform: translateX(35px) translateY(35px); }
  75% { opacity: 0.24; transform: translateX(0px) translateY(50px); }
  100% { opacity: 0.24; transform: translateX(0px) translateY(0px); }
`;

const floatingShape7 = keyframes`
  0% { opacity: 0.29; transform: translateX(0px) translateY(0px) skewX(0deg); }
  25% { opacity: 0.29; transform: translateX(-20px) translateY(-45px) skewX(15deg); }
  50% { opacity: 0.29; transform: translateX(30px) translateY(-25px) skewX(-10deg); }
  75% { opacity: 0.29; transform: translateX(-10px) translateY(35px) skewX(20deg); }
  100% { opacity: 0.29; transform: translateX(0px) translateY(0px) skewX(0deg); }
`;

const floatingShape8 = keyframes`
  0% { opacity: 0.27; transform: translateX(0px) translateY(0px) scale(1); }
  20% { opacity: 0.27; transform: translateX(45px) translateY(-15px) scale(1.3); }
  40% { opacity: 0.27; transform: translateX(20px) translateY(40px) scale(0.7); }
  60% { opacity: 0.27; transform: translateX(-35px) translateY(10px) scale(1.1); }
  80% { opacity: 0.27; transform: translateX(-15px) translateY(-30px) scale(0.9); }
  100% { opacity: 0.27; transform: translateX(0px) translateY(0px) scale(1); }
`;

const spiralMotion = keyframes`
  0% { opacity: 0.31; transform: translateX(0px) translateY(0px) scale(0.8); }
  25% { opacity: 0.31; transform: translateX(30px) translateY(-30px) scale(1.2); }
  50% { opacity: 0.31; transform: translateX(0px) translateY(-60px) scale(1.0); }
  75% { opacity: 0.31; transform: translateX(-30px) translateY(-30px) scale(1.1); }
  100% { opacity: 0.31; transform: translateX(0px) translateY(0px) scale(0.8); }
`;

const morphingShape = keyframes`
  0% { opacity: 0.33; transform: translateX(0px) translateY(0px) scaleX(1) scaleY(1); }
  33% { opacity: 0.33; transform: translateX(25px) translateY(-20px) scaleX(1.5) scaleY(0.6); }
  66% { opacity: 0.33; transform: translateX(-20px) translateY(25px) scaleX(0.7) scaleY(1.8); }
  100% { opacity: 0.33; transform: translateX(0px) translateY(0px) scaleX(1) scaleY(1); }
`;

const wavyMotion = keyframes`
  0% { opacity: 0.23; transform: translateX(0px) translateY(0px); }
  12.5% { opacity: 0.23; transform: translateX(20px) translateY(-10px); }
  25% { opacity: 0.23; transform: translateX(35px) translateY(5px); }
  37.5% { opacity: 0.23; transform: translateX(25px) translateY(25px); }
  50% { opacity: 0.23; transform: translateX(0px) translateY(30px); }
  62.5% { opacity: 0.23; transform: translateX(-25px) translateY(25px); }
  75% { opacity: 0.23; transform: translateX(-35px) translateY(5px); }
  87.5% { opacity: 0.23; transform: translateX(-20px) translateY(-10px); }
  100% { opacity: 0.23; transform: translateX(0px) translateY(0px); }
`;

const Login: React.FC = () => {
  const router = useRouter();
  const { error, status } = router.query;

  useEffect(() => {
    // Check if user is already logged in
    const checkExistingAuth = async () => {
      try {
        await axios.get('/api/auth/me');
        // If we get here, user is already authenticated
        const redirectPath = localStorage.getItem('redirectAfterLogin') || '/';
        localStorage.removeItem('redirectAfterLogin');
        router.push(redirectPath);
      } catch (err) {
        // User not authenticated, stay on login page
      }
    };

    checkExistingAuth();
  }, [router]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const response = await axios.post('/api/auth/google', {
        idToken: credentialResponse.credential,
      });

      if (response.data.user) {
        // Redirect to intended page or dashboard
        const redirectPath = localStorage.getItem('redirectAfterLogin') || '/';
        localStorage.removeItem('redirectAfterLogin');
        router.push(redirectPath);
      }
    } catch (error: any) {
      console.error('Login failed:', error);

      if (error.response?.status === 403) {
        router.push('/login?error=domain_not_allowed&status=403');
      } else {
        router.push('/login?error=login_failed&status=500');
      }
    }
  };

  const handleGoogleError = () => {
    console.error('Google login failed');
    router.push('/login?error=google_login_failed&status=400');
  };

  const getErrorMessage = () => {
    if (!error) return null;

    switch (error) {
      case 'domain_not_allowed':
        return 'Access denied. Only work email addresses allowed.';
      case 'login_failed':
        return 'Login failed. Please try again.';
      case 'google_login_failed':
        return 'Google login failed. Please try again.';
      case 'not_authenticated':
        return 'Please log in to access this page.';
      case 'token_expired':
        return 'Your session has expired. Please log in again.';
      default:
        return 'An error occurred during login. Please try again.';
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="grey.50"
        p={3}
        position="relative"
        overflow="hidden"
      >
        {/* Animated Background Shapes */}
        <Box
          position="absolute"
          top="10%"
          left="15%"
          width="120px"
          height="120px"
          borderRadius="50%"
          border={`2px solid ${tokens.colors.primary[200]}`}
          sx={{
            animation: `${floatingShape1} 8s ease-in-out infinite, ${continuousRotate} 12s linear infinite`,
            animationDelay: '0s',
          }}
        />

        <Box
          position="absolute"
          top="20%"
          right="10%"
          width="0"
          height="0"
          borderLeft="60px solid transparent"
          borderRight="60px solid transparent"
          borderBottom={`80px solid ${tokens.colors.primary[100]}`}
          sx={{
            animation: `${floatingShape2} 12s ease-in-out infinite, ${continuousRotateReverse} 15s linear infinite`,
            animationDelay: '2s',
          }}
        />

        <Box
          position="absolute"
          bottom="25%"
          left="8%"
          width="100px"
          height="100px"
          bgcolor={tokens.colors.primary[50]}
          sx={{
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            animation: `${floatingShape3} 10s ease-in-out infinite`,
            animationDelay: '4s',
          }}
        />

        <Box
          position="absolute"
          bottom="15%"
          right="20%"
          width="80px"
          height="80px"
          bgcolor={tokens.colors.primary[100]}
          borderRadius="20px"
          sx={{
            animation: `${floatingShape4} 15s ease-in-out infinite, ${continuousRotate} 18s linear infinite`,
            animationDelay: '1s',
          }}
        />

        <Box
          position="absolute"
          top="50%"
          left="5%"
          width="150px"
          height="2px"
          bgcolor={tokens.colors.primary[100]}
          sx={{
            animation: `${pulsingGlow} 6s ease-in-out infinite`,
            animationDelay: '3s',
          }}
        />

        <Box
          position="absolute"
          top="30%"
          right="25%"
          width="60px"
          height="60px"
          border={`1px solid ${tokens.colors.primary[200]}`}
          sx={{
            clipPath:
              'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
            animation: `${floatingShape1} 11s ease-in-out infinite, ${continuousRotateReverse} 20s linear infinite`,
            animationDelay: '5s',
          }}
        />

        <Box
          position="absolute"
          bottom="40%"
          right="5%"
          width="200px"
          height="1px"
          bgcolor={tokens.colors.primary[100]}
          sx={{
            transform: 'rotate(-30deg)',
            animation: `${pulsingGlow} 9s ease-in-out infinite`,
            animationDelay: '7s',
          }}
        />

        {/* Additional shapes for more dynamic background */}
        <Box
          position="absolute"
          top="35%"
          left="3%"
          width="90px"
          height="90px"
          bgcolor={tokens.colors.primary[300]}
          sx={{
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            animation: `${floatingShape5} 14s ease-in-out infinite`,
            animationDelay: '6s',
          }}
        />

        <Box
          position="absolute"
          top="60%"
          right="12%"
          width="70px"
          height="40px"
          bgcolor={tokens.colors.primary[200]}
          borderRadius="50%"
          sx={{
            animation: `${floatingShape6} 13s ease-in-out infinite`,
            animationDelay: '8s',
          }}
        />

        <Box
          position="absolute"
          bottom="60%"
          left="25%"
          width="25px"
          height="25px"
          borderRadius="50%"
          bgcolor={tokens.colors.primary[200]}
          sx={{
            animation: `${orbitalMotion} 16s linear infinite`,
            animationDelay: '3s',
          }}
        />

        <Box
          position="absolute"
          top="70%"
          left="12%"
          width="140px"
          height="3px"
          bgcolor={tokens.colors.primary[900]}
          sx={{
            transform: 'rotate(65deg)',
            animation: `${pulsingGlow} 7s ease-in-out infinite`,
            animationDelay: '9s',
          }}
        />

        <Box
          position="absolute"
          bottom="70%"
          right="30%"
          width="50px"
          height="50px"
          border={`2px solid ${tokens.colors.primary[200]}`}
          borderRadius="8px"
          sx={{
            transform: 'rotate(30deg)',
            animation: `${floatingShape4} 11s ease-in-out infinite`,
            animationDelay: '4.5s',
          }}
        />

        <Box
          position="absolute"
          top="45%"
          right="35%"
          width="35px"
          height="35px"
          bgcolor={tokens.colors.primary[100]}
          sx={{
            clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
            animation: `${floatingShape3} 12s ease-in-out infinite`,
            animationDelay: '10s',
          }}
        />

        {/* Additional wave of high-tech shapes */}
        <Box
          position="absolute"
          top="15%"
          left="40%"
          width="65px"
          height="65px"
          bgcolor={tokens.colors.primary[100]}
          sx={{
            clipPath:
              'polygon(50% 0%, 80% 10%, 100% 35%, 100% 70%, 80% 90%, 50% 100%, 20% 90%, 0% 70%, 0% 35%, 20% 10%)',
            animation: `${floatingShape7} 17s ease-in-out infinite`,
            animationDelay: '11s',
          }}
        />

        <Box
          position="absolute"
          bottom="25%"
          left="45%"
          width="45px"
          height="45px"
          border={`3px solid ${tokens.colors.primary[200]}`}
          borderRadius="50%"
          sx={{
            animation: `${floatingShape8} 20s ease-in-out infinite`,
            animationDelay: '2.5s',
          }}
        />

        <Box
          position="absolute"
          top="80%"
          right="40%"
          width="55px"
          height="20px"
          bgcolor={tokens.colors.primary[100]}
          borderRadius="10px"
          sx={{
            animation: `${spiralMotion} 18s ease-in-out infinite`,
            animationDelay: '12s',
          }}
        />

        <Box
          position="absolute"
          bottom="35%"
          right="8%"
          width="40px"
          height="40px"
          bgcolor={tokens.colors.primary[100]}
          sx={{
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
            animation: `${morphingShape} 15s ease-in-out infinite`,
            animationDelay: '13s',
          }}
        />

        <Box
          position="absolute"
          top="25%"
          left="50%"
          width="30px"
          height="30px"
          bgcolor={tokens.colors.primary[100]}
          borderRadius="3px"
          sx={{
            animation: `${wavyMotion} 22s ease-in-out infinite`,
            animationDelay: '5.5s',
          }}
        />

        <Box
          position="absolute"
          bottom="50%"
          left="35%"
          width="180px"
          height="2px"
          bgcolor={tokens.colors.primary[100]}
          sx={{
            transform: 'rotate(15deg)',
            animation: `${pulsingGlow} 8s ease-in-out infinite`,
            animationDelay: '14s',
          }}
        />

        <Box
          position="absolute"
          top="55%"
          left="8%"
          width="75px"
          height="75px"
          border={`1px solid ${tokens.colors.primary[200]}`}
          sx={{
            clipPath:
              'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            animation: `${floatingShape5} 19s ease-in-out infinite`,
            animationDelay: '15s',
          }}
        />

        <Box
          position="absolute"
          bottom="80%"
          right="18%"
          width="20px"
          height="20px"
          bgcolor={tokens.colors.primary[100]}
          borderRadius="50%"
          sx={{
            animation: `${orbitalMotion} 14s linear infinite`,
            animationDelay: '16s',
          }}
        />

        <Box
          position="absolute"
          top="90%"
          left="30%"
          width="95px"
          height="4px"
          bgcolor={tokens.colors.primary[100]}
          sx={{
            transform: 'rotate(-45deg)',
            animation: `${pulsingGlow} 10s ease-in-out infinite`,
            animationDelay: '17s',
          }}
        />

        <Box
          position="absolute"
          bottom="10%"
          right="45%"
          width="60px"
          height="35px"
          bgcolor={tokens.colors.primary[100]}
          borderRadius="15px"
          sx={{
            animation: `${floatingShape6} 16s ease-in-out infinite`,
            animationDelay: '18s',
          }}
        />
        <Paper
          elevation={3}
          sx={{
            p: 6,
            maxWidth: 520,
            width: '100%',
            textAlign: 'center',
            position: 'relative',
            zIndex: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            pb: 10,
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
            <BrainIcon
              sx={{
                fontSize: '3rem',
                color: tokens.colors.primary[400],
                mr: 0.5,
                opacity: 0,
                // Transform handled in keyframes to maintain flip during animation
                animation: `${logoSlideIn} 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                animationDelay: '0.2s', // Brain appears first
                willChange: 'transform, opacity',
              }}
            />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                fontSize: '3rem',
              }}
            >
              Status{' '}
              <Box
                component="span"
                sx={{
                  color: tokens.colors.primary[400],
                  display: 'inline-block',
                  opacity: 0,
                  animation: `${aiSprintIn} 400ms cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards`,
                  animationDelay: '0.8s', // AI sprints in after brain has appeared
                  willChange: 'transform, opacity',
                }}
              >
                AI
              </Box>
            </Typography>
          </Box>

          <Typography
            variant="body1"
            color="textSecondary"
            sx={{
              mb: 8,
              opacity: 0,
              animation: `${millbrookFadeIn} 500ms ease-out forwards`,
              animationDelay: '1.4s', // After AI animation completes (0.8s + 0.4s + 0.2s buffer)
            }}
          >
            A Millbrook Companies&reg; product.
          </Typography>

          {getErrorMessage() && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {getErrorMessage()}
            </Alert>
          )}

          <Box display="flex" justifyContent="center">
            <Box
              sx={{
                transform: 'scale(1.3)',
                transformOrigin: 'center',
                '& iframe': {
                  borderRadius: '8px !important',
                },
                '& div[role="button"]': {
                  borderRadius: '8px !important',
                  fontSize: '18px !important',
                  fontWeight: '500 !important',
                  padding: '14px 24px !important',
                  minHeight: '50px !important',
                },
              }}
            >
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                theme="filled_blue"
                size="large"
                text="signin_with"
              />
            </Box>
          </Box>
        </Paper>
      </Box>
    </GoogleOAuthProvider>
  );
};

export default Login;
