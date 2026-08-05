import { notifications, type Notification, type NotifType } from './notifications';
import { notificationPrefs } from './notificationPrefs';
import { presence } from './userPresence';

let audioCtx: AudioContext | null = null;
let installed = false;

const TONE: Record<NotifType, { freq: number; durMs: number; gain: number; waveform: OscillatorType }> = {
  mention:    { freq: 880, durMs: 140, gain: 0.06, waveform: 'sine'     },
  assignment: { freq: 660, durMs: 110, gain: 0.05, waveform: 'triangle' },
  deadline:   { freq: 520, durMs: 180, gain: 0.07, waveform: 'sine'     },
  system:     { freq: 440, durMs: 90,  gain: 0.04, waveform: 'sine'     },
};

function playSound(type: NotifType): void {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});

    const cfg = TONE[type];
    const t0  = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gn  = audioCtx.createGain();
    osc.type = cfg.waveform;
    osc.frequency.setValueAtTime(cfg.freq, t0);
    if (type === 'mention') {
      osc.frequency.exponentialRampToValueAtTime(cfg.freq * 1.5, t0 + cfg.durMs / 1000 / 2);
    }
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(cfg.gain, t0 + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + cfg.durMs / 1000);
    osc.connect(gn).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + cfg.durMs / 1000 + 0.02);
  } catch { /* swallow — sound is non-essential */ }
}

function showDesktop(notif: Notification): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!document.hidden) return;
  try {
    const n = new Notification(notif.title, {
      body: notif.body,
      icon: '/favicon.png',
      tag: notif.id,
      silent: true,
    });
    n.onclick = () => {
      window.focus();
      notifications.markRead(notif.id);
      if (notif.to) {
        window.history.pushState({}, '', notif.to);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      n.close();
    };
  } catch { /* swallow — service worker required for some platforms */ }
}

export function getDesktopPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestDesktopPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

export function installNotificationDispatch(): () => void {
  if (installed) return () => {};
  installed = true;
  const unsub = notifications.onAdd((notif) => {
    if (presence.isMuted()) return;

    const prefs = notificationPrefs.get();
    const channels = prefs[notif.type];
    if (!channels) return;
    if (channels.sound)   playSound(notif.type);
    if (channels.desktop) showDesktop(notif);
  });
  return () => { installed = false; unsub(); };
}
