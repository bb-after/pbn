import React, { useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/router';
import useValidateUserToken from '../../hooks/useValidateUserToken';

// Lucide Icons for modern aesthetic
import {
  Brain,
  Sparkles,
  Globe,
  FileText,
  Users,
  BarChart3,
  Settings,
  Target,
  Zap,
  Activity,
  TrendingUp,
  Shield,
  Search,
  Bell,
  HelpCircle,
  User,
  Home,
  ChevronRight,
  ChevronDown,
  Plus,
  Building2,
  Layers,
  Map,
  Wrench,
  CreditCard,
  Camera,
  Bookmark,
  ExternalLink,
  Database,
} from 'lucide-react';

import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
  InputBase,
  Paper,
  Collapse,
  useTheme,
  useMediaQuery,
  alpha,
  Card,
  CardContent,
  Chip,
  Stack,
} from '@mui/material';

// Import React Icons as fallbacks
import { Menu as MenuIcon } from '@mui/icons-material';

import { tokens } from '../../theme/intercom-theme';
import { keyframes } from '@mui/system';

interface NavigationItem {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  badge?: number;
  children?: NavigationItem[];
}

interface IntercomLayoutProps {
  children: ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string; icon?: any }>;
  actions?: ReactNode;
}

// Subtle slide-and-pop-in animation for the "AI" label
const aiPopIn = keyframes`
  0% { opacity: 0; transform: translateX(-8px) scale(0.98); }
  60% { opacity: 1; transform: translateX(0) scale(1.02); }
  100% { opacity: 1; transform: translateX(0) scale(1); }
`;

const DRAWER_WIDTH = 320;

