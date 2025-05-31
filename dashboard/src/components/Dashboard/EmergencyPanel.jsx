import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Badge,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Refresh,
  Warning,
  CheckCircle,
  Cancel,
  Schedule,
  LocationOn,
  Phone,
  Person,
  Edit,
  Delete,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { emergencyAPI } from '../../services/api';
import { format, formatDistanceToNow } from 'date-fns';

const EmergencyPanel = () => {
  const [createAlertOpen, setCreateAlertOpen] = useState(false);
  const [createResponseOpen, setCreateResponseOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alertForm, setAlertForm] = useState({
    title: '',
    description: '',
    severity: 'medium',
    latitude: '',
    longitude: '',
    radius: '',
    risk_type: '',
    contact_info: '',
  });
  const [responseForm, setResponseForm] = useState({
    response_type: '',
    description: '',
    priority: 3,
    personnel_count: '',
    estimated_cost: '',
    deployment_location: '',
    contact_person: '',
    contact_phone: '',
  });

  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  // Fetch emergency dashboard summary
  const { data: dashboardSummary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['emergency-dashboard-summary'],
    queryFn: () => emergencyAPI.getDashboardSummary(),
    select: (response) => response.data,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch recent alerts
  const { data: recentAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['recent-alerts'],
    queryFn: () => emergencyAPI.getAlerts({ limit: 10, status: 'active' }),
    select: (response) => response.data,
    refetchInterval: 30000,
  });

  // Fetch recent responses
  const { data: recentResponses, isLoading: responsesLoading } = useQuery({
    queryKey: ['recent-responses'],
    queryFn: () => emergencyAPI.getResponses({ limit: 10 }),
    select: (response) => response.data,
    refetchInterval: 60000,
  });

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: (alertData) => emergencyAPI.createAlert(alertData),
    onSuccess: () => {
      queryClient.invalidateQueries(['emergency-dashboard-summary']);
      queryClient.invalidateQueries(['recent-alerts']);
      setCreateAlertOpen(false);
      setAlertForm({
        title: '',
        description: '',
        severity: 'medium',
        latitude: '',
        longitude: '',
        radius: '',
        risk_type: '',
        contact_info: '',
      });
      enqueueSnackbar('Emergency alert created successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to create alert: ${error.response?.data?.detail || error.message}`, { 
        variant: 'error' 
      });
    },
  });

  // Create response mutation
  const createResponseMutation = useMutation({
    mutationFn: (responseData) => emergencyAPI.createResponse(responseData),
    onSuccess: () => {
      queryClient.invalidateQueries(['recent-responses']);
      setCreateResponseOpen(false);
      setResponseForm({
        response_type: '',
        description: '',
        priority: 3,
        personnel_count: '',
        estimated_cost: '',
        deployment_location: '',
        contact_person: '',
        contact_phone: '',
      });
      enqueueSnackbar('Emergency response plan created successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to create response: ${error.response?.data?.detail || error.message}`, { 
        variant: 'error' 
      });
    },
  });

  // Update alert status mutation
  const updateAlertMutation = useMutation({
    mutationFn: ({ alertId, status }) => emergencyAPI.updateAlert(alertId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['emergency-dashboard-summary']);
      queryClient.invalidateQueries(['recent-alerts']);
      enqueueSnackbar('Alert status updated successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar(`Failed to update alert: ${error.response?.data?.detail || error.message}`, { 
        variant: 'error' 
      });
    },
  });

  const handleCreateAlert = () => {
    const alertData = {
      ...alertForm,
      latitude: parseFloat(alertForm.latitude),
      longitude: parseFloat(alertForm.longitude),
      radius: alertForm.radius ? parseFloat(alertForm.radius) * 1000 : null, // Convert km to meters
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    };
    createAlertMutation.mutate(alertData);
  };

  const handleCreateResponse = () => {
    if (!selectedAlert) return;
    
    const responseData = {
      ...responseForm,
      alert_id: selectedAlert.alert_id,
      personnel_count: responseForm.personnel_count ? parseInt(responseForm.personnel_count) : null,
      estimated_cost: responseForm.estimated_cost ? parseFloat(responseForm.estimated_cost) : null,
    };
    createResponseMutation.mutate(responseData);
  };

  const handleUpdateAlertStatus = (alertId, status) => {
    updateAlertMutation.mutate({ alertId, status });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'error';
      case 'resolved': return 'success';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getResponseStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Dashboard Summary */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Alerts
                  </Typography>
                  <Typography variant="h4">
                    {summaryLoading ? '-' : Object.values(dashboardSummary?.active_alerts_by_severity || {}).reduce((a, b) => a + b, 0)}
                  </Typography>
                </Box>
                <Warning color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Active Responses
                  </Typography>
                  <Typography variant="h4">
                    {summaryLoading ? '-' : Object.values(dashboardSummary?.active_responses_by_status || {}).reduce((a, b) => a + b, 0)}
                  </Typography>
                </Box>
                <CheckCircle color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Critical Alerts
                  </Typography>
                  <Typography variant="h4">
                    {summaryLoading ? '-' : dashboardSummary?.active_alerts_by_severity?.critical || 0}
                  </Typography>
                </Box>
                <Badge badgeContent={dashboardSummary?.active_alerts_by_severity?.critical || 0} color="error">
                  <Warning color="error" sx={{ fontSize: 40 }} />
                </Badge>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Recent Alerts (24h)
                  </Typography>
                  <Typography variant="h4">
                    {summaryLoading ? '-' : dashboardSummary?.recent_alerts_24h || 0}
                  </Typography>
                </Box>
                <Schedule color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Alerts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Recent Emergency Alerts</Typography>
                <Box>
                  <Tooltip title="Refresh">
                    <IconButton size="small" onClick={refetchSummary}>
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Add />}
                    onClick={() => setCreateAlertOpen(true)}
                    sx={{ ml: 1 }}
                  >
                    Create Alert
                  </Button>
                </Box>
              </Box>

              {alertsLoading ? (
                <LinearProgress />
              ) : recentAlerts && recentAlerts.length > 0 ? (
                <List dense>
                  {recentAlerts.map((alert, index) => (
                    <React.Fragment key={alert.id}>
                      <ListItem>
                        <ListItemIcon>
                          <Warning color={getSeverityColor(alert.severity)} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" noWrap>
                                {alert.title}
                              </Typography>
                              <Chip
                                label={alert.severity}
                                color={getSeverityColor(alert.severity)}
                                size="small"
                              />
                              <Chip
                                label={alert.status}
                                color={getStatusColor(alert.status)}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {alert.location_name || `${alert.latitude}, ${alert.longitude}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDistanceToNow(new Date(alert.issued_at), { addSuffix: true })}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box display="flex" gap={1}>
                            <Tooltip title="Create Response">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedAlert(alert);
                                  setCreateResponseOpen(true);
                                }}
                              >
                                <Add />
                              </IconButton>
                            </Tooltip>
                            {alert.status === 'active' && (
                              <Tooltip title="Resolve Alert">
                                <IconButton
                                  size="small"
                                  onClick={() => handleUpdateAlertStatus(alert.id, 'resolved')}
                                >
                                  <CheckCircle />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < recentAlerts.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Alert severity="info">No recent emergency alerts</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Responses */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Emergency Responses
              </Typography>

              {responsesLoading ? (
                <LinearProgress />
              ) : recentResponses && recentResponses.length > 0 ? (
                <List dense>
                  {recentResponses.map((response, index) => (
                    <React.Fragment key={response.id}>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color={getResponseStatusColor(response.status)} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" noWrap>
                                {response.response_type.replace('_', ' ').toUpperCase()}
                              </Typography>
                              <Chip
                                label={response.status.replace('_', ' ')}
                                color={getResponseStatusColor(response.status)}
                                size="small"
                              />
                              <Chip
                                label={`Priority ${response.priority}`}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                {response.lead_agency || 'Unknown Agency'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {response.personnel_count ? `${response.personnel_count} personnel` : 'Personnel TBD'}
                              </Typography>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Box display="flex" gap={1}>
                            <Tooltip title="Edit Response">
                              <IconButton size="small">
                                <Edit />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < recentResponses.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Alert severity="info">No recent emergency responses</Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Alert Dialog */}
      <Dialog open={createAlertOpen} onClose={() => setCreateAlertOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Emergency Alert</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Alert Title"
                value={alertForm.title}
                onChange={(e) => setAlertForm({ ...alertForm, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={alertForm.description}
                onChange={(e) => setAlertForm({ ...alertForm, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={alertForm.severity}
                  label="Severity"
                  onChange={(e) => setAlertForm({ ...alertForm, severity: e.target.value })}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Risk Type"
                value={alertForm.risk_type}
                onChange={(e) => setAlertForm({ ...alertForm, risk_type: e.target.value })}
                placeholder="e.g., flood, storm, wildfire"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Latitude"
                type="number"
                value={alertForm.latitude}
                onChange={(e) => setAlertForm({ ...alertForm, latitude: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Longitude"
                type="number"
                value={alertForm.longitude}
                onChange={(e) => setAlertForm({ ...alertForm, longitude: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Radius (km)"
                type="number"
                value={alertForm.radius}
                onChange={(e) => setAlertForm({ ...alertForm, radius: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contact Information"
                value={alertForm.contact_info}
                onChange={(e) => setAlertForm({ ...alertForm, contact_info: e.target.value })}
                placeholder="Emergency contact details"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateAlertOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateAlert}
            variant="contained"
            disabled={createAlertMutation.isLoading || !alertForm.title || !alertForm.description}
          >
            {createAlertMutation.isLoading ? 'Creating...' : 'Create Alert'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Response Dialog */}
      <Dialog open={createResponseOpen} onClose={() => setCreateResponseOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Create Emergency Response
          {selectedAlert && (
            <Typography variant="subtitle2" color="text.secondary">
              For Alert: {selectedAlert.title}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Response Type"
                value={responseForm.response_type}
                onChange={(e) => setResponseForm({ ...responseForm, response_type: e.target.value })}
                placeholder="e.g., evacuation, medical, rescue"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={responseForm.priority}
                  label="Priority"
                  onChange={(e) => setResponseForm({ ...responseForm, priority: e.target.value })}
                >
                  <MenuItem value={1}>1 - Lowest</MenuItem>
                  <MenuItem value={2}>2 - Low</MenuItem>
                  <MenuItem value={3}>3 - Medium</MenuItem>
                  <MenuItem value={4}>4 - High</MenuItem>
                  <MenuItem value={5}>5 - Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={responseForm.description}
                onChange={(e) => setResponseForm({ ...responseForm, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Personnel Count"
                type="number"
                value={responseForm.personnel_count}
                onChange={(e) => setResponseForm({ ...responseForm, personnel_count: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Estimated Cost"
                type="number"
                value={responseForm.estimated_cost}
                onChange={(e) => setResponseForm({ ...responseForm, estimated_cost: e.target.value })}
                placeholder="Cost in USD"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Deployment Location"
                value={responseForm.deployment_location}
                onChange={(e) => setResponseForm({ ...responseForm, deployment_location: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Person"
                value={responseForm.contact_person}
                onChange={(e) => setResponseForm({ ...responseForm, contact_person: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Phone"
                value={responseForm.contact_phone}
                onChange={(e) => setResponseForm({ ...responseForm, contact_phone: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateResponseOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateResponse}
            variant="contained"
            disabled={createResponseMutation.isLoading || !responseForm.response_type || !responseForm.description}
          >
            {createResponseMutation.isLoading ? 'Creating...' : 'Create Response'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmergencyPanel;
