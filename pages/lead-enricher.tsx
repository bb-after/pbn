import React, { useState, useCallback, useEffect } from 'react';
import {
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
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import MappingIcon from '@mui/icons-material/AccountTree';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import {
  IntercomLayout,
  ThemeProvider,
  ToastProvider,
  IntercomCard,
  IntercomButton,
} from '../components/ui';
import UnauthorizedAccess from 'components/UnauthorizedAccess';
import useValidateUserToken from 'hooks/useValidateUserToken';
import axios from 'axios';
import { useRouter } from 'next/router';
import Image from 'next/image';

interface CSVRow {
  Company: string;
  Keyword: string;
  URL: string;
  OwnerUserId?: number;
  rowNumber: number;
}

interface IndividualCSVRow {
  URL: string;
  keyword: string;
  negativeURLTitle: string;
  firstName: string;
  lastName: string;
  email?: string;
  linkedinURL?: string;
  OwnerUserId?: number;
  rowNumber: number;
}

interface BLPCSVRow {
  companyName: string;
  website: string;
  industry: string;
  location: string;
  employeeCount?: string;
  revenue?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  OwnerUserId?: number;
  rowNumber: number;
}

interface ValidationError {
  rowNumber: number;
  missingFields: string[];
}

interface FieldMapping {
  [requiredField: string]: string; // required field -> CSV column
}

interface User {
  id: number;
  name: string;
}

type ListType = 'company' | 'individual' | 'blp';

function LeadEnricherContent() {
  const router = useRouter();
  const { isValidUser, token, user } = useValidateUserToken();
  const [listType, setListType] = useState<ListType>('company');
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [individualCsvData, setIndividualCsvData] = useState<IndividualCSVRow[]>([]);
  const [blpCsvData, setBlpCsvData] = useState<BLPCSVRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValid, setIsValid] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawCsvData, setRawCsvData] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<number | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [modalOwner, setModalOwner] = useState<number | null>(null);

  // Auto-match field names with fuzzy matching
  const autoMatchFields = (csvHeaders: string[], requiredFields: string[]): FieldMapping => {
    const mapping: FieldMapping = {};

    const normalizeField = (field: string) =>
      field
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();

    // Common field mappings
    const fieldAliases: { [key: string]: string[] } = {
      Company: ['company', 'companyname', 'organization', 'org', 'business'],
      Keyword: ['keyword', 'searchterm', 'term', 'query'],
      URL: ['url', 'website', 'link', 'domain', 'site'],
      firstName: ['firstname', 'fname', 'first', 'givenname'],
      lastName: ['lastname', 'lname', 'last', 'surname', 'familyname'],
      email: ['email', 'emailaddress', 'mail'],
      linkedinURL: ['linkedin', 'linkedinurl', 'linkedinprofile', 'profile'],
      negativeURLTitle: ['negativeurltitle', 'negativetitle', 'excludetitle', 'badtitle'],
      companyName: ['companyname', 'company', 'organization', 'org', 'business'],
      website: ['website', 'url', 'domain', 'site', 'link'],
      industry: ['industry', 'sector', 'vertical', 'business'],
      location: ['location', 'address', 'city', 'region', 'country'],
      employeeCount: ['employeecount', 'employees', 'headcount', 'size'],
      revenue: ['revenue', 'income', 'earnings', 'sales'],
      contactName: ['contactname', 'name', 'contact', 'person'],
      contactTitle: ['contacttitle', 'title', 'position', 'role'],
      contactEmail: ['contactemail', 'email', 'emailaddress', 'mail'],
      owner: ['owner', 'assignedto', 'user', 'assignee', 'responsible'],
    };

    requiredFields.forEach(requiredField => {
      // First try exact match (case insensitive)
      const exactMatch = csvHeaders.find(
        header => normalizeField(header) === normalizeField(requiredField)
      );

      if (exactMatch) {
        mapping[requiredField] = exactMatch;
        return;
      }

      // Try alias matching
      const aliases = fieldAliases[requiredField] || [];
      const aliasMatch = csvHeaders.find(header =>
        aliases.some(alias => normalizeField(header) === alias)
      );

      if (aliasMatch) {
        mapping[requiredField] = aliasMatch;
        return;
      }

      // Try partial matching
      const partialMatch = csvHeaders.find(
        header =>
          normalizeField(header).includes(normalizeField(requiredField)) ||
          normalizeField(requiredField).includes(normalizeField(header))
      );

      if (partialMatch) {
        mapping[requiredField] = partialMatch;
      }
    });

    return mapping;
  };

  // Fetch users for owner selection
  const fetchUsers = useCallback(async () => {
    if (!token) return;

    setLoadingUsers(true);
    try {
      const response = await axios.get('/api/lead-enricher/users', {
        headers: {
          'x-auth-token': token,
        },
      });

      setUsers(response.data.users || []);

      // Auto-select current user if available
      if (user?.id && response.data.users) {
        const currentUser = response.data.users.find((u: User) => u.id === Number(user.id));
        if (currentUser) {
          setSelectedOwner(currentUser.id);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [token, user?.id]);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (users.length > 0) {
      if (user?.id) {
        const found = users.find(u => u.id === Number(user.id));
        setModalOwner(found ? found.id : users[0].id);
      } else {
        setModalOwner(users[0].id);
      }
    }
  }, [users, user?.id]);

  const validateCSVData = (
    data: any[],
    type: ListType,
    fieldMapping: FieldMapping
  ): { isValid: boolean; errors: ValidationError[] } => {
    const errors: ValidationError[] = [];
    const requiredFields =
      type === 'company'
        ? ['Company', 'Keyword', 'URL']
        : type === 'individual'
          ? ['URL', 'keyword', 'negativeURLTitle', 'firstName', 'lastName']
          : ['companyName']; // BLP required fields - only company name needed

    // Note: owner is optional in CSV since it can be set via dropdown

    data.forEach((row, index) => {
      const missingFields: string[] = [];

      requiredFields.forEach(field => {
        const csvColumn = fieldMapping[field];
        if (!csvColumn || !row[csvColumn] || String(row[csvColumn]).trim() === '') {
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

    // Parse CSV properly handling quoted fields
    const parseCSVLine = (line: string): string[] => {
      // Clean up line - remove carriage returns and fix malformed quotes
      const cleanLine = line.replace(/\r/g, '').trim();

      // Handle malformed lines that start with quote but aren't properly formatted
      if (cleanLine.startsWith('"') && !cleanLine.includes('","') && cleanLine.includes(',')) {
        // This looks like a malformed line, try to split it normally
        return cleanLine
          .replace(/^"|"$/g, '')
          .split(',')
          .map(val => val.trim());
      }

      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      let i = 0;

      while (i < cleanLine.length) {
        const char = cleanLine[i];

        if (char === '"') {
          if (inQuotes && cleanLine[i + 1] === '"') {
            // Escaped quote
            current += '"';
            i += 2;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
            i++;
          }
        } else if (char === ',' && !inQuotes) {
          // Field separator
          result.push(current.trim());
          current = '';
          i++;
        } else {
          current += char;
          i++;
        }
      }

      // Add last field
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(header => header.replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i];

      // Skip obviously malformed or empty rows
      const cleanLine = rawLine.replace(/\r/g, '').trim();
      if (!cleanLine || cleanLine === '""' || cleanLine.match(/^"+$/)) {
        console.log(`Skipping malformed row ${i + 1}:`, rawLine);
        continue;
      }

      const values = parseCSVLine(rawLine).map(value => value.replace(/"/g, ''));
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      data.push(row);
    }

    return data;
  };

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
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

          // Get CSV headers
          const headers = Object.keys(parsedData[0]);
          setCsvHeaders(headers);
          setRawCsvData(parsedData);

          // Get required fields based on list type
          const requiredFields =
            listType === 'company'
              ? ['Company', 'Keyword', 'URL']
              : listType === 'individual'
                ? ['URL', 'keyword', 'negativeURLTitle', 'firstName', 'lastName']
                : ['companyName']; // BLP only needs company name

          // Auto-match fields
          const autoMapping = autoMatchFields(headers, requiredFields);
          setFieldMapping(autoMapping);

          console.log('=== FIELD MAPPING DEBUG ===');
          console.log('CSV Headers:', headers);
          console.log('Required Fields:', requiredFields);
          console.log('Auto Mapping Result:', autoMapping);

          // Check if all required fields are mapped
          const allFieldsMapped = requiredFields.every(field => autoMapping[field]);
          console.log('All Required Fields Mapped:', allFieldsMapped);

          // Log which fields are missing
          const unmappedFields = requiredFields.filter(field => !autoMapping[field]);
          if (unmappedFields.length > 0) {
            console.log('Unmapped Fields:', unmappedFields);
          }

          // Always show mapping interface so users can review/adjust
          console.log('Showing field mapping modal for user review');
          setShowMapping(true);

          // REMOVED: Auto-processing logic - now always show modal
          // if (allFieldsMapped) {
          //   console.log('All fields matched automatically, skipping modal');
          //   processDataWithMapping(parsedData, autoMapping);
          // } else {
          //   console.log('Some fields not matched, showing modal');
          //   setShowMapping(true);
          // }
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
    },
    [listType]
  );

  const processDataWithMapping = (data: any[], mapping: FieldMapping) => {
    // Validate data with mapping
    const validation = validateCSVData(data, listType, mapping);

    let ownerIdToUse = modalOwner || selectedOwner || null;
    let ownerNameToUse = users.find(u => u.id === ownerIdToUse)?.name || '';

    if (listType === 'company') {
      const transformedData: CSVRow[] = data.map((row, index) => ({
        Company: row[mapping['Company']] || '',
        Keyword: row[mapping['Keyword']] || '',
        URL: row[mapping['URL']] || '',
        OwnerUserId: ownerIdToUse || undefined,
        rowNumber: index + 2,
      }));
      setCsvData(transformedData);
      setIndividualCsvData([]);
      setBlpCsvData([]);
    } else if (listType === 'individual') {
      const transformedIndividualData: IndividualCSVRow[] = data.map((row, index) => ({
        URL: row[mapping['URL']] || '',
        keyword: row[mapping['keyword']] || '',
        negativeURLTitle: row[mapping['negativeURLTitle']] || '',
        firstName: row[mapping['firstName']] || '',
        lastName: row[mapping['lastName']] || '',
        email: row[mapping['email']] || '',
        linkedinURL: row[mapping['linkedinURL']] || '',
        OwnerUserId: ownerIdToUse || undefined,
        rowNumber: index + 2,
      }));
      setIndividualCsvData(transformedIndividualData);
      setCsvData([]);
      setBlpCsvData([]);
    } else {
      const transformedBlpData: BLPCSVRow[] = data.map((row, index) => ({
        companyName: row[mapping['companyName']] || '',
        website: row[mapping['website']] || '',
        industry: row[mapping['industry']] || '',
        location: row[mapping['location']] || '',
        employeeCount: row[mapping['employeeCount']] || '',
        revenue: row[mapping['revenue']] || '',
        contactName: row[mapping['contactName']] || '',
        contactTitle: row[mapping['contactTitle']] || '',
        contactEmail: row[mapping['contactEmail']] || '',
        OwnerUserId: ownerIdToUse || undefined,
        rowNumber: index + 2,
      }));
      setBlpCsvData(transformedBlpData);
      setCsvData([]);
      setIndividualCsvData([]);
    }

    setValidationErrors(validation.errors);
    setIsValid(validation.isValid);
    setShowMapping(false);
  };

  const handleMappingChange = (requiredField: string, csvColumn: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [requiredField]: csvColumn,
    }));
  };

  const applyMapping = () => {
    const requiredFields =
      listType === 'company'
        ? ['Company', 'Keyword', 'URL']
        : listType === 'individual'
          ? ['URL', 'keyword', 'negativeURLTitle', 'firstName', 'lastName']
          : ['companyName']; // BLP only needs company name

    // Check if all required fields are mapped
    const unmappedFields = requiredFields.filter(field => !fieldMapping[field]);
    if (unmappedFields.length > 0) {
      setError(`Please map all required fields: ${unmappedFields.join(', ')}`);
      return;
    }

    // Owner field is optional in CSV mapping
    setError(null);
    processDataWithMapping(rawCsvData, fieldMapping);
    // Sync modalOwner to selectedOwner after mapping is applied
    if (modalOwner) {
      setSelectedOwner(modalOwner);
    }
  };

  const handleSubmit = async () => {
    if (
      !isValid ||
      (listType === 'company'
        ? csvData.length === 0
        : listType === 'individual'
          ? individualCsvData.length === 0
          : blpCsvData.length === 0)
    )
      return;

    // Check if owner is selected
    if (!selectedOwner) {
      setError('Please select an owner for this submission');
      return;
    }

    const selectedUser = users.find(u => u.id === selectedOwner);
    if (!selectedUser) {
      setError('Selected owner not found');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const apiEndpoint =
        listType === 'company'
          ? '/api/lead-enricher/submit'
          : listType === 'individual'
            ? '/api/lead-enricher/submit-individual'
            : '/api/lead-enricher/submit-blp';

      const response = await axios.post(apiEndpoint, {
        data:
          listType === 'company'
            ? csvData.map(row => ({
                Company: row.Company,
                Keyword: row.Keyword,
                URL: row.URL,
                OwnerUserId: selectedOwner, // Use selected owner ID
              }))
            : listType === 'individual'
              ? individualCsvData.map(row => ({
                  URL: row.URL,
                  keyword: row.keyword,
                  negativeURLTitle: row.negativeURLTitle,
                  firstName: row.firstName,
                  lastName: row.lastName,
                  email: row.email,
                  linkedinURL: row.linkedinURL,
                  OwnerUserId: selectedOwner, // Use selected owner ID
                }))
              : blpCsvData.map(row => ({
                  companyName: row.companyName,
                  website: row.website,
                  industry: row.industry,
                  location: row.location,
                  employeeCount: row.employeeCount,
                  revenue: row.revenue,
                  contactName: row.contactName,
                  contactTitle: row.contactTitle,
                  contactEmail: row.contactEmail,
                  OwnerUserId: selectedOwner, // Use selected owner ID
                })),
        userToken: token,
        fieldMapping: fieldMapping,
        csvHeaders: csvHeaders,
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
    setIndividualCsvData([]);
    setBlpCsvData([]);
    setValidationErrors([]);
    setIsValid(false);
    setSubmitted(false);
    setError(null);
    setShowMapping(false);
    setFieldMapping({});
    setCsvHeaders([]);
    setRawCsvData([]);
    // Reset owner selection to current user
    if (user?.id) {
      const resetCurrentUser = users.find(u => u.id === Number(user.id));
      if (resetCurrentUser) {
        setSelectedOwner(resetCurrentUser.id);
      }
    }
    // Reset file input
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  if (!isValidUser) {
    return <UnauthorizedAccess />;
  }

  if (submitted) {
    return (
      <IntercomLayout
        title="Submission Successful"
        breadcrumbs={[{ label: 'Lead Enricher' }, { label: 'Success' }]}
      >
        <IntercomCard>
          <Box p={4} textAlign="center">
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Success!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your data has been successfully submitted and added to the enrichment queue.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <IntercomButton variant="primary" onClick={resetForm}>
                Submit Another List
              </IntercomButton>
              <IntercomButton variant="secondary" onClick={() => router.push('/')}>
                Back to Dashboard
              </IntercomButton>
            </Stack>
          </Box>
        </IntercomCard>
      </IntercomLayout>
    );
  }

  return (
    <IntercomLayout title="Lead Enricher" breadcrumbs={[{ label: 'Lead Enricher' }]}>
      <IntercomCard>
        <Box p={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box sx={{ height: 120, width: 'auto', position: 'relative', mb: 2 }}>
              <Image
                src="/images/sl-lead-enricher-logo.png"
                alt="Lead Enricher"
                width={220}
                height={220}
              />
            </Box>
            <br />
            <br />
            <br />
            <br />
            <br />

            <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
              Upload your data for enrichment and analysis
            </Typography>

            <Typography variant="h5" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
              Choose Your List Type
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '200px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '2px solid',
                    borderColor: listType === 'company' ? 'primary.main' : 'grey.300',
                    backgroundColor: listType === 'company' ? 'primary.50' : 'background.paper',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'primary.50',
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => {
                    setListType('company');
                    // Reset form when changing list type
                    setCsvData([]);
                    setIndividualCsvData([]);
                    setBlpCsvData([]);
                    setValidationErrors([]);
                    setIsValid(false);
                    setError(null);
                    setShowMapping(false);
                    setFieldMapping({});
                    setCsvHeaders([]);
                    setRawCsvData([]);
                    // Reset file input
                    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                  }}
                >
                  <CardContent
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      position: 'relative',
                    }}
                  >
                    {listType === 'company' && (
                      <CheckCircleIcon
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          color: 'primary.main',
                          fontSize: 24,
                        }}
                      />
                    )}
                    <BusinessIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom color="primary.main">
                      Company Partial List
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                      For enriching company data with fields: Company, Keyword, URL
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '200px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '2px solid',
                    borderColor: listType === 'individual' ? 'secondary.main' : 'grey.300',
                    backgroundColor:
                      listType === 'individual' ? 'secondary.50' : 'background.paper',
                    '&:hover': {
                      borderColor: 'secondary.main',
                      backgroundColor: 'secondary.50',
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => {
                    setListType('individual');
                    // Reset form when changing list type
                    setCsvData([]);
                    setIndividualCsvData([]);
                    setBlpCsvData([]);
                    setValidationErrors([]);
                    setIsValid(false);
                    setError(null);
                    setShowMapping(false);
                    setFieldMapping({});
                    setCsvHeaders([]);
                    setRawCsvData([]);
                    // Reset file input
                    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                  }}
                >
                  <CardContent
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      position: 'relative',
                    }}
                  >
                    {listType === 'individual' && (
                      <CheckCircleIcon
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          color: 'secondary.main',
                          fontSize: 24,
                        }}
                      />
                    )}
                    <PersonIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom color="secondary.main">
                      Individual Partial List
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                      For enriching individual data with personal details, keywords, and URLs
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '200px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: '2px solid',
                    borderColor: listType === 'blp' ? 'success.main' : 'grey.300',
                    backgroundColor: listType === 'blp' ? 'success.50' : 'background.paper',
                    '&:hover': {
                      borderColor: 'success.main',
                      backgroundColor: 'success.50',
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => {
                    setListType('blp');
                    // Reset form when changing list type
                    setCsvData([]);
                    setIndividualCsvData([]);
                    setBlpCsvData([]);
                    setValidationErrors([]);
                    setIsValid(false);
                    setError(null);
                    setShowMapping(false);
                    setFieldMapping({});
                    setCsvHeaders([]);
                    setRawCsvData([]);
                    // Reset file input
                    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                  }}
                >
                  <CardContent
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      position: 'relative',
                    }}
                  >
                    {listType === 'blp' && (
                      <CheckCircleIcon
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          color: 'success.main',
                          fontSize: 24,
                        }}
                      />
                    )}
                    <BusinessIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom color="success.main">
                      BLP Prospected Companies
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                      For BLP prospecting - only company name required, other data will be enriched
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {listType === 'company' ? (
              csvData.length === 0 ? (
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <CloudUploadIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Upload CSV File
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Please upload a CSV file with columns for: <strong>Company</strong>,{' '}
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
                      <IntercomButton
                        variant="primary"
                        component="span"
                        leftIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                        disabled={uploading}
                        size="large"
                      >
                        {uploading ? 'Processing...' : 'Choose CSV File'}
                      </IntercomButton>
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
                        <Typography variant="h6">
                          Validation {isValid ? 'Passed' : 'Failed'}
                        </Typography>
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
                              <TableCell>Owner</TableCell>
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
                                    {row.OwnerUserId
                                      ? users.find(u => u.id === row.OwnerUserId)?.name ||
                                        'Unknown User'
                                      : 'No Owner'}
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
                    <IntercomButton variant="secondary" onClick={resetForm} disabled={submitting}>
                      Upload Different File
                    </IntercomButton>
                    <IntercomButton
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={!isValid || submitting}
                      leftIcon={submitting ? <CircularProgress size={20} /> : undefined}
                    >
                      {submitting ? 'Submitting...' : 'Submit for Enrichment'}
                    </IntercomButton>
                  </Box>
                </Stack>
              )
            ) : listType === 'individual' ? (
              individualCsvData.length === 0 ? (
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <CloudUploadIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Upload CSV File
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Please upload a CSV file with columns for: <strong>URL</strong>,{' '}
                      <strong>keyword</strong>, <strong>negativeURLTitle</strong>,{' '}
                      <strong>firstName</strong>, <strong>lastName</strong>, <strong>email</strong>{' '}
                      (optional), <strong>linkedinURL</strong> (optional)
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
                      <IntercomButton
                        variant="primary"
                        component="span"
                        leftIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                        disabled={uploading}
                        size="large"
                      >
                        {uploading ? 'Processing...' : 'Choose CSV File'}
                      </IntercomButton>
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
                        <Typography variant="h6">
                          Validation {isValid ? 'Passed' : 'Failed'}
                        </Typography>
                        <Chip
                          label={`${individualCsvData.length} rows`}
                          color="primary"
                          variant="outlined"
                        />
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
                              <TableCell>URL</TableCell>
                              <TableCell>Keyword</TableCell>
                              <TableCell>Negative URL Title</TableCell>
                              <TableCell>First Name</TableCell>
                              <TableCell>Last Name</TableCell>
                              <TableCell>Email</TableCell>
                              <TableCell>LinkedIn URL</TableCell>
                              <TableCell>Owner</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {individualCsvData.slice(0, 10).map((row, index) => {
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
                                  <TableCell>{row.keyword}</TableCell>
                                  <TableCell>{row.negativeURLTitle}</TableCell>
                                  <TableCell>{row.firstName}</TableCell>
                                  <TableCell>{row.lastName}</TableCell>
                                  <TableCell>{row.email}</TableCell>
                                  <TableCell>{row.linkedinURL}</TableCell>
                                  <TableCell>
                                    {row.OwnerUserId
                                      ? users.find(u => u.id === row.OwnerUserId)?.name ||
                                        'Unknown User'
                                      : 'No Owner'}
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
                      {individualCsvData.length > 10 && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                          Showing first 10 rows of {individualCsvData.length} total rows
                        </Typography>
                      )}
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <IntercomButton variant="secondary" onClick={resetForm} disabled={submitting}>
                      Upload Different File
                    </IntercomButton>
                    <IntercomButton
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={!isValid || submitting}
                      leftIcon={submitting ? <CircularProgress size={20} /> : undefined}
                    >
                      {submitting ? 'Submitting...' : 'Submit for Enrichment'}
                    </IntercomButton>
                  </Box>
                </Stack>
              )
            ) : blpCsvData.length === 0 ? (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <CloudUploadIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Upload CSV File
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Please upload a CSV file with a column for: <strong>companyName</strong>.{' '}
                    Additional fields like <strong>website</strong>, <strong>industry</strong>,{' '}
                    <strong>location</strong>, <strong>employeeCount</strong>,{' '}
                    <strong>revenue</strong>, <strong>contactName</strong>,{' '}
                    <strong>contactTitle</strong>, and <strong>contactEmail</strong> are optional
                    and will be enriched automatically.
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
                    <IntercomButton
                      variant="primary"
                      component="span"
                      leftIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                      disabled={uploading}
                      size="large"
                    >
                      {uploading ? 'Processing...' : 'Choose CSV File'}
                    </IntercomButton>
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
                      <Typography variant="h6">
                        Validation {isValid ? 'Passed' : 'Failed'}
                      </Typography>
                      <Chip
                        label={`${blpCsvData.length} rows`}
                        color="primary"
                        variant="outlined"
                      />
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
                            <TableCell>Company Name</TableCell>
                            <TableCell>Website</TableCell>
                            <TableCell>Industry</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Employee Count</TableCell>
                            <TableCell>Revenue</TableCell>
                            <TableCell>Contact Name</TableCell>
                            <TableCell>Contact Title</TableCell>
                            <TableCell>Contact Email</TableCell>
                            <TableCell>Owner</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {blpCsvData.slice(0, 10).map((row, index) => {
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
                                <TableCell>{row.companyName}</TableCell>
                                <TableCell
                                  sx={{
                                    maxWidth: 200,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {row.website}
                                </TableCell>
                                <TableCell>{row.industry}</TableCell>
                                <TableCell>{row.location}</TableCell>
                                <TableCell>{row.employeeCount}</TableCell>
                                <TableCell>{row.revenue}</TableCell>
                                <TableCell>{row.contactName}</TableCell>
                                <TableCell>{row.contactTitle}</TableCell>
                                <TableCell>{row.contactEmail}</TableCell>
                                <TableCell>
                                  {row.OwnerUserId
                                    ? users.find(u => u.id === row.OwnerUserId)?.name ||
                                      'Unknown User'
                                    : 'No Owner'}
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
                    {blpCsvData.length > 10 && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Showing first 10 rows of {blpCsvData.length} total rows
                      </Typography>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <IntercomButton variant="secondary" onClick={resetForm} disabled={submitting}>
                    Upload Different File
                  </IntercomButton>
                  <IntercomButton
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={!isValid || submitting}
                    leftIcon={submitting ? <CircularProgress size={20} /> : undefined}
                  >
                    {submitting ? 'Submitting...' : 'Submit for Enrichment'}
                  </IntercomButton>
                </Box>
              </Stack>
            )}
          </Box>
        </Box>
      </IntercomCard>

      {/* Field Mapping Modal */}
      <Dialog
        open={showMapping}
        onClose={() => setShowMapping(false)}
        maxWidth="md"
        fullWidth
        sx={{
          zIndex: 1300,
          '& .MuiDialog-paper': {
            zIndex: 1301,
          },
        }}
        BackdropProps={{
          sx: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <MappingIcon sx={{ color: 'primary.main' }} />
            <Box>
              <Typography variant="h6">Map Your CSV Fields</Typography>
              <Typography variant="body2" color="text.secondary">
                Found {rawCsvData.length} data rows in your CSV file
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Map each required field to the appropriate column from your CSV file. We&apos;ve
            auto-matched what we could detect. The owner field is optional - you can set it using
            the dropdown above.
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>CSV Column</TableCell>
                  <TableCell>Maps To</TableCell>
                  <TableCell>Required</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(listType === 'company'
                  ? ['Company', 'Keyword', 'URL', 'owner']
                  : listType === 'individual'
                    ? [
                        'URL',
                        'keyword',
                        'negativeURLTitle',
                        'firstName',
                        'lastName',
                        'email',
                        'linkedinURL',
                        'owner',
                      ]
                    : [
                        'companyName',
                        'website',
                        'industry',
                        'location',
                        'employeeCount',
                        'revenue',
                        'contactName',
                        'contactTitle',
                        'contactEmail',
                        'owner',
                      ]
                ).map(requiredField => {
                  const isRequired =
                    listType === 'company'
                      ? true // All required for company, including owner
                      : listType === 'individual'
                        ? !['email', 'linkedinURL'].includes(requiredField) // All except email/linkedin for individual
                        : requiredField === 'companyName' || requiredField === 'owner'; // BLP: only companyName required
                  return (
                    <TableRow key={requiredField}>
                      <TableCell sx={{ minWidth: 200 }}>
                        {requiredField === 'owner' ? (
                          <FormControl fullWidth size="small" required>
                            <Select
                              value={modalOwner || ''}
                              onChange={e => setModalOwner(Number(e.target.value))}
                              displayEmpty
                            >
                              {users.map(userItem => (
                                <MenuItem key={userItem.id} value={userItem.id}>
                                  {userItem.name}
                                  {userItem.id === Number(user?.id) && ' (You)'}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <FormControl fullWidth size="small">
                            <Select
                              value={fieldMapping[requiredField] || ''}
                              onChange={e => handleMappingChange(requiredField, e.target.value)}
                              displayEmpty
                            >
                              <MenuItem value="">
                                <em>Select CSV column...</em>
                              </MenuItem>
                              {csvHeaders.map(header => (
                                <MenuItem key={header} value={header}>
                                  {header}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {requiredField}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={isRequired ? 'Required' : 'Optional'}
                          color={isRequired ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <IntercomButton variant="secondary" onClick={() => setShowMapping(false)}>
            Cancel
          </IntercomButton>
          <IntercomButton
            variant="primary"
            onClick={applyMapping}
            disabled={
              (listType === 'company'
                ? ['Company', 'Keyword', 'URL']
                : listType === 'individual'
                  ? ['URL', 'keyword', 'negativeURLTitle', 'firstName', 'lastName']
                  : ['companyName']
              ) // BLP only needs company name
                .some(field => !fieldMapping[field]) || !modalOwner
            }
          >
            Apply Mapping
          </IntercomButton>
        </DialogActions>
      </Dialog>
    </IntercomLayout>
  );
}

export default function LeadEnricherPage() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <LeadEnricherContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
