import { Capacitor, registerPlugin } from '@capacitor/core';

const ApkUpdater = registerPlugin<any>('ApkUpdater');

// The version baked into this build. Bump together with public/version.json
// whenever a new APK is published.
export const APP_VERSION = '1.1.1';

// Where the live deployment (and the published APK) lives.
const REMOTE_BASE = 'https://electron-app-beta.vercel.app';

export type UpdateInfo = {
  available: boolean;
  version: string;
  apkUrl: string;
  notes?: string;
};

function isNewer(remote: string, local: string): boolean {
  const r = remote.split('.').map(n => parseInt(n, 10) || 0);
  const l = local.split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(r.length, l.length);
  for (let i = 0; i < len; i++) {
    const a = r[i] || 0;
    const b = l[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(`${REMOTE_BASE}/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const version = String(data.version || '');
    if (!version) return null;
    let apkUrl = String(data.apkUrl || '/erp-app.apk');
    if (apkUrl.startsWith('/')) apkUrl = REMOTE_BASE + apkUrl;
    return {
      available: isNewer(version, APP_VERSION),
      version,
      apkUrl,
      notes: data.notes,
    };
  } catch (e) {
    console.warn('checkForUpdate failed', e);
    return null;
  }
}

export async function runUpdate(apkUrl: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ApkUpdater.downloadAndInstall({ url: apkUrl });
      return;
    } catch (e) {
      console.error('native update failed, falling back to browser', e);
    }
  }
  window.open(apkUrl, '_blank', 'noopener,noreferrer');
}
