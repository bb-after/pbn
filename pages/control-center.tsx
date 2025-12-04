import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Skeleton,
  Paper,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  TrendingUp,
  Speed,
  DataUsage,
  AccessTime,
  Close as CloseIcon,
} from '@mui/icons-material';
import { green, orange, red, blue } from '@mui/material/colors';
import Head from 'next/head';
import { IntercomLayout } from '../components/ui';
import useAuth from '../hooks/useAuth';
import { UserAnalyticsTable } from '../components/UserAnalyticsTable';

interface ProductMetrics {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  dailyActivity: number;
  weeklyActivity: number;
  monthlyActivity: number;
  totalRecords: number;
  lastActivity: string;
  uptime: number;
  errorRate: number;
  details: {
    activeUsers?: number;
    pendingItems?: number;
    successRate?: number;
    avgProcessingTime?: number;
    activeSites?: number;
    activeSchedules?: number;
    activeClients?: number;
    [key: string]: any;
  };
}

interface ControlCenterMetrics {
  overview: {
    totalProducts: number;
    healthyProducts: number;
    warningProducts: number;
    errorProducts: number;
  };
  products: ProductMetrics[];
}

const StatusIcon = ({ status }: { status: 'healthy' | 'warning' | 'error' }) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle sx={{ color: green[500] }} />;
    case 'warning':
      return <Warning sx={{ color: orange[500] }} />;
    case 'error':
      return <ErrorIcon sx={{ color: red[500] }} />;
  }
};

const StatusChip = ({ status }: { status: 'healthy' | 'warning' | 'error' }) => {
  const colors = {
    healthy: { bg: green[100], text: green[800] },
    warning: { bg: orange[100], text: orange[800] },
    error: { bg: red[100], text: red[800] },
  };

  return (
    <Chip
      icon={<StatusIcon status={status} />}
      label={status.toUpperCase()}
      size="small"
      sx={{
        backgroundColor: colors[status].bg,
        color: colors[status].text,
        fontWeight: 600,
      }}
    />
  );
};

