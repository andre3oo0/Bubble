// A random ID this browser makes for itself, so signed-out chat limits count per
// device instead of per network. It says nothing about the person, is never tied to
// an account, and is cleared on sign-out (forgetDevice).
export const DEVICE_STORAGE_KEY = 'bubble-device';

// Used when local storage isn't available (private mode): lasts until the page closes
let fallback: string | undefined;

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_STORAGE_KEY, id);
    }
    return id;
  } catch {
    fallback ??= crypto.randomUUID();
    return fallback;
  }
}

export function forgetDeviceId(): void {
  fallback = undefined;
  try {
    localStorage.removeItem(DEVICE_STORAGE_KEY);
  } catch {
    // nothing stored then
  }
}
