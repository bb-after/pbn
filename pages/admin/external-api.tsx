import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { IntercomLayout, IntercomCard, ToastProvider } from '../../components/ui';
import useAuth from '../../hooks/useAuth';
import UnauthorizedAccess from '../../components/UnauthorizedAccess';
import axios from 'axios';

export default function ExternalApiAdminPage() {
  return (
    <ToastProvider>
      <ExternalApiAdmin />
    </ToastProvider>
  );
}

interface ExternalUser {
  id: number;
  external_user_id: string;
  external_user_name: string;
  application_name: string;
  total_requests: number;
  first_seen: string;
  last_seen: string;
}

interface AnalysisResult {
  id: number;
  client_name: string;
  keyword: string;
  analysis_type: string;
  intent_category: string;
  timestamp: string;
  external_user_id: string;
  external_user_name: string;
  application_name: string;
}

function ExternalApiAdmin() {
  const { token } = useAuth('/login');
  const [loading, setLoading] = useState(false);
  const [externalUsers, setExternalUsers] = useState<ExternalUser[]>([]);
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisResult[]>([]);
  const [stats, setStats] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load external users
      const usersResp = await axios.get('/api/admin/external-users');
      setExternalUsers(usersResp.data.users || []);

      // Load recent analyses
      const analysesResp = await axios.get('/api/admin/external-analyses');
      setRecentAnalyses(analysesResp.data.analyses || []);

      // Load stats
      const statsResp = await axios.get('/api/admin/external-stats');
      setStats(statsResp.data);
    } catch (error) {
      console.error('Failed to load external API data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  if (!token) return <UnauthorizedAccess />;

  return (
    <IntercomLayout
      title="External API Administration"
      breadcrumbs={[{ label: 'Admin' }, { label: 'External API' }]}
    >
      <IntercomCard>
        <Box p={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5">External API Usage</Typography>
            <Button variant="outlined" onClick={loadData} disabled={loading}>
              {loading ? <CircularProgress size={18} /> : 'Refresh'}
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            Monitor external applications using the GEO Check API. This shows usage statistics and recent activity.
          </Alert>

          {/* Stats Cards */}
          {stats && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary">
                      {stats.totalUsers || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total External Users
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary">
                      {stats.totalAnalyses || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Analyses (30 days)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary">
                      {stats.uniqueApplications || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Unique Applications
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" color="primary">
                      {stats.avgAnalysesPerDay || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Analyses/Day
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* External Users Table */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            External Users ({externalUsers.length})
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Application</TableCell>
                  <TableCell>User ID</TableCell>
                  <TableCell>User Name</TableCell>
                  <TableCell>Total Requests</TableCell>
                  <TableCell>First Seen</TableCell>
                  <TableCell>Last Seen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {externalUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Chip label={user.application_name} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>{user.external_user_id}</TableCell>
                    <TableCell>{user.external_user_name}</TableCell>
                    <TableCell>{user.total_requests}</TableCell>
                    <TableCell>{new Date(user.first_seen).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(user.last_seen).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Recent Analyses Table */}
          <Typography variant="h6" gutterBottom>
            Recent Analyses ({recentAnalyses.length})
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Application</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Keyword</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Timestamp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentAnalyses.map((analysis) => (
                  <TableRow key={analysis.id}>
                    <TableCell>
                      <Chip label={analysis.application_name} size="small" color="secondary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{analysis.external_user_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {analysis.external_user_id}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{analysis.client_name}</TableCell>
                    <TableCell>{analysis.keyword}</TableCell>
                    <TableCell>
                      <Chip label={analysis.analysis_type} size="small" />
                    </TableCell>
                    <TableCell>{analysis.intent_category}</TableCell>
                    <TableCell>{new Date(analysis.timestamp).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {externalUsers.length === 0 && !loading && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No external API users found. The API is ready for external applications to connect.
              </Typography>
            </Box>
          )}
        </Box>
      </IntercomCard>
    </IntercomLayout>
  );
}