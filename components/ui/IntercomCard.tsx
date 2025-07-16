import React from 'react';
import { Card, CardProps, Box, Typography, IconButton, Divider } from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { tokens } from '../../theme/intercom-theme';

export interface IntercomCardProps extends CardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showMoreButton?: boolean;
  onMoreClick?: () => void;
  padding?: 'none' | 'small' | 'medium' | 'large';
  borderless?: boolean;
}

export const IntercomCard: React.FC<IntercomCardProps> = ({
  title,
  subtitle,
  actions,
  showMoreButton = false,
  onMoreClick,
  padding = 'medium',
  borderless = false,
  children,
  sx,
  ...props
}) => {
  const getPaddingValue = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'small':
        return 2;
      case 'medium':
        return 3;
      case 'large':
        return 4;
      default:
        return 3;
    }
  };

  const hasHeader = title || subtitle || actions || showMoreButton;

  return (
    <Card
      sx={{
        borderRadius: tokens.borderRadius.lg,
        boxShadow: borderless ? 'none' : tokens.shadows[2],
        border: borderless ? 'none' : '1px solid',
        borderColor: borderless ? 'transparent' : 'divider',
        backgroundColor: 'background.paper',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: borderless ? 'none' : tokens.shadows[3],
        },
        ...sx,
      }}
      {...props}
    >
      {hasHeader && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: getPaddingValue(),
            py: 2,
            borderBottom: `1px solid ${tokens.colors.grey[100]}`,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {title && (
              <Typography
                variant="h6"
                sx={{
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: tokens.colors.grey[900],
                  lineHeight: 1.4,
                  mb: subtitle ? 0.5 : 0,
                }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography
                variant="body2"
                sx={{
                  color: tokens.colors.grey[600],
                  fontSize: '0.875rem',
                  lineHeight: 1.4,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
            {actions}
            {showMoreButton && (
              <IconButton
                size="small"
                onClick={onMoreClick}
                sx={{
                  color: tokens.colors.grey[500],
                  '&:hover': {
                    backgroundColor: tokens.colors.grey[100],
                    color: tokens.colors.grey[700],
                  },
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          p: padding === 'none' ? 0 : getPaddingValue(),
        }}
      >
        {children}
      </Box>
    </Card>
  );
};

// Pre-configured card variants
export const IntercomStatsCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  onClick?: () => void;
}> = ({ title, value, subtitle, icon, trend, onClick }) => {
  const getTrendColor = () => {
    if (!trend) return tokens.colors.grey[500];
    switch (trend.direction) {
      case 'up':
        return tokens.colors.success[500];
      case 'down':
        return tokens.colors.error[500];
      default:
        return tokens.colors.grey[500];
    }
  };

  return (
    <IntercomCard
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick
          ? {
              transform: 'translateY(-2px)',
              boxShadow: tokens.shadows[4],
            }
          : {},
        transition: 'all 0.2s ease',
      }}
      onClick={onClick}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {icon && (
          <Box
            sx={{
              p: 1.5,
              borderRadius: tokens.borderRadius.md,
              backgroundColor: tokens.colors.primary[50],
              color: tokens.colors.primary[600],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              color: tokens.colors.grey[600],
              fontSize: '0.875rem',
              fontWeight: 500,
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontSize: '2rem',
              fontWeight: 700,
              color: tokens.colors.grey[900],
              lineHeight: 1.2,
              mb: subtitle || trend ? 0.5 : 0,
            }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: tokens.colors.grey[500],
                fontSize: '0.75rem',
                display: 'block',
                mb: trend ? 0.5 : 0,
              }}
            >
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Typography
              variant="caption"
              sx={{
                color: getTrendColor(),
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              {trend.value}
            </Typography>
          )}
        </Box>
      </Box>
    </IntercomCard>
  );
};

export const IntercomEmptyCard: React.FC<{
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, description, icon, action }) => (
  <IntercomCard padding="large">
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        py: 6,
      }}
    >
      {icon && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: '50%',
            backgroundColor: tokens.colors.grey[100],
            color: tokens.colors.grey[400],
            fontSize: '2rem',
          }}
        >
          {icon}
        </Box>
      )}
      <Typography
        variant="h6"
        sx={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: tokens.colors.grey[900],
          mb: 1,
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: tokens.colors.grey[600],
          fontSize: '0.875rem',
          lineHeight: 1.5,
          maxWidth: 400,
          mb: action ? 3 : 0,
        }}
      >
        {description}
      </Typography>
      {action && <Box>{action}</Box>}
    </Box>
  </IntercomCard>
);
