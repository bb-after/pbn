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
  Avatar,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
  InputBase,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Dashboard as DashboardIcon,
  Assessment as ReportsIcon,
  Notifications as NotificationsIcon,
  Help as HelpIcon,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import { tokens } from '../../theme/intercom-theme';

interface NavigationItem {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
}

interface ClientInfo {
  name: string;
  email: string;
}

interface ClientPortalLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  clientInfo?: ClientInfo | null;
}

const clientPortalNavigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    href: '/client-portal/dashboard',
  },
  {
    id: 'content-portal',
    label: 'Approval Desk',
    icon: <DocumentIcon />,
    href: '/client-portal',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <ReportsIcon />,
    href: '/client-portal/reports',
  },
];

const DRAWER_WIDTH = 280;

export const ClientPortalLayout: React.FC<ClientPortalLayoutProps> = ({
  children,
  title = 'Dashboard',
  breadcrumbs = [],
  actions,
  clientInfo,
}) => {
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const [searchValue, setSearchValue] = useState('');

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = item.href === router.pathname;

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => router.push(item.href!)}
            sx={{
              borderRadius: 1.5,
              mx: 1.5,
              my: 0.5,
              backgroundColor: isActive ? 'primary.main' : 'transparent',
              color: isActive ? 'primary.contrastText' : 'text.primary',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                color: isActive ? 'white' : 'text.primary',
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
          </ListItemButton>
        </ListItem>
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
          Status Command Center
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
        <List sx={{ px: 2 }}>
          {clientPortalNavigationItems.map(item => renderNavigationItem(item))}
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
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {clientInfo?.name ? clientInfo.name.charAt(0).toUpperCase() : '?'}
              </Avatar>
            </ListItemIcon>
            <ListItemText
              primary={clientInfo?.name || 'Client User'}
              secondary={clientInfo?.email || 'client@example.com'}
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
          borderBottom: 1,
          borderColor: 'divider',
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
                  href="/client-portal/dashboard"
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  <HomeIcon sx={{ mr: 0.5, fontSize: 16 }} />
                  Command Center
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

          <IconButton
            color="inherit"
            sx={{ mr: 1 }}
            onClick={() => {
              console.log('Notifications clicked');
              // Add notifications functionality here
            }}
          >
            <NotificationsIcon />
          </IconButton>

          <IconButton
            color="inherit"
            onClick={() => {
              console.log('Help clicked');
              // Add help functionality here
            }}
          >
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
              borderRight: 1,
              borderColor: 'divider',
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
          backgroundColor: 'background.paper',
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
            // Add profile functionality here
            console.log('Profile clicked');
          }}
        >
          Profile
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleProfileClose();
            router.push('/client-portal/settings');
          }}
        >
          Settings
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            handleProfileClose();
            // Add logout functionality here
            console.log('Logout clicked');
            // You can add actual logout logic here
          }}
        >
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};
