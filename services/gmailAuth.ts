import { Platform, TurboModuleRegistry } from 'react-native';
import type { GmailRequest } from './gmailSync';

export const gmailAvailable = Platform.OS === 'android' && Boolean(TurboModuleRegistry.get('RNGoogleSignin'));
const scope = 'https://www.googleapis.com/auth/gmail.readonly';
let configured = false;
function sdk() {
  if (!gmailAvailable) throw new Error('Gmail needs the updated Android APK. It is unavailable in Expo Go.');
  const module: typeof import('@react-native-google-signin/google-signin') = require('@react-native-google-signin/google-signin');
  if (!configured) { module.GoogleSignin.configure({ scopes: [scope], offlineAccess: false }); configured = true; }
  return module;
}
export async function gmailSession(interactive: boolean) {
  const { GoogleSignin } = sdk();
  if (interactive) await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = interactive ? await GoogleSignin.signIn() : await GoogleSignin.signInSilently();
  if (response.type !== 'success') throw new Error(interactive ? 'Google sign-in was cancelled.' : 'Reconnect Gmail to continue syncing.');
  const user = response.data;
  if (!user.scopes.includes(scope)) throw new Error('Gmail read access was not granted. Reconnect and allow Gmail access.');
  return { accountId: user.user.id, email: user.user.email };
}
export async function disconnectGmail() {
  const { GoogleSignin } = sdk();
  try { await GoogleSignin.revokeAccess(); }
  finally { await GoogleSignin.signOut(); }
}
export function gmailError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === '10' || code === 'DEVELOPER_ERROR') return 'Google setup is incomplete. Register this APK’s package and SHA-1 in Google Cloud, enable Gmail API, and add your Gmail account as a test user. See README: Gmail setup.';
  if (code === 'SIGN_IN_CANCELLED') return 'Google sign-in was cancelled.';
  return error instanceof Error ? error.message : 'Gmail could not sync. Please reconnect and retry.';
}

export function gmailRequest(): GmailRequest {
  return async <T>(path: string, signal: AbortSignal): Promise<T> => {
    const { GoogleSignin } = sdk();
    for (let attempt = 0; attempt < 2; attempt++) {
      if (signal.aborted) throw new Error('Sync cancelled.');
      const { accessToken } = await GoogleSignin.getTokens();
      if (signal.aborted) throw new Error('Sync cancelled.');
      const controller = new AbortController();
      const cancel = () => controller.abort();
      signal.addEventListener('abort', cancel);
      const timeout = setTimeout(cancel, 30000);
      try {
        const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
          headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal,
        });
        if (response.status === 401 && attempt === 0) { await GoogleSignin.clearCachedAccessToken(accessToken); continue; }
        if (response.status === 401) throw new Error('Gmail authorization expired. Reconnect Gmail.');
        if (response.status === 403) throw new Error('Gmail access denied. Check Gmail API is enabled and read access was granted.');
        if (response.status === 429) throw new Error('Gmail rate limit reached. Wait a little and sync again.');
        if (!response.ok) throw new Error(`Gmail could not complete sync (${response.status}). Please retry.`);
        return await response.json() as T;
      } finally { clearTimeout(timeout); signal.removeEventListener('abort', cancel); }
    }
    throw new Error('Reconnect Gmail to continue.');
  };
}
