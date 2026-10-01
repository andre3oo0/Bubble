import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useChatStore } from '@/store/chatStore';
import { useMoodStore } from '@/store/moodStore';
import BubbleAvatar from './BubbleAvatar';
import UserAvatar from './UserAvatar';
import { useAvatarStore } from '@/store/avatarStore';
import audioHandler from '@/lib/audioHandler';
import { environmentImages } from './assets';

export default function AnimatedScene() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const { currentEnvironment } = useEnvironmentStore();
  const { messages } = useChatStore();
  const { currentMood } = useMoodStore();
  const { avatarCustomization } = useAvatarStore();
  const [audioPlaying, setAudioPlaying] = useState(false);
  
  // Toggle ambient sound
  const toggleAmbientSound = () => {
    if (audioPlaying) {
      audioHandler.stopBackgroundSound();
      setAudioPlaying(false);
    } else {
      // Play environment-specific sound if available, otherwise use mood-based sound
      const soundType = currentEnvironment ? `env_${currentEnvironment.id}` : currentMood;
      audioHandler.playBackgroundSound(soundType);
      setAudioPlaying(true);
    }
  };

  // When environment or mood changes, update ambient sound
  useEffect(() => {
    if (audioPlaying) {
      // Prioritize environment sounds over mood sounds for a more immersive experience
      const soundType = currentEnvironment ? `env_${currentEnvironment.id}` : currentMood;
      audioHandler.playBackgroundSound(soundType);
    }
  }, [currentEnvironment, currentMood, audioPlaying]);

  // Get appropriate animation class based on environment
  const getEnvironmentAnimationClass = () => {
    if (!currentEnvironment) return '';
    
    switch (currentEnvironment?.id) {
      case 'forest':
        return 'animated-forest';
      case 'ocean':
        return 'animated-ocean';
      case 'cafe':
        return 'animated-cafe';
      case 'bedroom':
        return 'animated-bedroom';
      default:
        return '';
    }
  };
  
  // Get the appropriate environment image based on ID
  const getEnvironmentImage = () => {
    if (!currentEnvironment) return '';
    
    // Use our imported environment images
    const envId = currentEnvironment.id as keyof typeof environmentImages;
    return environmentImages[envId] || '';
  };

  return (
    <div 
      ref={sceneRef} 
      className={`relative h-full w-full overflow-hidden ${getEnvironmentAnimationClass()}`}
    >
      {/* Background environment */}
      <div className="absolute inset-0 w-full h-full">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{ 
            backgroundImage: `url(${getEnvironmentImage()})`,
            opacity: 1
          }}
        />
        
        {/* Animated overlay elements specific to each environment */}
        {currentEnvironment?.id === 'forest' && (
          <div className="forest-elements">
            <div className="campfire flickering-fire"></div>
            <div className="star twinkling-star-1"></div>
            <div className="star twinkling-star-2"></div>
            <div className="star twinkling-star-3"></div>
          </div>
        )}
        
        {currentEnvironment?.id === 'ocean' && (
          <div className="ocean-elements">
            <div className="rain falling-rain"></div>
            <div className="raindrop falling-drop-1"></div>
            <div className="raindrop falling-drop-2"></div>
            <div className="lightning flash-lightning"></div>
          </div>
        )}
        
        {currentEnvironment?.id === 'cafe' && (
          <div className="cafe-elements">
            <div className="steam rising-steam-1"></div>
            <div className="steam rising-steam-2"></div>
            <div className="people cafe-people"></div>
          </div>
        )}
        
        {currentEnvironment?.id === 'bedroom' && (
          <div className="bedroom-elements">
            <div className="lamp glowing-lamp"></div>
            <div className="book floating-book"></div>
            <div className="plant swaying-plant"></div>
          </div>
        )}
      </div>
      
      {/* Avatars container */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-10 pb-6">
        {/* Bubble Avatar */}
        <div className="flex flex-col items-center">
          <BubbleAvatar 
            mood={currentMood} 
            size="lg" 
            animate={true} 
          />
          <p className="text-white text-sm mt-2 px-2 py-1 bg-black bg-opacity-30 rounded-full">Bubble</p>
        </div>
        
        {/* User Avatar */}
        <div className="flex flex-col items-center">
          <UserAvatar 
            customization={avatarCustomization}
            mood={messages.length > 0 ? messages[messages.length - 1].mood || 'neutral' : 'neutral'}
            size="lg"
          />
          <p className="text-white text-sm mt-2 px-2 py-1 bg-black bg-opacity-30 rounded-full">You</p>
        </div>
      </div>
      
      {/* Sound toggle button */}
      <button 
        onClick={toggleAmbientSound}
        className="absolute top-4 right-4 bg-black bg-opacity-30 rounded-full p-2 text-white transition-colors hover:bg-opacity-50"
      >
        <span className="material-icons">
          {audioPlaying ? 'volume_up' : 'volume_off'}
        </span>
      </button>
    </div>
  );
}