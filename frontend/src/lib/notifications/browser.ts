import NotificationApi from '@/api-requests/notification.requests';
import type { NotificationFrame } from '@/types/notification.types';

/**
 * An operating system notification through the service worker (/sw.js). registration.showNotification works even when
 * the tab is hidden and on Android Chrome (new Notification() does not). The same tag → several tabs calling it still
 * leave just one notification.
 */
export type BrowserPermission = NotificationPermission | 'unsupported';

export const isSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

export const permission = (): BrowserPermission => (isSupported() ? Notification.permission : 'unsupported');

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

export const registerWorker = () => {
  if (!isSupported()) return Promise.resolve(null);
  registration ??= navigator.serviceWorker.register('/sw.js').catch(() => null);
  return registration;
};

export const requestPermission = async (): Promise<BrowserPermission> => {
  if (!isSupported()) return 'unsupported';
  const result = await Notification.requestPermission();
  if (result === 'granted') {
    await registerWorker();
    await syncPushSubscription();
  }
  return result;
};

export const tagOf = (f: NotificationFrame) => `${f.kind}:${f.id ?? f.conversationId ?? f.createdAt}`;

export const showOsNotification = async (f: NotificationFrame) => {
  if (permission() !== 'granted') return;
  const reg = await registerWorker();
  if (!reg) return;
  await reg.showNotification(f.title, {
    body: f.message,
    tag: tagOf(f),
    data: { link: f.link ?? '/' },
    icon: '/favicon.ico',
    silent: !f.alert.sound,
  });
};

let audio: AudioContext | null = null;

/** A short "ting" sound, no audio file needed. If the browser blocks sound before any user gesture, skip it. */
export const beep = () => {
  try {
    audio ??= new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.18);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.18);
  } catch {
    /* no sound is fine too */
  }
};

const pushSupported = () => isSupported() && 'PushManager' in window;

const fromBase64Url = (value: string) => {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
};

/**
 * N3 — register Web Push for this browser and send it to the server (receive notifications even after the tab is
 * closed). Only runs once permission is granted and the server has a VAPID key; calling it many times is still just one
 * row (the server upserts by endpoint).
 */
export const syncPushSubscription = async () => {
  if (!pushSupported() || permission() !== 'granted') return;
  try {
    const key = (await NotificationApi.pushPublicKey()).data.publicKey;
    if (!key) return;
    const reg = await registerWorker();
    if (!reg) return;
    const existing = await reg.pushManager.getSubscription();
    const subscription =
      existing ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromBase64Url(key) }));
    await NotificationApi.subscribePush(subscription.toJSON());
  } catch {
    /* the browser refuses or the network is lost: notifications while a tab is open still work */
  }
};

/**
 * Sign out: this machine stops receiving Web Push of the account that just left (shared machine). Call it while the
 * session is still valid.
 */
export const dropPushSubscription = async () => {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await reg?.pushManager.getSubscription();
    if (!subscription) return;
    await NotificationApi.unsubscribePush(subscription.endpoint).catch(() => undefined);
    await subscription.unsubscribe();
  } catch {
    /* nothing to cancel */
  }
};
