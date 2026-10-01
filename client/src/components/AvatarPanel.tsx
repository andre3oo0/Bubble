import { useEffect } from 'react';
import { motion } from 'framer-motion';
import BubbleAvatar from './BubbleAvatar';
import { Mood } from '@/models/types';
import { environmentImages, environmentDescriptions } from './assets';
import audioHandler from '@/lib/audioHandler';

interface AvatarPanelProps {
  currentMood: Mood;
  setCurrentMood: (mood: Mood) => void;
  selectedEnvironment?: string;
  setSelectedEnvironment?: (env: string) => void;
}

export default function AvatarPanel({ 
  currentMood, 
  setCurrentMood,
  selectedEnvironment = 'ocean',
  setSelectedEnvironment = () => {}
}: AvatarPanelProps) {
  
  // Define environment data
  const environments = [
    { id: 'ocean', name: 'Rain', description: environmentDescriptions.ocean, image: environmentImages.ocean },
    { id: 'forest', name: 'Campfire', description: environmentDescriptions.forest, image: environmentImages.forest },
    { id: 'cafe', name: 'Café', description: environmentDescriptions.cafe, image: environmentImages.cafe },
    { id: 'bedroom', name: 'Cozy Room', description: environmentDescriptions.bedroom, image: environmentImages.bedroom }
  ];
  
  // Play environment sound when environment changes
  useEffect(() => {
    if (selectedEnvironment) {
      audioHandler.playBackgroundSound(`env_${selectedEnvironment}`);
      audioHandler.setBackgroundVolume(0.3); // Set to a comfortable level
    }
    
    return () => {
      // Clean up sounds when component unmounts
      audioHandler.stopBackgroundSound();
    };
  }, [selectedEnvironment]);

  // Handle mood change and save it
  const handleMoodChange = (newMood: Mood) => {
    setCurrentMood(newMood);
  };

  // Handle environment change and save it
  const handleEnvironmentChange = (envId: string) => {
    setSelectedEnvironment(envId);
    localStorage.setItem('selectedEnvironment', envId);
  };

  return (
    <motion.div 
      className="h-full flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-white text-4xl font-bold mb-4 text-center">AVATAR</div>
      
      {/* Preview section */}
      <div className="bg-[#3498db]/30 rounded-3xl p-6 mb-6 flex flex-col items-center glassmorphism">
        <BubbleAvatar mood={currentMood} size="lg" animate={true} />
        <p className="text-white mt-4 text-center">
          This is how your Bubble looks with the current mood and settings
        </p>
      </div>
      
      {/* Mood selection */}
      <div className="bg-[#3498db]/30 rounded-3xl p-4 mb-6 glassmorphism">
        <h3 className="text-white text-lg mb-3">Bubble's Mood</h3>
        <div className="grid grid-cols-3 gap-3">
          {(['happy', 'calm', 'sad', 'anxious', 'stressed', 'neutral', 'improved'] as const).map((moodOption) => (
            <motion.button
              key={moodOption}
              onClick={() => handleMoodChange(moodOption)}
              className={`rounded-full py-2 px-4 text-white ${
                currentMood === moodOption 
                  ? 'bg-[#50c8ff]' 
                  : 'bg-[#9AD9EA]/70'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {moodOption.charAt(0).toUpperCase() + moodOption.slice(1)}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Environment selection */}
      <div className="flex-1 bg-[#3498db]/30 rounded-3xl p-4 overflow-y-auto glassmorphism">
        <h3 className="text-white text-lg mb-3">Environment</h3>
        <div className="grid grid-cols-2 gap-3">
          {environments.map((env) => (
            <motion.div
              key={env.id}
              onClick={() => handleEnvironmentChange(env.id)}
              className={`bg-[#9AD9EA]/40 rounded-2xl p-3 cursor-pointer ${
                selectedEnvironment === env.id ? 'ring-2 ring-white' : ''
              }`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <div 
                className="h-28 rounded-xl mb-2 bg-cover bg-center" 
                style={{ backgroundImage: `url(${env.image})` }}
              ></div>
              <h4 className="text-white font-medium">{env.name}</h4>
              <p className="text-white/70 text-sm">{env.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}