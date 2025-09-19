import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
  Collapse,
  Divider,
} from '@mui/material';
import { IntercomLayout, IntercomCard, ToastProvider } from '../components/ui';
import useValidateUserToken from 'hooks/useValidateUserToken';
import UnauthorizedAccess from '../components/UnauthorizedAccess';
import axios from 'axios';

export default function GeoRunsPage() {
  return (
    <ToastProvider>
      <GeoRuns />
    </ToastProvider>
  );
}

function GeoRuns() {
  const { token } = useValidateUserToken();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, any>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<number, boolean>>({});

  const loadRuns = async () => {
    setLoading(true);
    try {
      const resp = await axios.get('/api/geo/runs?limit=50');
      setRuns(resp.data.runs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (runId: number) => {
    setLoadingDetails(prev => ({ ...prev, [runId]: true }));
    try {
      const resp = await axios.get(`/api/geo/runs/${runId}`);
      setDetails(prev => ({ ...prev, [runId]: resp.data }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(prev => ({ ...prev, [runId]: false }));
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  if (!token) return <UnauthorizedAccess />;

  return (
    <IntercomLayout title="GEO Runs" breadcrumbs={[{ label: 'GEO' }, { label: 'Runs' }]}>
      <IntercomCard>
        <Box p={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Recent Runs</Typography>
            <Box>
              <Button variant="outlined" onClick={loadRuns} sx={{ mr: 1 }} disabled={loading}>
                {loading ? <CircularProgress size={18} /> : 'Refresh'}
              </Button>
              <Button
                variant="contained"
                onClick={async () => {
                  setProcessing(true);
                  try {
                    await axios.post('/api/geo/runs/process');
                    await loadRuns();
                  } finally {
                    setProcessing(false);
                  }
                }}
                disabled={processing}
              >
                {processing ? <CircularProgress size={18} /> : 'Process Runs Now'}
              </Button>
            </Box>
          </Box>

          {runs.length === 0 && <Typography variant="body2">No runs found.</Typography>}

          <Grid container spacing={2}>
            {runs.map(run => (
              <Grid item xs={12} key={run.run_id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle1" gutterBottom>
                          {run.run_date} • {run.client_name} • {run.keyword}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          Prompt: {run.base_text}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Engines: {run.engines_count} • Avg Visibility{' '}
                          {Number(run.avg_visibility_score || 0).toFixed(2)} • Avg Position{' '}
                          {Number(run.avg_position || 0).toFixed(2)} • Citation Share{' '}
                          {Number(run.avg_citation_share || 0).toFixed(2)} • Mentions{' '}
                          {run.total_mentions || 0}
                        </Typography>
                      </Box>
                      <Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={async () => {
                            const newId = expandedRunId === run.run_id ? null : run.run_id;
                            setExpandedRunId(newId);
                            if (newId && !details[newId]) {
                              await loadDetails(newId);
                            }
                          }}
                        >
                          {expandedRunId === run.run_id ? 'Hide Details' : 'View Details'}
                        </Button>
                      </Box>
                    </Box>
                    <Collapse in={expandedRunId === run.run_id} timeout="auto" unmountOnExit>
                      <Divider sx={{ my: 2 }} />
                      {loadingDetails[run.run_id] && <CircularProgress size={18} />}
                      {!loadingDetails[run.run_id] && details[run.run_id] && (
                        <Box>
                          {(details[run.run_id].results || []).map((r: any) => (
                            <Box key={r.result_id} sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Engine #{r.engine_id}
                              </Typography>
                              <Typography variant="body2" gutterBottom>
                                Summary: {r.raw_summary || '—'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                URLs: {(r.found_urls || []).join(', ') || '—'}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Collapse>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </IntercomCard>
    </IntercomLayout>
  );
}
