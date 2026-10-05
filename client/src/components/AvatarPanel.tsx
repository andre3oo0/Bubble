import { motion } from 'framer-motion';
import { Pause, Play, Volume2 } from 'lucide-react';
import BubbleAvatar from './BubbleAvatar';
import { Mood } from '@/models/types';
import { SCENES, type SceneId } from './scenes';
import { useSoundStore } from '@/store/soundStore';
import { usePreferences, type ThemePreference } from '@/store/preferencesStore';

interface AvatarPanelProps {
  currentMood: Mood;
  setCurrentMood: (mood: Mood) => void;
  selectedEnvironment?: string;
  setSelectedEnvironment?: (env: string) => void;
}

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Automatic' },
  { value: 'day', label: 'Day' },
  { value: 'night', label: 'Night' },
];

const cardClass = 'bg-[#3498db]/30 rounded-3xl p-4 mb-6 glassmorphism';

export default function AvatarPanel({
  currentMood,
  setCurrentMood,
  selectedEnvironment = 'ocean',
  setSelectedEnvironment = () => {}
}: AvatarPanelProps) {
  const { playing, volume, play, stop, setVolume } = useSoundStore();
  const { motion: motionPreference, theme, setMotion, setTheme } = usePreferences();

  const scene = SCENES.find((s) => s.id === selectedEnvironment) ?? SCENES[0];
  const sceneSoundPlaying = playing === scene.id;

  const handleEnvironmentChange = (id: SceneId) => {
    setSelectedEnvironment(id);
    // Keep the sound in step with the scene if it's already playing
    if (playing && playing !== 'breathing') play(id);
  };

  return (
    <motion.div
      className="md:h-full flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-white text-3xl md:text-4xl font-bold mb-4 text-center">SETTINGS</div>

      {/* Preview section */}
      <div className={`${cardClass} p-6 flex flex-col items-center`}>
        <BubbleAvatar mood={currentMood} size="lg" animate={true} />
        <p className="text-white mt-4 text-center">
          This is how your Bubble looks with the current mood and settings
        </p>
      </div>

      {/* Mood selection */}
      <div className={cardClass}>
        <h3 className="text-white text-lg mb-3">Bubble's Mood</h3>
        <div className="grid grid-cols-3 gap-3">
          {(['happy', 'calm', 'sad', 'anxious', 'stressed', 'neutral', 'improved'] as const).map((moodOption) => (
            <motion.button
              key={moodOption}
              onClick={() => setCurrentMood(moodOption)}
              aria-pressed={currentMood === moodOption}
              className={`rounded-full py-2 px-4 text-white ${
                currentMood === moodOption
                  ? 'bg-[#0b6bb8]'
                  : 'bg-[#0b5394]/50'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {moodOption.charAt(0).toUpperCase() + moodOption.slice(1)}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Scene and its sound */}
      <div className={cardClass}>
        <h3 className="text-white text-lg mb-3">Scene</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {SCENES.map(({ id, name, description, icon: Icon, thumbnail }) => (
            <motion.button
              key={id}
              onClick={() => handleEnvironmentChange(id)}
              aria-pressed={selectedEnvironment === id}
              className={`text-left bg-[#0b5394]/40 rounded-2xl p-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 ${
                selectedEnvironment === id ? 'ring-2 ring-white' : ''
              }`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`h-24 rounded-xl mb-2 bg-gradient-to-br ${thumbnail} flex items-center justify-center`}>
                <Icon className="h-9 w-9 text-white/90 drop-shadow" aria-hidden="true" />
              </div>
              <span className="block text-white font-medium">{name}</span>
              <span className="block text-white/90 text-sm">{description}</span>
            </motion.button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[#0b5394]/40 p-3">
          <button
            onClick={() => (sceneSoundPlaying ? stop() : play(scene.id))}
            aria-pressed={sceneSoundPlaying}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-[#0b5394] focus:outline-none focus:ring-4 focus:ring-white/60"
          >
            {sceneSoundPlaying ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            {sceneSoundPlaying ? 'Pause sound' : `Play ${scene.name.toLowerCase()} sound`}
          </button>
          <label className="flex min-w-[10rem] flex-1 items-center gap-2 text-white">
            <Volume2 size={18} aria-hidden="true" />
            <span className="sr-only">Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-white"
            />
          </label>
        </div>
      </div>

      {/* Display */}
      <div className={`${cardClass} md:flex-1`}>
        <h3 className="text-white text-lg mb-3">Display</h3>

        <label className="mb-4 flex items-start justify-between gap-4 text-white">
          <span>
            <span className="block font-medium">Calm visuals</span>
            <span className="block text-sm text-white/90">
              Stops the moving scenery and bubble effects. Already on if your device asks for less motion.
            </span>
          </span>
          <input
            type="checkbox"
            checked={motionPreference === 'reduced'}
            onChange={(e) => setMotion(e.target.checked ? 'reduced' : 'system')}
            className="mt-1 h-5 w-5 shrink-0 accent-white"
          />
        </label>

        <fieldset>
          <legend className="mb-2 font-medium text-white">Theme</legend>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-full py-2 text-center text-white focus-within:ring-4 focus-within:ring-white/60 ${
                  theme === option.value ? 'bg-[#0b6bb8] ring-2 ring-white' : 'bg-[#0b5394]/50'
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => setTheme(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-white/90">Night uses darker colours for late evenings. Automatic follows your device.</p>
        </fieldset>
      </div>
    </motion.div>
  );
}
