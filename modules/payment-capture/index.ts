import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type CaptureSource = 'sms' | 'notification';
export type CaptureEvent = {
  id: string;
  source: CaptureSource;
  sender: string;
  text: string;
  timestamp: number;
};
export type CaptureStatus = {
  notificationConnected?: boolean;
  smsEnabled: boolean;
  notificationEnabled: boolean;
  smsGranted: boolean;
  notificationGranted: boolean;
};
type PaymentCaptureModule = {
  getStatusAsync(): Promise<CaptureStatus>;
  setEnabledAsync(source: CaptureSource, enabled: boolean): Promise<void>;
  openNotificationSettingsAsync(): Promise<void>;
  getPendingAsync(): Promise<string>;
  acknowledgeAsync(ids: string[]): Promise<void>;
};

// Expo Go and other platforms keep manual import available without crashing.
export const paymentCapture = Platform.OS === 'android'
  ? requireOptionalNativeModule<PaymentCaptureModule>('PaymentCapture')
  : null;
