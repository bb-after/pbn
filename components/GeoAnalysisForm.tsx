import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Grid,
  Chip,
  Box,
  Divider,
  Paper,
  Stack,
  InputAdornment,
  alpha,
  Avatar,
} from '@mui/material';
import {
  MapPin,
  Target,
  Building2,
  User,
  Search,
  Zap,
  Settings,
  Brain,
  FileText,
} from 'lucide-react';
import ClientDropdown from './ClientDropdown';
import { getAllDataSources } from '../utils/ai-engines';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const BRAND_INTENT_CATEGORIES = [
  {
    value: 'general_overview',
    label: 'General Overview',
    prompt: 'What is [Brand Name]? Tell me about [Brand Name]',
  },
  { value: 'ownership', label: 'Ownership', prompt: 'Who owns [Brand Name]?' },
  {
    value: 'founding_history',
    label: 'Founding & History',
    prompt: "Who founded [Brand Name] and when? What's the story behind [Brand Name]?",
  },
  { value: 'leadership', label: 'Leadership', prompt: 'Who is the CEO of [Brand Name]?' },
  {
    value: 'reputation',
    label: 'Reputation',
    prompt: 'Does [Brand Name] have a good reputation? What do people think of [Brand Name]?',
  },
  {
    value: 'product_service',
    label: 'Product / Service Details',
    prompt: 'What does [Brand Name] do? What products does [Brand Name] offer?',
  },
  {
    value: 'industry_context',
    label: 'Industry Context',
    prompt: 'How does [Brand Name] compare to [Competitor]? What makes [Brand Name] different?',
  },
  {
    value: 'news_controversy',
    label: 'News & Controversy',
    prompt:
      'Has [Brand Name] been in the news recently? What controversies has [Brand Name] been involved in?',
  },
  {
    value: 'reviews_opinion',
    label: 'Reviews / Public Opinion',
    prompt: 'What are people saying about [Brand Name]? Customer reviews for [Brand Name]?',
  },
  {
    value: 'funding_investors',
    label: 'Funding / Investors',
    prompt: 'Who has invested in [Brand Name]? Is [Brand Name] VC-backed?',
  },
  {
    value: 'employment_culture',
    label: 'Employment / Culture',
    prompt: "Is [Brand Name] a good company to work for? What's the culture at [Brand Name]?",
  },
  {
    value: 'legitimacy_scam',
    label: 'Legitimacy / Scam Check',
    prompt: 'Is [Brand Name] legit or a scam?',
  },
];

const INDIVIDUAL_INTENT_CATEGORIES = [
  { value: 'general_overview', label: 'General Overview', prompt: 'Who is [Full Name]?' },
  {
    value: 'background',
    label: 'Background',
    prompt: 'What is [Full Name] known for? What does [Full Name] do?',
  },
  {
    value: 'reputation',
    label: 'Reputation',
    prompt: 'Does [Full Name] have a good reputation? What do people say about [Full Name]?',
  },
  {
    value: 'employment_leadership',
    label: 'Employment / Leadership',
    prompt: "What is [Full Name]'s role at [Company]? Is [Full Name] the CEO of [Company]?",
  },
  {
    value: 'notable_events',
    label: 'Notable Events',
    prompt: 'Has [Full Name] been in the news recently? What is [Full Name] best known for?',
  },
  {
    value: 'net_worth_influence',
    label: 'Net Worth / Influence',
    prompt: "What is [Full Name]'s net worth? How influential is [Full Name]?",
  },
  {
    value: 'social_media',
    label: 'Social Media Presence',
    prompt: 'Where can I find [Full Name] online?',
  },
  {
    value: 'education_credentials',
    label: 'Education / Credentials',
    prompt: "Where did [Full Name] go to school? What is [Full Name]'s background?",
  },
  {
    value: 'affiliation',
    label: 'Affiliation',
    prompt: 'Is [Full Name] affiliated with [Brand/Org]?',
  },
  {
    value: 'legal_controversy',
    label: 'Legal / Controversy',
    prompt: 'Has [Full Name] been involved in any controversies?',
  },
];

interface GeoAnalysisFormData {
  clientName: string;
  keyword: string;
  analysisType: 'brand' | 'individual';
  intentCategory: string;
  customPrompt: string;
  selectedEngines: number[];
}

interface GeoAnalysisFormProps {
  data: GeoAnalysisFormData;
  onChange: (data: GeoAnalysisFormData) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  disabled?: boolean;
  showSubmitButton?: boolean;
  title?: string;
}

