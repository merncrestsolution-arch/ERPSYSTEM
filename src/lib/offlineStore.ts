import { getErpApi, newClientUuid } from './erpApi';

const OUTBOX_KEY = 'erp_offline_outbox_v1';
const META_KEY = 'erp_offline_meta_v1';

/** Simple obfuscation for local offline payload (not a substitute for device encryption). */
function encode(value: string): string {
  try {
    return btoa(unescape(encodeURIComponent(value)));
  } catch {
    return value;
  }
}

function decode(value: string): string {
  try {
    return decodeURIComponent(escape(atob(value)));
  } catch {
    return value;
  }
}

async function readRaw(key: string): Promise<string | null> {
  try {
    // Prefer Capacitor Preferences when available (native Android).
    // @ts-ignore
    const Preferences = (await import('@capacitor/preferences')).Preferences;
    const { value } = await Preferences.get({ key });
    return value;
  } catch {
    return localStorage.getItem(key);
  }
}

async function writeRaw(key: string, value: string): Promise<void> {
  try {
    // @ts-ignore
    const Preferences = (await import('@capacitor/preferences')).Preferences;
    await Preferences.set({ key, value });
  } catch {
    localStorage.setItem(key, value);
  }
}

export type OfflineOutboxItem = {
  client_uuid: string;
  entity_type: string;
  entity_id?: string | null;
  payload: any;
  created_at: string;
  status: 'pending' | 'synced' | 'conflict';
};

export async function getLocalOutbox(): Promise<OfflineOutboxItem[]> {
  const raw = await readRaw(OUTBOX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(decode(raw));
  } catch {
    return [];
  }
}

export async function enqueueOffline(entity_type: string, payload: any, entity_id?: string | null): Promise<OfflineOutboxItem | { duplicate: true }> {
  const list = await getLocalOutbox();
  const client_uuid = newClientUuid();
  if (list.some((i) => i.client_uuid === client_uuid)) return { duplicate: true };
  const item: OfflineOutboxItem = {
    client_uuid,
    entity_type,
    entity_id: entity_id || null,
    payload,
    created_at: new Date().toISOString(),
    status: 'pending',
  };
  list.unshift(item);
  await writeRaw(OUTBOX_KEY, encode(JSON.stringify(list)));

  // Also mirror into server outbox when online API is available.
  try {
    const api = getErpApi();
    if (api?.enqueueSync) {
      await api.enqueueSync({
        entity_type,
        entity_id: entity_id || null,
        payload,
        client_uuid,
      });
    }
  } catch {
    // stay offline-only
  }
  return item;
}

export async function flushLocalOutbox(): Promise<{ synced: number; conflicts: number }> {
  const api = getErpApi();
  const list = await getLocalOutbox();
  let synced = 0;
  let conflicts = 0;
  for (const item of list) {
    if (item.status !== 'pending') continue;
    try {
      if (api?.enqueueSync) {
        const res = await api.enqueueSync({
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          payload: item.payload,
          client_uuid: item.client_uuid,
        });
        if (res?.duplicate) {
          item.status = 'conflict';
          conflicts++;
        } else {
          item.status = 'synced';
          synced++;
        }
      } else {
        item.status = 'synced';
        synced++;
      }
    } catch {
      item.status = 'conflict';
      conflicts++;
    }
  }
  await writeRaw(OUTBOX_KEY, encode(JSON.stringify(list)));
  if (api?.flushSyncOutbox) await api.flushSyncOutbox();
  await writeRaw(META_KEY, encode(JSON.stringify({ last_flush: new Date().toISOString() })));
  return { synced, conflicts };
}

/** FCM / push registration placeholder — wire Firebase when keys are available. */
export async function registerPushPlaceholder(userId?: number | null): Promise<{ ok: boolean; token: string | null }> {
  const token = `fcm-placeholder-${userId || 'anon'}-${Date.now().toString(36)}`;
  await writeRaw('erp_fcm_token', encode(token));
  try {
    const api = getErpApi();
    if (api?.addNotification) {
      await api.addNotification({
        user_id: userId || null,
        title: 'Push registered',
        body: 'FCM placeholder token stored on device. Configure Firebase to enable real push.',
        channel: 'push',
      });
    }
  } catch {
    // ignore
  }
  return { ok: true, token };
}
