import React, { useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
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
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Help as HelpIcon,
  ExpandLess,
  ExpandMore,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
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
    href: '/clients',
  },
  {
    id: 'client-approval',
    label: 'Client Approval',
    icon: <AssignmentIcon />,
    href: '/client-approval',
  },
  {
    id: 'submissions',
    label: 'Submissions',
    icon: <AssignmentIcon />,
    children: [
      {
        id: 'pbn-submissions',
        label: 'PBN Submissions',
        icon: <AssignmentIcon />,
        href: '/pbn-submissions',
      },
      {
        id: 'superstar-submissions',
        label: 'Superstar Submissions',
        icon: <AssignmentIcon />,
        href: '/superstar-sites',
      },
    ],
  },
  {
    id: 'content-compass',
    label: 'Content Compass',
    icon: <SettingsIcon />,
    href: '/content-compass',
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['submissions']);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [searchValue, setSearchValue] = useState('');

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
        <ListItem disablePadding>
          <ListItemButton
            onClick={hasChildren ? () => handleExpandClick(item.id) : () => router.push(item.href!)}
            sx={{
              pl: `${paddingLeft}px`,
              borderRadius: 1.5,
              mx: 1.5,
              my: 0.5,
              backgroundColor: isActive ? 'primary.main' : 'transparent',
              color: isActive ? 'primary.contrastText' : 'text.primary',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                color: isActive ? 'white' : 'inherit',
                '& .MuiListItemText-primary': {
                  color: isActive ? 'white' : 'rgba(0, 0, 0, 0.87)',
                },
                '& .MuiListItemIcon-root': {
                  color: isActive ? 'white' : 'rgba(0, 0, 0, 0.54)',
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
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
        <List sx={{ px: 2 }}>{navigationItems.map(item => renderNavigationItem(item))}</List>
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleProfileClick}
            sx={{
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'action.hover',
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
                JD
              </Avatar>
            </ListItemIcon>
            <ListItemText
              primary="John Doe"
              secondary="john@example.com"
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
        <MenuItem onClick={handleProfileClose}>Profile</MenuItem>
        <MenuItem onClick={handleProfileClose}>Settings</MenuItem>
        <Divider />
        <MenuItem onClick={handleProfileClose}>Logout</MenuItem>
      </Menu>
    </Box>
  );
};
