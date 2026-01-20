import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Image } from 'react-native';
import LoginLogo from '../../images/login_logo.png';
import { COLORS } from '../../constants';

const HeartbeatAnimation = ({ isActive, size = 150 }) => {
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
        <Image 
          source={LoginLogo} 
          style={[styles.heartImage, { width: size, height: size }]}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  heartContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartImage: {
    tintColor: COLORS.primary, // 로고 색상을 핑크로 변경
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
});

export default HeartbeatAnimation;
