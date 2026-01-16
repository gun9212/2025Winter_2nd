import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS } from '../../constants';

const HeartbeatAnimation = ({ isActive, size = 100 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // 페이드 인
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // 심장 박동 애니메이션 (무한 반복)
      const heartbeat = Animated.sequence([
        // 첫 번째 박동
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 150,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        // 두 번째 박동
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 150,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        // 휴식
        Animated.delay(300),
      ]);

      Animated.loop(heartbeat).start();
    } else {
      // 페이드 아웃
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // 스케일 리셋
      scaleAnim.setValue(1);
    }
  }, [isActive, scaleAnim, opacityAnim]);

  if (!isActive) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.heartContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={[styles.heart, { width: size, height: size }]}>
          <View style={[styles.heartShape, { width: size, height: size }]}>
            <View style={[styles.leftHeart, { width: size * 0.5, height: size * 0.8 }]} />
            <View style={[styles.rightHeart, { width: size * 0.5, height: size * 0.8 }]} />
          </View>
          <View style={[styles.heartBottom, { 
            width: size * 0.707, 
            height: size * 0.707,
            top: size * 0.2,
          }]} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
  heartContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heart: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartShape: {
    flexDirection: 'row',
  },
  leftHeart: {
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 1000,
    borderBottomLeftRadius: 1000,
    transform: [{ rotate: '-45deg' }],
  },
  rightHeart: {
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 1000,
    borderBottomRightRadius: 1000,
    transform: [{ rotate: '45deg' }],
    marginLeft: -20,
  },
  heartBottom: {
    position: 'absolute',
    backgroundColor: COLORS.primary,
    transform: [{ rotate: '45deg' }],
  },
});

export default HeartbeatAnimation;
