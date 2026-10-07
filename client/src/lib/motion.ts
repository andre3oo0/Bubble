import { useEffect, useState } from 'react';

// For effects outside React/framer (the DOM bubbles in chat, smooth scrolling).
// App puts the reduce-motion class on <html> when the in-app setting is on.
export function prefersReducedMotion(): boolean {
  return (
    document.documentElement.classList.contains('reduce-motion') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

// Whether the phone or computer itself asks for less motion, kept up to date
export function useDeviceReducesMotion(): boolean {
  const [reduces, setReduces] = useState(() => window.matchMedia(REDUCE_QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(REDUCE_QUERY);
    const onChange = () => setReduces(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return reduces;
}
