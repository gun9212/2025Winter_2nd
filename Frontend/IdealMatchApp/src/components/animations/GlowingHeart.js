import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Path } from 'react-native-svg';

const GlowingHeart = ({ size = 200 }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 숨쉬는 듯한 Pulsing 애니메이션
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.95,
            duration: 1250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 1250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, []);

  // 더 자연스러운 하트 형태 (상단 홈 깊이 강화, 하단 부드러운 곡선)
  const heartPath = `
    M ${size / 2},${size * 0.35}
    C ${size / 2},${size * 0.22} ${size * 0.38},${size * 0.1} ${size * 0.25},${size * 0.1}
    C ${size * 0.08},${size * 0.1} 0,${size * 0.25} 0,${size * 0.42}
    C 0,${size * 0.7} ${size / 2},${size * 0.88} ${size / 2},${size * 0.95}
    C ${size / 2},${size * 0.88} ${size},${size * 0.7} ${size},${size * 0.42}
    C ${size},${size * 0.25} ${size * 0.92},${size * 0.1} ${size * 0.75},${size * 0.1}
    C ${size * 0.62},${size * 0.1} ${size / 2},${size * 0.22} ${size / 2},${size * 0.35}
    Z
  `;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer Glow Layers - 네온 헤일로 효과 */}
      <Animated.View
        style={[
          styles.glowLayer,
          styles.glow1,
          {
            width: size * 1.5,
            height: size * 1.5,
            transform: [{ scale: pulseAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.glowLayer,
          styles.glow2,
          {
            width: size * 1.3,
            height: size * 1.3,
            transform: [{ scale: pulseAnim }],
            opacity: opacityAnim,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.glowLayer,
          styles.glow3,
          {
            width: size * 1.15,
            height: size * 1.15,
            transform: [{ scale: pulseAnim }],
            opacity: opacityAnim,
          },
        ]}
      />

      {/* SVG Heart with Radial Gradient - 3D 입체감 */}
      <Animated.View
        style={{
          transform: [{ scale: pulseAnim }],
          opacity: opacityAnim,
        }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <RadialGradient
              id="heartGradient"
              cx="50%"
              cy="40%"
              r="65%"
              fx="50%"
              fy="40%"
            >
              {/* 5단계 그라디언트로 강력한 3D 효과 */}
              <Stop offset="0%" stopColor="#FFE5F0" stopOpacity="1" />
              <Stop offset="25%" stopColor="#FFB7CE" stopOpacity="1" />
              <Stop offset="50%" stopColor="#FF8DB4" stopOpacity="1" />
              <Stop offset="75%" stopColor="#FF69B4" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FF4D9C" stopOpacity="1" />
            </RadialGradient>
          </Defs>
          <Path
            d={heartPath}
            fill="url(#heartGradient)"
            stroke="rgba(255, 105, 180, 0.4)"
            strokeWidth="3"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowLayer: {
    position: 'absolute',
    borderRadius: 9999,
  },
  glow1: {
    backgroundColor: 'rgba(255, 183, 206, 0.12)',
    shadowColor: '#FFB7CE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
  },
  glow2: {
    backgroundColor: 'rgba(255, 126, 166, 0.18)',
    shadowColor: '#FF7EA6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  glow3: {
    backgroundColor: 'rgba(255, 105, 180, 0.22)',
    shadowColor: '#FF69B4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
});

export default GlowingHeart;
