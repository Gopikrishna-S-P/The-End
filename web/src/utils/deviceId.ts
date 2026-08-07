const DEVICE_ID_KEY = 'recoverpro_device_id';

function newUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10);
}

/**
 * Stable per-browser-install fingerprint sent as X-Device-Id on auth requests.
 * Backend's SessionAnomalyDetector uses it to flag logins from an unrecognized
 * device, and the sessions list uses it to mark "this device" — both rely on
 * the same id being sent consistently, so it lives in localStorage (not
 * sessionStorage) to survive across tabs and "don't remember this device" logins.
 */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = newUuid();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
