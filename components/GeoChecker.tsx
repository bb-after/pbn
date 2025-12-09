import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Grid,
  Chip,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Fade,
  Slide,
  Step,
  Stepper,
  StepLabel,
  LinearProgress,
  Container,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import GeoPdfExport from './GeoPdfExport';
import GeoAnalysisForm, { GeoAnalysisFormData } from './GeoAnalysisForm';
import { exportToPDF } from '../utils/pdfExporter';
import { formatSuperstarContent } from '../utils/formatSuperstarContent';
import useAuth from '../hooks/useAuth';
import { GeoAnalysisResult, TagFrequency, SourceInfo } from '../utils/ai-engines';
import axios from 'axios';

export default function GeoChecker() {
  const { token, user, isValidUser } = useAuth('/login');
  const [formData, setFormData] = useState<GeoAnalysisFormData>({
    clientName: '',
    keyword: '',
    analysisType: 'brand',
    intentCategory: '',
    customPrompt: '',
    selectedEngines: [],
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeoAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);

  // Carousel state
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Configure Analysis', 'Processing', 'Results'];

  const pdfRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExportPDF = async () => {
    if (!pdfRef.current || !result) return;

    setPdfLoading(true);
    try {
      const filename = `GEO_Analysis_${formData.keyword.replace(/\s+/g, '_')}_${formData.clientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
      await exportToPDF(pdfRef.current, filename);
    } catch (error) {
      console.error('PDF export failed:', error);
      setError('Failed to export PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (
      !formData.clientName.trim() ||
      !formData.keyword.trim() ||
      !formData.intentCategory ||
      formData.selectedEngines.length === 0
    ) {
      setError(
        'Please fill in all fields, select an intent category, and select at least one AI engine.'
      );
      return;
    }

    if (!token) {
      setError('User authentication required. Please refresh the page and try again.');
      return;
    }

    // Move to loading step
    setActiveStep(1);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post('/api/geo-analysis', {
        keyword: formData.keyword.trim(),
        clientName: formData.clientName.trim(),
        selectedEngineIds: formData.selectedEngines,
        customPrompt: formData.customPrompt.trim(),
        analysisType: formData.analysisType,
        intentCategory: formData.intentCategory,
        userToken: token,
      });

      setResult(response.data);
      // Move to results step
      setActiveStep(2);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'An error occurred during analysis');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred during analysis');
      }
      // Go back to form step on error
      setActiveStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewSearch = () => {
    setActiveStep(0);
    setResult(null);
    setError(null);
    setFormData({
      clientName: '',
      keyword: '',
      analysisType: 'brand',
      intentCategory: '',
      customPrompt: '',
      selectedEngines: [],
    });
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '#4caf50';
      case 'negative':
        return '#f44336';
      case 'mixed':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '👍';
      case 'negative':
        return '👎';
      case 'mixed':
        return '⚖️';
      default:
        return '😐';
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Fade in={true} timeout={500}>
            <Box>
              <GeoAnalysisForm
                data={formData}
                onChange={setFormData}
                onSubmit={handleAnalyze}
                submitLabel="Analyze Keyword"
                disabled={false}
              />
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </Fade>
        );
      case 1:
        return (
          <Fade in={true} timeout={500}>
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={60} sx={{ mb: 3 }} />
              <Typography variant="h6" gutterBottom>
                Analyzing &ldquo;{formData.keyword}&rdquo;...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Processing with {formData.selectedEngines.length} AI engine
                {formData.selectedEngines.length !== 1 ? 's' : ''}
              </Typography>
              <LinearProgress sx={{ width: '100%', maxWidth: 400, mx: 'auto' }} />
            </Box>
          </Fade>
        );
      case 2:
        return (
          <Slide direction="left" in={true} timeout={500}>
            <Box>
              {result && (
                <Card>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 3,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TrendingUpIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">
                          Analysis Results for &ldquo;{result.keyword}&rdquo; - {result.clientName}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          startIcon={<RestartAltIcon />}
                          onClick={handleStartNewSearch}
                          sx={{ mr: 1 }}
                        >
                          Start New Search
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={
                            pdfLoading ? <CircularProgress size={16} /> : <PictureAsPdfIcon />
                          }
                          onClick={handleExportPDF}
                          disabled={pdfLoading}
                        >
                          {pdfLoading ? 'Generating...' : 'Export PDF'}
                        </Button>
                      </Box>
                    </Box>

                    {/* Aggregated Insights */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                      {/* Overall Sentiment */}
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3, height: '100%' }}>
                          <Typography variant="h6" gutterBottom>
                            📊 Overall Sentiment
                          </Typography>
                          <Box sx={{ textAlign: 'center', mb: 2 }}>
                            <Typography variant="h2" sx={{ mb: 1 }}>
                              {getSentimentIcon(result.aggregatedInsights.overallSentiment)}
                            </Typography>
                            <Chip
                              label={result.aggregatedInsights.overallSentiment.toUpperCase()}
                              size="medium"
                              sx={{
                                backgroundColor: getSentimentColor(
                                  result.aggregatedInsights.overallSentiment
                                ),
                                color: 'white',
                                fontWeight: 'bold',
                              }}
                            />
                          </Box>

                          <Typography variant="subtitle2" gutterBottom>
                            Breakdown by Engine:
                          </Typography>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" color="success.main">
                              👍 Positive:{' '}
                              {result.aggregatedInsights.sentimentBreakdown.positive.count}
                            </Typography>
                            <Typography variant="body2" color="error.main">
                              👎 Negative:{' '}
                              {result.aggregatedInsights.sentimentBreakdown.negative.count}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              😐 Neutral:{' '}
                              {result.aggregatedInsights.sentimentBreakdown.neutral.count}
                            </Typography>
                            <Typography variant="body2" color="warning.main">
                              ⚖️ Mixed: {result.aggregatedInsights.sentimentBreakdown.mixed.count}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>

                      {/* Top Tags */}
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3, height: '100%' }}>
                          <Typography variant="h6" gutterBottom>
                            🏷️ Top Tags
                          </Typography>
                          {result.aggregatedInsights.topTags.length > 0 ? (
                            <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                              {result.aggregatedInsights.topTags.map((tag, index) => (
                                <Box
                                  key={index}
                                  sx={{
                                    mb: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                  }}
                                >
                                  <Chip
                                    label={tag.tag}
                                    size="small"
                                    variant="outlined"
                                    sx={{ maxWidth: '60%' }}
                                  />
                                  <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="body2" fontWeight="bold">
                                      {tag.count}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {tag.engines.length} engine
                                      {tag.engines.length !== 1 ? 's' : ''}
                                    </Typography>
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No common tags identified
                            </Typography>
                          )}
                        </Paper>
                      </Grid>

                      {/* Sources */}
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 3, height: '100%' }}>
                          <Typography variant="h6" gutterBottom>
                            📚 Sources Mentioned
                          </Typography>
                          {result.aggregatedInsights.sources.length > 0 ? (
                            <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                              {result.aggregatedInsights.sources.map((source, index) => (
                                <Box
                                  key={index}
                                  sx={{
                                    mb: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: source.excerpts ? 'pointer' : 'default',
                                  }}
                                  onClick={() => {
                                    if (source.excerpts && source.excerpts.length > 0) {
                                      setSelectedSource(source);
                                      setSourceModalOpen(true);
                                    }
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontWeight: 'medium',
                                      maxWidth: '70%',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      color: source.excerpts ? 'primary.main' : 'text.primary',
                                      textDecoration: source.excerpts ? 'underline' : 'none',
                                    }}
                                  >
                                    {source.source}
                                  </Typography>
                                  <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="body2" fontWeight="bold">
                                      {source.count}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {source.engines.length} engine
                                      {source.engines.length !== 1 ? 's' : ''}
                                    </Typography>
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No specific sources identified
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    </Grid>

                    {/* URL Sources */}
                    {result.aggregatedInsights.urlSources &&
                      result.aggregatedInsights.urlSources.length > 0 && (
                        <Paper sx={{ p: 3, mb: 3 }}>
                          <Typography variant="h6" gutterBottom>
                            🔗 URLs Referenced by AI Engines
                          </Typography>
                          <Grid container spacing={2}>
                            {result.aggregatedInsights.urlSources.map((urlSource, index) => (
                              <Grid item xs={12} sm={6} md={4} key={index}>
                                <Paper
                                  sx={{
                                    p: 2,
                                    cursor: 'pointer',
                                    '&:hover': { backgroundColor: 'grey.100' },
                                    border: '1px solid',
                                    borderColor: 'grey.300',
                                  }}
                                  onClick={() => {
                                    setSelectedSource(urlSource);
                                    setSourceModalOpen(true);
                                  }}
                                >
                                  <Typography
                                    variant="subtitle2"
                                    sx={{
                                      color: 'primary.main',
                                      textDecoration: 'underline',
                                      mb: 1,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {urlSource.source}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Referenced by {urlSource.engines.join(', ')} ({urlSource.count}{' '}
                                    times)
                                  </Typography>
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </Paper>
                      )}

                    {/* Sentiment Highlights */}
                    {(result.aggregatedInsights.mainSentimentHighlights.positive.length > 0 ||
                      result.aggregatedInsights.mainSentimentHighlights.negative.length > 0) && (
                      <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                          💬 Sentiment Highlights
                        </Typography>

                        <Grid container spacing={2}>
                          {result.aggregatedInsights.mainSentimentHighlights.positive.length >
                            0 && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom color="success.main">
                                👍 Positive Insights:
                              </Typography>
                              {result.aggregatedInsights.mainSentimentHighlights.positive.map(
                                (highlight, index) => (
                                  <Paper
                                    key={index}
                                    sx={{
                                      p: 2,
                                      mb: 1,
                                      backgroundColor: 'success.light',
                                      color: 'success.contrastText',
                                    }}
                                  >
                                    <Typography variant="body2">&quot;{highlight}&quot;</Typography>
                                  </Paper>
                                )
                              )}
                            </Grid>
                          )}

                          {result.aggregatedInsights.mainSentimentHighlights.negative.length >
                            0 && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom color="error.main">
                                👎 Areas for Attention:
                              </Typography>
                              {result.aggregatedInsights.mainSentimentHighlights.negative.map(
                                (highlight, index) => (
                                  <Paper
                                    key={index}
                                    sx={{
                                      p: 2,
                                      mb: 1,
                                      backgroundColor: 'error.light',
                                      color: 'error.contrastText',
                                    }}
                                  >
                                    <Typography variant="body2">&quot;{highlight}&quot;</Typography>
                                  </Paper>
                                )
                              )}
                            </Grid>
                          )}
                        </Grid>
                      </Paper>
                    )}

                    {/* Summary and Themes */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        📋 Analysis Summary
                      </Typography>

                      {result.aggregatedInsights.keyThemes.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Key Themes Identified:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {result.aggregatedInsights.keyThemes.map((theme, index) => (
                              <Chip
                                key={index}
                                label={theme}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Box>
                      )}

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Summary:
                        </Typography>
                        {result.aggregatedInsights.commonInsights.map((insight, index) => (
                          <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                            • {insight}
                          </Typography>
                        ))}
                      </Box>

                      {result.aggregatedInsights.recommendations.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Top Recommendations:
                          </Typography>
                          {result.aggregatedInsights.recommendations
                            .slice(0, 3)
                            .map((rec, index) => (
                              <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                                💡 {rec}
                              </Typography>
                            ))}
                        </Box>
                      )}
                    </Paper>

                    {/* Individual Engine Results */}
                    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                      🤖 Individual Engine Results
                    </Typography>

                    {result.results.map((engineResult, index) => (
                      <Accordion
                        key={index}
                        sx={{ mb: 1, backgroundColor: 'background.paper', color: 'text.primary' }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Typography sx={{ flexGrow: 1, color: 'text.primary' }}>
                              {engineResult.engine} ({engineResult.model})
                            </Typography>
                            {engineResult.error ? (
                              <Chip label="ERROR" size="small" color="error" />
                            ) : (
                              <Chip label="SUCCESS" size="small" color="success" />
                            )}
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {engineResult.error ? (
                            <Alert severity="error">
                              Failed to get results from {engineResult.engine}: {engineResult.error}
                            </Alert>
                          ) : (
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', mb: 2 }}
                                dangerouslySetInnerHTML={{
                                  __html: formatSuperstarContent(engineResult.summary, '').content,
                                }}
                              />

                              {engineResult.sources && engineResult.sources.length > 0 && (
                                <Box
                                  sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}
                                >
                                  <Typography variant="subtitle2" gutterBottom>
                                    🔗 Sources Referenced:
                                  </Typography>
                                  {engineResult.sources.map((source, idx) => (
                                    <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                                      •{' '}
                                      <a
                                        href={source}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#1976d2' }}
                                      >
                                        {source}
                                      </a>
                                    </Typography>
                                  ))}
                                </Box>
                              )}
                            </Box>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    ))}

                    <Box sx={{ mt: 2, textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary">
                        Analysis completed at: {result.timestamp.toLocaleString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Slide>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xl">
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent()}

      {/* Hidden PDF Export Component */}
      {result && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={pdfRef}>
            <GeoPdfExport result={result} />
          </div>
        </div>
      )}

      {/* Source Excerpts Modal */}
      <Dialog
        open={sourceModalOpen}
        onClose={() => setSourceModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Source Excerpts: {selectedSource?.source}</DialogTitle>
        <DialogContent>
          {selectedSource?.excerpts && selectedSource.excerpts.length > 0 ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Referenced by: {selectedSource.engines.join(', ')}
              </Typography>
              {selectedSource.excerpts.map((fullText: string, index: number) => {
                // Highlight URLs in the full text
                let highlightedText = fullText;
                if (selectedSource.urls) {
                  selectedSource.urls.forEach((url: string) => {
                    const urlRegex = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                    highlightedText = highlightedText.replace(
                      urlRegex,
                      `<mark style="background-color: yellow; padding: 2px 4px; border-radius: 3px;"><a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #1976d2; text-decoration: underline;">${url}</a></mark>`
                    );
                  });
                }

                return (
                  <Paper key={index} sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 1, display: 'block' }}
                    >
                      Engine: {selectedSource.engines[index] || 'Unknown'}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                        '& mark': {
                          backgroundColor: 'yellow',
                          padding: '2px 4px',
                          borderRadius: '3px',
                        },
                      }}
                      dangerouslySetInnerHTML={{ __html: highlightedText }}
                    />
                  </Paper>
                );
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No excerpts available for this source.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSourceModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
