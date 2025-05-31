import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, ALERT_SEVERITIES } from '../../utils/constants';

const AlertCard = ({
  alertData,
  onPress,
  onDismiss,
  showActions = true,
  style,
}) => {
  if (!alertData) {
    return null;
  }

  const {
    id,
    title,
    description,
    severity,
    alertType,
    location,
    issuedAt,
    expiresAt,
    distance,
    verified,
  } = alertData;

  const getSeverityConfig = (severity) => {
    const configs = {
      [ALERT_SEVERITIES.LOW]: {
        color: COLORS.SUCCESS,
        backgroundColor: '#E8F5E8',
        icon: 'information-circle',
        label: 'Advisory',
      },
      [ALERT_SEVERITIES.MEDIUM]: {
        color: COLORS.WARNING,
        backgroundColor: '#FFF3E0',
        icon: 'warning',
        label: 'Watch',
      },
      [ALERT_SEVERITIES.HIGH]: {
        color: COLORS.ERROR,
        backgroundColor: '#FFEBEE',
        icon: 'alert',
        label: 'Warning',
      },
      [ALERT_SEVERITIES.CRITICAL]: {
        color: '#D32F2F',
        backgroundColor: '#FFCDD2',
        icon: 'alert-circle',
        label: 'Emergency',
      },
      [ALERT_SEVERITIES.EXTREME]: {
        color: '#B71C1C',
        backgroundColor: '#FFCDD2',
        icon: 'nuclear',
        label: 'Extreme',
      },
    };

    return configs[severity] || configs[ALERT_SEVERITIES.MEDIUM];
  };

  const getAlertTypeIcon = (type) => {
    const icons = {
      weather: 'cloud',
      flood: 'water',
      drought: 'sunny',
      wildfire: 'flame',
      earthquake: 'earth',
      tsunami: 'water',
      hurricane: 'thunderstorm',
      tornado: 'thunderstorm',
      heat_wave: 'thermometer',
      cold_wave: 'snow',
      air_quality: 'leaf',
      general: 'alert-circle',
    };

    return icons[type] || 'alert-circle';
  };

  const severityConfig = getSeverityConfig(severity);
  const typeIcon = getAlertTypeIcon(alertType);

  const handleDismiss = () => {
    Alert.alert(
      'Dismiss Alert',
      'Are you sure you want to dismiss this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Dismiss', 
          style: 'destructive',
          onPress: () => onDismiss && onDismiss(id)
        },
      ]
    );
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDistance = (distance) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m away`;
    }
    return `${distance.toFixed(1)}km away`;
  };

  const CardContent = () => (
    <View style={[
      styles.container,
      { 
        backgroundColor: severityConfig.backgroundColor,
        borderLeftColor: severityConfig.color,
      },
      style
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.severityContainer}>
          <Ionicons 
            name={severityConfig.icon} 
            size={20} 
            color={severityConfig.color} 
          />
          <Text style={[styles.severityText, { color: severityConfig.color }]}>
            {severityConfig.label.toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.typeContainer}>
          <Ionicons 
            name={typeIcon} 
            size={16} 
            color={COLORS.GRAY_MEDIUM} 
          />
          <Text style={styles.typeText}>
            {alertType.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Verification Badge */}
      {verified && (
        <View style={styles.verificationBadge}>
          <Ionicons name="shield-checkmark" size={14} color={COLORS.SUCCESS} />
          <Text style={styles.verificationText}>Verified</Text>
        </View>
      )}

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>

      {/* Description */}
      <Text style={styles.description} numberOfLines={3}>
        {description}
      </Text>

      {/* Location and Distance */}
      <View style={styles.locationContainer}>
        <Ionicons name="location-outline" size={16} color={COLORS.GRAY_MEDIUM} />
        <Text style={styles.locationText} numberOfLines={1}>
          {location}
        </Text>
        {distance !== undefined && (
          <Text style={styles.distanceText}>
            • {formatDistance(distance)}
          </Text>
        )}
      </View>

      {/* Time Information */}
      <View style={styles.timeContainer}>
        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>Issued:</Text>
          <Text style={styles.timeValue}>{formatTime(issuedAt)}</Text>
        </View>
        {expiresAt && (
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Expires:</Text>
            <Text style={styles.timeValue}>{formatTime(expiresAt)}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.detailsButton]}
            onPress={onPress}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          
          {onDismiss && (
            <TouchableOpacity
              style={[styles.actionButton, styles.dismissButton]}
              onPress={handleDismiss}
            >
              <Ionicons name="close" size={16} color={COLORS.GRAY_MEDIUM} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  if (onPress && !showActions) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: SPACING.MEDIUM,
    marginVertical: SPACING.SMALL,
    borderLeftWidth: 4,
    shadowColor: COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SMALL,
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityText: {
    marginLeft: SPACING.TINY,
    fontSize: FONTS.SIZE_SMALL,
    fontWeight: 'bold',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    marginLeft: SPACING.TINY,
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.GRAY_MEDIUM,
    fontWeight: '500',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: SPACING.SMALL,
    paddingVertical: SPACING.TINY,
    borderRadius: 12,
    marginBottom: SPACING.SMALL,
  },
  verificationText: {
    marginLeft: SPACING.TINY,
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.SUCCESS,
    fontWeight: '500',
  },
  title: {
    fontSize: FONTS.SIZE_LARGE,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
    marginBottom: SPACING.SMALL,
    lineHeight: 22,
  },
  description: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.GRAY_DARK,
    marginBottom: SPACING.MEDIUM,
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SMALL,
  },
  locationText: {
    marginLeft: SPACING.TINY,
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.GRAY_MEDIUM,
    flex: 1,
  },
  distanceText: {
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.GRAY_MEDIUM,
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.MEDIUM,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.GRAY_MEDIUM,
    marginRight: SPACING.TINY,
  },
  timeValue: {
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.GRAY_DARK,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SMALL,
    paddingHorizontal: SPACING.MEDIUM,
    borderRadius: 8,
  },
  detailsButton: {
    backgroundColor: COLORS.WHITE,
    flex: 1,
    marginRight: SPACING.SMALL,
  },
  detailsButtonText: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.PRIMARY,
    fontWeight: '500',
    marginRight: SPACING.TINY,
  },
  dismissButton: {
    backgroundColor: COLORS.WHITE,
    padding: SPACING.SMALL,
  },
});

export default AlertCard;
