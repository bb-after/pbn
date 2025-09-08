import React, { useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/router';
import useValidateUserToken from '../../hooks/useValidateUserToken';
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
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Article as ArticleIcon,
  Star as StarIcon,
  Language as LanguageIcon,
  Explore as ExploreIcon,
  Assessment as AssessmentIcon,
  Notifications as NotificationsIcon,
  Help as HelpIcon,
  ExpandLess,
  ExpandMore,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  Build as BuildIcon,
  Insights as InsightsIcon,
  Link as LinkIcon,
  TravelExplore as TravelExploreIcon,
  Wallpaper as WallpaperIcon,
  Business as BusinessIcon,
  Public as PublicIcon,
} from '@mui/icons-material';
import { tokens } from '../../theme/intercom-theme';

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
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    href: '/',
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: <PeopleIcon />,
    children: [
      {
        id: 'view-clients',
        label: 'View Clients',
        icon: <PeopleIcon />,
        href: '/clients',
      },
      {
        id: 'client-approval',
        label: 'Client Approval',
        icon: <CheckCircleIcon />,
        href: '/client-approval',
      },
      {
        id: 'content-compass',
        label: 'Content Compass',
        icon: <ExploreIcon />,
        href: '/content-compass',
      },
    ],
  },
  {
    id: 'pbn',
    label: 'PBN',
    icon: <ArticleIcon />,
    children: [
      {
        id: 'pbn-submissions',
        label: 'PBN Sites',
        icon: <BusinessIcon />,
        href: '/pbn-sites',
      },
      {
        id: 'pbn-submissions',
        label: 'PBN Submissions',
        icon: <AssignmentIcon />,
        href: '/pbn-site-submissions',
      },
      {
        id: 'pbn-create-new',
        label: 'Create New Submission',
        icon: <AddCircleOutlineIcon />,
        href: '/pbn-form',
      },
      {
        id: 'pbn-upload',
        label: 'Manual / Bulk Upload',
        icon: <AssignmentIcon />,
        href: '/pbn-upload',
      },
    ],
  },
  {
    id: 'superstar',
    label: 'Superstar',
    icon: <StarIcon />,
    children: [
      {
        id: 'superstar-sites',
        label: 'Superstar Sites',
        icon: <StarIcon />,
        href: '/superstar-sites',
      },
      {
        id: 'superstar-submissions',
        label: 'Superstar Submissions',
        icon: <AssignmentIcon />,
        href: '/superstar-site-submissions',
      },
      {
        id: 'superstar-create-new-submission',
        label: 'Create New Submission',
        icon: <AddCircleOutlineIcon />,
        href: '/superstar-form',
      },
      {
        id: 'superstar-capture-post',
        label: 'Capture WP Submission',
        icon: <LanguageIcon />,
        href: '/superstar-post-capture-form',
      },
      {
        id: 'superstar-create-new',
        label: 'Create New Site',
        icon: <AddCircleOutlineIcon />,
        href: '/superstar-sites/new',
      },
    ],
  },
  {
    id: 'geo',
    label: 'GEO',
    icon: <PublicIcon />,
    children: [
      {
        id: 'geo-checker',
        label: 'GEO Checker',
        icon: <PublicIcon />,
        href: '/geo-checker',
      },
      {
        id: 'geo-history',
        label: 'GEO History',
        icon: <AssessmentIcon />,
        href: '/geo-analysis-history',
      },
    ],
  },
  {
    id: 'other-tooling',
    label: 'Other Tooling',
    icon: <BuildIcon />,
    children: [
      {
        id: 'reports',
        label: 'Reports',
        icon: <AssessmentIcon />,
        href: '/reports',
      },
      {
        id: 'lead-enricher',
        label: 'Lead Enricher',
        icon: <InsightsIcon />,
        href: '/lead-enricher',
      },
      {
        id: 'backlink-buddy',
        label: 'Backlink Buddy',
        icon: <LinkIcon />,
        href: '/backlink-buddy',
      },
      {
        id: 'wiki-scraper',
        label: 'Wiki Scraper',
        icon: <TravelExploreIcon />,
        href: '/company-info',
      },
      {
        id: 'zoom-backdrop',
        label: 'Zoom Backdrop',
        icon: <WallpaperIcon />,
        href: '/zoom',
      },
    ],
  },
];

