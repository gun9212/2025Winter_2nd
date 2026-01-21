import { NativeModules, Platform } from 'react-native';
import { StorageService } from '../storage';
import { CONFIG } from '../../constants/config';

const { BackgroundMatching } = NativeModules;

export async function startAndroidForegroundMatching({
  intervalMs = 60000,
  radiusKm = 0.05,
  consentEnabledAtMs = 0,
  consentWindowMs = 30000,
} = {}) {
  if (Platform.OS !== 'android') return;
  if (!BackgroundMatching?.start) return;

  const accessToken = await StorageService.getAccessToken();
  if (!accessToken) {
    console.warn('⚠️ Android Foreground Service: access token 없음');
    return;
  }

  const baseUrl = CONFIG?.API_BASE_URL;
  if (!baseUrl) {
    console.warn('⚠️ Android Foreground Service: API_BASE_URL 없음');
    return;
  }

  BackgroundMatching.start({
    baseUrl,
    accessToken,
    intervalMs,
    radiusKm,
    consentEnabledAtMs,
    consentWindowMs,
  });
}

export function stopAndroidForegroundMatching() {
  if (Platform.OS !== 'android') return;
  if (!BackgroundMatching?.stop) return;
  BackgroundMatching.stop();
}

