import { useEffect, useRef } from 'react';
import type { Mood } from '@shared/chat';
import type { SceneId } from './scenes';
import { MOOD_AMBIENCE } from '@/lib/moodAmbience';

interface MoodAmbienceProps {
  mood: Mood;
  // A new scene brings new animations, which need the speed too
  scene: SceneId;
  // The "Scene follows Bubble's mood" setting; off leaves the scene as drawn
  enabled: boolean;
}

// Sits over the scene, inside its layer. The tint fades between moods (calm visuals
// makes that instant, like every other transition in the scene). The speed is set on
// the scene's own animations through playbackRate, which keeps each one where it is
// instead of jumping, as changing animation-duration would.
export default function MoodAmbience({ mood, scene, enabled }: MoodAmbienceProps) {
  const ref = useRef<HTMLDivElement>(null);
  const ambience = MOOD_AMBIENCE[enabled ? mood : 'neutral'];

  useEffect(() => {
    const layer = ref.current?.parentElement;
    if (!layer) return;
    // Set directly rather than with updatePlaybackRate, which waits until each new
    // animation is ready and so can leave a freshly drawn scene at the old speed
    const apply = () =>
      layer.getAnimations({ subtree: true }).forEach((animation) => {
        animation.playbackRate = ambience.speed;
      });
    apply();
    // Animations also start afresh when the night theme or calm visuals switch (classes
    // on <html>, set just after the first render)
    layer.addEventListener('animationstart', apply);
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      layer.removeEventListener('animationstart', apply);
      observer.disconnect();
    };
  }, [ambience.speed, scene]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="mood-wash absolute inset-0"
      style={{ backgroundColor: ambience.tint, opacity: ambience.strength }}
    />
  );
}
