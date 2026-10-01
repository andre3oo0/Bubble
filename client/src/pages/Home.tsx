import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home as HomeIcon, MessageCircle, Book, BarChart3, Settings, Heart, ArrowLeft, Wind, LifeBuoy } from 'lucide-react';
import BubbleAvatar from '@/components/BubbleAvatar';
import ChatInterface from '@/components/ChatInterface';
import JournalPanel from '@/components/JournalPanel';
import MoodPanel from '@/components/MoodPanel';
import AvatarPanel from '@/components/AvatarPanel';
import FeedbackPanel from '@/components/FeedbackPanel';
import BreathingExercise from '@/components/BreathingExercise';
import SosScreen from '@/components/SosScreen';
import { useMoodStore } from '@/store/moodStore';
import { useSosStore } from '@/store/sosStore';

type ActivePanel = 'chat' | 'avatar' | 'journal' | 'mood' | 'feedback' | 'welcome' | 'home';

export default function Home() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('welcome');
  const [isTyping, setIsTyping] = useState(false);
  const { currentMood, setCurrentMood } = useMoodStore();
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('ocean');
  const [showBreathingExercise, setShowBreathingExercise] = useState(false);
  const { open: openSos, close: closeSos } = useSosStore();

  // Load the last active panel from localStorage
  useEffect(() => {
    const savedPanel = localStorage.getItem('activePanel');
    if (savedPanel) {
      setActivePanel(savedPanel as ActivePanel);
    }
  }, []);

  // Save active panel to localStorage
  useEffect(() => {
    localStorage.setItem('activePanel', activePanel);
  }, [activePanel]);

  // Load selected environment from localStorage
  useEffect(() => {
    const savedEnvironment = localStorage.getItem('selectedEnvironment');
    if (savedEnvironment) {
      setSelectedEnvironment(savedEnvironment);
    }
  }, []);

  // Save selected environment to localStorage
  useEffect(() => {
    localStorage.setItem('selectedEnvironment', selectedEnvironment);
  }, [selectedEnvironment]);

  // Get the background class based on selected environment
  const getEnvironmentClass = () => {
    switch(selectedEnvironment) {
      case 'forest':
        return 'animated-forest';
      case 'ocean':
        return 'animated-ocean';
      case 'sunset':
        return 'animated-sunset';
      case 'bedroom':
        return 'animated-bedroom';
      default:
        return 'animated-ocean';
    }
  };

  // Get panel component based on active panel
  const getPanelComponent = () => {
    switch(activePanel) {
      case 'chat':
        return <ChatInterface setIsTyping={setIsTyping} />;
      case 'avatar':
        return <AvatarPanel 
                setCurrentMood={setCurrentMood} 
                currentMood={currentMood} 
                selectedEnvironment={selectedEnvironment}
                setSelectedEnvironment={setSelectedEnvironment}
              />;
      case 'journal':
        return <JournalPanel />;
      case 'mood':
        return <MoodPanel 
                setCurrentMood={setCurrentMood} 
                currentMood={currentMood} 
              />;
      case 'feedback':
        return <FeedbackPanel />;
      case 'home':
      case 'welcome':
      default:
        return (
          <motion.div 
            className="flex flex-col items-center justify-center text-center p-8 h-full overflow-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold mb-4 text-white">Hey there! I'm Bubble</h1>
            <p className="text-xl mb-8 text-white">your personal mental health bot</p>
            <div className="flex flex-col items-center">
              <button 
                onClick={() => setActivePanel('chat')}
                className="bg-[#50c8ff] text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-[#3498db] transition-colors mb-4"
              >
                Start chatting
              </button>
              <p className="text-sm opacity-75 text-white">I'm here to help you feel better</p>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className={`flex h-screen overflow-y-auto bg-gradient-to-br from-[#1e90ff] to-[#0077b6] ${getEnvironmentClass()}`}>
      {/* Always reachable in one tap, on every panel */}
      <button
        onClick={openSos}
        aria-haspopup="dialog"
        className="fixed top-4 right-4 z-40 hidden md:flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#b42318] shadow-lg focus:outline-none focus:ring-4 focus:ring-white/60"
      >
        <LifeBuoy size={18} aria-hidden="true" />
        Get help now
      </button>

      <SosScreen
        onBreathe={() => {
          closeSos();
          setShowBreathingExercise(true);
        }}
      />

      {/* Breathing Exercise Overlay */}
      <BreathingExercise 
        isOpen={showBreathingExercise} 
        onClose={() => setShowBreathingExercise(false)} 
      />
      
      {/* Floating Breathing Exercise Button */}
      <motion.button
        className="fixed bottom-8 right-8 bg-[#50c8ff] text-white rounded-full p-3 shadow-lg z-50"
        onClick={() => setShowBreathingExercise(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        title="Breathing Exercise"
      >
        <Wind size={24} />
      </motion.button>
      
      {/* Left sidebar with persistent navigation */}
      <div className="w-16 min-w-[4rem] h-full bg-[#3498db]/30 backdrop-blur-md flex flex-col items-center py-6 border-r border-[#B8DFFC]/40 z-10">
        {/* Bubble logo */}
        <div className="text-white font-bold text-xl mb-6 md:mb-12">B</div>

        {/* On small screens the top-right pill would cover the header, so SOS lives here */}
        <button
          onClick={openSos}
          aria-haspopup="dialog"
          aria-label="Get help now"
          className="md:hidden mb-6 flex flex-col items-center rounded-2xl bg-white px-2 py-1.5 text-[#b42318] shadow-lg focus:outline-none focus:ring-4 focus:ring-white/60"
        >
          <LifeBuoy size={20} aria-hidden="true" />
          <span className="text-[10px] font-bold leading-tight">SOS</span>
        </button>

        {/* Navigation icons */}
        <div className="flex-1 flex flex-col items-center gap-8">
          <NavIcon 
            icon={<HomeIcon />}
            label="Home"
            isActive={activePanel === 'home' || activePanel === 'welcome'}
            onClick={() => setActivePanel('home')}
          />
          <NavIcon 
            icon={<MessageCircle />}
            label="Chat"
            isActive={activePanel === 'chat'}
            onClick={() => setActivePanel('chat')}
          />
          <NavIcon 
            icon={<Book />}
            label="Journal"
            isActive={activePanel === 'journal'}
            onClick={() => setActivePanel('journal')}
          />
          <NavIcon 
            icon={<BarChart3 />}
            label="Mood"
            isActive={activePanel === 'mood'}
            onClick={() => setActivePanel('mood')}
          />
          <NavIcon 
            icon={<Settings />}
            label="Avatar"
            isActive={activePanel === 'avatar'}
            onClick={() => setActivePanel('avatar')}
          />
          <NavIcon 
            icon={<Heart />}
            label="Feedback"
            isActive={activePanel === 'feedback'}
            onClick={() => setActivePanel('feedback')}
          />
        </div>
      </div>

      {/* Avatar area */}
      <div className="w-1/4 h-full flex flex-col items-center pt-8 pb-4 z-10">
        {/* Bubble logo */}
        <div className="text-white font-bold text-2xl mb-8">BUBBLE</div>

        {/* Bubble avatar */}
        <div className="flex-1 flex items-center justify-center mb-4">
          <BubbleAvatar
            size="lg"
            animate={true}
            isTyping={isTyping}
            mood={currentMood}
          />
        </div>

        {/* Mood indicator text */}
        <div className="text-white text-sm opacity-80 mb-8">
          {isTyping ? (
            "Bubble is typing..."
          ) : (
            <>
              {currentMood === 'happy' && "I'm feeling cheerful!"}
              {currentMood === 'calm' && "I'm feeling peaceful"}
              {currentMood === 'sad' && "I'm here for you"}
              {currentMood === 'anxious' && "Let's take deep breaths"}
              {currentMood === 'stressed' && "One step at a time"}
              {currentMood === 'neutral' && "How are you feeling?"}
              {currentMood === 'improved' && "Things are looking up!"}
            </>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="w-2/4 h-full flex flex-col z-10">
        {/* Content header with back button */}
        <div className="h-16 px-6 flex items-center">
          {activePanel !== 'home' && activePanel !== 'welcome' && (
            <button 
              onClick={() => setActivePanel('home')}
              className="flex items-center text-white hover:text-[#50c8ff] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Back to home</span>
            </button>
          )}
        </div>
        
        {/* Main content with scrolling */}
        <div className="flex-1 px-6 pb-6 overflow-y-auto">
          {getPanelComponent()}
        </div>
      </div>

      {/* Environment elements based on selection */}
      {/* overflow-hidden: the drifting clouds/waves otherwise make the page scroll sideways */}
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${selectedEnvironment}-elements`}>
        {selectedEnvironment === 'forest' && (
          <>
            <div className="swaying-tree-1"></div>
            <div className="swaying-tree-2"></div>
            <div className="flying-bird-1"></div>
            <div className="flying-bird-2"></div>
          </>
        )}
        {selectedEnvironment === 'ocean' && (
          <>
            <div className="moving-wave-1"></div>
            <div className="moving-wave-2"></div>
            <div className="floating-cloud-1"></div>
            <div className="floating-cloud-2"></div>
          </>
        )}
        {selectedEnvironment === 'sunset' && (
          <>
            <div className="glowing-sun"></div>
            <div className="floating-cloud-sunset-1"></div>
            <div className="floating-cloud-sunset-2"></div>
          </>
        )}
        {selectedEnvironment === 'bedroom' && (
          <>
            <div className="flickering-fire"></div>
            <div className="flickering-candle-1"></div>
            <div className="flickering-candle-2"></div>
          </>
        )}
      </div>
    </div>
  );
}

interface NavIconProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function NavIcon({ icon, label, isActive, onClick }: NavIconProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`w-10 h-10 rounded-full flex items-center justify-center text-center transition-all ${
        isActive 
          ? 'bg-[#50c8ff] text-white' 
          : 'bg-[#9AD9EA]/30 text-white/90 hover:bg-[#9AD9EA]/50'
      }`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      title={label}
    >
      {icon}
    </motion.button>
  );
}
