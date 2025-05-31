import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../utils/constants';

const { width, height } = Dimensions.get('window');

const LoadingScreen = ({ message = 'Loading...', showLogo = true }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Continuous rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {showLogo && (
          <View style={styles.logoContainer}>
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <Ionicons name="earth" size={64} color={COLORS.PRIMARY} />
            </Animated.View>
            <Text style={styles.appName}>ClimateGuardian AI</Text>
          </View>
        )}

        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.spinner,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          >
            <Ionicons name="sync" size={32} color={COLORS.PRIMARY} />
          </Animated.View>
          <Text style={styles.loadingText}>{message}</Text>
        </View>

        <View style={styles.dotsContainer}>
          <LoadingDots />
        </View>
      </Animated.View>
    </View>
  );
};

const LoadingDots = () => {
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDots = () => {
      const duration = 600;
      const delay = 200;

      Animated.sequence([
        Animated.timing(dot1Anim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(dot1Anim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        Animated.sequence([
          Animated.timing(dot2Anim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);

      setTimeout(() => {
        Animated.sequence([
          Animated.timing(dot3Anim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay * 2);
    };

    animateDots();
    const interval = setInterval(animateDots, 2000);

    return () => clearInterval(interval);
  }, []);

  const getDotStyle = (anim) => ({
    opacity: anim,
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={styles.dots}>
      <Animated.View style={[styles.dot, getDotStyle(dot1Anim)]} />
      <Animated.View style={[styles.dot, getDotStyle(dot2Anim)]} />
      <Animated.View style={[styles.dot, getDotStyle(dot3Anim)]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.XXLARGE,
  },
  iconContainer: {
    marginBottom: SPACING.MEDIUM,
  },
  appName: {
    fontSize: FONTS.SIZE_HEADER,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: SPACING.LARGE,
  },
  spinner: {
    marginBottom: SPACING.MEDIUM,
  },
  loadingText: {
    fontSize: FONTS.SIZE_LARGE,
    color: COLORS.GRAY_DARK,
    textAlign: 'center',
  },
  dotsContainer: {
    marginTop: SPACING.MEDIUM,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
    marginHorizontal: 4,
  },
});

export default LoadingScreen;
