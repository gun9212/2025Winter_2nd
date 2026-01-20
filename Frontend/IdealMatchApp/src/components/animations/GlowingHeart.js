import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Text, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Defs, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';

const GlowingHeart = ({ size = 200, isActive = true, count = 0 }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 활성 상태일 때만 애니메이션 실행
    if (!isActive) {
      return;
    }

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
  }, [isActive]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Outer Glow Layers - 활성 상태일 때만 표시 */}
      {isActive && (
        Platform.OS === 'android' ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: size * 1.7,
              height: size * 1.7,
              transform: [{ scale: pulseAnim }],
              opacity: opacityAnim,
            }}
          >
            <Svg width="100%" height="100%" viewBox={`0 0 ${size * 1.7} ${size * 1.7}`}>
              <Defs>
                <RadialGradient id="heartGlow1" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FFB7CE" stopOpacity="0.34" />
                  <Stop offset="55%" stopColor="#FF7EA6" stopOpacity="0.14" />
                  <Stop offset="100%" stopColor="#FF7EA6" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="heartGlow2" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FF8DB4" stopOpacity="0.26" />
                  <Stop offset="60%" stopColor="#FF69B4" stopOpacity="0.12" />
                  <Stop offset="100%" stopColor="#FF69B4" stopOpacity="0" />
                </RadialGradient>
                <RadialGradient id="heartGlow3" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FF69B4" stopOpacity="0.18" />
                  <Stop offset="70%" stopColor="#FF4D9C" stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="#FF4D9C" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle
                cx={(size * 1.7) / 2}
                cy={(size * 1.7) / 2}
                r={(size * 1.7) * 0.48}
                fill="url(#heartGlow1)"
              />
              <Circle
                cx={(size * 1.7) / 2}
                cy={(size * 1.7) / 2}
                r={(size * 1.7) * 0.40}
                fill="url(#heartGlow2)"
              />
              <Circle
                cx={(size * 1.7) / 2}
                cy={(size * 1.7) / 2}
                r={(size * 1.7) * 0.33}
                fill="url(#heartGlow3)"
              />
            </Svg>
          </Animated.View>
        ) : (
          <>
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
          </>
        )
      )}

      {/* Radial Gradient Heart with Outline */}
      <Animated.View
        style={{
          transform: [{ scale: isActive ? pulseAnim : 1 }],
          opacity: isActive ? opacityAnim : 0.6,
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
              {isActive ? (
                // 핑크 그라디언트 (활성 상태)
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
              ) : (
                // 회색 그라디언트 (비활성 상태)
                <RadialGradient
                  id="heartGrayGradient"
                  cx="50%"
                  cy="40%"
                  r="70%"
                  fx="50%"
                  fy="40%"
                >
                  <Stop offset="0%" stopColor="#E5E7EB" stopOpacity="1" />
                  <Stop offset="30%" stopColor="#D1D5DB" stopOpacity="1" />
                  <Stop offset="60%" stopColor="#9CA3AF" stopOpacity="1" />
                  <Stop offset="85%" stopColor="#6B7280" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#4B5563" stopOpacity="1" />
                </RadialGradient>
              )}
            </Defs>
            <Rect
              x="0"
              y="0"
              width={size}
              height={size}
              fill={isActive ? "url(#heartRadialGradient)" : "url(#heartGrayGradient)"}
            />
          </Svg>
        </MaskedView>
        
        {/* Heart Outline */}
        <View style={{ position: 'absolute', top: 0, left: 0 }}>
          <Icon 
            name="heart-outline" 
            size={size} 
            color={isActive ? "rgba(255, 77, 156, 0.3)" : "rgba(107, 114, 128, 0.3)"}
            style={{ 
              textShadowColor: isActive ? 'rgba(255, 77, 156, 0.15)' : 'rgba(107, 114, 128, 0.15)',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 1.5,
            }}
          />
        </View>

        {/* Count Text - 하트 중앙에 숫자 표시 (매칭 동의 활성화 시에만) */}
        {isActive && count > 0 && (
          <View style={styles.countContainer}>
            <Text style={[styles.countText, { fontSize: size * 0.42 }]}>
              {count}
            </Text>
          </View>
        )}
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
  countContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none', // 터치 이벤트 방해 안 함
  },
  countText: {
    fontFamily: 'System',
    fontWeight: '700',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: -2,
  },
});

export default GlowingHeart;