const DRAWER_WIDTH = 280;

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

  // Debug logging
  console.log('IntercomLayout user object:', user);
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
        <ListItem disablePadding sx={{ padding: 0, margin: 1 }}>
          <ListItemButton
            onClick={hasChildren ? () => handleExpandClick(item.id) : () => router.push(item.href!)}
            sx={{
              pl: `${paddingLeft}px`,
              borderRadius: 1.5,
              mx: 0,
              my: 0,
              backgroundColor: isActive ? 'primary.main' : 'transparent',
              color: isActive ? 'primary.contrastText' : 'text.primary',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                color: isActive ? 'white' : 'inherit',
                '& .MuiListItemText-primary': {
                  color: isActive ? 'white' : 'text.primary',
                },
                '& .MuiListItemIcon-root': {
                  color: isActive ? 'white' : 'text.secondary',
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                padding: 0,
                minWidth: 40,
                color: isActive ? 'primary.contrastText' : 'text.secondary',
                transition: 'color 0.2s ease-in-out',
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'inherit',
              }}
            />
            {item.badge && (
              <Badge
                badgeContent={item.badge}
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: tokens.colors.primary[400],
                    color: 'white',
                    fontSize: '0.75rem',
                    height: 18,
                    minWidth: 18,
                  },
                }}
              />
            )}
            {hasChildren && (
              <Box sx={{ ml: 1 }}>{isExpanded ? <ExpandLess /> : <ExpandMore />}</Box>
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
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            fontSize: '1.25rem',
          }}
        >
          Status Approvals
        </Typography>
      </Box>

      <Box sx={{ p: 2 }}>
        <Paper
          component="form"
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            backgroundColor: 'action.hover',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: 'action.selected',
            },
          }}
        >
          <IconButton sx={{ p: '6px' }} aria-label="search">
            <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          </IconButton>
          <InputBase
            sx={{
              ml: 1,
              flex: 1,
              fontSize: '0.875rem',
              color: 'text.primary',
              '& input::placeholder': {
                color: 'text.secondary',
                opacity: 1,
              },
            }}
            placeholder="Search..."
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            inputProps={{ 'aria-label': 'search' }}
          />
        </Paper>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List sx={{ paddingLeft: 0, paddingRight: 2 }}>
          {navigationItems.map(item => renderNavigationItem(item))}
        </List>
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleProfileClick}
            sx={{
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'action.hover',
                // Ensure text colors have enough contrast on hover
                '& .MuiListItemText-primary': {
                  color: 'text.primary',
                },
                '& .MuiListItemText-secondary': {
                  color: 'text.secondary',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: tokens.colors.primary[400],
                  fontSize: '0.875rem',
                }}
              >
                {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
              </Avatar>
            </ListItemIcon>
            <ListItemText
              primary={user?.username || 'Unknown User'}
              secondary={user?.email || 'No email'}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'text.primary',
              }}
              secondaryTypographyProps={{
                fontSize: '0.75rem',
                color: 'text.secondary',
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
          boxShadow: tokens.shadows[1],
          borderBottom: `1px solid ${tokens.colors.grey[200]}`,
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
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
                separator={<ChevronRightIcon fontSize="small" />}
                aria-label="breadcrumb"
                sx={{ mb: 0.5 }}
              >
                <Link
                  underline="hover"
                  color="inherit"
                  href="/"
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <HomeIcon sx={{ mr: 0.5, fontSize: 16 }} />
                  Home
                </Link>
                {breadcrumbs.map((crumb, index) => (
                  <Link
                    key={index}
                    underline="hover"
                    color={index === breadcrumbs.length - 1 ? 'text.primary' : 'inherit'}
                    href={crumb.href}
                    sx={{ fontSize: '0.875rem' }}
                  >
                    {crumb.label}
                  </Link>
                ))}
              </Breadcrumbs>
            ) : null}
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          </Box>

          {actions && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>{actions}</Box>
          )}

          <IconButton color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={4} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton color="inherit">
            <HelpIcon />
          </IconButton>
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
              borderRight: `1px solid ${tokens.colors.grey[200]}`,
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
            boxShadow: tokens.shadows[4],
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
