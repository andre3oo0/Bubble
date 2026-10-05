import { Flame, Sunset, Trees, Waves, type LucideIcon } from 'lucide-react';

export type SceneId = 'ocean' | 'forest' | 'sunset' | 'bedroom';

export interface Scene {
  id: SceneId;
  name: string;
  description: string;
  icon: LucideIcon;
}

// Names match what each scene actually shows (SceneBackdrop draws them)
export const SCENES: Scene[] = [
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Waves rolling in under a soft sky',
    icon: Waves,
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Tall trees, birdsong and a light breeze',
    icon: Trees,
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm evening light and a gentle wind',
    icon: Sunset,
  },
  {
    id: 'bedroom',
    name: 'Cozy room',
    description: 'A crackling fire and candlelight',
    icon: Flame,
  },
];

export const isSceneId = (value: string | null): value is SceneId => SCENES.some((scene) => scene.id === value);