const ProductCard = ({ product, onClick }: { product: ProductMetrics; onClick: (product: ProductMetrics) => void }) => {
  const formatLastActivity = (lastActivity: string) => {
    if (lastActivity === 'Never') return 'Never';
    try {
      return new Date(lastActivity).toLocaleString();
    } catch {
      return lastActivity;
    }
  };

  const getAnalyticsEndpoint = (productName: string) => {
    switch (productName) {
      case 'PBN': return '/api/control-center/pbn-analytics';
      case 'Superstar': return '/api/control-center/superstar-analytics';
      case 'Stillbrook': return '/api/control-center/stillbrook-analytics';
      case 'Lead Enricher': return '/api/control-center/lead-enricher-analytics';
      default: return null;
    }
  };

  const shouldBeClickable = getAnalyticsEndpoint(product.name) !== null;

  return (
    <Card 
      sx={{ 
        height: '100%', 
        position: 'relative',
        cursor: shouldBeClickable ? 'pointer' : 'default',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': shouldBeClickable ? {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        } : {}
      }}
      onClick={() => shouldBeClickable && onClick(product)}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={600}>
            {product.name}
          </Typography>
          <StatusChip status={product.status} />
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box textAlign="center">
              <Typography variant="h4" color="primary" fontWeight={700}>
                {product.dailyActivity}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Today
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box textAlign="center">
              <Typography variant="h4" color="secondary" fontWeight={700}>
                {product.weeklyActivity}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                This Week
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <DataUsage fontSize="small" />
              Total Records
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {product.totalRecords.toLocaleString()}
            </Typography>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <Speed fontSize="small" />
              Uptime
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {product.uptime}%
            </Typography>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <TrendingUp fontSize="small" />
              Success Rate
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {product.details.successRate || 100 - product.errorRate}%
            </Typography>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <AccessTime fontSize="small" />
              Last Activity
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatLastActivity(product.lastActivity)}
            </Typography>
          </Box>

          {/* Product-specific details */}
          {product.details.activeSites && (
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="textSecondary">
                Active Sites
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {product.details.activeSites}
              </Typography>
            </Box>
          )}

          {product.details.activeSchedules && (
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="textSecondary">
                Active Schedules
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {product.details.activeSchedules}
              </Typography>
            </Box>
          )}

          {product.details.activeClients && (
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="textSecondary">
                Active Clients
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {product.details.activeClients}
              </Typography>
            </Box>
          )}

          {product.details.avgProcessingTime && (
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="textSecondary">
                Avg Processing Time
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {product.details.avgProcessingTime}s
              </Typography>
            </Box>
          )}
        </Stack>

        {/* Health bar */}
        <Box mt={2}>
          <LinearProgress
            variant="determinate"
            value={product.uptime}
            sx={{
              height: 6,
              borderRadius: 3,
              '& .MuiLinearProgress-bar': {
                backgroundColor:
                  product.status === 'healthy'
                    ? green[500]
                    : product.status === 'warning'
                      ? orange[500]
                      : red[500],
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

const OverviewCard = ({ overview }: { overview: ControlCenterMetrics['overview'] }) => {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        System Overview
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={3}>
          <Box textAlign="center">
            <Typography variant="h3" color="primary" fontWeight={700}>
              {overview.totalProducts}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Products
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={3}>
          <Box textAlign="center">
            <Typography variant="h3" sx={{ color: green[600] }} fontWeight={700}>
              {overview.healthyProducts}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Healthy
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={3}>
          <Box textAlign="center">
            <Typography variant="h3" sx={{ color: orange[600] }} fontWeight={700}>
              {overview.warningProducts}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Warning
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={3}>
          <Box textAlign="center">
            <Typography variant="h3" sx={{ color: red[600] }} fontWeight={700}>
              {overview.errorProducts}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Error
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

function ControlCenterContent() {
  const { isValidUser } = useAuth('/login');
  const [metrics, setMetrics] = useState<ControlCenterMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductMetrics | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (isValidUser) {
      fetchMetrics();
      // Refresh every 30 seconds
      const interval = setInterval(fetchMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [isValidUser]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/control-center/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product: ProductMetrics) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedProduct(null);
  };

  const getAnalyticsEndpoint = (productName: string) => {
    switch (productName) {
      case 'PBN': return '/api/control-center/pbn-analytics';
      case 'Superstar': return '/api/control-center/superstar-analytics';
      case 'Stillbrook': return '/api/control-center/stillbrook-analytics';
      case 'Lead Enricher': return '/api/control-center/lead-enricher-analytics';
      default: return null;
    }
  };

  if (!isValidUser) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Control Center - Tooling Dashboard</title>
      </Head>

      <Box p={3} minHeight="100vh">
        <Typography variant="h3" fontWeight={700} mb={1}>
          Control Center
        </Typography>
        <Typography variant="h6" color="textSecondary" mb={3}>
          Monitor the heartbeat of all your tooling and services
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Grid container spacing={3}>
            {[...Array(8)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="60%" height={32} />
                    <Skeleton
                      variant="circular"
                      width={24}
                      height={24}
                      sx={{ float: 'right', mt: -4 }}
                    />
                    <Box mt={2}>
                      <Skeleton variant="text" width="40%" height={48} />
                      <Skeleton variant="text" width="80%" />
                      <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : metrics ? (
          <>
            <OverviewCard overview={metrics.overview} />

            <Grid container spacing={3}>
              {metrics.products.map(product => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.name}>
                  <ProductCard product={product} onClick={handleProductClick} />
                </Grid>
              ))}
            </Grid>
          </>
        ) : null}

        <Box mt={3} textAlign="center">
          <Typography variant="caption" color="textSecondary">
            Last updated: {new Date().toLocaleString()} • Auto-refresh every 30 seconds
          </Typography>
        </Box>

        {/* User Analytics Modal */}
        <Dialog
          open={modalOpen}
          onClose={handleModalClose}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: {
              minHeight: '80vh',
              maxHeight: '90vh'
            }
          }}
        >
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h5" fontWeight={600}>
                {selectedProduct?.name} User Analytics
              </Typography>
              <IconButton onClick={handleModalClose} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {selectedProduct && getAnalyticsEndpoint(selectedProduct.name) && (
              <UserAnalyticsTable
                productName={selectedProduct.name}
                apiEndpoint={getAnalyticsEndpoint(selectedProduct.name)!}
                onClose={handleModalClose}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleModalClose} variant="outlined">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}

export default function ControlCenter() {
  return (
    <IntercomLayout>
      <ControlCenterContent />
    </IntercomLayout>
  );
}
