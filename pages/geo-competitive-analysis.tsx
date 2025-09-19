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
} from '@mui/material';
import { IntercomLayout, ToastProvider, IntercomCard } from '../components/ui';
import UnauthorizedAccess from '../components/UnauthorizedAccess';
import useValidateUserToken from 'hooks/useValidateUserToken';
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
  const { token } = useValidateUserToken();
  const [step, setStep] = useState(1);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('brand');
  const [brandOrName, setBrandOrName] = useState('');
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
        brandOrName,
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
      clientName: brandOrName,
      keyword: brandOrName,
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
                      Step 1: Configure
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Select
                          fullWidth
                          value={analysisType}
                          onChange={e => setAnalysisType(e.target.value as AnalysisType)}
                        >
                          <MenuItem value="brand">Brand</MenuItem>
                          <MenuItem value="individual">Individual</MenuItem>
                        </Select>
                      </Grid>
                      <Grid item xs={12} md={8}>
                        <TextField
                          fullWidth
                          label={analysisType === 'brand' ? 'Brand Name' : 'Full Name'}
                          value={brandOrName}
                          onChange={e => setBrandOrName(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Topics (comma-separated)"
                          value={topics}
                          onChange={e => setTopics(e.target.value)}
                        />
                      </Grid>
                    </Grid>
                    <Box mt={2}>
                      <Button
                        variant="contained"
                        onClick={handleGenerate}
                        disabled={loading || !brandOrName.trim()}
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
                          await axios.post('/api/geo/prompts/selection?runNow=true', {
                            clientName: brandOrName,
                            keyword: brandOrName,
                            analysisType,
                            items,
                          });
                          setStep(3);
                        }}
                      >
                        Run Now
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              )}
              {step === 3 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Selection saved
                    </Typography>
                    <Typography variant="body2">
                      Daily runs will be scheduled for the selected prompts.
                    </Typography>
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
