import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Link as MuiLink,
  Paper,
  Typography,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import ArticleIcon from '@mui/icons-material/Article';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LayoutContainer from '../../../components/LayoutContainer';
import StyledHeader from '../../../components/StyledHeader';
import useValidateUserToken from '../../../hooks/useValidateUserToken';
import Link from 'next/link';

interface Site {
  id: number;
  name: string;
  domain: string;
  description: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  submission_response: string;
  autogenerated: number;
  client_name: string;
  author_name: string;
  author_avatar: string;
  created: string;
  modified_at: string | null;
  user_name: string;
}

interface Stats {
  total_clients: number;
}

const SiteClientPosts: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [site, setSite] = useState<Site | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const { isLoading: isValidating, isValidUser } = useValidateUserToken();

  useEffect(() => {
    const fetchSitePosts = async () => {
      if (!id || !isValidUser) return;

      setIsLoading(true);

      try {
        const response = await fetch(`/api/superstar-sites/client-posts-by-site?siteId=${id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch site posts');
        }

        const data = await response.json();
        setSite(data.site);
        setPosts(data.posts);
        setStats(data.stats);
      } catch (error: any) {
        console.error('Error fetching site posts:', error);
        setError(error.message || 'Failed to load site posts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSitePosts();
  }, [id, isValidUser]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Function to safely render HTML content
  const renderHTML = (htmlContent: string) => {
    return { __html: htmlContent.substring(0, 300) + '...' };
  };

  if (isValidating || isLoading) {
    return (
      <LayoutContainer>
        <StyledHeader />
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <CircularProgress />
        </Box>
      </LayoutContainer>
    );
  }

  if (!isValidUser) {
    return (
      <LayoutContainer>
        <StyledHeader />
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <Typography variant="h6">Unauthorized access. Please log in.</Typography>
        </Box>
      </LayoutContainer>
    );
  }

  if (error) {
    return (
      <LayoutContainer>
        <StyledHeader />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography color="error" variant="h6">
              {error}
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.back()}
              startIcon={<ArrowBackIcon />}
              sx={{ mt: 2 }}
            >
              Go Back
            </Button>
          </Paper>
        </Container>
      </LayoutContainer>
    );
  }

  return (
    <LayoutContainer>
      <StyledHeader />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Client Posts for {site?.name}
          </Typography>
        </Box>

        {site && (
          <Paper sx={{ p: 3, mb: 4 }}>
            <Box display="flex" alignItems="center">
              <Box>
                <Typography variant="h5">{site.name}</Typography>
                <Typography variant="body1" color="text.secondary">
                  {site.domain}
                </Typography>
                {site.description && (
                  <Typography variant="body2" color="text.secondary">
                    {site.description}
                  </Typography>
                )}
              </Box>
              <Box flexGrow={1} />
              <Box>
                <Chip
                  label={`${posts.length} Posts`}
                  color="primary"
                  variant="outlined"
                  icon={<ArticleIcon />}
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={`${stats?.total_clients || 0} Clients`}
                  color="secondary"
                  variant="outlined"
                  icon={<BusinessIcon />}
                />
                <Button
                  variant="contained"
                  size="small"
                  sx={{ ml: 2 }}
                  onClick={() => router.back()}
                >
                  Back to Sites
                </Button>
              </Box>
            </Box>
          </Paper>
        )}

        {posts.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No client posts found for this site
            </Typography>
          </Paper>
        ) : (
          <List>
            {posts.map(post => (
              <Paper key={post.id} sx={{ mb: 3 }}>
                <ListItem alignItems="flex-start" sx={{ pr: 12 }}>
                  <ListItemAvatar>
                    <Avatar>
                      {post.autogenerated === 1 ? <AutoAwesomeIcon /> : <ArticleIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="h6" component="div">
                        {post.title}
                      </Typography>
                    }
                    secondary={
                      <React.Fragment>
                        <Box mt={1} mb={1}>
                          <div dangerouslySetInnerHTML={renderHTML(post.content || '')} />
                        </Box>
                        <Box display="flex" alignItems="center" mt={2} flexWrap="wrap">
                          <Chip
                            size="small"
                            label={post.autogenerated === 1 ? 'Autogenerated' : 'Manual'}
                            color={post.autogenerated === 1 ? 'primary' : 'secondary'}
                            sx={{ mr: 1, mb: 1 }}
                          />
                          <Chip
                            size="small"
                            icon={<CalendarTodayIcon />}
                            label={`Created: ${formatDate(post.created)}`}
                            variant="outlined"
                            sx={{ mr: 1, mb: 1 }}
                          />
                          {post.modified_at && (
                            <Chip
                              size="small"
                              label={`Modified: ${formatDate(post.modified_at)}`}
                              variant="outlined"
                              color="info"
                              sx={{ mr: 1, mb: 1 }}
                            />
                          )}
                          {post.client_name && (
                            <Chip
                              size="small"
                              label={`Client: ${post.client_name}`}
                              variant="outlined"
                              color="primary"
                              sx={{ mb: 1 }}
                            />
                          )}
                        </Box>
                        {post.author_name && (
                          <Typography variant="body2" color="text.secondary">
                            Author: {post.author_name}
                          </Typography>
                        )}
                        {post.user_name && (
                          <Typography variant="body2" color="text.secondary">
                            Created by: {post.user_name}
                          </Typography>
                        )}
                      </React.Fragment>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Link href={`/editSuperStarPost/${post.id}`} passHref>
                      <IconButton edge="end" aria-label="edit" sx={{ mr: 1 }}>
                        <EditIcon />
                      </IconButton>
                    </Link>
                    <IconButton
                      edge="end"
                      aria-label="view"
                      component="a"
                      href={post.submission_response}
                      target="_blank"
                    >
                      <OpenInNewIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </Paper>
            ))}
          </List>
        )}
      </Container>
    </LayoutContainer>
  );
};

export default SiteClientPosts;
