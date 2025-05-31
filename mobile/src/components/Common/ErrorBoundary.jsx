import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../utils/constants';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Log error to crash reporting service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // In production, send to crash reporting service like Sentry
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Example: Send to analytics or crash reporting
    // Analytics.recordError('ErrorBoundary', {
    //   error: error.toString(),
    //   componentStack: errorInfo.componentStack,
    // });
  };

  handleRestart = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Error Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={64} color={COLORS.ERROR} />
            </View>

            {/* Error Title */}
            <Text style={styles.title}>Oops! Something went wrong</Text>

            {/* Error Message */}
            <Text style={styles.message}>
              We're sorry, but something unexpected happened. The app has encountered an error and needs to restart.
            </Text>

            {/* Error Details Toggle */}
            <TouchableOpacity
              style={styles.detailsToggle}
              onPress={this.toggleDetails}
            >
              <Text style={styles.detailsToggleText}>
                {this.state.showDetails ? 'Hide' : 'Show'} Error Details
              </Text>
              <Ionicons
                name={this.state.showDetails ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={COLORS.PRIMARY}
              />
            </TouchableOpacity>

            {/* Error Details */}
            {this.state.showDetails && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details:</Text>
                
                {this.state.error && (
                  <View style={styles.errorSection}>
                    <Text style={styles.errorSectionTitle}>Error:</Text>
                    <Text style={styles.errorText}>
                      {this.state.error.toString()}
                    </Text>
                  </View>
                )}

                {this.state.errorInfo && this.state.errorInfo.componentStack && (
                  <View style={styles.errorSection}>
                    <Text style={styles.errorSectionTitle}>Component Stack:</Text>
                    <Text style={styles.errorText}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={this.handleRestart}
              >
                <Ionicons name="refresh" size={20} color={COLORS.WHITE} />
                <Text style={styles.primaryButtonText}>Restart App</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  // In production, open support/feedback
                  console.log('Report error');
                }}
              >
                <Ionicons name="mail" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.secondaryButtonText}>Report Issue</Text>
              </TouchableOpacity>
            </View>

            {/* Help Text */}
            <Text style={styles.helpText}>
              If this problem persists, please contact our support team with the error details above.
            </Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.LARGE,
  },
  iconContainer: {
    marginBottom: SPACING.LARGE,
  },
  title: {
    fontSize: FONTS.SIZE_HEADER,
    fontWeight: 'bold',
    color: COLORS.ERROR,
    textAlign: 'center',
    marginBottom: SPACING.MEDIUM,
  },
  message: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.GRAY_DARK,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.LARGE,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SMALL,
    marginBottom: SPACING.MEDIUM,
  },
  detailsToggleText: {
    fontSize: FONTS.SIZE_MEDIUM,
    color: COLORS.PRIMARY,
    marginRight: SPACING.TINY,
  },
  errorDetails: {
    width: '100%',
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: 8,
    padding: SPACING.MEDIUM,
    marginBottom: SPACING.LARGE,
  },
  errorTitle: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: 'bold',
    color: COLORS.ERROR,
    marginBottom: SPACING.SMALL,
  },
  errorSection: {
    marginBottom: SPACING.MEDIUM,
  },
  errorSectionTitle: {
    fontSize: FONTS.SIZE_SMALL,
    fontWeight: 'bold',
    color: COLORS.GRAY_DARK,
    marginBottom: SPACING.TINY,
  },
  errorText: {
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.GRAY_MEDIUM,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  actions: {
    width: '100%',
    marginBottom: SPACING.LARGE,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.MEDIUM,
    paddingHorizontal: SPACING.LARGE,
    borderRadius: 8,
    marginBottom: SPACING.SMALL,
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  secondaryButton: {
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  primaryButtonText: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginLeft: SPACING.SMALL,
  },
  secondaryButtonText: {
    fontSize: FONTS.SIZE_MEDIUM,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginLeft: SPACING.SMALL,
  },
  helpText: {
    fontSize: FONTS.SIZE_SMALL,
    color: COLORS.GRAY_MEDIUM,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ErrorBoundary;
