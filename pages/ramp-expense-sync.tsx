import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
  Chip,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControlLabel,
  TableSortLabel,
} from '@mui/material';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useRouter } from 'next/router';
import { IntercomLayout } from '../components/layout/IntercomLayout';
import { ContentCopy, CallSplit } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import useAuth from '../hooks/useAuth';
import UnauthorizedAccess from '../components/UnauthorizedAccess';
import { findBestClientMatch, autoMapClients } from '../utils/rampClientMapping';

interface User {
  id: string;
  name: string;
  email: string;
}

interface RampExpense {
  id: string;
  user_id: string;
  user_name: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  client: string;
  date: string;
  merchant: string;
  receipt_url?: string;
  raw_data: any;
  parent_transaction_id?: string;
  is_line_item?: boolean;
  line_item_index?: number;
  total_amount?: number;
  total_line_items?: number;
}

interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'error';
  message?: string;
  progress?: number;
  totalRecords?: number;
  processedRecords?: number;
}

interface AuthStatus {
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
}

const RampExpenseSync: React.FC = () => {
  const router = useRouter();
  const { token } = useAuth('/login');
  const [users, setUsers] = useState<User[]>([]);
  const [mappedUsers, setMappedUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>('');
  const [userMapping, setUserMapping] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: 'idle' });
  const [expenses, setExpenses] = useState<RampExpense[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [loadingExpenses, setLoadingExpenses] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    isLoading: true,
  });
  const [sheetTabInfo, setSheetTabInfo] = useState<{
    exists: boolean;
    tabName?: string;
    allTabs: string[];
    expectedTabName: string;
    isProtected?: boolean;
  } | null>(null);
  const [checkingTab, setCheckingTab] = useState<boolean>(false);
  const [clientOptions, setClientOptions] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<Map<string, string>>(new Map());
  const [loadingClientOptions, setLoadingClientOptions] = useState<boolean>(false);
  const [selectedExpenseCategories, setSelectedExpenseCategories] = useState<Map<string, string>>(
    new Map()
  );
  const [profilesAmounts, setProfilesAmounts] = useState<Map<string, number>>(new Map());
  const [prepaidPlacementsAmounts, setPrepaidPlacementsAmounts] = useState<Map<string, number>>(
    new Map()
  );
  const [sortBy, setSortBy] = useState<keyof RampExpense>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Predefined expense categories (alphabetized)
  const expenseCategoryOptions = [
    'Cloud Crawler',
    'Engagement Gigs',
    'Freelance Writers (Paypal)',
    'Guest Blogging',
    'Internal Content',
    'Lottie',
    'Other',
    'Public Relations',
    'Subscriptions',
    'Textbroker',
    'Upwork (Content)',
    'Upwork (VA Backlinking)',
    'Upwork (VA Other)',
    'VA Backlinking (PayPal)',
    'VA Other (Paypal)',
    'Websites/Domains/Hosting',
    'WritersAccess',
  ];

  // Generate trailing 12 months for dropdown
  const getAvailableMonths = () => {
    const months = [];
    const currentDate = new Date();

    for (let i = 0; i < 12; i++) {
      const monthDate = subMonths(currentDate, i);
      months.push({
        value: format(monthDate, 'yyyy-MM'),
        label: format(monthDate, 'MMMM yyyy'),
      });
    }

    return months;
  };

  // Get start and end dates for selected month
  const getDateRangeFromMonth = (monthString: string) => {
    // Parse the month string (e.g., "2025-08") and create date in UTC to avoid timezone issues
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1); // Month is 0-indexed
    return {
      startDate: startOfMonth(date),
      endDate: endOfMonth(date),
    };
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (authStatus.isAuthenticated) {
      fetchUsers();
      fetchMappedUsers();
    }
  }, [authStatus.isAuthenticated]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserMapping(selectedUser);
    } else {
      setUserMapping(null);
      setGoogleSheetUrl('');
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser && selectedMonth) {
      fetchExpensesForUser();
    } else {
      setExpenses([]);
      setSelectedExpenseIds(new Set());
      setProfilesAmounts(new Map());
      setPrepaidPlacementsAmounts(new Map());
    }
  }, [selectedUser, selectedMonth]);

  useEffect(() => {
    if (selectedMonth && googleSheetUrl) {
      checkSheetTab();
    } else {
      setSheetTabInfo(null);
    }
  }, [selectedMonth, googleSheetUrl]);

  useEffect(() => {
    // Auto-map clients when both client options and expenses are available
    if (clientOptions.length > 0 && expenses.length > 0) {
      autoMapClientsHandler();
    }
  }, [clientOptions, expenses]);

  useEffect(() => {
    // Auto-map expense categories when expenses are available
    if (expenses.length > 0) {
      autoMapExpenseCategories();
    }
  }, [expenses]);

  useEffect(() => {
    const { auth, error } = router.query;
    if (auth === 'success') {
      setSyncStatus({
        status: 'success',
        message: 'Successfully connected to Ramp!',
      });
      checkAuthStatus();
      router.replace('/ramp-expense-sync', undefined, { shallow: true });
    } else if (error) {
      setAuthStatus(prev => ({
        ...prev,
        error: decodeURIComponent(error as string),
      }));
      router.replace('/ramp-expense-sync', undefined, { shallow: true });
    }
  }, [router.query]);

  const checkAuthStatus = async () => {
    // Using client credentials - no user auth needed
    setAuthStatus({
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const initiateAuth = async () => {
    try {
      const response = await fetch('/api/ramp/auth/initiate');
      if (response.ok) {
        const { authUrl } = await response.json();
        window.location.href = authUrl;
      } else {
        setAuthStatus(prev => ({
          ...prev,
          error: 'Failed to initiate authentication',
        }));
      }
    } catch (error) {
      setAuthStatus(prev => ({
        ...prev,
        error: 'Failed to initiate authentication',
      }));
    }
  };

  const fetchUsers = async () => {
    try {
      // Keep fetching all users for potential future use
      const response = await fetch('/api/ramp/users-simple');
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
        console.log('Fetched all users:', userData);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch users:', errorData);
        setSyncStatus({
          status: 'error',
          message: `Failed to fetch users: ${errorData.error}`,
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setSyncStatus({
        status: 'error',
        message: 'Network error fetching users',
      });
    }
  };

  const fetchMappedUsers = async () => {
    try {
      const [usersResponse, mappingsResponse] = await Promise.all([
        fetch('/api/ramp/users-simple'),
        fetch('/api/ramp/user-mappings'),
      ]);

      if (usersResponse.ok && mappingsResponse.ok) {
        const allUsers = await usersResponse.json();
        const mappings = await mappingsResponse.json();

        // Filter users to only include those with mappings
        const mappedUserIds = mappings.map((m: any) => m.ramp_user_id);
        const usersWithMappings = allUsers.filter((user: User) => mappedUserIds.includes(user.id));

        setMappedUsers(usersWithMappings);
        console.log('Fetched mapped users:', usersWithMappings.length, 'of', allUsers.length);
      }
    } catch (error) {
      console.error('Error fetching mapped users:', error);
    }
  };

  const fetchUserMapping = async (userId: string) => {
    try {
      const response = await fetch(`/api/ramp/user-mappings/${userId}`);
      if (response.ok) {
        const mapping = await response.json();
        setUserMapping(mapping);
        setGoogleSheetUrl(mapping.google_sheet_url);
      } else if (response.status === 404) {
        // No mapping found for this user
        setUserMapping(null);
        setGoogleSheetUrl('');
      }
    } catch (error) {
      console.error('Error fetching user mapping:', error);
      setUserMapping(null);
    }
  };

  const fetchExpensesForUser = async () => {
    if (!selectedUser || !selectedMonth) return;

    const { startDate, endDate } = getDateRangeFromMonth(selectedMonth);
    setLoadingExpenses(true);

    try {
      const selectedUserData = mappedUsers.find(u => u.id === selectedUser);

      console.log('Date range calculation:', {
        selectedMonth,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        startDateObj: startDate,
        endDateObj: endDate,
      });

      const response = await fetch('/api/ramp/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUser,
          user_name: selectedUserData?.name || 'Unknown User',
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }

      const expenseData = await response.json();
      setExpenses(expenseData);
      // Select all expenses by default
      setSelectedExpenseIds(new Set(expenseData.map((exp: RampExpense) => exp.id)));
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setSyncStatus({
        status: 'error',
        message: `Error fetching expenses: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setLoadingExpenses(false);
    }
  };

  const handleExpenseToggle = (expenseId: string) => {
    const newSelectedIds = new Set(selectedExpenseIds);
    if (newSelectedIds.has(expenseId)) {
      newSelectedIds.delete(expenseId);
    } else {
      newSelectedIds.add(expenseId);
    }
    setSelectedExpenseIds(newSelectedIds);
  };

  const handleSelectAll = () => {
    if (selectedExpenseIds.size === expenses.length) {
      setSelectedExpenseIds(new Set());
    } else {
      setSelectedExpenseIds(new Set(expenses.map(exp => exp.id)));
    }
  };

  const copyToClipboard = async (data: any) => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonString);
      // Could add a toast notification here if desired
      console.log('Copied to clipboard:', data.id);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: create a temporary textarea
      const textArea = document.createElement('textarea');
      textArea.value = JSON.stringify(data, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const checkSheetTab = async () => {
    if (!selectedMonth || !googleSheetUrl) return;

    const { startDate } = getDateRangeFromMonth(selectedMonth);
    const expectedTabName = `Expenses - ${format(startDate, 'MMMM yyyy')}`;

    setCheckingTab(true);

    try {
      const response = await fetch('/api/google-sheets/find-tab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheet_url: googleSheetUrl,
          expected_tab_name: expectedTabName,
        }),
      });

      if (response.ok) {
        const tabInfo = await response.json();
        setSheetTabInfo(tabInfo);

        // If tab exists, fetch client options
        if (tabInfo.exists && tabInfo.tabName) {
          await fetchClientOptions(tabInfo.tabName);
        } else {
          setClientOptions([]);
        }
      } else {
        console.error('Failed to check sheet tab');
        setSheetTabInfo(null);
        setClientOptions([]);
      }
    } catch (error) {
      console.error('Error checking sheet tab:', error);
      setSheetTabInfo(null);
      setClientOptions([]);
    } finally {
      setCheckingTab(false);
    }
  };

  const fetchClientOptions = async (tabName: string) => {
    if (!googleSheetUrl) return;

    setLoadingClientOptions(true);

    try {
      const response = await fetch('/api/google-sheets/get-client-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheet_url: googleSheetUrl,
          tab_name: tabName,
        }),
      });

      if (response.ok) {
        const { clientOptions } = await response.json();
        setClientOptions(clientOptions);
        console.log('Fetched client options:', clientOptions);

        // Auto-mapping will be triggered by useEffect
      } else {
        console.error('Failed to fetch client options');
        setClientOptions([]);
      }
    } catch (error) {
      console.error('Error fetching client options:', error);
      setClientOptions([]);
    } finally {
      setLoadingClientOptions(false);
    }
  };

  const handleClientSelection = (expenseId: string, clientName: string) => {
    const newSelectedClients = new Map(selectedClients);
    if (clientName === '') {
      newSelectedClients.delete(expenseId);
    } else {
      newSelectedClients.set(expenseId, clientName);
    }
    setSelectedClients(newSelectedClients);
  };

  // extractClientFromMemo function is now imported from utils/rampClientMapping

  // findBestClientMatch is now imported from utils/rampClientMapping

  const autoMapClientsHandler = () => {
    if (clientOptions.length === 0 || expenses.length === 0) return;

    const newSelectedClients = autoMapClients(expenses, clientOptions, selectedClients);
    setSelectedClients(newSelectedClients);
    console.log('Auto-mapped clients result:', Object.fromEntries(newSelectedClients));
  };

  const findBestCategoryMatch = (expense: RampExpense): string => {
    const category = expense.category.toLowerCase();

    // Category mapping rules
    const categoryMappings: { [key: string]: string } = {
      'dues and subscriptions': 'Subscriptions',
      'contracted services:subscriptions - opsonly': 'Subscriptions',
      'contracted services:subscriptions': 'Subscriptions',
      'contracted services:blog publishing - us clients': 'Guest Blogging',
      'contracted services:blog publishing - uk/europe': 'Guest Blogging',
      'contracted services:blog publishing': 'Guest Blogging',
      'contracted services:website build, domain & hosting': 'Websites/Domains/Hosting',
      'contracted services:engagement gigs': 'Engagement Gigs',
      'saas / software': 'Subscriptions',
      'web services': 'Subscriptions',
      advertising: 'Public Relations',
      marketing: 'Public Relations',
      'content creation': 'Internal Content',
      'writing services': 'Freelance Writers (Paypal)',
      freelance: 'Other',
      hosting: 'Websites/Domains/Hosting',
      domain: 'Websites/Domains/Hosting',
      upwork: 'Upwork (VA Other)', // Default Upwork category
    };

    // Try exact match first
    if (categoryMappings[category]) {
      return categoryMappings[category];
    }

    // Try partial matches
    for (const [key, value] of Object.entries(categoryMappings)) {
      if (category.includes(key) || key.includes(category)) {
        return value;
      }
    }

    // Default fallback
    return 'Other';
  };

  const handleExpenseCategorySelection = (expenseId: string, categoryName: string) => {
    const newSelectedCategories = new Map(selectedExpenseCategories);
    if (categoryName === '') {
      newSelectedCategories.delete(expenseId);
    } else {
      newSelectedCategories.set(expenseId, categoryName);
    }
    setSelectedExpenseCategories(newSelectedCategories);
  };

  const autoMapExpenseCategories = () => {
    if (expenses.length === 0) return;

    const newSelectedCategories = new Map(selectedExpenseCategories);

    for (const expense of expenses) {
      // Only auto-map if not already mapped
      if (!newSelectedCategories.has(expense.id)) {
        const bestMatch = findBestCategoryMatch(expense);
        newSelectedCategories.set(expense.id, bestMatch);
      }
    }

    setSelectedExpenseCategories(newSelectedCategories);
    console.log('Auto-mapped expense categories:', Object.fromEntries(newSelectedCategories));
  };

  const handleProfilesAmountChange = (expenseId: string, amount: string) => {
    const newProfilesAmounts = new Map(profilesAmounts);
    const numericAmount = parseFloat(amount);

    if (amount === '' || isNaN(numericAmount)) {
      newProfilesAmounts.delete(expenseId);
    } else {
      newProfilesAmounts.set(expenseId, numericAmount);
    }
    setProfilesAmounts(newProfilesAmounts);
  };

  const handlePrepaidPlacementsAmountChange = (expenseId: string, amount: string) => {
    const newPrepaidPlacementsAmounts = new Map(prepaidPlacementsAmounts);
    const numericAmount = parseFloat(amount);

    if (amount === '' || isNaN(numericAmount)) {
      newPrepaidPlacementsAmounts.delete(expenseId);
    } else {
      newPrepaidPlacementsAmounts.set(expenseId, numericAmount);
    }
    setPrepaidPlacementsAmounts(newPrepaidPlacementsAmounts);
  };

  const handleSort = (column: keyof RampExpense) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortedExpenses = () => {
    return [...expenses].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle date sorting
      if (sortBy === 'date') {
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
      }

      // Handle number sorting
      if (sortBy === 'amount') {
        aValue = a.amount;
        bValue = b.amount;
      }

      // Handle string sorting (case-insensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getUnmappedExpenses = () => {
    return expenses.filter(exp => selectedExpenseIds.has(exp.id) && !selectedClients.has(exp.id));
  };

  const getUnmappedExpenseCategories = () => {
    return expenses.filter(
      exp => selectedExpenseIds.has(exp.id) && !selectedExpenseCategories.has(exp.id)
    );
  };

  const syncToGoogleSheets = async () => {
    const selectedExpenses = expenses.filter(exp => selectedExpenseIds.has(exp.id));

    if (!googleSheetUrl || selectedExpenses.length === 0) {
      setSyncStatus({
        status: 'error',
        message: 'Please provide Google Sheet URL and select at least one expense',
      });
      return;
    }

    // Check for unmapped expenses
    const unmappedExpenses = getUnmappedExpenses();
    if (unmappedExpenses.length > 0) {
      setSyncStatus({
        status: 'error',
        message: `Please map all expenses to a Sheet Client. ${unmappedExpenses.length} expense(s) are missing client mappings.`,
      });
      return;
    }

    // Check for unmapped expense categories
    const unmappedExpenseCategories = getUnmappedExpenseCategories();
    if (unmappedExpenseCategories.length > 0) {
      setSyncStatus({
        status: 'error',
        message: `Please map all expenses to a Sheet Expense Category. ${unmappedExpenseCategories.length} expense(s) are missing category mappings.`,
      });
      return;
    }

    // Check if tab exists
    if (sheetTabInfo && !sheetTabInfo.exists) {
      setSyncStatus({
        status: 'error',
        message: `Sheet tab "${sheetTabInfo.expectedTabName}" does not exist. Please create this tab in your Google Sheet before syncing.`,
      });
      return;
    }

    // Check if tab is protected/locked
    if (sheetTabInfo?.exists && sheetTabInfo?.isProtected) {
      setSyncStatus({
        status: 'error',
        message: `Cannot sync to protected sheet tab "${sheetTabInfo.tabName}". Please unlock the tab or contact the sheet owner.`,
      });
      return;
    }

    // Auto-generate sheet name based on selected month
    const { startDate } = getDateRangeFromMonth(selectedMonth);
    const sheetName = `Expenses - ${format(startDate, 'MMMM yyyy')}`;

    console.log('Auto-generated sheet name:', sheetName);

    setSyncStatus({
      status: 'syncing',
      message: 'Syncing expenses to Google Sheets...',
      totalRecords: selectedExpenses.length,
      processedRecords: 0,
    });

    try {
      const response = await fetch('/api/ramp/sync-to-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          expenses: selectedExpenses,
          sheet_url: googleSheetUrl,
          sheet_name: sheetName,
          client_mappings: Object.fromEntries(selectedClients),
          expense_category_mappings: Object.fromEntries(selectedExpenseCategories),
          profiles_amounts: Object.fromEntries(profilesAmounts),
          prepaid_placements_amounts: Object.fromEntries(prepaidPlacementsAmounts),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync to Google Sheets');
      }

      const result = await response.json();
      setSyncStatus({
        status: 'success',
        message: `Successfully synced ${result.recordsProcessed} expenses to Google Sheets`,
        processedRecords: result.recordsProcessed,
        totalRecords: selectedExpenses.length,
      });
    } catch (error) {
      setSyncStatus({
        status: 'error',
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const selectedUserName = users.find(u => u.id === selectedUser)?.name || '';

  if (!token) {
    return <UnauthorizedAccess />;
  }

  if (authStatus.isLoading) {
    return (
      <IntercomLayout
        title="Ramp Expense Sync"
        breadcrumbs={[{ label: 'Ramp', href: '/ramp-expense-sync' }, { label: 'Expense Sync' }]}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}
        >
          <LinearProgress sx={{ width: '300px' }} />
        </Box>
      </IntercomLayout>
    );
  }

  if (!authStatus.isAuthenticated) {
    return (
      <IntercomLayout
        title="Ramp Expense Sync"
        breadcrumbs={[{ label: 'Ramp', href: '/ramp-expense-sync' }, { label: 'Expense Sync' }]}
      >
        <Card sx={{ mt: 3, maxWidth: 600 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Authentication Required
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              To access your Ramp expense data, you need to authenticate with Ramp first. This will
              allow the application to securely fetch your expense information.
            </Typography>

            {authStatus.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {authStatus.error}
              </Alert>
            )}

            <Button
              variant="contained"
              color="primary"
              onClick={initiateAuth}
              size="large"
              fullWidth
            >
              Connect to Ramp
            </Button>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              You&apos;ll be redirected to Ramp to authorize this application. Only Admin or
              Business Owner roles can grant permissions.
            </Typography>
          </CardContent>
        </Card>
      </IntercomLayout>
    );
  }

  return (
    <IntercomLayout
      title="Ramp Expense Sync"
      breadcrumbs={[{ label: 'Ramp', href: '/ramp-expense-sync' }, { label: 'Expense Sync' }]}
    >
      <Alert severity="success" sx={{ mb: 3 }}>
        ✅ Connected to Ramp
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Expense Selection
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {mappedUsers.length === 0 && (
                  <Alert severity="warning">
                    <strong>No users mapped to sheets:</strong> You need to set up user-to-sheet
                    mappings first. Go to{' '}
                    <a href="/ramp-user-mappings" target="_blank">
                      User Mappings
                    </a>{' '}
                    to configure which Google Sheet each team member&apos;s expenses should sync to.
                  </Alert>
                )}

                <FormControl fullWidth>
                  <InputLabel>Select Team Member</InputLabel>
                  <Select
                    value={selectedUser}
                    label="Select Team Member"
                    onChange={e => setSelectedUser(e.target.value)}
                  >
                    {mappedUsers.length === 0 ? (
                      <MenuItem disabled>No users with sheet mappings found</MenuItem>
                    ) : (
                      mappedUsers.map(user => (
                        <MenuItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Select Month</InputLabel>
                  <Select
                    value={selectedMonth}
                    label="Select Month"
                    onChange={e => setSelectedMonth(e.target.value)}
                  >
                    {getAvailableMonths().map(month => (
                      <MenuItem key={month.value} value={month.value}>
                        {month.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Google Sheets Configuration
              </Typography>

              {userMapping ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>Mapped Sheet Found:</strong> This user is already mapped to a Google
                  Sheet.
                </Alert>
              ) : selectedUser ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <strong>No Mapping:</strong> This user is not mapped to a Google Sheet. You can
                  set up mappings in{' '}
                  <a href="/ramp-user-mappings" target="_blank">
                    User Mappings
                  </a>
                  .
                </Alert>
              ) : null}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Google Sheet URL"
                  value={googleSheetUrl}
                  onChange={e => setGoogleSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  fullWidth
                  helperText={
                    userMapping ? 'Sheet URL from user mapping' : 'Paste the full Google Sheets URL'
                  }
                  disabled={!!userMapping}
                />

                {/* Sheet Tab Status */}
                {googleSheetUrl && selectedMonth && (
                  <Box sx={{ mb: 2 }}>
                    {checkingTab ? (
                      <Alert severity="info">
                        <strong>Checking sheet tabs...</strong> Looking for tab &ldquo;
                        {(() => {
                          const { startDate } = getDateRangeFromMonth(selectedMonth);
                          return format(startDate, 'MMMM yyyy');
                        })()}
                        &rdquo;
                        <LinearProgress sx={{ mt: 1 }} />
                      </Alert>
                    ) : sheetTabInfo ? (
                      sheetTabInfo.exists ? (
                        <Alert severity={sheetTabInfo.isProtected ? 'error' : 'success'}>
                          <strong>Tab found:</strong> &ldquo;{sheetTabInfo.tabName}&rdquo; matches
                          the expected format for{' '}
                          {(() => {
                            const { startDate } = getDateRangeFromMonth(selectedMonth);
                            return format(startDate, 'MMMM yyyy');
                          })()}
                          {sheetTabInfo.isProtected && (
                            <>
                              <br />
                              <strong>⚠️ This tab is protected/locked.</strong> You must unlock it
                              before syncing.
                            </>
                          )}
                        </Alert>
                      ) : (
                        <Alert severity="error">
                          <strong>Tab not found:</strong> &ldquo;
                          {sheetTabInfo.expectedTabName}&rdquo; doesn&apos;t exist. Please create
                          this tab in your Google Sheet before syncing.
                          <br />
                          <small>
                            Existing tabs:{' '}
                            {sheetTabInfo.allTabs.length > 0
                              ? sheetTabInfo.allTabs.join(', ')
                              : 'None'}
                          </small>
                        </Alert>
                      )
                    ) : (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}
                      >
                        <strong>Sheet tab:</strong> Looking for tab named &ldquo;Expenses -{' '}
                        {(() => {
                          const { startDate } = getDateRangeFromMonth(selectedMonth);
                          return format(startDate, 'MMMM yyyy');
                        })()}
                        &rdquo;
                      </Typography>
                    )}
                  </Box>
                )}

                <Button
                  variant="contained"
                  color="primary"
                  onClick={syncToGoogleSheets}
                  disabled={
                    syncStatus.status === 'syncing' ||
                    selectedExpenseIds.size === 0 ||
                    !googleSheetUrl ||
                    getUnmappedExpenses().length > 0 ||
                    getUnmappedExpenseCategories().length > 0 ||
                    (sheetTabInfo && !sheetTabInfo.exists) ||
                    (sheetTabInfo?.exists && sheetTabInfo?.isProtected)
                  }
                  fullWidth
                >
                  {syncStatus.status === 'syncing'
                    ? 'Syncing...'
                    : sheetTabInfo && !sheetTabInfo.exists
                      ? 'Sheet Tab Does Not Exist'
                      : sheetTabInfo?.exists && sheetTabInfo?.isProtected
                        ? 'Sheet Tab is Protected'
                        : getUnmappedExpenses().length > 0
                          ? `Map ${getUnmappedExpenses().length} Missing Client(s)`
                          : getUnmappedExpenseCategories().length > 0
                            ? `Map ${getUnmappedExpenseCategories().length} Missing Category/Categories`
                            : `Sync ${selectedExpenseIds.size} Selected Expenses`}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {syncStatus.status !== 'idle' && (
        <Box sx={{ mt: 3 }}>
          <Alert
            severity={
              syncStatus.status === 'success'
                ? 'success'
                : syncStatus.status === 'error'
                  ? 'error'
                  : 'info'
            }
          >
            {syncStatus.message}
          </Alert>
          {syncStatus.status === 'syncing' && syncStatus.totalRecords && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={((syncStatus.processedRecords || 0) / syncStatus.totalRecords) * 100}
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {syncStatus.processedRecords || 0} of {syncStatus.totalRecords} records processed
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Expenses Table */}
      {(loadingExpenses || expenses.length > 0) && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                {loadingExpenses
                  ? 'Loading expenses...'
                  : `${expenses.length} expenses for ${selectedUserName}`}
              </Typography>
            </Box>
            {expenses.length > 0 && (
              <Box
                sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 2 }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedExpenseIds.size === expenses.length && expenses.length > 0}
                      indeterminate={
                        selectedExpenseIds.size > 0 && selectedExpenseIds.size < expenses.length
                      }
                      onChange={handleSelectAll}
                    />
                  }
                  label="Select All"
                />
              </Box>
            )}

            {loadingExpenses && <LinearProgress sx={{ mb: 2 }} />}

            {expenses.length > 0 && (
              <>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip
                    label={`${selectedExpenseIds.size} of ${expenses.length} selected`}
                    color="primary"
                  />
                  <Chip
                    label={`Total: $${expenses
                      .filter(exp => selectedExpenseIds.has(exp.id))
                      .reduce((sum, exp) => sum + exp.amount, 0)
                      .toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                    color="secondary"
                  />
                  <Chip
                    label={`Month: ${selectedMonth ? format(new Date(selectedMonth + '-01'), 'MMMM yyyy') : 'Not selected'}`}
                  />
                  {getUnmappedExpenses().length > 0 && (
                    <Chip
                      label={`${getUnmappedExpenses().length} unmapped clients`}
                      color="error"
                      variant="outlined"
                    />
                  )}
                  {getUnmappedExpenseCategories().length > 0 && (
                    <Chip
                      label={`${getUnmappedExpenseCategories().length} unmapped categories`}
                      color="error"
                      variant="outlined"
                    />
                  )}
                </Box>

                {getUnmappedExpenses().length > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>Missing Client Mappings:</strong> {getUnmappedExpenses().length}{' '}
                    expense(s) highlighted in red need to have a Sheet Client selected before
                    syncing.
                  </Alert>
                )}

                {getUnmappedExpenseCategories().length > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>Missing Category Mappings:</strong>{' '}
                    {getUnmappedExpenseCategories().length} expense(s) highlighted in red need to
                    have a Sheet Expense Category selected before syncing.
                  </Alert>
                )}

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">Select</TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'date'}
                            direction={sortBy === 'date' ? sortOrder : 'asc'}
                            onClick={() => handleSort('date')}
                          >
                            Date
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'amount'}
                            direction={sortBy === 'amount' ? sortOrder : 'asc'}
                            onClick={() => handleSort('amount')}
                          >
                            Amount
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'description'}
                            direction={sortBy === 'description' ? sortOrder : 'asc'}
                            onClick={() => handleSort('description')}
                          >
                            Memo
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'merchant'}
                            direction={sortBy === 'merchant' ? sortOrder : 'asc'}
                            onClick={() => handleSort('merchant')}
                          >
                            Merchant
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'category'}
                            direction={sortBy === 'category' ? sortOrder : 'asc'}
                            onClick={() => handleSort('category')}
                          >
                            Category
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'client'}
                            direction={sortBy === 'client' ? sortOrder : 'asc'}
                            onClick={() => handleSort('client')}
                          >
                            Client
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>Sheet Client</TableCell>
                        <TableCell>Sheet Expense Category</TableCell>
                        <TableCell>Profiles</TableCell>
                        <TableCell>Prepaid Placements</TableCell>
                        <TableCell>Split</TableCell>
                        <TableCell>Debug</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getSortedExpenses().map(expense => {
                        const isUnmapped =
                          selectedExpenseIds.has(expense.id) &&
                          (!selectedClients.has(expense.id) ||
                            !selectedExpenseCategories.has(expense.id));
                        return (
                          <TableRow
                            key={expense.id}
                            hover
                            sx={{
                              backgroundColor: isUnmapped ? '#ffebee' : 'inherit',
                              '&:hover': {
                                backgroundColor: isUnmapped ? '#ffcdd2' : 'rgba(0, 0, 0, 0.04)',
                              },
                            }}
                          >
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedExpenseIds.has(expense.id)}
                                onChange={() => handleExpenseToggle(expense.id)}
                              />
                            </TableCell>
                            <TableCell>
                              {(() => {
                                try {
                                  const date = new Date(expense.date);
                                  return isNaN(date.getTime())
                                    ? 'Invalid Date'
                                    : format(date, 'MMM dd, yyyy');
                                } catch (error) {
                                  console.error('Date formatting error:', expense.date, error);
                                  return 'Invalid Date';
                                }
                              })()}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                $
                                {expense.amount.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ maxWidth: 250 }}>
                                {expense.description}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{expense.merchant}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {expense.category}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium" color="primary.main">
                                {expense.client}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <FormControl size="small" sx={{ minWidth: 120 }}>
                                <Select
                                  value={selectedClients.get(expense.id) || ''}
                                  onChange={e => handleClientSelection(expense.id, e.target.value)}
                                  displayEmpty
                                  disabled={loadingClientOptions || clientOptions.length === 0}
                                >
                                  <MenuItem value="">
                                    <em>
                                      {loadingClientOptions
                                        ? 'Loading...'
                                        : clientOptions.length === 0
                                          ? 'No clients'
                                          : 'Select client'}
                                    </em>
                                  </MenuItem>
                                  {clientOptions.sort().map(client => (
                                    <MenuItem key={client} value={client}>
                                      {client}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <FormControl size="small" sx={{ minWidth: 150 }}>
                                <Select
                                  value={selectedExpenseCategories.get(expense.id) || ''}
                                  onChange={e =>
                                    handleExpenseCategorySelection(expense.id, e.target.value)
                                  }
                                  displayEmpty
                                >
                                  <MenuItem value="">
                                    <em>Select category</em>
                                  </MenuItem>
                                  {expenseCategoryOptions.map(category => (
                                    <MenuItem key={category} value={category}>
                                      {category}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                placeholder="$0.00"
                                value={profilesAmounts.get(expense.id) || ''}
                                onChange={e =>
                                  handleProfilesAmountChange(expense.id, e.target.value)
                                }
                                sx={{ minWidth: 100 }}
                                InputProps={{
                                  startAdornment: '$',
                                  inputProps: {
                                    min: 0,
                                    step: 0.01,
                                    style: { textAlign: 'right' },
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                placeholder="$0.00"
                                value={prepaidPlacementsAmounts.get(expense.id) || ''}
                                onChange={e =>
                                  handlePrepaidPlacementsAmountChange(expense.id, e.target.value)
                                }
                                sx={{ minWidth: 100 }}
                                InputProps={{
                                  startAdornment: '$',
                                  inputProps: {
                                    min: 0,
                                    step: 0.01,
                                    style: { textAlign: 'right' },
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              {expense.is_line_item &&
                              expense.total_line_items &&
                              expense.total_line_items > 1 ? (
                                <Tooltip
                                  title={`Line item ${(expense.line_item_index || 0) + 1} of ${expense.total_line_items} (total: ${expense.total_amount ? `$${expense.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'split expense'})`}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CallSplit fontSize="small" color="info" />
                                    <Typography variant="caption" color="text.secondary">
                                      {(expense.line_item_index || 0) + 1}/
                                      {expense.total_line_items}
                                    </Typography>
                                  </Box>
                                </Tooltip>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => copyToClipboard(expense.raw_data)}
                                title="Copy raw JSON data to clipboard"
                              >
                                <ContentCopy fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </IntercomLayout>
  );
};

export default RampExpenseSync;
