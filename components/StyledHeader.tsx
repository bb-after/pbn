import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  useTheme,
  useMediaQuery,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

interface NavigationItem {
  text: string;
  href: string;
  description?: string;
}

interface NavigationGroup {
  group: string;
  items: NavigationItem[];
}

const StyledHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Anchor elements for dropdowns
  const [pbnAnchorEl, setPbnAnchorEl] = useState<null | HTMLElement>(null);
  const [superstarAnchorEl, setSuperstarAnchorEl] = useState<null | HTMLElement>(null);
  const [clientsAnchorEl, setClientsAnchorEl] = useState<null | HTMLElement>(null);
  const [otherToolsAnchorEl, setOtherToolsAnchorEl] = useState<null | HTMLElement>(null);

  const handlePbnClick = (event: React.MouseEvent<HTMLElement>) => {
    setPbnAnchorEl(event.currentTarget);
  };

  const handleSuperstarClick = (event: React.MouseEvent<HTMLElement>) => {
    setSuperstarAnchorEl(event.currentTarget);
  };

  const handleClientsClick = (event: React.MouseEvent<HTMLElement>) => {
    setClientsAnchorEl(event.currentTarget);
  };

  const handleOtherToolsClick = (event: React.MouseEvent<HTMLElement>) => {
    setOtherToolsAnchorEl(event.currentTarget);
  };

  const handlePbnClose = () => {
    setPbnAnchorEl(null);
  };

  const handleSuperstarClose = () => {
    setSuperstarAnchorEl(null);
  };

  const handleClientsClose = () => {
    setClientsAnchorEl(null);
  };

  const handleOtherToolsClose = () => {
    setOtherToolsAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const navigationItems: NavigationGroup[] = [
    {
      group: 'PBN Tools',
      items: [
        {
          text: "PBN'J",
          href: '/',
          description: 'Generate new PBN articles with AI',
        },
        {
          text: "PBN'J List",
          href: 'https://sales.statuscrawl.io/admin/article/list',
          description: 'View all generated PBN articles',
        },
        {
          text: 'PBN Posts',
          href: '/pbn-site-submissions',
          description: 'View all submitted PBN posts',
        },
        {
          text: 'New PBN Post',
          href: '/pbn-form',
          description: 'Submit a new PBN article',
        },
      ],
    },

    {
      group: 'Superstar Tools',
      items: [
        {
          text: 'All Superstar Sites',
          href: '/superstar-sites',
          description: 'Manage your Superstar site list',
        },
        {
          text: 'Add New Site',
          href: '/superstar-sites/new',
          description: 'Add another Superstar site to your list',
        },
        {
          text: 'Content Compass',
          href: '/content-compass',
          description: 'Find perfect content placement for clients',
        },
        {
          text: 'Site Submissions',
          href: '/superstar-site-submissions',
          description: 'View all submitted Superstar posts',
        },
        {
          text: 'Generate Post',
          href: '/superstar',
          description: 'Create new Superstar content with AI',
        },
        {
          text: 'Submit Post',
          href: '/superstar-form',
          description: 'Submit a new Superstar article',
        },
        {
          text: 'Capture WP Post',
          href: '/superstar-post-capture-form',
          description: 'Import existing WordPress posts',
        },
      ],
    },
    {
      group: 'Clients',
      items: [
        {
          text: 'View Clients',
          href: '/clients',
          description: 'View and manage your client list',
        },
        {
          text: 'Add New Client',
          href: '/clients/add',
          description: 'Add a new client to the system',
        },
        {
          text: 'Client Mappings',
          href: '/clients/mappings',
          description: 'Manage client industry and region mappings',
        },
        {
          text: 'Content Compass',
          href: '/content-compass',
          description: 'Navigate content placement for clients',
        },
      ],
    },
    {
      group: 'Other Tools',
      items: [
        {
          text: 'Wiki Scraper',
          href: '/company-info',
          description: 'Extract company information from Wikipedia',
        },
        {
          text: 'Zoom Backdrop',
          href: '/zoom',
          description: 'Generate custom Zoom backgrounds',
        },
      ],
    },
  ];

  const renderNavigationItems = (items: NavigationGroup[], mobile = false) => {
    if (mobile) {
      return items.map(group => (
        <Box key={group.group} sx={{ mx: mobile ? 0 : 2 }}>
          <Box
            sx={{
              typography: 'caption',
              color: 'text.secondary',
              mb: 1,
              mt: 2,
              px: 2,
            }}
          >
            {group.group}
          </Box>
          <List>
            {group.items.map(item => (
              <ListItem key={item.text} component={Link} href={item.href}>
                <ListItemText primary={item.text} secondary={item.description} />
              </ListItem>
            ))}
          </List>
        </Box>
      ));
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          color="inherit"
          onClick={handlePbnClick}
          endIcon={<KeyboardArrowDownIcon />}
          sx={{ textTransform: 'none' }}
        >
          PBN Tools
        </Button>
        <Menu
          anchorEl={pbnAnchorEl}
          open={Boolean(pbnAnchorEl)}
          onClose={handlePbnClose}
          MenuListProps={{
            'aria-labelledby': 'pbn-button',
          }}
        >
          {navigationItems[0].items.map(item => (
            <MenuItem
              key={item.text}
              onClick={handlePbnClose}
              component={Link}
              href={item.href}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: '250px',
              }}
            >
              <Box component="span" sx={{ fontWeight: 500 }}>
                {item.text}
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: '12px',
                  color: 'text.secondary',
                  mt: 0.5,
                }}
              >
                {item.description}
              </Box>
            </MenuItem>
          ))}
        </Menu>

        <Button
          color="inherit"
          onClick={handleSuperstarClick}
          endIcon={<KeyboardArrowDownIcon />}
          sx={{ textTransform: 'none' }}
        >
          Superstar Tools
        </Button>
        <Menu
          anchorEl={superstarAnchorEl}
          open={Boolean(superstarAnchorEl)}
          onClose={handleSuperstarClose}
          MenuListProps={{
            'aria-labelledby': 'superstar-button',
          }}
        >
          {navigationItems[1].items.map(item => (
            <MenuItem
              key={item.text}
              onClick={handleSuperstarClose}
              component={Link}
              href={item.href}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: '250px',
              }}
            >
              <Box component="span" sx={{ fontWeight: 500 }}>
                {item.text}
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: '12px',
                  color: 'text.secondary',
                  mt: 0.5,
                }}
              >
                {item.description}
              </Box>
            </MenuItem>
          ))}
        </Menu>

        <Button
          color="inherit"
          onClick={handleClientsClick}
          endIcon={<KeyboardArrowDownIcon />}
          sx={{ textTransform: 'none' }}
        >
          Clients
        </Button>
        <Menu
          anchorEl={clientsAnchorEl}
          open={Boolean(clientsAnchorEl)}
          onClose={handleClientsClose}
          MenuListProps={{
            'aria-labelledby': 'clients-button',
          }}
        >
          {navigationItems[2].items.map(item => (
            <MenuItem
              key={item.text}
              onClick={handleClientsClose}
              component={Link}
              href={item.href}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: '250px',
              }}
            >
              <Box component="span" sx={{ fontWeight: 500 }}>
                {item.text}
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: '12px',
                  color: 'text.secondary',
                  mt: 0.5,
                }}
              >
                {item.description}
              </Box>
            </MenuItem>
          ))}
        </Menu>

        <Button
          color="inherit"
          onClick={handleOtherToolsClick}
          endIcon={<KeyboardArrowDownIcon />}
          sx={{ textTransform: 'none' }}
        >
          Other Tools
        </Button>
        <Menu
          anchorEl={otherToolsAnchorEl}
          open={Boolean(otherToolsAnchorEl)}
          onClose={handleOtherToolsClose}
          MenuListProps={{
            'aria-labelledby': 'other-tools-button',
          }}
        >
          {navigationItems[3].items.map(item => (
            <MenuItem
              key={item.text}
              onClick={handleOtherToolsClose}
              component={Link}
              href={item.href}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: '250px',
              }}
            >
              <Box component="span" sx={{ fontWeight: 500 }}>
                {item.text}
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: '12px',
                  color: 'text.secondary',
                  mt: 0.5,
                }}
              >
                {item.description}
              </Box>
            </MenuItem>
          ))}
        </Menu>
      </Box>
    );
  };

  return (
    <>
      <style jsx global>{`
        .nav-link:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `}</style>
      <AppBar position="sticky" sx={{ backgroundColor: '#000' }}>
        <Toolbar sx={{ py: 1 }}>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Image
              priority
              src="/images/sl-logo.png"
              width={180}
              height={20}
              style={{ objectFit: 'contain' }}
              alt="Logo"
            />
          </Box>

          {isMobile ? (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {renderNavigationItems(navigationItems)}
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: 280 },
        }}
      >
        <Box sx={{ mt: 2 }}>{renderNavigationItems(navigationItems, true)}</Box>
      </Drawer>
    </>
  );
};

export default StyledHeader;
