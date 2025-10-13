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
} from '@mui/material';
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
    prompt: 'Is [Brand Name] trustworthy? What do people think of [Brand Name]?',
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
    prompt: 'Is [Full Name] trustworthy? What do people say about [Full Name]?',
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
  submitLabel = 'Analyze Keyword',
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
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ClientDropdown
              value={data.clientName}
              onChange={handleClientChange}
              fullWidth
              margin="normal"
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Search Term/Keyword"
              value={data.keyword}
              onChange={e => onChange({ ...data, keyword: e.target.value })}
              fullWidth
              margin="normal"
              required
              placeholder="Enter keyword to analyze"
              disabled={disabled}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl component="fieldset" margin="normal">
              <FormLabel component="legend">Analysis Type</FormLabel>
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
              >
                <FormControlLabel
                  value="brand"
                  control={<Radio />}
                  label="Brand"
                  disabled={disabled}
                />
                <FormControlLabel
                  value="individual"
                  control={<Radio />}
                  label="Individual"
                  disabled={disabled}
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Intent Category</InputLabel>
              <Select
                value={data.intentCategory}
                onChange={e => onChange({ ...data, intentCategory: e.target.value })}
                input={<OutlinedInput label="Intent Category" />}
                disabled={disabled}
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
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Analysis Prompt"
              value={data.customPrompt}
              onChange={e => onChange({ ...data, customPrompt: e.target.value })}
              fullWidth
              margin="normal"
              multiline
              rows={3}
              placeholder="Select an intent category above to generate a prompt, or write your own custom prompt"
              helperText="This prompt will be sent to all AI engines. It auto-updates when you change selections above, but you can edit it directly."
              disabled={disabled}
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                },
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl
              fullWidth
              margin="normal"
              required
              error={data.selectedEngines.length === 0}
            >
              <InputLabel>AI Engines *</InputLabel>
              <Select
                multiple
                value={data.selectedEngines}
                onChange={handleEngineChange}
                input={<OutlinedInput label="AI Engines *" />}
                disabled={disabled}
                renderValue={selected => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.length === dataSources.length ? (
                      <Chip key="all" label="ALL ENGINES" size="small" />
                    ) : selected.length > 0 ? (
                      selected.map(value => {
                        const engine = dataSources.find(ds => ds.id === value);
                        return (
                          <Chip
                            key={value}
                            label={engine?.name || `Engine ${value}`}
                            size="small"
                          />
                        );
                      })
                    ) : (
                      <Box sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
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
                  />
                  <ListItemText primary="Select All" />
                </MenuItem>
                <Divider />
                {dataSources.map(engine => (
                  <MenuItem key={engine.id} value={engine.id}>
                    <Checkbox checked={data.selectedEngines.indexOf(engine.id) > -1} />
                    <ListItemText primary={`${engine.name} (${engine.model})`} />
                  </MenuItem>
                ))}
              </Select>
              <Typography
                variant="caption"
                color={data.selectedEngines.length === 0 ? 'error' : 'text.secondary'}
                sx={{ mt: 0.5, mx: 1.5 }}
              >
                {data.selectedEngines.length === 0
                  ? '⚠️ You must select at least one AI engine to run your analysis'
                  : `${data.selectedEngines.length} AI engine${data.selectedEngines.length === 1 ? '' : 's'} selected - Your analysis will run on all selected engines`}
              </Typography>
            </FormControl>
          </Grid>
        </Grid>

        {showSubmitButton && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={onSubmit}
              disabled={disabled || !isFormValid()}
              sx={{ minWidth: 200 }}
            >
              {submitLabel}
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export type { GeoAnalysisFormData };
