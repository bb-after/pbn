import React, { useState, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  Stack,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import LayoutContainer from 'components/LayoutContainer';
import StyledHeader from 'components/StyledHeader';
import useValidateUserToken from 'hooks/useValidateUserToken';
import axios from 'axios';
import { useRouter } from 'next/router';
import Image from 'next/image';

interface CSVRow {
  Company: string;
  Keyword: string;
  URL: string;
  rowNumber: number;
}

interface ValidationError {
  rowNumber: number;
  missingFields: string[];
}

export default function LeadEnricherPage() {
  const router = useRouter();
  const { isValidUser, token } = useValidateUserToken();
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateCSVData = (data: any[]): { isValid: boolean; errors: ValidationError[] } => {
    const errors: ValidationError[] = [];
    const requiredFields = ['Company', 'Keyword', 'URL'];

    data.forEach((row, index) => {
      const missingFields: string[] = [];

      requiredFields.forEach(field => {
        if (!row[field] || String(row[field]).trim() === '') {
          missingFields.push(field);
        }
      });

      if (missingFields.length > 0) {
        errors.push({
          rowNumber: index + 2, // +2 because index starts at 0 and we want to account for header row
          missingFields,
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
    const data = [];

    // Create a mapping of normalized headers to original headers
    const headerMap: { [key: string]: string } = {};
    headers.forEach(header => {
      headerMap[header.toLowerCase()] = header;
    });

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      // Also add normalized keys for easier access
      row.Company = row[headerMap['company']] || '';
      row.Keyword = row[headerMap['keyword']] || '';
      row.URL = row[headerMap['url']] || '';

      data.push(row);
    }

    return data;
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setUploading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const csvText = e.target?.result as string;
        const parsedData = parseCSV(csvText);

        if (parsedData.length === 0) {
          setError('The CSV file appears to be empty');
          setUploading(false);
          return;
        }

        // Check if required columns exist
        const requiredColumns = ['Company', 'Keyword', 'URL'];
        const firstRow = parsedData[0];
        const availableColumns = Object.keys(firstRow);

        // Check case insensitive
        const availableColumnsLower = availableColumns.map(col => col.toLowerCase());
        const missingColumns = requiredColumns.filter(
          col => !availableColumnsLower.includes(col.toLowerCase())
        );

        if (missingColumns.length > 0) {
          setError(
            `Missing required columns: ${missingColumns.join(', ')}. Please ensure your CSV has columns named: Company, Keyword, URL (case insensitive)`
          );
          setUploading(false);
          return;
        }

        // Validate data
        const validation = validateCSVData(parsedData);

        // Transform data to include row numbers
        const transformedData: CSVRow[] = parsedData.map((row, index) => ({
          Company: row.Company,
          Keyword: row.Keyword,
          URL: row.URL,
          rowNumber: index + 2, // +2 for header row and 1-based indexing
        }));

        setCsvData(transformedData);
        setValidationErrors(validation.errors);
        setIsValid(validation.isValid);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        setError('Error parsing CSV file. Please check the file format.');
      } finally {
        setUploading(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading file');
      setUploading(false);
    };

    reader.readAsText(file);
  }, []);

  const handleSubmit = async () => {
    if (!isValid || csvData.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await axios.post('/api/lead-enricher/submit', {
        data: csvData.map(row => ({
          Company: row.Company,
          Keyword: row.Keyword,
          URL: row.URL,
        })),
        userToken: token,
      });

      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting data:', error);
      setError(error.response?.data?.message || error.message || 'Failed to submit data');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCsvData([]);
    setValidationErrors([]);
    setIsValid(false);
    setSubmitted(false);
    setError(null);
    // Reset file input
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  if (!isValidUser) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography variant="h6">Unauthorized access. Please log in.</Typography>
      </Box>
    );
  }

  if (submitted) {
    return (
      <LayoutContainer>
        <StyledHeader />
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Success!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your data has been successfully submitted and added to the enrichment queue.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="contained" onClick={resetForm}>
                Submit Another List
              </Button>
              <Button variant="outlined" onClick={() => router.push('/')}>
                Back to Dashboard
              </Button>
            </Stack>
          </Paper>
        </Container>
      </LayoutContainer>
    );
  }

  return (
    <LayoutContainer>
      <StyledHeader />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box sx={{ height: 120, width: 'auto', position: 'relative', mb: 2 }}>
              <Image
                src="/images/sl-lead-enricher-logo.png"
                alt="Lead Enricher"
                width={220}
                height={220}
              />
              {/* <Typography
                variant="h3"
                component="h1"
                sx={{
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                🚀 Lead Enricher
              </Typography> */}
            </Box>
            <br />
            <br />
            <br />
            <br />
            <br />

            <Typography variant="h6" color="text.secondary" textAlign="center">
              Upload your company data for enrichment and analysis
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {csvData.length === 0 ? (
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <CloudUploadIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Upload CSV File
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Please upload a CSV file with the following columns: <strong>Company</strong>,{' '}
                  <strong>Keyword</strong>, <strong>URL</strong>
                </Typography>

                <input
                  accept=".csv"
                  style={{ display: 'none' }}
                  id="csv-upload"
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <label htmlFor="csv-upload">
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                    disabled={uploading}
                    size="large"
                  >
                    {uploading ? 'Processing...' : 'Choose CSV File'}
                  </Button>
                </label>
              </CardContent>
            </Card>
          ) : (
            <Stack spacing={3}>
              {/* Validation Status */}
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    {isValid ? (
                      <CheckCircleIcon sx={{ color: 'success.main' }} />
                    ) : (
                      <ErrorIcon sx={{ color: 'error.main' }} />
                    )}
                    <Typography variant="h6">Validation {isValid ? 'Passed' : 'Failed'}</Typography>
                    <Chip label={`${csvData.length} rows`} color="primary" variant="outlined" />
                  </Stack>

                  {!isValid && validationErrors.length > 0 && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        The following rows have missing required fields:
                      </Typography>
                      {validationErrors.map((error, index) => (
                        <Typography key={index} variant="body2">
                          • Row {error.rowNumber}: Missing {error.missingFields.join(', ')}
                        </Typography>
                      ))}
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Data Preview */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Data Preview
                  </Typography>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Row</TableCell>
                          <TableCell>Company</TableCell>
                          <TableCell>Keyword</TableCell>
                          <TableCell>URL</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {csvData.slice(0, 10).map((row, index) => {
                          const hasError = validationErrors.some(
                            error => error.rowNumber === row.rowNumber
                          );
                          return (
                            <TableRow
                              key={index}
                              sx={{
                                backgroundColor: hasError ? 'error.light' : 'inherit',
                                '&:nth-of-type(odd)': {
                                  backgroundColor: hasError ? 'error.light' : 'action.hover',
                                },
                              }}
                            >
                              <TableCell>{row.rowNumber}</TableCell>
                              <TableCell>{row.Company}</TableCell>
                              <TableCell>{row.Keyword}</TableCell>
                              <TableCell
                                sx={{
                                  maxWidth: 200,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {row.URL}
                              </TableCell>
                              <TableCell>
                                {hasError ? (
                                  <Chip label="Error" color="error" size="small" />
                                ) : (
                                  <Chip label="Valid" color="success" size="small" />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {csvData.length > 10 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Showing first 10 rows of {csvData.length} total rows
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button variant="outlined" onClick={resetForm} disabled={submitting}>
                  Upload Different File
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!isValid || submitting}
                  startIcon={submitting ? <CircularProgress size={20} /> : undefined}
                >
                  {submitting ? 'Submitting...' : 'Submit for Enrichment'}
                </Button>
              </Box>
            </Stack>
          )}
        </Paper>
      </Container>
    </LayoutContainer>
  );
}
