import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Select,
  TextField,
  Typography,
  FormControl,
  InputLabel,
} from '@mui/material';
import { IntercomLayout, ToastProvider, IntercomCard } from '../components/ui';
import UnauthorizedAccess from '../components/UnauthorizedAccess';
import useAuth from '../hooks/useAuth';
import ClientDropdown from '../components/ClientDropdown';
import axios from 'axios';

type AnalysisType = 'brand' | 'individual';

export default function GeoCompetitiveAnalysisPage() {
  return (
    <ToastProvider>
      <GeoCompetitiveAnalysis />
    </ToastProvider>
  );
}

function GeoCompetitiveAnalysis() {
  const { token } = useAuth('/login');
  const [step, setStep] = useState(1);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('brand');
  const [clientName, setClientName] = useState('');
  const [keyword, setKeyword] = useState('');
  const [topics, setTopics] = useState<string>('general, visibility, citations');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<
    Record<string, { prompt_id?: number; text: string; selected?: boolean }[]>
  >({});

  const isAuthorized = Boolean(token);

  const parsedTopics = useMemo(
    () =>
      topics
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .slice(0, 8),
    [topics]
  );

  const selectedCount = useMemo(
    () =>
      Object.values(generated)
        .flat()
        .filter(p => p.selected).length,
    [generated]
  );

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const resp = await axios.post('/api/geo/prompts/generate', {
        brandOrName: keyword, // Use keyword as the brand/name for prompt generation
        analysisType,
        topics: parsedTopics,
      });
      const g: Record<string, { prompt_id?: number; text: string; selected?: boolean }[]> = {};
      (resp.data.generated as any[]).forEach(item => {
        g[item.topic] = (item.prompts as any[]).map(p => ({
          prompt_id: p.prompt_id,
          text: p.base_text,
        }));
      });
      setGenerated(g);
      setStep(2);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (topic: string, idx: number) => {
    setGenerated(prev => {
      const copy = { ...prev } as any;
      const arr = [...copy[topic]];
      const item = { ...arr[idx] };
      const nextSelected = !item.selected;
      const currentSelected = Object.values(copy)
        .flat()
        .filter((p: any) => p.selected).length;
      if (nextSelected && currentSelected >= 10) return prev; // enforce limit
      item.selected = nextSelected;
      arr[idx] = item;
      copy[topic] = arr;
      return copy;
    });
  };

  const handleSave = async () => {
    const items = Object.values(generated)
      .flat()
      .filter(p => p.selected && p.prompt_id)
      .map(p => ({ prompt_id: p.prompt_id as number }));

    if (items.length === 0) {
      console.error('No valid prompts selected to save');
      return;
    }

    await axios.post('/api/geo/prompts/selection', {
      clientName,
      keyword,
      analysisType,
      items,
    });
    setStep(3);
  };

  return (
    <IntercomLayout
      title="GEO Competitive Analysis"
      breadcrumbs={[{ label: 'GEO' }, { label: 'Competitive Analysis' }]}
    >
      <IntercomCard>
        <Box p={3}>
          {!isAuthorized ? (
            <UnauthorizedAccess />
          ) : (
            <>
              {step === 1 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Step 1: Configure Analysis
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <ClientDropdown
                          value={clientName}
                          onChange={newClientName => {
                            setClientName(newClientName);
                            // Auto-populate keyword with client name if keyword is empty
                            if (!keyword.trim() && newClientName.trim()) {
                              setKeyword(newClientName);
                            }
                          }}
                          fullWidth
                          label="Client Name"
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Search Term / Keyword"
                          value={keyword}
                          onChange={e => setKeyword(e.target.value)}
                          required
                          helperText="Auto-filled from client name, edit as needed"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Analysis Type</InputLabel>
                          <Select
                            value={analysisType}
                            onChange={e => setAnalysisType(e.target.value as AnalysisType)}
                            label="Analysis Type"
                          >
                            <MenuItem value="brand">Brand</MenuItem>
                            <MenuItem value="individual">Individual</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Topics (comma-separated)"
                          value={topics}
                          onChange={e => setTopics(e.target.value)}
                          helperText="Max 8 topics, e.g: general, visibility, citations"
                        />
                      </Grid>
                    </Grid>
                    <Box mt={3}>
                      <Button
                        variant="contained"
                        onClick={handleGenerate}
                        disabled={loading || !clientName.trim() || !keyword.trim()}
                        size="large"
                      >
                        {loading ? <CircularProgress size={20} /> : 'Generate Prompts'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              )}
              {step === 2 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Step 2: Select up to 10 prompts
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      Analysis for: <strong>{keyword}</strong> (Client: {clientName})
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Selected: {selectedCount} / 10
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={2}>
                      {Object.entries(generated).map(([topic, prompts]) => (
                        <Grid item xs={12} key={topic}>
                          <Typography variant="subtitle1" gutterBottom>
                            {topic}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {prompts.map((p, idx) => (
                              <Chip
                                key={`${topic}-${idx}`}
                                label={p.text}
                                onClick={() => toggleSelect(topic, idx)}
                                color={p.selected ? 'primary' : 'default'}
                                variant={p.selected ? 'filled' : 'outlined'}
                              />
                            ))}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                    <Box mt={2}>
                      <Button variant="outlined" onClick={() => setStep(1)} sx={{ mr: 1 }}>
                        Back
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={selectedCount === 0}
                        sx={{ mr: 1 }}
                      >
                        Save Selection
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        disabled={selectedCount === 0}
                        onClick={async () => {
                          const items = Object.values(generated)
                            .flat()
                            .filter(p => p.selected && p.prompt_id)
                            .map(p => ({ prompt_id: p.prompt_id as number }));
                          if (items.length === 0) return;
                          setLoading(true);
                          try {
                            await axios.post('/api/geo/prompts/selection?runNow=true', {
                              clientName,
                              keyword,
                              analysisType,
                              items,
                            });
                            setStep(3);
                          } catch (error) {
                            console.error('Error running analysis:', error);
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        {loading ? <CircularProgress size={20} /> : 'Run Now'}
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              )}
              {step === 3 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      ✅ Analysis Successfully Submitted
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      Your competitive analysis has been set up for <strong>{keyword}</strong>{' '}
                      (Client: {clientName})
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Selected {selectedCount} prompts will be processed and results will be
                      available in:
                    </Typography>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        📍 Where to find your results:
                      </Typography>
                      <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                        <li>
                          <strong>GEO Runs</strong> - Monitor the processing status of your
                          scheduled runs
                        </li>
                        <li>
                          <strong>GEO History</strong> - View completed analysis results and
                          detailed insights
                        </li>
                        <li>
                          Daily scheduled runs will continue automatically based on your selection
                        </li>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        onClick={() => (window.location.href = '/geo-runs')}
                      >
                        View GEO Runs
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => (window.location.href = '/geo-analysis-history')}
                      >
                        View GEO History
                      </Button>
                      <Button
                        variant="text"
                        onClick={() => {
                          setStep(1);
                          setClientName('');
                          setKeyword('');
                          setGenerated({});
                        }}
                      >
                        Start New Analysis
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </Box>
      </IntercomCard>
    </IntercomLayout>
  );
}
