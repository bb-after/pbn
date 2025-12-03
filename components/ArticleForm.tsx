import React from 'react';
import axios from 'axios';
import {
  TextField,
  Box,
  FormControl,
  FormControlLabel,
  Select,
  MenuItem,
  Checkbox,
  FormLabel,
  FormGroup,
  InputLabel,
  Button,
  TextareaAutosize,
  SelectChangeEvent,
  Paper,
  Typography,
  Stack,
  InputAdornment,
  alpha,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  Hash,
  FileText,
  Link2,
  Zap,
  Globe,
  Palette,
  Settings,
  Sparkles,
} from 'lucide-react';
import BacklinkInputs from './BacklinkInputs';

interface ArticleFormProps {
  handleSubmit: (e: React.FormEvent) => void;
  wordCount: number;
  setWordCount: React.Dispatch<React.SetStateAction<number>>;
  articleCount: number;
  setArticleCount: React.Dispatch<React.SetStateAction<number>>;
  keywords: string;
  setKeywords: React.Dispatch<React.SetStateAction<string>>;
  keywordsToExclude: string;
  setKeywordsToExclude: React.Dispatch<React.SetStateAction<string>>;
  sourceUrl: string;
  setSourceUrl: React.Dispatch<React.SetStateAction<string>>;
  sourceContent: string;
  setSourceContent: React.Dispatch<React.SetStateAction<string>>;
  useSourceContent: boolean;
  setUseSourceContent: React.Dispatch<React.SetStateAction<boolean>>;
  engine: string;
  handleEngineChange: (e: SelectChangeEvent) => void;
  handleLanguage: (e: SelectChangeEvent) => void;
  language: string;
  backlinks: string[];
  setBacklinks: React.Dispatch<React.SetStateAction<string[]>>;
  tone: string[];
  handleToneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  otherInstructions: string;
  setOtherInstructions: React.Dispatch<React.SetStateAction<string>>;
}

