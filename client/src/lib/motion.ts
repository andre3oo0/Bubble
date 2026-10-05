// For effects outside React/framer (the DOM bubbles in chat, smooth scrolling).
// App puts the reduce-motion class on <html> when the in-app setting is on.
export function prefersReducedMotion(): boolean {
  return (
    document.documentElement.classList.contains('reduce-motion') ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
