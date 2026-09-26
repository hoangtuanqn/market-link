import type { NotificationFrame } from '@/types/notification.types';

/**
 * Thông báo của hệ điều hành qua service worker (/sw.js). registration.showNotification chạy được cả khi tab ẩn và trên
 * Android Chrome (new Notification() thì không). tag giống nhau → nhiều tab cùng gọi cũng chỉ còn một thông báo.
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
  if (result === 'granted') await registerWorker();
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

/** Tiếng "ting" ngắn, không cần file âm thanh. Trình duyệt chặn âm khi chưa có thao tác nào thì bỏ qua. */
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
    /* không có âm thanh cũng không sao */
  }
};
