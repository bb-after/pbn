import React from 'react';
import { TextField, Box, FormControl, FormControlLabel, Select, MenuItem, Checkbox, FormLabel, FormGroup, InputLabel, Button, TextareaAutosize, SelectChangeEvent } from '@mui/material';
import BacklinkInputs from './BacklinkInputs'; // Import your BacklinkInputs component

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
    gptVersion: string;
    handleGptVersionChange: (e: SelectChangeEvent) => void;
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
  keywords,
  setKeywords,
  keywordsToExclude,
  setKeywordsToExclude,
  sourceUrl,
  setSourceUrl,
  gptVersion,
  handleGptVersionChange,
  language,
  handleLanguage,
  backlinks,
  setBacklinks,
  tone,
  handleToneChange,
  otherInstructions,
  setOtherInstructions,
}) => (
    <form onSubmit={handleSubmit}>

    <TextField
      label="Word Count"
      value={wordCount}
      onChange={(e) => setWordCount(Number(e.target.value))}
      margin="normal"
      type="number"
      defaultValue={520}
      style={{width: 250}}
      placeholder='Approximate count'
      required
    />
   
    <TextField
      label="Keywords"
      value={keywords}
      onChange={(e) => setKeywords(e.target.value)}
      fullWidth
      margin="normal"
      required
      placeholder='Comma separated - eg. name, company, location, hobbies & interests, other business ventures, etc.'
    />

    <TextField
      label="Keywords to Exclude (Optional)"
      value={keywordsToExclude}
      onChange={(e) => setKeywordsToExclude(e.target.value)}
      fullWidth
      margin="normal"
      placeholder='Comma separated'
    />
    <br />

    <TextField
      label="Source Url (Optional)"
      value={sourceUrl}
      onChange={(e) => setSourceUrl(e.target.value)}
      fullWidth
      margin="normal"
      placeholder='An article that system should use for context'
    />

    <br /><br />

    <Box>
      <FormControl>
        <InputLabel>GPT Engine</InputLabel>
        <Select
          autoWidth
          value={gptVersion}
          label="GPT Version"
          onChange={handleGptVersionChange}
        >
        <MenuItem value={"gpt-3.5-turbo"}>GPT 3.5 Turbo (faster)</MenuItem>
        <MenuItem value={"gpt-4"}>GPT 4 (more advanced, slower)</MenuItem>
        </Select>
      </FormControl>
    </Box>
    <br /> <br />
    <Box>
      <FormControl>
        <InputLabel>Language</InputLabel>
        <Select
          autoWidth
          value={language}
          label="Language"
          onChange={handleLanguage}
        >
        <MenuItem value={"English"}>English</MenuItem>
        <MenuItem value={"Arabic"}>Arabic</MenuItem>
        <MenuItem value={"Italian"}>Italian</MenuItem>
        <MenuItem value={"French"}>French</MenuItem>
        <MenuItem value={"German"}>German</MenuItem>
        <MenuItem value={"Hebrew"}>Hebrew</MenuItem>
        <MenuItem value={"Hindu"}>Hindu</MenuItem>
        <MenuItem value={"Portuguese"}>Portuguese</MenuItem>
        <MenuItem value={"Brazilian Portuguese"}>Portuguese (Brazil)</MenuItem>
        <MenuItem value={"Romanian"}>Romanian</MenuItem>
        <MenuItem value={"Spanish"}>Spanish</MenuItem>
        </Select>
      </FormControl>
    </Box>

    <br></br>
    <BacklinkInputs backlinks={backlinks} setBacklinks={setBacklinks} />
    <br></br>
    <br></br>
    <FormControl component="fieldset">
      <FormLabel component="legend">Tone</FormLabel>
      <FormGroup>
        <FormControlLabel
          control={
            <Checkbox
              checked={tone.includes('formal')}
              onChange={handleToneChange}
              value="formal"
            />
          }
          label="Formal"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={tone.includes('informal')}
              onChange={handleToneChange}
              value="informal"
            />
          }
          label="Informal"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={tone.includes('journalistic')}
              onChange={handleToneChange}
              value="journalistic"
            />
          }
          label="Journalistic"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={tone.includes('joyful')}
              onChange={handleToneChange}
              value="joyful"
            />
          }
          label="Joyful"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={tone.includes('optimistic')}
              onChange={handleToneChange}
              value="optimistic"
            />
          }
          label="Optimistic"
        />

      <FormControlLabel
          control={
            <Checkbox
              checked={tone.includes('sincere')}
              onChange={handleToneChange}
              value="sincere"
            />
          }
          label="Sincere"
        />

      <FormControlLabel
          control={
            <Checkbox
              checked={tone.includes('humorous')}
              onChange={handleToneChange}
              value="humorous"
            />
          }
          label="Humorous"
        />

      </FormGroup>
    </FormControl>

    <TextareaAutosize
      minRows={4}
      placeholder="Other Instructions (optional)"
      value={otherInstructions}
      onChange={(e) => setOtherInstructions(e.target.value)}
      style={{ width: '100%', marginTop: 20, fontFamily: 'Roboto', fontWeight: 400, fontSize: '1rem', padding: '0.5rem' }}
    />

    <Button variant="contained" type="submit">Give me the PB and the J</Button>

  </form>
);

export default ArticleForm;
