import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import dynamic from "next/dynamic";
import {
  TextField,
  Button,
  FormControl,
  FormLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
  InputLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  Typography,
  Box,
  Alert,
} from "@mui/material";
import CopyToClipboardButton from "./CopyToClipboardButton";
import useValidateUserToken from "../hooks/useValidateUserToken";

// Dynamically load JoditEditor to prevent SSR issues
const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

interface PbnFormProps {
  articleTitle: string;
  clientName?: string;
  categories?: string;
  submissionId?: number;
  content: string;
  onSubmit: (title: string, content: string) => void;
}

interface CsvRow {
  title: string;
  content: string;
}

const PbnSubmissionForm: React.FC<PbnFormProps> = ({
  articleTitle,
  clientName = "",
  categories = "",
  submissionId,
  content,
  onSubmit,
}) => {
  // State management
  const [editorContent, setEditorContent] = useState(content); // Independent editor content state
  const [title, setTitle] = useState(articleTitle);
  const [client, setClient] = useState(clientName);
  const [id, setId] = useState(submissionId);
  const [category, setCategory] = useState(categories);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [submissionUrls, setSubmissionUrls] = useState<string[]>([]);
  const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState(false);
  const [submissionType, setSubmissionType] = useState<'individual'|'bulk'>('individual');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = useValidateUserToken();

  // Handle category changes
  const handleCategoryChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value as string);
  };

  // Handle submission type change
  const handleSubmissionTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newType = event.target.value as 'individual' | 'bulk';
    setSubmissionType(newType);
    
    // Reset CSV data when switching back to individual
    if (newType === 'individual') {
      setCsvData([]);
      setCsvFile(null);
      setCsvError(null);
      
      // Reset file input if there is one
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle CSV file selection
  const handleCsvFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setCsvError(null);
    
    // Clear previous data first to ensure UI updates
    setCsvData([]);
    
    if (files && files.length > 0) {
      const file = files[0];
      setCsvFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvContent = e.target?.result as string;
          if (!csvContent || csvContent.trim() === '') {
            setCsvError('CSV file is empty');
            setCsvData([]);
            return;
          }
          
          // Split content by new lines, handling different line endings
          const rows = csvContent.split(/\r?\n/).filter(row => row.trim() !== '');
          
          if (rows.length < 2) { // Need at least header and one data row
            setCsvError('CSV file must have a header row and at least one data row');
            setCsvData([]);
            return;
          }
          
          // Process header row to find title and content columns
          const headerRow = rows[0].toLowerCase();
          // Properly parse CSV handling quotes and commas
          const headerCols = parseCSVRow(headerRow);
          
          const titleIndex = headerCols.findIndex(col => col.trim() === 'title');
          const contentIndex = headerCols.findIndex(col => col.trim() === 'content');
          
          if (titleIndex === -1 || contentIndex === -1) {
            setCsvError('CSV file must have both "title" and "content" columns');
            setCsvData([]);
            return;
          }
          
          // Parse the CSV data
          const parsedData: CsvRow[] = [];
          
          // Process each row (skip header)
          for (let i = 1; i < rows.length; i++) {
            if (rows[i].trim() === '') continue;
            
            const columns = parseCSVRow(rows[i]);
            
            if (columns.length <= Math.max(titleIndex, contentIndex)) {
              console.warn(`Row ${i+1} has fewer columns than expected and will be skipped`);
              continue;
            }
            
            const title = columns[titleIndex]?.trim();
            const content = columns[contentIndex]?.trim();
            
            if (title && content) {
              parsedData.push({ title, content });
            } else {
              console.warn(`Row ${i+1} is missing title or content and will be skipped`);
            }
          }
          
          // Validate data
          if (parsedData.length === 0) {
            setCsvError('No valid rows found in CSV');
            setCsvData([]); // Ensure empty array for the UI
          } else if (parsedData.length > 20) {
            setCsvError('CSV contains more than 20 articles. Only the first 20 will be used.');
            // Create a new array to ensure React detects the state change
            const limitedData = [...parsedData.slice(0, 20)];
            setCsvData(limitedData);
          } else {
            // Create a new array to ensure React detects the state change
            setCsvData([...parsedData]);
          }
        } catch (error) {
          console.error('CSV parsing error:', error);
          setCsvError('Error parsing CSV file');
          setCsvData([]);
        }
      };
      
      reader.onerror = () => {
        setCsvError('Error reading CSV file');
        setCsvData([]);
      };
      
      reader.readAsText(file);
    } else {
      setCsvFile(null);
      setCsvData([]);
    }
  };
  
  // Helper function to parse CSV row handling quotes and commas
  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        // Toggle quote state
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last field
    result.push(current);
    return result;
  };

  // Update state on prop changes
  useEffect(() => {
    setId(submissionId);
    setTitle(articleTitle);
    setClient(clientName);
    setCategory(categories);
    setEditorContent(content); // Reset editor content if `content` prop changes
  }, [articleTitle, clientName, categories, submissionId, content]);

  // Post content to PBN
  const postContentToPbn = async () => {
    try {
      if (submissionType === 'individual') {
        const response = await fetch("/api/postToWordPress", {
          method: "POST",
          body: JSON.stringify({
            title,
            clientName: client,
            content: editorContent,
            userToken: token,
            category,
            tags: [],
            submissionId: id,
          }),
          headers: { "Content-Type": "application/json" },
        });

        if (response.status === 201) {
          const responseData = await response.json();
          setSubmissionUrl(responseData.link);
          setSubmissionUrls([responseData.link]); // Set single URL in the array too
          setIsSubmissionSuccessful(true);
        } else {
          handleError(response);
        }
      } else if (submissionType === 'bulk' && csvData.length > 0) {
        // Call the bulk upload endpoint
        const response = await fetch("/api/bulkPostToWordPress", {
          method: "POST",
          body: JSON.stringify({
            articles: csvData,
            clientName: client,
            userToken: token,
            category,
          }),
          headers: { "Content-Type": "application/json" },
        });

        if (response.status === 201 || response.status === 200) {
          const responseData = await response.json();
          
          // Store all links
          if (responseData.links && responseData.links.length > 0) {
            setSubmissionUrls(responseData.links);
            setSubmissionUrl(responseData.links[0]); // Keep first one in the single URL for backward compatibility
          } else {
            setSubmissionUrls([]);
            setSubmissionUrl("Articles posted successfully, but no links were returned");
          }
          
          setIsSubmissionSuccessful(true);
          alert(`Successfully posted ${responseData.successCount || csvData.length} articles`);
        } else {
          handleError(response);
        }
      } else {
        alert("No CSV data available for bulk upload");
      }
    } catch (error: any) {
      alert("Request error: " + error.message);
      setIsSubmissionSuccessful(false);
    }
  };

  const handleError = async (response: Response) => {
    const responseData = await response.json();
    if (response.status === 400) {
      alert(
        `Article already uploaded to PBN. Submission response: ${responseData.submission_response}`
      );
    } else if (response.status === 404) {
      alert("No active blogs found in database");
    } else {
      alert("Failed to post article to PBN");
    }
    setIsSubmissionSuccessful(false);
  };

  // Input handlers
  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleClientChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setClient(event.target.value);
  };

  const handleContentChange = (newContent: string) => {
    setEditorContent(newContent);
  };

  return (
    <div>
      {isSubmissionSuccessful ? (
        <div>
          {submissionType === 'individual' || submissionUrls.length === 0 ? (
            // Show single URL for individual submissions
            <div>
              <TextField
                fullWidth
                margin="normal"
                value={submissionUrl}
                InputProps={{ readOnly: true }}
                variant="outlined"
              />
              <CopyToClipboardButton text={submissionUrl} />
            </div>
          ) : (
            // Show multiple URLs for bulk submissions
            <div>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Successfully posted {submissionUrls.length} articles
              </Typography>
              <Box sx={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #eee', borderRadius: '4px', p: 2, mt: 2 }}>
                {submissionUrls.map((url, index) => (
                  <Box key={`url-${index}`} sx={{ mb: 2, pb: 2, borderBottom: index < submissionUrls.length - 1 ? '1px solid #eee' : 'none' }}>
                    <Typography variant="body2" gutterBottom><strong>Article {index + 1}:</strong></Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={url}
                      InputProps={{ readOnly: true }}
                      variant="outlined"
                      sx={{ mb: 1 }}
                    />
                    <CopyToClipboardButton text={url} />
                  </Box>
                ))}
              </Box>
            </div>
          )}
        </div>
      ) : (
        <>
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">Submission Type</FormLabel>
            <RadioGroup
              row
              name="submissionType"
              value={submissionType}
              onChange={handleSubmissionTypeChange}
            >
              <FormControlLabel
                value="individual"
                control={<Radio />}
                label="Individual Article"
              />
              <FormControlLabel
                value="bulk"
                control={<Radio />}
                label="Bulk CSV Upload"
              />
            </RadioGroup>
          </FormControl>

          <FormControl component="fieldset" fullWidth>
            <TextField
              label="Client Name"
              value={client}
              fullWidth
              margin="normal"
              required
              placeholder="Client Name"
              onChange={handleClientChange}
            />
          </FormControl>

          <FormControl component="fieldset" fullWidth>
            <InputLabel id="category-select-label">Category</InputLabel>
            <Select
              labelId="category-select-label"
              id="category-select"
              value={category}
              label="Category"
              onChange={handleCategoryChange}
              fullWidth
            >
              {[
                "Business",
                "Finance",
                "Health",
                "Lifestyle",
                "Technology",
                "News",
                "Education",
                "Entrepreneurship",
                "Sports",
                "General",
              ].map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {submissionType === 'individual' ? (
            <>
              <FormControl component="fieldset" fullWidth>
                <TextField
                  label="Article Title"
                  value={title}
                  fullWidth
                  margin="normal"
                  required
                  placeholder="Article Title"
                  onChange={handleTitleChange}
                />
              </FormControl>
              <FormControl component="fieldset" fullWidth>
                <FormLabel>Content</FormLabel>
                <JoditEditor
                  key={`editor-${submissionId || articleTitle}`} // Unique key for each instance
                  value={editorContent}
                  onBlur={handleContentChange} // Update content on blur
                  onChange={handleContentChange} // Update content on each change
                />
              </FormControl>
            </>
          ) : (
            <FormControl component="fieldset" fullWidth>
              <FormLabel>CSV Upload (Max 20 articles)</FormLabel>
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Upload a CSV file with two columns: title and content. Each row will create a separate article.
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  <strong>Format:</strong> Make sure your CSV has &ldquo;title&rdquo; and &ldquo;content&rdquo; in the header row.
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  <strong>Example:</strong> title,content
                  <br />
                  &ldquo;My Article Title&rdquo;,&ldquo;&lt;p&gt;Article content here...&lt;/p&gt;&rdquo;
                </Typography>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  ref={fileInputRef}
                  key={`file-input-${csvData.length}`} // Add key to force re-render when data changes
                  style={{ marginTop: '10px' }}
                />
                {csvError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {csvError}
                  </Alert>
                )}
                {csvData.length > 0 && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Successfully loaded {csvData.length} article{csvData.length !== 1 ? 's' : ''} from CSV
                  </Alert>
                )}
                {csvData.length > 0 && (
                  <Box 
                    sx={{ mt: 2, maxHeight: '200px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px', p: 1 }}
                    key={`preview-box-${csvData.length}-${Date.now()}`} // Add dynamic key to force re-render
                  >
                    <Typography variant="subtitle2" gutterBottom>Preview of loaded articles:</Typography>
                    {csvData.map((article, index) => (
                      <Box key={`article-${index}-${Date.now()}`} sx={{ mb: 1, pb: 1, borderBottom: index < csvData.length - 1 ? '1px solid #eee' : 'none' }}>
                        <Typography variant="body2"><strong>Title {index + 1}:</strong> {article.title.substring(0, 50)}{article.title.length > 50 ? '...' : ''}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </FormControl>
          )}

          <Button 
            onClick={postContentToPbn} 
            variant="contained" 
            color="primary"
            disabled={(submissionType === 'bulk' && csvData.length === 0)}
            sx={{ mt: 2 }}
          >
            Submit
          </Button>
        </>
      )}
    </div>
  );
};

export default PbnSubmissionForm;
