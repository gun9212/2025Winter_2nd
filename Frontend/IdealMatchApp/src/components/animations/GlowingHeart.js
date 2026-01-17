import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

const GlowingHeart = ({ size = 200 }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 숨쉬는 듯한 Pulsing 애니메이션 (움직임 감소)
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.03, // 1.08에서 1.03으로 감소
            duration: 1500, // 1250에서 1500으로 증가 (더 부드럽게)
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.98, // 0.95에서 0.98로 증가 (투명도 변화 감소)
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 1500,
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

      {/* Radial Gradient Heart with Outline */}
      <Animated.View
        style={{
          transform: [{ scale: pulseAnim }],
          opacity: opacityAnim,
        }}
      >
        {/* Radial Gradient Heart */}
        <MaskedView
          maskElement={
            <Icon 
              name="heart" 
              size={size} 
              color="white"
            />
          }
        >
          <Svg width={size} height={size}>
            <Defs>
              <RadialGradient
                id="heartRadialGradient"
                cx="50%"
                cy="40%"
                r="70%"
                fx="50%"
                fy="40%"
              >
                <Stop offset="0%" stopColor="#FFE5F0" stopOpacity="1" />
                <Stop offset="30%" stopColor="#FFB7CE" stopOpacity="1" />
                <Stop offset="60%" stopColor="#FF8DB4" stopOpacity="1" />
                <Stop offset="85%" stopColor="#FF69B4" stopOpacity="1" />
                <Stop offset="100%" stopColor="#FF4D9C" stopOpacity="1" />
              </RadialGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={size}
              height={size}
              fill="url(#heartRadialGradient)"
            />
          </Svg>
        </MaskedView>
        
        {/* Heart Outline */}
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <Icon 
            name="heart-outline" 
            size={size} 
            color="rgba(255, 77, 156, 0.3)"
            style={{ 
              textShadowColor: 'rgba(255, 77, 156, 0.15)',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 1.5,
            }}
          />
        </View>
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
  heartEmoji: {
    textAlign: 'center',
    textShadowColor: 'rgba(255, 105, 180, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
});

export default GlowingHeart;
