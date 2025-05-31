import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';
import { emergencyAPI } from '../services/api';
import AlertCard from '../components/Weather/AlertCard';
import LoadingScreen from '../components/Common/LoadingScreen';
import { COLORS, FONTS, SPACING, ALERT_SEVERITIES } from '../utils/constants';

const AlertsScreen = ({ navigation }) => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const { currentLocation } = useLocation();

  useEffect(() => {
    loadAlerts();
  }, [currentLocation]);

  useEffect(() => {
    applyFilter();
  }, [alerts, selectedFilter]);

  const loadAlerts = async () => {
    if (!currentLocation) {
      setLoading(false);
      return;
    }

    try {
      const response = await emergencyAPI.getActiveAlerts(
        currentLocation.latitude,
        currentLocation.longitude,
        100 // 100km radius
      );

      setAlerts(response.data);
    } catch (error) {
      console.error('Error loading alerts:', error);
      Alert.alert('Error', 'Failed to load alerts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = () => {
    let filtered = alerts;

    if (selectedFilter !== 'all') {
      filtered = alerts.filter(alert => alert.severity === selectedFilter);
    }

    // Sort by severity and time
    filtered.sort((a, b) => {
      const severityOrder = {
        [ALERT_SEVERITIES.CRITICAL]: 5,
        [ALERT_SEVERITIES.HIGH]: 4,
        [ALERT_SEVERITIES.MEDIUM]: 3,
        [ALERT_SEVERITIES.LOW]: 2,
        [ALERT_SEVERITIES.EXTREME]: 6,
      };

      const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;

      return new Date(b.issued_at) - new Date(a.issued_at);
    });

    setFilteredAlerts(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAlerts();
  };

  const handleAlertPress = (alert) => {
    navigation.navigate('AlertDetails', { alert });
  };

  const handleDismissAlert = (alertId) => {
    // In a real app, this would call an API to dismiss the alert
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    Alert.alert('Alert Dismissed', 'The alert has been dismissed from your view.');
  };

  const getFilterCount = (filter) => {
    if (filter === 'all') return alerts.length;
    return alerts.filter(alert => alert.severity === filter).length;
  };

  const renderAlert = ({ item }) => (
    <AlertCard
      alertData={item}
      onPress={() => handleAlertPress(item)}
      onDismiss={handleDismissAlert}
      showActions={true}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="shield-checkmark" size={64} color={COLORS.SUCCESS} />
      <Text style={styles.emptyTitle}>No Active Alerts</Text>
      <Text style={styles.emptySubtitle}>
        {selectedFilter === 'all' 
          ? 'There are currently no emergency alerts in your area.'
          : `No ${selectedFilter} severity alerts in your area.`
        }
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={loadAlerts}>
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <LoadingScreen message="Loading emergency alerts..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency Alerts</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="filter" size={24} color={COLORS.PRIMARY} />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterChips}>
        <FilterChip
          label={`All (${getFilterCount('all')})`}
          selected={selectedFilter === 'all'}
          onPress={() => setSelectedFilter('all')}
        />
        <FilterChip
          label={`Critical (${getFilterCount(ALERT_SEVERITIES.CRITICAL)})`}
          selected={selectedFilter === ALERT_SEVERITIES.CRITICAL}
          onPress={() => setSelectedFilter(ALERT_SEVERITIES.CRITICAL)}
          color={COLORS.ERROR}
        />
        <FilterChip
          label={`High (${getFilterCount(ALERT_SEVERITIES.HIGH)})`}
          selected={selectedFilter === ALERT_SEVERITIES.HIGH}
          onPress={() => setSelectedFilter(ALERT_SEVERITIES.HIGH)}
          color={COLORS.WARNING}
        />
      </View>

      {/* Alerts List */}
      <FlatList
        data={filteredAlerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Alerts</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.GRAY_DARK} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalSectionTitle}>By Severity</Text>
            
            <FilterOption
              label="All Alerts"
              count={getFilterCount('all')}
              selected={selectedFilter === 'all'}
              onPress={() => {
                setSelectedFilter('all');
                setFilterModalVisible(false);
              }}
            />
            
            <FilterOption
              label="Critical"
              count={getFilterCount(ALERT_SEVERITIES.CRITICAL)}
              selected={selectedFilter === ALERT_SEVERITIES.CRITICAL}
              onPress={() => {
                setSelectedFilter(ALERT_SEVERITIES.CRITICAL);
                setFilterModalVisible(false);
              }}
              color={COLORS.ERROR}
            />
            
            <FilterOption
              label="High"
              count={getFilterCount(ALERT_SEVERITIES.HIGH)}
              selected={selectedFilter === ALERT_SEVERITIES.HIGH}
              onPress={() => {
                setSelectedFilter(ALERT_SEVERITIES.HIGH);
                setFilterModalVisible(false);
              }}
              color={COLORS.WARNING}
            />
            
            <FilterOption
              label="Medium"
              count={getFilterCount(ALERT_SEVERITIES.MEDIUM)}
              selected={selectedFilter === ALERT_SEVERITIES.MEDIUM}
              onPress={() => {
                setSelectedFilter(ALERT_SEVERITIES.MEDIUM);
                setFilterModalVisible(false);
              }}
              color={COLORS.INFO}
            />
            
            <FilterOption
              label="Low"
              count={getFilterCount(ALERT_SEVERITIES.LOW)}
              selected={selectedFilter === ALERT_SEVERITIES.LOW}
              onPress={() => {
                setSelectedFilter(ALERT_SEVERITIES.LOW);
                setFilterModalVisible(false);
              }}
              color={COLORS.SUCCESS}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const FilterChip = ({ label, selected, onPress, color = COLORS.PRIMARY }) => (
  <TouchableOpacity
    style={[
      styles.filterChip,
      selected && { backgroundColor: color },
    ]}
    onPress={onPress}
  >
    <Text
      style={[
        styles.filterChipText,
        selected && { color: COLORS.WHITE },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const FilterOption = ({ label, count, selected, onPress, color = COLORS.PRIMARY }) => (
  <TouchableOpacity style={styles.filterOption} onPress={onPress}>
    <View style={styles.filterOptionContent}>
      <View style={[styles.filterOptionIndicator, { backgroundColor: color }]} />
      <Text style={styles.filterOptionLabel}>{label}</Text>
      <Text style={styles.filterOptionCount}>({count})</Text>
    </View>
    {selected && (
      <Ionicons name="checkmark" size={20} color={COLORS.PRIMARY} />
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.LARGE,
    backgroundColor: COLORS.WHITE,
  },
  headerTitle: {
    fontSize: FONTS.SIZE_HEADER,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SMALL,
    paddingVertical: SPACING.TINY,
  },
  filterButtonText: {
    marginLeft: SPACING.TINY,
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  filterChips: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  filterChip: {
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.SMALL,
    borderRadius: 16,
    backgroundColor: COLORS.GRAY_LIGHT,
    marginRight: SPACING.SMALL,
  },
  filterChipText: {
    fontSize: FONTS.SIZE_SMALL,
    fontWeight: '500',
    color: COLORS.GRAY_DARK,
  },
  listContainer: {
    padding: SPACING.MEDIUM,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.LARGE,
  },
  emptyTitle: {
    fontSize: FONTS.SIZE_LARGE,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
    marginTop: SPACING.MEDIUM,
    marginBottom: SPACING.SMALL,
  },
  emptySubtitle: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.GRAY_MEDIUM,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.LARGE,
  },
  refreshButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.LARGE,
    paddingVertical: SPACING.MEDIUM,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MEDIUM,
    paddingVertical: SPACING.LARGE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  modalTitle: {
    fontSize: FONTS.SIZE_LARGE,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
  },
  modalContent: {
    flex: 1,
    padding: SPACING.MEDIUM,
  },
  modalSectionTitle: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
    marginBottom: SPACING.MEDIUM,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.MEDIUM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterOptionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.SMALL,
  },
  filterOptionLabel: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.GRAY_DARK,
    flex: 1,
  },
  filterOptionCount: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.GRAY_MEDIUM,
    marginRight: SPACING.SMALL,
  },
});

export default AlertsScreen;
