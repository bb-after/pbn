import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import dynamic from 'next/dynamic';
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
} from '@mui/material';
import ClientDropdown from 'components/ClientDropdown';
import CopyToClipboardButton from './CopyToClipboardButton';
import useAuth from '../hooks/useAuth';
import { useTheme as useMuiTheme } from '@mui/material/styles';

// Use the same editor as Superstar: ReactQuill
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

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

interface UploadMethod {
  id: string;
  name: string;
  description: string;
}

// Import mammoth.js for DOCX processing
import * as mammoth from 'mammoth';

const PbnSubmissionForm: React.FC<PbnFormProps> = ({
  articleTitle,
  clientName = '',
  categories = '',
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
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionUrls, setSubmissionUrls] = useState<string[]>([]);
  const [isSubmissionSuccessful, setIsSubmissionSuccessful] = useState(false);
  const [submissionType, setSubmissionType] = useState<'individual' | 'bulk'>('individual');
  const [uploadMethod, setUploadMethod] = useState<string>('docx');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [docxFiles, setDocxFiles] = useState<File[]>([]);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [docxError, setDocxError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);

  // Available upload methods
  const uploadMethods: UploadMethod[] = [
    {
      id: 'docx',
      name: 'Word Documents',
      description: 'Upload DOCX files from Google Docs with formatting preserved',
    },
    {
      id: 'csv',
      name: 'CSV File',
      description: 'Upload a CSV file with title and content columns',
    },
    {
      id: 'docs',
      name: 'HTML Files',
      description: 'Upload HTML exports from Google Docs',
    },
  ];
  const { token } = useAuth('/login');

  // Handle category changes
  const handleCategoryChange = (event: SelectChangeEvent) => {
    setCategory(event.target.value as string);
  };

  // Handle submission type change
  const handleSubmissionTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newType = event.target.value as 'individual' | 'bulk';
    setSubmissionType(newType);

    // Reset all upload data when switching types
    if (newType === 'individual') {
      setCsvData([]);
      setCsvFile(null);
      setCsvError(null);
      setDocFiles([]);
      setDocError(null);
      setDocxFiles([]);
      setDocxError(null);

      // Reset file inputs if they exist
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (docInputRef.current) {
        docInputRef.current.value = '';
      }
      if (docxInputRef.current) {
        docxInputRef.current.value = '';
      }
    }
  };

  // Handle upload method change
  const handleUploadMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMethod = event.target.value;
    setUploadMethod(newMethod);

    // Reset data for the previous method
    setCsvData([]);
    setCsvFile(null);
    setCsvError(null);
    setDocFiles([]);
    setDocError(null);
    setDocxFiles([]);
    setDocxError(null);

    // Reset file inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (docInputRef.current) {
      docInputRef.current.value = '';
    }
    if (docxInputRef.current) {
      docxInputRef.current.value = '';
    }
  };

  // Handle Google Doc HTML files upload
  const handleDocFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setDocError(null);
    setDocFiles([]);
    setCsvData([]);

    if (files && files.length > 0) {
      // Convert FileList to array
      const fileArray = Array.from(files);

      // Check if we have too many files
      if (fileArray.length > 20) {
        setDocError('Maximum 20 files allowed. Only the first 20 will be used.');
        setDocFiles(fileArray.slice(0, 20));
      } else {
        setDocFiles(fileArray);
      }

      // Process HTML files to extract content
      const processFiles = async () => {
        const parsedData: CsvRow[] = [];

        for (const file of fileArray.slice(0, 20)) {
          // Only process HTML files
          if (
            !file.name.toLowerCase().endsWith('.html') &&
            !file.name.toLowerCase().endsWith('.htm')
          ) {
            console.warn(`File ${file.name} is not an HTML file and will be skipped`);
            continue;
          }

          try {
            // Read file content
            const content = await readFileAsText(file);

            // Extract title and content
            // For Google Docs HTML exports, we'll assume:
            // 1. The first line is the title
            // 2. The rest is the content with preserved formatting

            // Create a temporary div to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;

            // Get the title (either first heading or first paragraph)
            let title = '';
            const headings = tempDiv.querySelectorAll('h1, h2, h3');
            if (headings.length > 0) {
              title = headings[0].textContent || '';
              // Remove the heading node after extracting the title
              headings[0].parentNode?.removeChild(headings[0]);
            } else {
              // If no heading, try to use the first paragraph
              const firstPara = tempDiv.querySelector('p');
              if (firstPara) {
                title = firstPara.textContent || '';
                // Remove the first paragraph after extracting the title
                firstPara.parentNode?.removeChild(firstPara);
              } else {
                // Last resort: use filename without extension
                title = file.name.replace(/\.(html|htm)$/i, '');
              }
            }

            // The rest is the content with preserved formatting
            const htmlContent = tempDiv.innerHTML;

            if (title && htmlContent) {
              parsedData.push({
                title: title.trim(),
                content: htmlContent,
              });
            }
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
          }
        }

        if (parsedData.length === 0) {
          setDocError('No valid HTML files found or content could not be extracted.');
        } else {
          setCsvData(parsedData); // Reuse the same state for all upload methods
        }
      };

      processFiles();
    }
  };

  // Helper function to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsText(file);
    });
  };

  // Function to handle DOCX file uploads
  const handleDocxFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setDocxError(null);
    setDocxFiles([]);
    setCsvData([]);

    if (files && files.length > 0) {
      // Convert FileList to array
      const fileArray = Array.from(files);

      // Check if we have too many files
      if (fileArray.length > 50) {
        setDocxError('Maximum 50 files allowed. Only the first 50 will be used.');
        setDocxFiles(fileArray.slice(0, 50));
      } else {
        setDocxFiles(fileArray);
      }

      // Process DOCX files to extract content
      const processFiles = async () => {
        const parsedData: CsvRow[] = [];

        // Process each DOCX file with mammoth.js
        for (const file of fileArray.slice(0, 20)) {
          // Only process DOCX files
          if (!file.name.toLowerCase().endsWith('.docx')) {
            console.warn(`File ${file.name} is not a DOCX file and will be skipped`);
            continue;
          }

          try {
            // Extract title from the filename (we'll use this as fallback)
            const filenameTitle = file.name.replace(/\.docx$/i, '');

            // Use mammoth.js to convert DOCX to HTML
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            const htmlContent = result.value; // This preserves hyperlinks and formatting

            // Try to extract a better title from the first heading in the document
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;

            // Look for the first heading as title
            let title = '';
            const headings = tempDiv.querySelectorAll('h1, h2, h3');
            if (headings.length > 0) {
              title = headings[0].textContent || '';
              // Remove the heading from content since we're using it as title
              headings[0].parentNode?.removeChild(headings[0]);
            } else {
              // If no heading, try to use the first paragraph
              const firstPara = tempDiv.querySelector('p');
              if (firstPara) {
                title = firstPara.textContent || '';
                // Remove the first paragraph after extracting the title
                firstPara.parentNode?.removeChild(firstPara);
              } else {
                // Last resort: use filename
                title = filenameTitle;
              }
            }

            // Use the updated HTML content (with heading/title removed)
            const finalHtmlContent = title !== filenameTitle ? tempDiv.innerHTML : htmlContent;

            parsedData.push({
              title: title.trim(),
              content: finalHtmlContent,
            });
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
          }
        }

        if (parsedData.length === 0) {
          setDocxError('No valid DOCX files found or content could not be extracted.');
        } else {
          setCsvData(parsedData); // Reuse the same state for all upload methods
        }
      };

      processFiles();
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
      reader.onload = e => {
        try {
          const csvContent = e.target?.result as string;
          if (!csvContent || csvContent.trim() === '') {
            setCsvError('CSV file is empty');
            setCsvData([]);
            return;
          }

          // We need to parse the CSV properly to handle quoted content with newlines
          // First, identify where actual CSV rows end by tracking quote state
          const csvRows: string[] = [];
          let currentRow = '';
          let inQuotes = false;

          for (let i = 0; i < csvContent.length; i++) {
            const char = csvContent[i];

            // Handle quotes
            if (char === '"') {
              if (i + 1 < csvContent.length && csvContent[i + 1] === '"') {
                // Escaped quote inside quoted content
                currentRow += '"';
                i++; // Skip the next quote
              } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                currentRow += char;
              }
            }
            // Handle newlines
            else if ((char === '\n' || char === '\r') && !inQuotes) {
              // Skip carriage return if followed by newline
              if (char === '\r' && i + 1 < csvContent.length && csvContent[i + 1] === '\n') {
                i++; // Skip the \n
              }

              // Only add non-empty rows
              if (currentRow.trim()) {
                csvRows.push(currentRow);
              }
              currentRow = '';
            }
            // Add all other characters
            else {
              currentRow += char;
            }
          }

          // Add the last row if not empty
          if (currentRow.trim()) {
            csvRows.push(currentRow);
          }

          if (csvRows.length < 2) {
            // Need at least header and one data row
            setCsvError('CSV file must have a header row and at least one data row');
            setCsvData([]);
            return;
          }

          // Process header row to find title and content columns
          const headerRow = csvRows[0].toLowerCase();
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
          for (let i = 1; i < csvRows.length; i++) {
            const columns = parseCSVRow(csvRows[i]);

            if (columns.length <= Math.max(titleIndex, contentIndex)) {
              console.warn(`Row ${i + 1} has fewer columns than expected and will be skipped`);
              continue;
            }

            // Get title and content, preserving whitespace in content
            let title = columns[titleIndex]?.trim() || '';
            let content = columns[contentIndex] || '';

            // Remove enclosing quotes if present
            if (title.startsWith('"') && title.endsWith('"')) {
              title = title.slice(1, -1).trim();
            }

            if (content.startsWith('"') && content.endsWith('"')) {
              content = content.slice(1, -1);
              // Preserve paragraphs by replacing double quotes with proper HTML
              content = content.replace(/""/g, '"');
            }

            if (title && content) {
              parsedData.push({ title, content });
            } else {
              console.warn(`Row ${i + 1} is missing title or content and will be skipped`);
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

          console.log('Parsed CSV data:', parsedData);
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

  // Helper function to parse CSV row handling quotes, commas, and preserving newlines
  const parseCSVRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];

      if (char === '"') {
        // Check if it's an escaped quote (double quote inside quoted field)
        if (inQuotes && i + 1 < row.length && row[i + 1] === '"') {
          current += '"'; // Add the actual quote character
          i++; // Skip the next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
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
        const response = await fetch('/api/postToWordPress', {
          method: 'POST',
          body: JSON.stringify({
            title,
            clientName: client,
            content: editorContent,
            userToken: token,
            category,
            tags: [],
            submissionId: id,
          }),
          headers: { 'Content-Type': 'application/json' },
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
        const response = await fetch('/api/bulkPostToWordPress', {
          method: 'POST',
          body: JSON.stringify({
            articles: csvData,
            clientName: client,
            userToken: token,
            category,
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.status === 201 || response.status === 200) {
          const responseData = await response.json();

          // Check if any articles were successfully posted
          if (
            responseData.successCount > 0 &&
            responseData.links &&
            responseData.links.length > 0
          ) {
            // Success case - at least some articles were posted
            setSubmissionUrls(responseData.links);
            setSubmissionUrl(responseData.links[0]); // Keep first one in the single URL for backward compatibility
            setIsSubmissionSuccessful(true);
            alert(`Successfully posted ${responseData.successCount} articles`);
          } else if (responseData.failedCount > 0) {
            // All articles failed case
            setIsSubmissionSuccessful(false);

            // Set failed submissions for display
            setFailedSubmissions(responseData.failed);

            // Show brief error alert
            alert(`Failed to post articles. See details on screen.`);
          } else {
            // No success, no failures (shouldn't happen, but handle it anyway)
            setSubmissionUrls([]);
            setSubmissionUrl('No articles were processed');
            setIsSubmissionSuccessful(false);
            alert('No articles were processed. Please try again.');
          }
        } else {
          handleError(response);
        }
      } else {
        alert('No CSV data available for bulk upload');
      }
    } catch (error: any) {
      alert('Request error: ' + error.message);
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
      alert('No active blogs found in database');
    } else {
      alert('Failed to post article to PBN');
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

  // State for tracking failed submissions for display
  const [failedSubmissions, setFailedSubmissions] = useState<{ title: string; error: string }[]>(
    []
  );
  const muiTheme = useMuiTheme();

  return (
    <div>
      {isSubmissionSuccessful || failedSubmissions.length > 0 ? (
        <div>
          {isSubmissionSuccessful ? (
            // Success case
            <>
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
                  <Box
                    sx={{
                      maxHeight: '400px',
                      overflow: 'auto',
                      border: '1px solid #eee',
                      borderRadius: '4px',
                      p: 2,
                      mt: 2,
                    }}
                  >
                    {submissionUrls.map((url, index) => (
                      <Box
                        key={`url-${index}`}
                        sx={{
                          mb: 2,
                          pb: 2,
                          borderBottom:
                            index < submissionUrls.length - 1 ? '1px solid #eee' : 'none',
                        }}
                      >
                        <Typography variant="body2" gutterBottom>
                          <strong>Article {index + 1}:</strong>
                        </Typography>
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
            </>
          ) : failedSubmissions.length > 0 ? (
            // Failure case
            <div>
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to post articles. Please check the errors below.
              </Alert>
              <Box
                sx={{
                  maxHeight: '400px',
                  overflow: 'auto',
                  border: '1px solid #eee',
                  borderRadius: '4px',
                  p: 2,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Submission Errors:
                </Typography>
                {failedSubmissions.map((failure, index) => (
                  <Box
                    key={`error-${index}`}
                    sx={{
                      mb: 2,
                      pb: 2,
                      borderBottom:
                        index < failedSubmissions.length - 1 ? '1px solid #eee' : 'none',
                    }}
                  >
                    <Typography variant="body2" gutterBottom>
                      <strong>{failure.title}</strong>
                    </Typography>
                    <Typography variant="body2" color="error">
                      Error: {failure.error}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Button
                onClick={() => setFailedSubmissions([])}
                variant="outlined"
                color="primary"
                sx={{ mt: 2 }}
              >
                Try Again
              </Button>
            </div>
          ) : null}
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
              <FormControlLabel value="individual" control={<Radio />} label="Individual Article" />
              <FormControlLabel value="bulk" control={<Radio />} label="Bulk Upload" />
            </RadioGroup>
          </FormControl>

          <FormControl component="fieldset" fullWidth>
            <ClientDropdown
              value={client}
              onChange={val => setClient(val)}
              onClientIdChange={id => {
                /* optional, keep existing clientId state logic elsewhere if needed */
              }}
              fullWidth
              margin="normal"
              required
              label="Client Name"
              enableCreate={true}
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
                'Business',
                'Finance',
                'Health',
                'Lifestyle',
                'Technology',
                'News',
                'Education',
                'Entrepreneurship',
                'Sports',
                'General',
              ].map(cat => (
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
                <Box
                  sx={{
                    '& .ql-container': {
                      backgroundColor: muiTheme.palette.background.paper,
                      color: muiTheme.palette.text.primary,
                      borderRadius: 1,
                    },
                    '& .ql-editor': {
                      color: muiTheme.palette.text.primary,
                      minHeight: 200,
                    },
                  }}
                >
                  <ReactQuill
                    key={`editor-${submissionId || articleTitle}`}
                    value={editorContent}
                    onChange={handleContentChange}
                  />
                </Box>
              </FormControl>
            </>
          ) : (
            <FormControl component="fieldset" fullWidth>
              <FormLabel>Bulk Upload (Max 50 articles)</FormLabel>

              <RadioGroup
                row
                name="uploadMethod"
                value={uploadMethod}
                onChange={handleUploadMethodChange}
                sx={{ mb: 2, mt: 1 }}
              >
                {uploadMethods.map(method => (
                  <FormControlLabel
                    key={method.id}
                    value={method.id}
                    control={<Radio />}
                    label={method.name}
                  />
                ))}
              </RadioGroup>

              <Box sx={{ mt: 2, mb: 2 }}>
                {uploadMethod === 'csv' && (
                  <>
                    <Typography variant="body2" gutterBottom>
                      Upload a CSV file with two columns: title and content. Each row will create a
                      separate article.
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      <strong>Format:</strong> Make sure your CSV has &ldquo;title&rdquo; and
                      &ldquo;content&rdquo; in the header row.
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      <strong>Example:</strong> title,content
                      <br />
                      &ldquo;My Article Title&rdquo;,&ldquo;&lt;p&gt;Article content
                      here...&lt;/p&gt;&rdquo;
                    </Typography>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      ref={fileInputRef}
                      key={`file-input-${csvData.length}`}
                      style={{ marginTop: '10px' }}
                    />
                    {csvError && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {csvError}
                      </Alert>
                    )}
                  </>
                )}

                {uploadMethod === 'docs' && (
                  <>
                    <Typography variant="body2" gutterBottom>
                      Upload HTML files exported from Google Docs. The system will extract the title
                      from the first heading or paragraph.
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      <strong>How to export from Google Docs:</strong>
                    </Typography>
                    <ol>
                      <li>
                        In Google Docs, go to File &gt; Download &gt; Web Page (.html, zipped)
                      </li>
                      <li>Extract the ZIP file(s)</li>
                      <li>Upload the HTML file(s) here</li>
                    </ol>
                    <input
                      type="file"
                      accept=".html,.htm"
                      onChange={handleDocFilesChange}
                      ref={docInputRef}
                      multiple
                      key={`doc-input-${docFiles.length}`}
                      style={{ marginTop: '10px' }}
                    />
                    {docError && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {docError}
                      </Alert>
                    )}
                  </>
                )}

                {uploadMethod === 'docx' && (
                  <>
                    <Typography variant="body2" gutterBottom>
                      Upload DOCX files exported from Google Docs. This preserves all formatting,
                      including hyperlinks.
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      <strong>How to export from Google Docs:</strong>
                    </Typography>
                    <ol>
                      <li>In Google Docs, go to File &gt; Download &gt; Microsoft Word (.docx)</li>
                      <li>Upload the DOCX file(s) here (select multiple files if needed)</li>
                    </ol>
                    <input
                      type="file"
                      accept=".docx"
                      onChange={handleDocxFilesChange}
                      ref={docxInputRef}
                      multiple
                      key={`docx-input-${docxFiles.length}`}
                      style={{ marginTop: '10px' }}
                    />
                    {docxError && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {docxError}
                      </Alert>
                    )}
                  </>
                )}

                {csvData.length > 0 && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Successfully loaded {csvData.length} article{csvData.length !== 1 ? 's' : ''}
                  </Alert>
                )}

                {csvData.length > 0 && (
                  <Box
                    sx={{
                      mt: 2,
                      maxHeight: '300px',
                      overflow: 'auto',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      p: 1,
                    }}
                    key={`preview-box-${csvData.length}-${Date.now()}`} // Add dynamic key to force re-render
                  >
                    <Typography variant="subtitle2" gutterBottom>
                      Preview of loaded articles:
                    </Typography>
                    {csvData.map((article, index) => (
                      <Box
                        key={`article-${index}-${Date.now()}`}
                        sx={{
                          mb: 2,
                          pb: 2,
                          borderBottom: index < csvData.length - 1 ? '1px solid #eee' : 'none',
                        }}
                      >
                        <Typography variant="body2">
                          <strong>Title {index + 1}:</strong> {article.title.substring(0, 70)}
                          {article.title.length > 70 ? '...' : ''}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          sx={{ mt: 0.5, fontSize: '0.8rem' }}
                        >
                          <strong>Content preview:</strong>{' '}
                          {article.content.substring(0, 100).replace(/\n/g, ' ')}
                          {article.content.length > 100 ? '...' : ''}
                        </Typography>
                        {uploadMethod === 'docs' || uploadMethod === 'docx' ? (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{ mt: 0.5, fontSize: '0.8rem' }}
                          >
                            <strong>Format:</strong>{' '}
                            {uploadMethod === 'docx'
                              ? 'DOCX with preserved formatting & links'
                              : 'HTML with preserved formatting'}
                          </Typography>
                        ) : (
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{ mt: 0.5, fontSize: '0.8rem' }}
                          >
                            <strong>Paragraphs:</strong> {article.content.split(/\n+/).length}
                          </Typography>
                        )}
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
            disabled={submissionType === 'bulk' && csvData.length === 0}
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