const ArticleForm: React.FC<ArticleFormProps> = ({
  handleSubmit,
  wordCount,
  setWordCount,
  articleCount,
  setArticleCount,
  keywords,
  setKeywords,
  keywordsToExclude,
  setKeywordsToExclude,
  sourceUrl,
  setSourceUrl,
  sourceContent,
  setSourceContent,
  useSourceContent,
  setUseSourceContent,
  engine,
  handleEngineChange,
  language,
  handleLanguage,
  backlinks,
  setBacklinks,
  tone,
  handleToneChange,
  otherInstructions,
  setOtherInstructions,
}) => {
  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={4}>
        {/* Content Configuration */}
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
              <FileText size={20} color="white" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#667eea' }}>
              Content Configuration
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
          
          <Stack spacing={3}>
            <TextField
              label="Word Count"
              value={wordCount}
              onChange={e => setWordCount(Number(e.target.value))}
              type="number"
              defaultValue={520}
              sx={{
                maxWidth: 280,
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
                    <Hash size={18} color="#667eea" />
                  </InputAdornment>
                ),
              }}
              placeholder="Approximate count"
              required
            />
            <TextField
              label="Keywords"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
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
                    <Sparkles size={18} color="#667eea" />
                  </InputAdornment>
                ),
              }}
              placeholder="name, company, location, hobbies & interests, business ventures..."
            />
            <TextField
              label="Keywords to Exclude (Optional)"
              value={keywordsToExclude}
              onChange={e => setKeywordsToExclude(e.target.value)}
              fullWidth
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
                  color: 'text.secondary',
                  fontWeight: 500,
                },
              }}
              placeholder="Comma separated terms to avoid"
            />
          </Stack>
        </Paper>

        {/* Source Material */}
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
              <Link2 size={20} color="white" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#10b981' }}>
              Source Material
            </Typography>
            <Chip
              label="Optional"
              size="small"
              sx={{
                bgcolor: alpha('#10b981', 0.1),
                color: '#10b981',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
          </Box>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={useSourceContent}
                onChange={e => setUseSourceContent(e.target.checked)}
                sx={{
                  color: '#10b981',
                  '&.Mui-checked': {
                    color: '#10b981',
                  },
                }}
              />
            }
            label={
              <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>
                Use pasted source content instead of URL
              </Typography>
            }
          />
          
          {useSourceContent ? (
            <Box mt={2}>
              <TextareaAutosize
                minRows={4}
                placeholder="Paste your source content here for AI analysis..."
                value={sourceContent}
                onChange={e => setSourceContent(e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `2px solid ${alpha('#10b981', 0.2)}`,
                  backgroundColor: alpha('#f0fdf4', 0.5),
                  color: 'inherit',
                  resize: 'vertical',
                  transition: 'all 0.3s ease',
                }}
              />
            </Box>
          ) : (
            <Box mt={2}>
              <TextField
                label="Source URL (Optional)"
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: `0 4px 12px -4px ${alpha('#10b981', 0.2)}`,
                    },
                    '&.Mui-focused': {
                      boxShadow: `0 4px 12px -4px ${alpha('#10b981', 0.3)}`,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#10b981',
                    fontWeight: 500,
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Globe size={18} color="#10b981" />
                    </InputAdornment>
                  ),
                }}
                placeholder="Article URL for AI to analyze and use as context"
              />
            </Box>
          )}
        </Paper>
        {/* AI Engine Settings */}
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
              <Zap size={20} color="white" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#d97706' }}>
              AI Engine Settings
            </Typography>
            <Chip
              label="Advanced"
              size="small"
              sx={{
                bgcolor: alpha('#f59e0b', 0.1),
                color: '#d97706',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
          </Box>
          
          <Stack spacing={3} direction={{ xs: 'column', md: 'row' }}>
            <FormControl sx={{ minWidth: 280 }}>
              <InputLabel
                sx={{
                  color: '#d97706',
                  fontWeight: 500,
                  '&.Mui-focused': {
                    color: '#d97706',
                  },
                }}
              >
                AI Engine
              </InputLabel>
              <Select
                value={engine}
                label="AI Engine"
                onChange={handleEngineChange}
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
              >
                <MenuItem value={'gpt-5-mini'}>🚀 GPT 5 Mini (Latest & Fastest)</MenuItem>
                <MenuItem value={'gpt-4o-mini'}>⚡ GPT 4.0 Mini (Fast)</MenuItem>
                <MenuItem value={'gpt-4'}>🧠 GPT 4 (Advanced)</MenuItem>
                <MenuItem value={'claude-3-5-sonnet-20241022'}>
                  🎯 Claude 3.5 Sonnet (Most Intelligent)
                </MenuItem>
                <MenuItem value={'claude-3-5-haiku-20241022'}>💨 Claude 3.5 Haiku (Fastest)</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel
                sx={{
                  color: '#d97706',
                  fontWeight: 500,
                  '&.Mui-focused': {
                    color: '#d97706',
                  },
                }}
              >
                Language
              </InputLabel>
              <Select
                value={language}
                label="Language"
                onChange={handleLanguage}
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
              >
                <MenuItem value={'English'}>🇺🇸 English</MenuItem>
                <MenuItem value={'Arabic'}>🇸🇦 Arabic</MenuItem>
                <MenuItem value={'Italian'}>🇮🇹 Italian</MenuItem>
                <MenuItem value={'French'}>🇫🇷 French</MenuItem>
                <MenuItem value={'German'}>🇩🇪 German</MenuItem>
                <MenuItem value={'Hebrew'}>🇮🇱 Hebrew</MenuItem>
                <MenuItem value={'Hindu'}>🇮🇳 Hindi</MenuItem>
                <MenuItem value={'Portuguese'}>🇵🇹 Portuguese</MenuItem>
                <MenuItem value={'Brazilian Portuguese'}>🇧🇷 Portuguese (Brazil)</MenuItem>
                <MenuItem value={'Romanian'}>🇷🇴 Romanian</MenuItem>
                <MenuItem value={'Spanish'}>🇪🇸 Spanish</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Paper>
        {/* Backlinks Section */}
        <BacklinkInputs backlinks={backlinks} setBacklinks={setBacklinks} />

        {/* Content Style & Tone */}
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
              <Palette size={20} color="white" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#7c3aed' }}>
              Content Style & Tone
            </Typography>
            <Chip
              label="Creative"
              size="small"
              sx={{
                bgcolor: alpha('#8b5cf6', 0.1),
                color: '#7c3aed',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
          </Box>
          
          <FormControl component="fieldset">
            <FormLabel
              component="legend"
              sx={{
                color: '#7c3aed',
                fontWeight: 600,
                '&.Mui-focused': {
                  color: '#7c3aed',
                },
              }}
            >
              Select Writing Tone
            </FormLabel>
            <FormGroup sx={{ mt: 2 }}>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {[
                  { value: 'formal', label: 'Formal', emoji: '🎩' },
                  { value: 'informal', label: 'Informal', emoji: '😊' },
                  { value: 'journalistic', label: 'Journalistic', emoji: '📰' },
                  { value: 'joyful', label: 'Joyful', emoji: '🎉' },
                  { value: 'optimistic', label: 'Optimistic', emoji: '✨' },
                  { value: 'sincere', label: 'Sincere', emoji: '💝' },
                  { value: 'humorous', label: 'Humorous', emoji: '😄' },
                ].map(toneType => (
                  <FormControlLabel
                    key={toneType.value}
                    control={
                      <Checkbox
                        checked={tone.includes(toneType.value)}
                        onChange={handleToneChange}
                        value={toneType.value}
                        sx={{
                          color: '#8b5cf6',
                          '&.Mui-checked': {
                            color: '#7c3aed',
                          },
                        }}
                      />
                    }
                    label={`${toneType.emoji} ${toneType.label}`}
                    sx={{
                      '& .MuiFormControlLabel-label': {
                        fontWeight: 500,
                        color: 'text.primary',
                      },
                    }}
                  />
                ))}
              </Box>
            </FormGroup>
          </FormControl>
        </Paper>

        {/* Additional Instructions */}
        <Paper
          sx={{
            p: 3,
            border: '2px solid',
            borderColor: alpha('#6b7280', 0.1),
            borderRadius: 2,
            bgcolor: alpha('#f9fafb', 0.3),
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)',
              borderRadius: '2px 2px 0 0',
            },
          }}
        >
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={20} color="white" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#4b5563' }}>
              Additional Instructions
            </Typography>
            <Chip
              label="Optional"
              size="small"
              sx={{
                bgcolor: alpha('#6b7280', 0.1),
                color: '#4b5563',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            />
          </Box>
          
          <TextareaAutosize
            minRows={4}
            placeholder="Any specific requirements or additional context for the AI to consider..."
            value={otherInstructions}
            onChange={e => setOtherInstructions(e.target.value)}
            style={{
              width: '100%',
              fontSize: '1rem',
              fontFamily: 'inherit',
              padding: '12px',
              borderRadius: '8px',
              border: `2px solid ${alpha('#6b7280', 0.2)}`,
              backgroundColor: alpha('#f9fafb', 0.5),
              color: 'inherit',
              resize: 'vertical',
              transition: 'all 0.3s ease',
            }}
          />
        </Paper>
        {/* Generate Button */}
        <Box sx={{ pt: 2 }}>
          <Button
            variant="contained"
            type="submit"
            size="large"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontSize: '1.1rem',
              fontWeight: 600,
              textTransform: 'none',
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
            }}
            startIcon={<Zap size={20} />}
          >
            Generate PostAgent Content
          </Button>
        </Box>
      </Stack>
    </form>
  );
};

export default ArticleForm;