// Enhanced gradient animation
const gradientFlow = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// Floating animation for AI badge
const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-2px); }
`;

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <BarChart3 size={20} />,
    href: '/',
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: <Users size={20} />,
    children: [
      {
        id: 'view-clients',
        label: 'View Clients',
        icon: <Users size={18} />,
        href: '/clients',
      },
      {
        id: 'client-approval',
        label: 'Approval Desk',
        icon: <Shield size={18} />,
        href: '/client-approval',
      },
      {
        id: 'content-compass',
        label: 'Content Compass',
        icon: <Target size={18} />,
        href: '/content-compass',
      },
    ],
  },
  {
    id: 'pbn',
    label: 'Post Agent',
    icon: <Layers size={20} />,
    children: [
      {
        id: 'pbn-sites',
        label: 'Private Sites',
        icon: <Building2 size={18} />,
        href: '/pbn-sites',
      },
      {
        id: 'pbn-submissions',
        label: 'Post Agent Submissions',
        icon: <FileText size={18} />,
        href: '/pbn-site-submissions',
      },
      {
        id: 'pbn-create-new',
        label: 'Create New Submission',
        icon: <Plus size={18} />,
        href: '/pbn-form',
      },
      {
        id: 'pbn-upload',
        label: 'Manual / Bulk Upload',
        icon: <Database size={18} />,
        href: '/pbn-upload',
      },
    ],
  },
  {
    id: 'ai-wordflow',
    label: 'AI WordFlow',
    icon: <Brain size={20} />,
    children: [
      {
        id: 'ai-wordflow-dashboard',
        label: 'AI Dashboard',
        icon: <Sparkles size={18} />,
        href: '/ai-wordflow',
        badge: 3,
      },
      {
        id: 'ai-wordflow-submissions',
        label: 'Content Submissions',
        icon: <FileText size={18} />,
        href: '/ai-wordflow-submissions',
      },
      {
        id: 'ai-wordflow-create',
        label: 'Create Content',
        icon: <Zap size={18} />,
        href: '/ai-wordflow-form',
      },
      {
        id: 'ai-wordflow-capture',
        label: 'Content Capture',
        icon: <Globe size={18} />,
        href: '/ai-wordflow-post-capture-form',
      },
      {
        id: 'ai-wordflow-new-site',
        label: 'Launch New Site',
        icon: <Plus size={18} />,
        href: '/ai-wordflow/new',
      },
      {
        id: 'legacy-superstar',
        label: '← Legacy Superstar',
        icon: <ExternalLink size={18} />,
        href: '/superstar-sites',
      },
    ],
  },
  {
    id: 'geo',
    label: 'GEO Analysis',
    icon: <Map size={20} />,
    children: [
      {
        id: 'geo-competitive',
        label: 'Competitive Analysis',
        icon: <TrendingUp size={18} />,
        href: '/geo-competitive-analysis',
      },
      {
        id: 'geo-checker',
        label: 'GEO Monitor',
        icon: <Search size={18} />,
        href: '/geo-checker',
      },
      {
        id: 'geo-scheduler',
        label: 'GEO Scheduler',
        icon: <Activity size={18} />,
        href: '/geo-scheduler',
      },
      {
        id: 'geo-schedule-manager',
        label: 'Schedule Manager',
        icon: <Settings size={18} />,
        href: '/geo-schedule-manager',
      },
      {
        id: 'geo-history',
        label: 'Analysis History',
        icon: <BarChart3 size={18} />,
        href: '/geo-analysis-history',
      },
      {
        id: 'geo-runs',
        label: 'GEO Runs',
        icon: <Activity size={18} />,
        href: '/geo-runs',
      },
    ],
  },
  {
    id: 'other-tooling',
    label: 'Advanced Tools',
    icon: <Wrench size={20} />,
    children: [
      {
        id: 'reports',
        label: 'Analytics Reports',
        icon: <BarChart3 size={18} />,
        href: '/reports',
      },
      {
        id: 'lead-enricher',
        label: 'ProspectAI',
        icon: <TrendingUp size={18} />,
        href: '/lead-enricher',
      },
      {
        id: 'backlink-buddy',
        label: 'Autolink',
        icon: <ExternalLink size={18} />,
        href: '/backlink-buddy',
      },
      {
        id: 'stillbrook',
        label: 'Agentic Insight',
        icon: <Camera size={18} />,
        href: '/stillbrook',
      },
      {
        id: 'saved-stillbrook-searches',
        label: 'Saved Searches',
        icon: <Bookmark size={18} />,
        href: '/my-saved-searches',
      },
      {
        id: 'wiki-scraper',
        label: 'Wiki Scraper',
        icon: <Search size={18} />,
        href: '/company-info',
      },
      {
        id: 'zoom-backdrop',
        label: 'Zoom Backdrop',
        icon: <Camera size={18} />,
        href: '/zoom',
      },
    ],
  },
  {
    id: 'ramp',
    label: 'Financial Tools',
    icon: <CreditCard size={20} />,
    children: [
      {
        id: 'ramp-expense-sync',
        label: 'Expense Sync',
        icon: <Activity size={18} />,
        href: '/ramp-expense-sync',
      },
      {
        id: 'ramp-user-mappings',
        label: 'User Mappings',
        icon: <Users size={18} />,
        href: '/ramp-user-mappings',
      },
      {
        id: 'ramp-sync-history',
        label: 'Sync History',
        icon: <BarChart3 size={18} />,
        href: '/ramp-sync-history',
      },
    ],
  },
];

export const IntercomLayout: React.FC<IntercomLayoutProps> = ({
  children,
  title = 'Dashboard',
  breadcrumbs = [],
  actions,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useValidateUserToken();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);

  // Determine which sections should be expanded based on current route
  const getExpandedSectionsFromRoute = () => {
    const currentPath = router.pathname;
    const expandedSections: string[] = [];

    // Check each navigation section to see if current path matches any of its children
    navigationItems.forEach(item => {
      if (item.children) {
        const hasMatchingChild = item.children.some(child => child.href === currentPath);
        if (hasMatchingChild) {
          expandedSections.push(item.id);
        }
      }
    });

    return expandedSections;
  };

  const [expandedItems, setExpandedItems] = useState<string[]>(getExpandedSectionsFromRoute());
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [searchValue, setSearchValue] = useState('');

  // Update expanded sections when route changes
  useEffect(() => {
    const newExpandedSections = getExpandedSectionsFromRoute();
    setExpandedItems(newExpandedSections);
  }, [router.pathname]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleExpandClick = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const renderNavigationItem = (item: NavigationItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const paddingLeft = depth * 16 + 16;
    const isActive = item.href === router.pathname;

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ padding: 0, mb: 0.5, mx: 0 }}>
          <ListItemButton
            onClick={hasChildren ? () => handleExpandClick(item.id) : () => router.push(item.href!)}
            sx={{
              pl: `${paddingLeft + 8}px`,
              pr: 2,
              py: 1.5,
              borderRadius: 1,
              mx: 0,
              my: 0,
              minHeight: 48,
              background: isActive
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'transparent',
              color: isActive ? 'white' : 'text.primary',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': isActive
                ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                      'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent)',
                    backgroundSize: '20px 20px',
                    opacity: 0.3,
                  }
                : {},
              '&:hover': {
                backgroundColor: isActive ? undefined : alpha('#667eea', 0.08),
                transform: 'translateX(4px)',
                boxShadow: isActive
                  ? '0 8px 25px -8px rgba(102, 126, 234, 0.4)'
                  : '0 4px 12px -4px rgba(0, 0, 0, 0.1)',
                '& .MuiListItemText-primary': {
                  color: isActive ? 'white' : '#667eea',
                  fontWeight: isActive ? 600 : 500,
                },
                '& .MuiListItemIcon-root': {
                  color: isActive ? 'white' : '#667eea',
                  transform: 'scale(1.1)',
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                padding: 0,
                minWidth: 50,
                color: isActive ? 'white' : 'text.secondary',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                      color: 'inherit',
                      lineHeight: 1.2,
                    }}
                  >
                    {item.label}
                  </Typography>
                  {/* {item.id === 'ai-wordflow' && (
                    <Chip
                      label="AI"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        bgcolor: isActive ? alpha('#fff', 0.2) : alpha('#667eea', 0.1),
                        color: isActive ? 'white' : '#667eea',
                        border: `1px solid ${isActive ? alpha('#fff', 0.3) : alpha('#667eea', 0.3)}`,
                        animation: `${floatAnimation} 3s ease-in-out infinite`,
                        '& .MuiChip-label': {
                          px: 0.8,
                        },
                      }}
                    />
                  )} */}
                </Box>
              }
            />
            {item.badge && (
              <Badge
                badgeContent={item.badge}
                sx={{
                  '& .MuiBadge-badge': {
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    height: 20,
                    minWidth: 20,
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                  },
                }}
              />
            )}
            {hasChildren && (
              <Box
                sx={{
                  ml: 1,
                  transition: 'transform 0.3s ease',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                <ChevronDown size={18} />
              </Box>
            )}
          </ListItemButton>
        </ListItem>
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List disablePadding>
              {item.children?.map(child => renderNavigationItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Enhanced Header with Gradient */}
      <Box
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderBottom: 'none',
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
              'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.1,
          },
        }}
      >
        <Box position="relative" zIndex={2}>
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: alpha('#fff', 0.2),
                border: `2px solid ${alpha('#fff', 0.3)}`,
              }}
            >
              <Brain size={20} color="white" />
            </Avatar>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  color: 'white',
                  fontSize: '1.5rem',
                  lineHeight: 1,
                }}
              >
                Status AI
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Enhanced Search */}
      <Box sx={{ p: 2, pt: 2 }}>
        <Paper
          component="form"
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            backgroundColor: alpha('#f8fafc', 0.8),
            border: `1px solid ${alpha('#667eea', 0.2)}`,
            borderRadius: 2,
            boxShadow: 'none',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: alpha('#667eea', 0.05),
              borderColor: alpha('#667eea', 0.4),
              boxShadow: `0 4px 12px -4px ${alpha('#667eea', 0.2)}`,
            },
            '&:focus-within': {
              backgroundColor: 'white',
              borderColor: '#667eea',
              boxShadow: `0 4px 12px -4px ${alpha('#667eea', 0.3)}`,
            },
          }}
        >
          <IconButton sx={{ p: '8px' }} aria-label="search">
            <Search size={18} color="#667eea" />
          </IconButton>
          <InputBase
            sx={{
              ml: 1,
              flex: 1,
              fontSize: '0.875rem',
              color: 'text.primary',
              fontWeight: 500,
              '& input::placeholder': {
                color: 'text.secondary',
                opacity: 0.8,
                fontWeight: 400,
              },
            }}
            placeholder="Search tools and features..."
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            inputProps={{ 'aria-label': 'search' }}
          />
        </Paper>
      </Box>

      {/* Navigation with better spacing */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 0.25 }}>
        <List sx={{ py: 1 }}>{navigationItems.map(item => renderNavigationItem(item))}</List>
      </Box>

      {/* Enhanced User Profile Section */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${alpha('#e5e7eb', 0.5)}`,
          background: alpha('#f8fafc', 0.5),
        }}
      >
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleProfileClick}
            sx={{
              borderRadius: 2,
              p: 1.5,
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: alpha('#667eea', 0.08),
                transform: 'translateY(-2px)',
                boxShadow: `0 4px 12px -4px ${alpha('#667eea', 0.3)}`,
                '& .MuiListItemText-primary': {
                  color: '#667eea',
                  fontWeight: 600,
                },
                '& .MuiListItemText-secondary': {
                  color: 'text.secondary',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 48 }}>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  border: `2px solid ${alpha('#667eea', 0.2)}`,
                  boxShadow: `0 4px 12px -4px ${alpha('#667eea', 0.4)}`,
                }}
              >
                {user?.username ? user.username.charAt(0).toUpperCase() : <User size={18} />}
              </Avatar>
            </ListItemIcon>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'text.primary',
                    }}
                  >
                    {user?.username || 'Unknown User'}
                  </Typography>
                  <Chip
                    label="Pro"
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      bgcolor: alpha('#10b981', 0.1),
                      color: '#10b981',
                      '& .MuiChip-label': {
                        px: 0.6,
                      },
                    }}
                  />
                </Box>
              }
              secondary={user?.email || 'No email'}
              secondaryTypographyProps={{
                fontSize: '0.75rem',
                color: 'text.secondary',
                fontWeight: 400,
              }}
            />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: `0 1px 3px 0 ${alpha('#000', 0.1)}`,
          borderBottom: `1px solid ${alpha('#e5e7eb', 0.8)}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar sx={{ minHeight: 72, px: 3 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flex: 1 }}>
            {breadcrumbs.length > 0 ? (
              <Breadcrumbs
                separator={<ChevronRight size={16} color="#6b7280" />}
                aria-label="breadcrumb"
                sx={{ mb: 1 }}
              >
                <Link
                  underline="hover"
                  color="inherit"
                  href="/"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    '&:hover': {
                      color: '#667eea',
                    },
                  }}
                >
                  <Home size={16} />
                  Home
                </Link>
                {breadcrumbs.map((crumb, index) => {
                  const IconComponent = crumb.icon;
                  return (
                    <Link
                      key={index}
                      underline="hover"
                      color={index === breadcrumbs.length - 1 ? 'text.primary' : 'inherit'}
                      href={crumb.href}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontSize: '0.875rem',
                        fontWeight: index === breadcrumbs.length - 1 ? 600 : 500,
                        color: index === breadcrumbs.length - 1 ? '#667eea' : '#6b7280',
                        '&:hover': {
                          color: '#667eea',
                        },
                      }}
                    >
                      {IconComponent && <IconComponent size={16} />}
                      {crumb.label}
                    </Link>
                  );
                })}
              </Breadcrumbs>
            ) : null}
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                fontSize: '1.75rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.2,
              }}
            >
              {title}
            </Typography>
          </Box>

          {actions && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>{actions}</Box>
          )}

          <Stack direction="row" spacing={1}>
            <IconButton
              color="inherit"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: alpha('#667eea', 0.08),
                  color: '#667eea',
                },
              }}
            >
              <Badge
                badgeContent={3}
                sx={{
                  '& .MuiBadge-badge': {
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                  },
                }}
              >
                <Bell size={20} />
              </Badge>
            </IconButton>

            <IconButton
              color="inherit"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: alpha('#667eea', 0.08),
                  color: '#667eea',
                },
              }}
            >
              <HelpCircle size={20} />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              backgroundColor: 'background.paper',
              borderRight: `1px solid ${alpha('#e5e7eb', 0.8)}`,
              boxShadow: `2px 0 8px 0 ${alpha('#000', 0.05)}`,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8,
          backgroundColor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>

      <Menu
        anchorEl={profileAnchorEl}
        open={Boolean(profileAnchorEl)}
        onClose={handleProfileClose}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 200,
            borderRadius: 2,
            boxShadow: `0 10px 25px -5px ${alpha('#000', 0.1)}`,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            handleProfileClose();
            router.push('/profile');
          }}
        >
          Profile
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleProfileClose();
            router.push('/settings');
          }}
        >
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleProfileClose}>Logout</MenuItem>
      </Menu>
    </Box>
  );
};
