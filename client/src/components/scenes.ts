import { Flame, Sunset, Trees, Waves, type LucideIcon } from 'lucide-react';

export type SceneId = 'ocean' | 'forest' | 'sunset' | 'bedroom';

export interface Scene {
  id: SceneId;
  name: string;
  description: string;
  icon: LucideIcon;
  // Tailwind gradient for the picker thumbnail
  thumbnail: string;
}

// Names match what each scene actually shows (Home draws the moving elements)
export const SCENES: Scene[] = [
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Waves rolling in under a soft sky',
    icon: Waves,
    thumbnail: 'from-sky-300 via-sky-500 to-blue-800',
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Tall trees, birdsong and a light breeze',
    icon: Trees,
    thumbnail: 'from-emerald-300 via-emerald-600 to-green-900',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm evening light and a gentle wind',
    icon: Sunset,
    thumbnail: 'from-amber-300 via-rose-400 to-purple-800',
  },
  {
    id: 'bedroom',
    name: 'Cozy room',
    description: 'A crackling fire and candlelight',
    icon: Flame,
    thumbnail: 'from-amber-400 via-orange-700 to-stone-900',
  },
];

export const isSceneId = (value: string | null): value is SceneId => SCENES.some((scene) => scene.id === value);