export default function GeoAnalysisForm({
  data,
  onChange,
  onSubmit,
  submitLabel = 'Generate GeoIntel Analysis',
  disabled = false,
  showSubmitButton = true,
  title = 'Analysis Configuration',
}: GeoAnalysisFormProps) {
  const dataSources = getAllDataSources().sort((a, b) => a.name.localeCompare(b.name));

  const handleClientChange = (newClientName: string) => {
    const updatedData = { ...data, clientName: newClientName };
    // Auto-populate keyword field with client name if keyword is empty
    if (!data.keyword.trim() && newClientName.trim()) {
      updatedData.keyword = newClientName;
    }
    onChange(updatedData);
  };

  const generatePromptPreview = () => {
    if (!data.intentCategory || !data.keyword.trim()) return '';

    const categories =
      data.analysisType === 'brand' ? BRAND_INTENT_CATEGORIES : INDIVIDUAL_INTENT_CATEGORIES;
    const category = categories.find(cat => cat.value === data.intentCategory);

    if (!category) return '';

    let prompt = category.prompt;

    // Replace placeholders with actual keyword
    if (data.analysisType === 'brand') {
      prompt = prompt.replace(/\[Brand Name\]/g, data.keyword.trim());
      prompt = prompt.replace(/\[Competitor\]/g, 'competitors');
    } else {
      prompt = prompt.replace(/\[Full Name\]/g, data.keyword.trim());
      prompt = prompt.replace(/\[Company\]/g, 'their company');
      prompt = prompt.replace(/\[Brand\/Org\]/g, 'any organization');
    }

    // Add instruction for sources
    prompt += ' Include any links to sources.';

    return prompt;
  };

  // Update custom prompt when intent category or keyword changes
  React.useEffect(() => {
    const newPrompt = generatePromptPreview();
    if (newPrompt !== data.customPrompt) {
      onChange({ ...data, customPrompt: newPrompt });
    }
  }, [data.intentCategory, data.keyword, data.analysisType]);

  const handleEngineChange = (event: any) => {
    const value = event.target.value;
    let newSelectedEngines;

    if (value.includes('all')) {
      newSelectedEngines =
        value.includes('all') && data.selectedEngines.length !== dataSources.length
          ? dataSources.map(ds => ds.id)
          : [];
    } else {
      newSelectedEngines = typeof value === 'string' ? value.split(',').map(Number) : value;
    }

    onChange({ ...data, selectedEngines: newSelectedEngines });
  };

  const isFormValid = () => {
    return (
      data.clientName.trim() &&
      data.keyword.trim() &&
      data.intentCategory &&
      data.selectedEngines.length > 0
    );
  };

  return (
    <Stack spacing={4}>
      {/* Client & Search Configuration */}
      <Paper
        sx={{
          p: 3,
          border: '2px solid',
          borderColor: alpha('#667eea', 0.1),
          borderRadius: 2,
          bgcolor: alpha('#f8fafc', 0.3),
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '2px 2px 0 0',
          },
        }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Target size={20} color="white" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
            Search Configuration
          </Typography>
          <Chip
            label="Essential"
            size="small"
            sx={{
              bgcolor: alpha('#667eea', 0.1),
              color: '#667eea',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ClientDropdown
              value={data.clientName}
              onChange={handleClientChange}
              fullWidth
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: `0 4px 12px -4px ${alpha('#667eea', 0.2)}`,
                  },
                  '&.Mui-focused': {
                    boxShadow: `0 4px 12px -4px ${alpha('#667eea', 0.3)}`,
                  },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Search Term/Keyword"
              value={data.keyword}
              onChange={e => onChange({ ...data, keyword: e.target.value })}
              fullWidth
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: `0 4px 12px -4px ${alpha('#667eea', 0.2)}`,
                  },
                  '&.Mui-focused': {
                    boxShadow: `0 4px 12px -4px ${alpha('#667eea', 0.3)}`,
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#667eea',
                  fontWeight: 500,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} color="#667eea" />
                  </InputAdornment>
                ),
              }}
              placeholder="Brand name or individual name to analyze"
              disabled={disabled}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Analysis Type & Intent */}
      <Paper
        sx={{
          p: 3,
          border: '2px solid',
          borderColor: alpha('#10b981', 0.1),
          borderRadius: 2,
          bgcolor: alpha('#ecfdf5', 0.3),
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
            borderRadius: '2px 2px 0 0',
          },
        }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPin size={20} color="white" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#10b981' }}>
            Analysis Type & Intent
          </Typography>
          <Chip
            label="Strategic"
            size="small"
            sx={{
              bgcolor: alpha('#10b981', 0.1),
              color: '#10b981',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        </Box>
        
        <Stack spacing={3}>
          <FormControl component="fieldset">
            <FormLabel 
              component="legend"
              sx={{
                color: '#10b981',
                fontWeight: 600,
                '&.Mui-focused': {
                  color: '#10b981',
                },
              }}
            >
              Analysis Type
            </FormLabel>
            <RadioGroup
              value={data.analysisType}
              onChange={e => {
                onChange({
                  ...data,
                  analysisType: e.target.value as 'brand' | 'individual',
                  intentCategory: '', // Reset intent when changing type
                });
              }}
              row
              sx={{ mt: 1 }}
            >
              <FormControlLabel
                value="brand"
                control={
                  <Radio
                    sx={{
                      color: '#10b981',
                      '&.Mui-checked': {
                        color: '#10b981',
                      },
                    }}
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Building2 size={18} color="#10b981" />
                    <Typography sx={{ fontWeight: 500 }}>Brand Analysis</Typography>
                  </Box>
                }
                disabled={disabled}
              />
              <FormControlLabel
                value="individual"
                control={
                  <Radio
                    sx={{
                      color: '#10b981',
                      '&.Mui-checked': {
                        color: '#10b981',
                      },
                    }}
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <User size={18} color="#10b981" />
                    <Typography sx={{ fontWeight: 500 }}>Individual Analysis</Typography>
                  </Box>
                }
                disabled={disabled}
              />
            </RadioGroup>
          </FormControl>

          <FormControl fullWidth required>
            <InputLabel
              sx={{
                color: '#10b981',
                fontWeight: 500,
                '&.Mui-focused': {
                  color: '#10b981',
                },
              }}
            >
              Intent Category
            </InputLabel>
            <Select
              value={data.intentCategory}
              onChange={e => onChange({ ...data, intentCategory: e.target.value })}
              input={<OutlinedInput label="Intent Category" />}
              disabled={disabled}
              sx={{
                borderRadius: 2,
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  boxShadow: `0 4px 12px -4px ${alpha('#10b981', 0.2)}`,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#10b981',
                  boxShadow: `0 4px 12px -4px ${alpha('#10b981', 0.3)}`,
                },
              }}
            >
              {(data.analysisType === 'brand'
                ? BRAND_INTENT_CATEGORIES
                : INDIVIDUAL_INTENT_CATEGORIES
              ).map(category => (
                <MenuItem key={category.value} value={category.value}>
                  {category.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Custom Prompt */}
      <Paper
        sx={{
          p: 3,
          border: '2px solid',
          borderColor: alpha('#8b5cf6', 0.1),
          borderRadius: 2,
          bgcolor: alpha('#faf5ff', 0.3),
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)',
            borderRadius: '2px 2px 0 0',
          },
        }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={20} color="white" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#7c3aed' }}>
            Analysis Prompt
          </Typography>
          <Chip
            label="Auto-Generated"
            size="small"
            sx={{
              bgcolor: alpha('#8b5cf6', 0.1),
              color: '#7c3aed',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        </Box>
        
        <TextField
          label="Custom Analysis Prompt"
          value={data.customPrompt}
          onChange={e => onChange({ ...data, customPrompt: e.target.value })}
          fullWidth
          multiline
          rows={4}
          placeholder="Select an intent category above to auto-generate a prompt, or write your own custom prompt"
          helperText="This prompt will be sent to all selected AI engines. It auto-updates when you change selections above, but you can edit it directly."
          disabled={disabled}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: `0 4px 12px -4px ${alpha('#8b5cf6', 0.2)}`,
              },
              '&.Mui-focused': {
                boxShadow: `0 4px 12px -4px ${alpha('#8b5cf6', 0.3)}`,
              },
            },
            '& .MuiInputLabel-root': {
              color: '#7c3aed',
              fontWeight: 500,
            },
            '& .MuiInputBase-input': {
              fontFamily: 'ui-monospace, "SF Mono", "Monaco", "Cascadia Code", "Roboto Mono", monospace',
              fontSize: '0.9rem',
              lineHeight: 1.6,
            },
          }}
        />
      </Paper>

      {/* AI Engine Selection */}
      <Paper
        sx={{
          p: 3,
          border: '2px solid',
          borderColor: alpha('#f59e0b', 0.1),
          borderRadius: 2,
          bgcolor: alpha('#fffbeb', 0.3),
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '2px 2px 0 0',
          },
        }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Brain size={20} color="white" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#d97706' }}>
            AI Engine Selection
          </Typography>
          <Chip
            label="Required"
            size="small"
            sx={{
              bgcolor: alpha('#f59e0b', 0.1),
              color: '#d97706',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        </Box>
        
        <FormControl
          fullWidth
          required
          error={data.selectedEngines.length === 0}
        >
          <InputLabel
            sx={{
              color: '#d97706',
              fontWeight: 500,
              '&.Mui-focused': {
                color: '#d97706',
              },
            }}
          >
            AI Engines *
          </InputLabel>
          <Select
            multiple
            value={data.selectedEngines}
            onChange={handleEngineChange}
            input={<OutlinedInput label="AI Engines *" />}
            disabled={disabled}
            sx={{
              borderRadius: 2,
              '&:hover .MuiOutlinedInput-notchedOutline': {
                boxShadow: `0 4px 12px -4px ${alpha('#f59e0b', 0.2)}`,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#d97706',
                boxShadow: `0 4px 12px -4px ${alpha('#f59e0b', 0.3)}`,
              },
            }}
            renderValue={selected => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.length === dataSources.length ? (
                  <Chip 
                    key="all" 
                    label="🤖 ALL ENGINES" 
                    size="small"
                    sx={{
                      bgcolor: alpha('#f59e0b', 0.1),
                      color: '#d97706',
                      fontWeight: 600,
                    }}
                  />
                ) : selected.length > 0 ? (
                  selected.map(value => {
                    const engine = dataSources.find(ds => ds.id === value);
                    return (
                      <Chip
                        key={value}
                        label={engine?.name || `Engine ${value}`}
                        size="small"
                        sx={{
                          bgcolor: alpha('#f59e0b', 0.1),
                          color: '#d97706',
                          fontWeight: 500,
                        }}
                      />
                    );
                  })
                ) : (
                  <Box sx={{ color: 'text.secondary', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Settings size={16} />
                    Select AI models to run your analysis
                  </Box>
                )}
              </Box>
            )}
            MenuProps={MenuProps}
          >
            <MenuItem key="all" value="all">
              <Checkbox
                checked={data.selectedEngines.length === dataSources.length}
                indeterminate={
                  data.selectedEngines.length > 0 &&
                  data.selectedEngines.length < dataSources.length
                }
                sx={{
                  color: '#f59e0b',
                  '&.Mui-checked': {
                    color: '#d97706',
                  },
                }}
              />
              <ListItemText primary="🚀 Select All AI Engines" />
            </MenuItem>
            <Divider />
            {dataSources.map(engine => (
              <MenuItem key={engine.id} value={engine.id}>
                <Checkbox 
                  checked={data.selectedEngines.indexOf(engine.id) > -1}
                  sx={{
                    color: '#f59e0b',
                    '&.Mui-checked': {
                      color: '#d97706',
                    },
                  }}
                />
                <ListItemText primary={`🤖 ${engine.name} (${engine.model})`} />
              </MenuItem>
            ))}
          </Select>
          <Typography
            variant="caption"
            color={data.selectedEngines.length === 0 ? 'error' : 'text.secondary'}
            sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            {data.selectedEngines.length === 0 ? (
              <>⚠️ You must select at least one AI engine to run your analysis</>
            ) : (
              <>
                ✅ {data.selectedEngines.length} AI engine{data.selectedEngines.length === 1 ? '' : 's'} selected - Your analysis will run on all selected engines
              </>
            )}
          </Typography>
        </FormControl>
      </Paper>

      {showSubmitButton && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
          <Button
            variant="contained"
            size="large"
            onClick={onSubmit}
            disabled={disabled || !isFormValid()}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontSize: '1.1rem',
              fontWeight: 600,
              textTransform: 'none',
              minWidth: 250,
              boxShadow: `0 8px 25px -8px ${alpha('#667eea', 0.4)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 12px 30px -8px ${alpha('#667eea', 0.5)}`,
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              },
              '&:active': {
                transform: 'translateY(0px)',
              },
              '&:disabled': {
                background: alpha('#667eea', 0.3),
                color: alpha('#fff', 0.5),
                transform: 'none',
                boxShadow: 'none',
              },
            }}
            startIcon={<Zap size={20} />}
          >
            {submitLabel}
          </Button>
        </Box>
      )}
    </Stack>
  );
}

export type { GeoAnalysisFormData };
