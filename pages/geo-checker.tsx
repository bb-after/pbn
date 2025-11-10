import React from 'react';
import { IntercomLayout } from '../components/ui';
import GeoChecker from '../components/GeoChecker';
import { Box, Typography, alpha, Avatar } from '@mui/material';
import { MapPin, Target, BarChart3, TrendingUp, Search, Brain } from 'lucide-react';
import useValidateUserToken from '../hooks/useValidateUserToken';
import UnauthorizedAccess from '../components/UnauthorizedAccess';

export default function GeoCheckerPage() {
  const { token } = useValidateUserToken();

  if (!token) {
    return <UnauthorizedAccess />;
  }

  return (
    <IntercomLayout
      title="GEO Checker"
      breadcrumbs={[
        { label: 'GEO Analysis', icon: MapPin },
        { label: 'GeoIntel Monitor', icon: Target },
      ]}
    >
      {/* Modern Hero Section */}
      {/* <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          p: 4,
          mb: 4,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.08"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.3,
          },
        }}
      >
        <Box position="relative" zIndex={2}>
          <Box display="flex" alignItems="center" gap={3} mb={2}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: alpha('#fff', 0.2),
                border: `3px solid ${alpha('#fff', 0.3)}`,
              }}
            >
              <MapPin size={32} color="white" />
            </Avatar>
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                  mb: 0.5,
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                GEO Checker
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  opacity: 0.9,
                  fontWeight: 400,
                  fontSize: '1.1rem',
                }}
              >
                Generative Engine Optimization sentiment analysis and competitive intelligence
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={2} mt={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <Search size={20} />
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Smart Analysis
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <TrendingUp size={20} />
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Market Intelligence
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <BarChart3 size={20} />
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Data Insights
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Brain size={20} />
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                AI-Powered
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box> */}

      <GeoChecker />
    </IntercomLayout>
  );
}
