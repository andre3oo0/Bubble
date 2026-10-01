import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home as HomeIcon, MessageCircle, Book, BarChart3, Settings, Heart, ArrowLeft, Wind, LifeBuoy, UserRound } from 'lucide-react';
import BubbleAvatar from '@/components/BubbleAvatar';
import ChatInterface from '@/components/ChatInterface';
import JournalPanel from '@/components/JournalPanel';
import MoodPanel from '@/components/MoodPanel';
import AvatarPanel from '@/components/AvatarPanel';
import FeedbackPanel from '@/components/FeedbackPanel';
import BreathingExercise from '@/components/BreathingExercise';
import SosScreen from '@/components/SosScreen';
import AuthenticationModal from '@/components/AuthenticationModal';
import { Mood } from '@/models/types';
import { useSession } from '@/lib/authClient';
import { useAccountDialog } from '@/store/accountStore';
import { useMoodStore } from '@/store/moodStore';
import { useSosStore } from '@/store/sosStore';

type ActivePanel = 'chat' | 'avatar' | 'journal' | 'mood' | 'feedback' | 'welcome' | 'home';

// Shared by the desktop sidebar and the phone tab bar
const NAV_ITEMS: { panel: ActivePanel; label: string; icon: typeof HomeIcon }[] = [
  { panel: 'home', label: 'Home', icon: HomeIcon },
  { panel: 'chat', label: 'Chat', icon: MessageCircle },
  { panel: 'journal', label: 'Journal', icon: Book },
  { panel: 'mood', label: 'Mood', icon: BarChart3 },
  { panel: 'avatar', label: 'Avatar', icon: Settings },
  { panel: 'feedback', label: 'Feedback', icon: Heart },
];

const MOOD_LINES: Record<Mood, string> = {
  happy: "I'm feeling cheerful!",
  calm: "I'm feeling peaceful",
  sad: "I'm here for you",
  anxious: "Let's take deep breaths",
  stressed: 'One step at a time',
  neutral: 'How are you feeling?',
  improved: 'Things are looking up!',
};

