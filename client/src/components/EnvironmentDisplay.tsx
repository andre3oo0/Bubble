import { useEnvironmentStore } from '@/store/environmentStore';
import { useMoodStore } from '@/store/moodStore';
import { useEffect, useState, useMemo } from 'react';
import { AudioHandler } from '@/lib/audioHandler';
import { environmentSounds } from './assets';
import { X, Maximize } from "lucide-react";

interface Bubble {
  id: number;
  size: string;
  top: string;
  left: string;
  delay: string;
  opacity: number;
}

export default function EnvironmentDisplay() {
  const { currentEnvironment } = useEnvironmentStore();
  const { currentMood } = useMoodStore();
  const [showFullScreen, setShowFullScreen] = useState(false);
  
  // Generate random bubbles for the environment
  const generateBubbles = (count: number): Bubble[] => {
    const sizes = ['bubble-xs', 'bubble-sm', 'bubble-md', 'bubble-lg', 'bubble-xl'];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      size: sizes[Math.floor(Math.random() * sizes.length)],
      top: `${Math.floor(Math.random() * 80)}%`,
      left: `${Math.floor(Math.random() * 90)}%`,
      delay: `${(Math.random() * 3).toFixed(1)}s`,
      opacity: 0.5 + Math.random() * 0.4
    }));
  };
  
  // Create random bubbles when component mounts or environment changes
  const mainBubbles = useMemo(() => generateBubbles(8), [currentEnvironment]);
  const fullScreenBubbles = useMemo(() => generateBubbles(15), [currentEnvironment]);
  
  useEffect(() => {
    // Play the background sound when the environment changes
    if (currentEnvironment) {
      const audioHandler = new AudioHandler();
      const envId = currentEnvironment.id;
      
      // First stop any playing sound
      audioHandler.stopBackgroundSound();
      
      // Set volume to a comfortable level
      audioHandler.setBackgroundVolume(0.3);
      
      // Play the appropriate sound based on environment
      if (envId === 'ocean') {
        audioHandler.playBackgroundSound(environmentSounds.ocean);
      } else if (envId === 'forest') {
        audioHandler.playBackgroundSound(environmentSounds.forest);
      } else if (envId === 'cafe') {
        audioHandler.playBackgroundSound(environmentSounds.cafe);
      } else if (envId === 'bedroom') {
        audioHandler.playBackgroundSound(environmentSounds.bedroom);
      }
      
      return () => {
        audioHandler.stopBackgroundSound();
      };
    }
  }, [currentEnvironment]);

  const getMoodColor = () => {
    switch (currentMood) {
      case 'happy': return 'bg-bubble-success';
      case 'calm': return 'bg-bubble-success';
      case 'sad': return 'bg-bubble-warning';
      case 'anxious': return 'bg-bubble-warning';
      case 'stressed': return 'bg-bubble-error';
      case 'improved': return 'bg-bubble-success';
      default: return 'bg-bubble-primary';
    }
  };

  const getMoodText = () => {
    return currentMood ? currentMood.charAt(0).toUpperCase() + currentMood.slice(1) : 'Neutral';
  };

  return (
    <>
      {showFullScreen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-6xl max-h-[95vh] bg-white rounded-xl overflow-hidden">
            <button 
              className="absolute top-4 right-4 z-10 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition-colors"
              onClick={() => setShowFullScreen(false)}
            >
              <X size={20} />
            </button>
            
            <img 
              src={currentEnvironment?.imageUrl || "./attached_assets/Cozy campfire in the woods, surrounded by sleeping bags, at night, in the dark, sky full of stars.jpeg"} 
              alt={currentEnvironment?.name || "Serene environment"} 
              className="w-full h-[75vh] object-cover" 
            />
            
            {/* Floating bubbles animation inside full-screen view */}
            <div className="absolute inset-0 pointer-events-none">
              {fullScreenBubbles.map(bubble => (
                <div 
                  key={bubble.id}
                  className={`floating-bubble ${bubble.size}`} 
                  style={{ 
                    top: bubble.top, 
                    left: bubble.left, 
                    animationDelay: bubble.delay,
                    opacity: bubble.opacity
                  }}
                ></div>
              ))}
            </div>
            
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">{currentEnvironment?.name || "Campfire"}</h2>
              <p className="text-gray-600 mb-4 text-lg">{currentEnvironment?.description || "A peaceful environment to help you relax and reflect."}</p>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className={`w-4 h-4 rounded-full ${getMoodColor()} mr-3`}></span>
                  <span className="text-gray-700 text-lg">Current Mood: {getMoodText()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    
      <div className="mb-8">
        <h2 
          className="text-2xl font-bold text-white mb-4 flex items-center cursor-pointer hover:text-bubble-primary transition-colors"
          onClick={() => setShowFullScreen(true)}
        >
          Immersive Experience <Maximize size={22} className="ml-3 text-bubble-primary animate-pulse" />
        </h2>
        
        <div 
          className="relative h-[500px] bg-bubble-light overflow-hidden rounded-2xl shadow-xl cursor-pointer transform hover:scale-[1.02] transition-transform border-4 border-bubble-primary/30"
          onClick={() => setShowFullScreen(true)}
        >
          <img 
            src={currentEnvironment?.imageUrl || "./attached_assets/Cozy campfire in the woods, surrounded by sleeping bags, at night, in the dark, sky full of stars.jpeg"} 
            alt={currentEnvironment?.name || "Serene environment"} 
            className="w-full h-full object-cover" 
          />
          
          {/* Floating bubbles in environment display */}
          <div className="absolute inset-0 pointer-events-none">
            {mainBubbles.map(bubble => (
              <div 
                key={bubble.id}
                className={`floating-bubble ${bubble.size}`} 
                style={{ 
                  top: bubble.top, 
                  left: bubble.left, 
                  animationDelay: bubble.delay,
                  opacity: bubble.opacity
                }}
              ></div>
            ))}
          </div>
        
          <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-2">
            <div className="glass rounded-xl px-4 py-3 text-sm text-gray-700 font-medium">
              <div className="flex justify-between items-center">
                <span className="mr-2 text-base">{currentEnvironment?.name || "Campfire"}</span>
                <Maximize size={16} className="text-bubble-primary" />
              </div>
              {currentEnvironment?.description && (
                <p className="text-sm text-gray-600 mt-1">{currentEnvironment.description}</p>
              )}
            </div>
            
            <div className="glass rounded-xl px-4 py-3 text-sm self-end">
              <div className="flex items-center">
                <span className={`w-3 h-3 rounded-full ${getMoodColor()} mr-2`}></span>
                <span className="text-gray-700">{getMoodText()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}