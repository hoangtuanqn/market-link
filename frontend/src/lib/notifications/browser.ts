import NotificationApi from '@/api-requests/notification.requests';
import type { NotificationFrame } from '@/types/notification.types';

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

const tagOf = (f: NotificationFrame) => `${f.kind}:${f.id ?? f.conversationId ?? f.createdAt}`;

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