export default function Home() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('welcome');
  const [isTyping, setIsTyping] = useState(false);
  const { currentMood, setCurrentMood } = useMoodStore();
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('ocean');
  const [showBreathingExercise, setShowBreathingExercise] = useState(false);
  const { open: openSos, close: closeSos } = useSosStore();
  const { open: openAccount } = useAccountDialog();
  const { data: session } = useSession();

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
            className="flex flex-col items-center justify-center text-center p-6 md:p-8 h-full overflow-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">Hey there! I'm Bubble</h1>
            <p className="text-lg md:text-xl mb-8 text-white">your personal mental health bot</p>
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

  const moodLine = isTyping ? 'Bubble is typing...' : MOOD_LINES[currentMood];
  const isActive = (panel: ActivePanel) =>
    panel === 'home' ? activePanel === 'home' || activePanel === 'welcome' : activePanel === panel;

  const accountButton = (
    <button
      onClick={openAccount}
      aria-label={session ? `Account: ${session.user.name}` : 'Sign in'}
      title={session ? session.user.name : 'Sign in'}
      className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-white/90 text-[#0b5394] font-bold shadow focus:outline-none focus:ring-4 focus:ring-white/60"
    >
      {session ? session.user.name.charAt(0).toUpperCase() : <UserRound size={20} aria-hidden="true" />}
    </button>
  );

  return (
    // 100dvh so mobile browser toolbars don't hide the tab bar; h-screen is the fallback
    <div
      className={`relative flex flex-col md:flex-row h-screen overflow-hidden bg-gradient-to-br from-[#1e90ff] to-[#0077b6] ${getEnvironmentClass()}`}
      style={{ height: '100dvh' }}
    >
      {/* Always reachable in one tap, on every panel (phones get it in the header) */}
      <button
        onClick={openSos}
        aria-haspopup="dialog"
        className="fixed top-4 right-4 z-40 hidden md:flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#b42318] shadow-lg focus:outline-none focus:ring-4 focus:ring-white/60"
      >
        <LifeBuoy size={18} aria-hidden="true" />
        Get help now
      </button>

      <AuthenticationModal />

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

      {/* Floating breathing button. Sits above the tab bar on phones and is hidden in chat
          there, where it would cover the send button (chat has its own breathing button) */}
      <motion.button
        className={`fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-8 md:right-8 bg-[#50c8ff] text-white rounded-full p-3 shadow-lg z-30 ${
          activePanel === 'chat' ? 'hidden md:block' : ''
        }`}
        onClick={() => setShowBreathingExercise(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        title="Breathing Exercise"
        aria-label="Breathing exercise"
      >
        <Wind size={24} aria-hidden="true" />
      </motion.button>

      {/* Phone header: small Bubble, its mood line, SOS and account */}
      <header className="md:hidden z-10 flex items-center gap-3 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        {/* The face is drawn for the larger sizes, so shrink a medium avatar instead of using "sm" */}
        <div className="relative h-14 w-11 shrink-0" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.52]">
            <BubbleAvatar size="md" animate={false} isTyping={isTyping} mood={currentMood} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-white font-bold text-lg leading-tight">Bubble</div>
          <div className="text-white/85 text-sm truncate">{moodLine}</div>
        </div>
        <button
          onClick={openSos}
          aria-haspopup="dialog"
          aria-label="Get help now"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-bold text-[#b42318] shadow-lg focus:outline-none focus:ring-4 focus:ring-white/60"
        >
          <LifeBuoy size={18} aria-hidden="true" />
          SOS
        </button>
        {accountButton}
      </header>

      {/* Desktop sidebar with persistent navigation */}
      <nav
        aria-label="Main"
        className="hidden md:flex w-16 min-w-[4rem] h-full bg-[#3498db]/30 backdrop-blur-md flex-col items-center py-6 border-r border-[#B8DFFC]/40 z-10"
      >
        {/* Bubble logo */}
        <div className="text-white font-bold text-xl mb-12">B</div>

        {/* Navigation icons */}
        <div className="flex-1 flex flex-col items-center gap-8">
          {NAV_ITEMS.map(({ panel, label, icon: Icon }) => (
            <NavIcon
              key={panel}
              icon={<Icon />}
              label={label}
              isActive={isActive(panel)}
              onClick={() => setActivePanel(panel)}
            />
          ))}
        </div>

        {/* Account: initial when signed in, sign-in icon when not */}
        <div className="mt-4">{accountButton}</div>
      </nav>

      {/* Avatar area (desktop) */}
      <div className="hidden md:flex w-1/4 h-full flex-col items-center pt-8 pb-4 z-10">
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
        <div className="text-white text-sm opacity-80 mb-8">{moodLine}</div>
      </div>

      {/* Main content area: full width on phones */}
      <main className="z-10 flex min-h-0 flex-1 flex-col md:h-full md:w-2/4 md:flex-none">
        {/* Content header with back button (phones use the tab bar instead) */}
        <div className="hidden md:flex h-16 px-6 items-center">
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
        {/* Extra bottom padding on phones so the end of a page can scroll clear of the
            floating breathing button (not needed in chat, where that button is hidden) */}
        <div className={`flex-1 min-h-0 px-4 md:px-6 md:pb-6 overflow-y-auto ${activePanel === 'chat' ? 'pb-4' : 'pb-24'}`}>
          {getPanelComponent()}
        </div>
      </main>

      {/* Phone tab bar */}
      <nav
        aria-label="Main"
        className="md:hidden z-20 grid grid-cols-6 border-t border-white/25 bg-[#0b5394]/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        {NAV_ITEMS.map(({ panel, label, icon: Icon }) => (
          <button
            key={panel}
            onClick={() => setActivePanel(panel)}
            aria-current={isActive(panel) ? 'page' : undefined}
            className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium focus:outline-none focus-visible:bg-white/20 ${
              isActive(panel) ? 'text-white' : 'text-white/75'
            }`}
          >
            <span className={`flex h-7 w-12 items-center justify-center rounded-full ${isActive(panel) ? 'bg-white/25' : ''}`}>
              <Icon size={20} aria-hidden="true" />
            </span>
            {label}
          </button>
        ))}
      </nav>

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
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon}
    </motion.button>
  );
}
