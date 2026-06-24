import { Capacitor, registerPlugin } from '@capacitor/core';

// Community background-geolocation plugin (native only).
const BackgroundGeolocation = registerPlugin<any>('BackgroundGeolocation');

type TrackedUser = { id: number; username: string; full_name?: string };

let watcherId: string | null = null;
let webWatchId: number | null = null;
let lastWriteAt = 0;
let currentUser: TrackedUser | null = null;

// Avoid hammering the DB: write at most once per MIN_INTERVAL_MS.
const MIN_INTERVAL_MS = 30 * 1000;

async function persist(lat: number, lng: number, accuracy?: number) {
  if (!currentUser) return;
  const now = Date.now();
  if (now - lastWriteAt < MIN_INTERVAL_MS) return;
  lastWriteAt = now;
  try {
    // window.electronAPI is the Supabase shim on web/mobile.
    // @ts-ignore
    const api = window.electronAPI;
    if (api?.logLocation) {
      await api.logLocation({
        user_id: currentUser.id,
        username: currentUser.username,
        full_name: currentUser.full_name || currentUser.username,
        latitude: lat,
        longitude: lng,
        accuracy: accuracy ?? null,
        recorded_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error('persist location error', e);
  }
}

export async function startTracking(user: TrackedUser) {
  currentUser = user;
  lastWriteAt = 0;

  if (Capacitor.isNativePlatform()) {
    if (watcherId) return;
    try {
      watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: 'Location is being shared with your manager.',
          backgroundTitle: 'ERP System - Tracking active',
          requestPermissions: true,
          stale: false,
          distanceFilter: 25,
        },
        (location: any, error: any) => {
          if (error) {
            console.error('BackgroundGeolocation error', error);
            return;
          }
          if (location) {
            persist(location.latitude, location.longitude, location.accuracy);
          }
        }
      );
    } catch (e) {
      console.error('startTracking (native) failed', e);
    }
    return;
  }

  // Web fallback: foreground-only watch.
  if (webWatchId != null || !('geolocation' in navigator)) return;
  webWatchId = navigator.geolocation.watchPosition(
    (pos) => persist(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
    (err) => console.warn('geolocation error', err.message),
    { enableHighAccuracy: true, maximumAge: 15000, timeout: 60000 }
  );
}

export async function stopTracking() {
  currentUser = null;
  if (watcherId) {
    try {
      await BackgroundGeolocation.removeWatcher({ id: watcherId });
    } catch (e) {
      console.error('stopTracking error', e);
    }
    watcherId = null;
  }
  if (webWatchId != null) {
    navigator.geolocation.clearWatch(webWatchId);
    webWatchId = null;
  }
}
