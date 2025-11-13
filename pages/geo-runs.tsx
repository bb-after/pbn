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
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { IntercomLayout, IntercomCard, ToastProvider } from '../components/ui';
import useAuth from '../hooks/useAuth';
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
  const { token } = useAuth('/login');
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<number, any>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<number, boolean>>({});

  // Group runs by client
  const groupedRuns = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    runs.forEach(run => {
      const clientName = run.client_name || 'Unknown Client';
      if (!groups[clientName]) {
        groups[clientName] = [];
      }
      groups[clientName].push(run);
    });

    // Sort clients alphabetically and runs within each client by date (newest first)
    const sortedGroups: Record<string, any[]> = {};
    Object.keys(groups)
      .sort()
      .forEach(clientName => {
        sortedGroups[clientName] = groups[clientName].sort(
          (a, b) => new Date(b.run_date).getTime() - new Date(a.run_date).getTime()
        );
      });

    return sortedGroups;
  }, [runs]);

  const toggleClientExpansion = (clientName: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientName)) {
      newExpanded.delete(clientName);
    } else {
      newExpanded.add(clientName);
    }
    setExpandedClients(newExpanded);
  };

  const getClientStats = (clientRuns: any[]) => {
    const totalRuns = clientRuns.length;
    const runsWithResults = clientRuns.filter(run => run.engines_count > 0).length;
    const pendingRuns = totalRuns - runsWithResults;
    const avgVisibility =
      clientRuns.reduce((sum, run) => sum + (Number(run.avg_visibility_score) || 0), 0) / totalRuns;
    const avgPosition =
      clientRuns.reduce((sum, run) => sum + (Number(run.avg_position) || 0), 0) / totalRuns;

    // Find the next scheduled run time for pending runs
    const nextScheduledRun = clientRuns
      .filter(run => run.engines_count === 0 && run.estimated_next_run)
      .sort(
        (a, b) =>
          new Date(a.estimated_next_run).getTime() - new Date(b.estimated_next_run).getTime()
      )[0];

    return {
      totalRuns,
      runsWithResults,
      pendingRuns,
      avgVisibility,
      avgPosition,
      nextScheduledRun: nextScheduledRun?.estimated_next_run,
    };
  };

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
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Scheduled GEO Prompt Runs
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This shows automated runs from the GEO prompt scheduling system. These are different
              from the manual analyses you create in &ldquo;GEO Analysis&rdquo; - those can be found
              in &ldquo;GEO History&rdquo;. Scheduled runs are triggered automatically based on
              configured prompts and selections.
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Recent Scheduled Runs</Typography>
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

          {Object.entries(groupedRuns).map(([clientName, clientRuns]) => {
            const stats = getClientStats(clientRuns);
            const isExpanded = expandedClients.has(clientName);

            return (
              <Accordion key={clientName} expanded={isExpanded} sx={{ mb: 2 }}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  onClick={() => toggleClientExpansion(clientName)}
                  sx={{
                    backgroundColor: 'background.default',
                    '&:hover': { backgroundColor: 'action.hover' },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      mr: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">{clientName}</Typography>
                      <Chip
                        label={`${stats.totalRuns} runs`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      {stats.pendingRuns > 0 && (
                        <Chip
                          label={
                            stats.nextScheduledRun
                              ? `${stats.pendingRuns} pending • Next: ${new Date(
                                  stats.nextScheduledRun
                                ).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}`
                              : `${stats.pendingRuns} pending`
                          }
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                      {stats.runsWithResults > 0 && (
                        <Chip
                          label={`${stats.runsWithResults} completed`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mr: 1 }}>
                      {stats.runsWithResults > 0 && (
                        <>
                          <Chip
                            label={`Avg Vis: ${stats.avgVisibility.toFixed(2)}`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={`Avg Pos: ${stats.avgPosition.toFixed(2)}`}
                            size="small"
                            variant="outlined"
                          />
                        </>
                      )}
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {clientRuns.map(run => (
                      <Grid item xs={12} key={run.run_id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  {run.run_date} • {run.keyword}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  gutterBottom
                                  sx={{ color: 'text.secondary' }}
                                >
                                  {run.base_text}
                                </Typography>
                                {run.engines_count > 0 ? (
                                  <Typography variant="caption" color="text.secondary">
                                    Engines: {run.engines_count} • Visibility:{' '}
                                    {Number(run.avg_visibility_score || 0).toFixed(2)} • Position:{' '}
                                    {Number(run.avg_position || 0).toFixed(2)} • Citations:{' '}
                                    {Number(run.avg_citation_share || 0).toFixed(2)} • Mentions:{' '}
                                    {run.total_mentions || 0}
                                  </Typography>
                                ) : (
                                  <Box
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}
                                  >
                                    <Chip
                                      label="No results yet"
                                      size="small"
                                      color="default"
                                      variant="outlined"
                                    />
                                    {run.estimated_next_run && (
                                      <Typography variant="caption" color="text.secondary">
                                        • Scheduled:{' '}
                                        {new Date(run.estimated_next_run).toLocaleString()}
                                      </Typography>
                                    )}
                                  </Box>
                                )}
                              </Box>
                              {run.engines_count > 0 && (
                                <Box>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={async () => {
                                      const newId =
                                        expandedRunId === run.run_id ? null : run.run_id;
                                      setExpandedRunId(newId);
                                      if (newId && !details[newId]) {
                                        await loadDetails(newId);
                                      }
                                    }}
                                  >
                                    {expandedRunId === run.run_id ? 'Hide Details' : 'View Details'}
                                  </Button>
                                </Box>
                              )}
                            </Box>
                            <Collapse
                              in={expandedRunId === run.run_id}
                              timeout="auto"
                              unmountOnExit
                            >
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
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      </IntercomCard>
    </IntercomLayout>
  );
}
