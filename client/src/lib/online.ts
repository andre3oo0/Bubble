import { useSyncExternalStore } from 'react';

// The browser's own online flag. It can say "online" on a network with no internet,
// so failed requests still need their own handling; this is for telling people early.
const subscribe = (onChange: () => void) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
