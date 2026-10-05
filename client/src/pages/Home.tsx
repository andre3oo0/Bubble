import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home as HomeIcon, MessageCircle, Book, BarChart3, Settings, Heart, ArrowLeft, Wind, LifeBuoy, LogIn, UserRound } from 'lucide-react';
import BubbleAvatar from '@/components/BubbleAvatar';
import BubbleLogo from '@/components/BubbleLogo';
import SceneBackdrop from '@/components/SceneBackdrop';
import ChatInterface from '@/components/ChatInterface';
import JournalPanel from '@/components/JournalPanel';
import MoodPanel from '@/components/MoodPanel';
import AvatarPanel from '@/components/AvatarPanel';
import FeedbackPanel from '@/components/FeedbackPanel';
import BreathingExercise from '@/components/BreathingExercise';
import SosScreen, { helpButtonClass } from '@/components/SosScreen';
import AuthenticationModal from '@/components/AuthenticationModal';
import IntroTour from '@/components/IntroTour';
import OfflineBanner from '@/components/OfflineBanner';
import PhoneMenu from '@/components/PhoneMenu';
import { isSceneId, type SceneId } from '@/components/scenes';
import { Mood } from '@/models/types';
import { useSession } from '@/lib/authClient';
import { cn } from '@/lib/utils';
import { useAccountDialog } from '@/store/accountStore';
import { useMoodStore } from '@/store/moodStore';
import { useSosStore } from '@/store/sosStore';
import { useIntroStore } from '@/store/introStore';

type ActivePanel = 'chat' | 'avatar' | 'journal' | 'mood' | 'feedback' | 'welcome' | 'home';

// The desktop sidebar shows them all; phones show the first four as tabs and keep
// Settings and Feedback in the header menu, so the tab bar stays calm
const PHONE_TABS = 4;
const NAV_ITEMS: { panel: ActivePanel; label: string; icon: typeof HomeIcon }[] = [
  { panel: 'home', label: 'Home', icon: HomeIcon },
  { panel: 'chat', label: 'Chat', icon: MessageCircle },
  { panel: 'journal', label: 'Journal', icon: Book },
  { panel: 'mood', label: 'Mood', icon: BarChart3 },
  { panel: 'avatar', label: 'Settings', icon: Settings },
  { panel: 'feedback', label: 'Feedback', icon: Heart },
];

const MOOD_LINES: Record<Mood, string> = {
  happy: "I'm feeling cheerful!",
  calm: "I'm feeling peaceful",
  sad: "I'm here for you",
  anxious: "Let's breathe slowly",
  stressed: 'One step at a time',
  neutral: 'How are you feeling?',
  improved: 'Things look brighter',
};

export default function Home() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('welcome');
  const [isTyping, setIsTyping] = useState(false);
  const { currentMood, setCurrentMood } = useMoodStore();
  const [selectedEnvironment, setSelectedEnvironment] = useState<SceneId>('ocean');
  const [showBreathingExercise, setShowBreathingExercise] = useState(false);
  const { open: openSos, close: closeSos } = useSosStore();
  const { open: openAccount } = useAccountDialog();
  const { open: openIntro } = useIntroStore();
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
    // Older saves can hold "cafe", which no longer exists
    const savedEnvironment = localStorage.getItem('selectedEnvironment');
    if (isSceneId(savedEnvironment)) {
      setSelectedEnvironment(savedEnvironment);
    }
  }, []);

  // Save selected environment to localStorage
  useEffect(() => {
    localStorage.setItem('selectedEnvironment', selectedEnvironment);
  }, [selectedEnvironment]);


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
            <div className="mb-6 md:hidden" aria-hidden="true">
              <BubbleAvatar size="md" animate={false} isTyping={false} mood={currentMood} />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">Hey there! I'm Bubble</h1>
            <p className="text-lg md:text-xl mb-8 text-white">A calm place to talk things through</p>
            <div className="flex flex-col items-center">
              <button
                onClick={() => setActivePanel('chat')}
                className="bg-[#0b6bb8] text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-[#095a9c] transition-colors mb-4"
              >
                Start chatting
              </button>
              <button
                onClick={() => setShowBreathingExercise(true)}
                className="mb-4 flex items-center gap-2 rounded-full px-5 py-2 font-medium text-white surface-soft surface-soft-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              >
                <Wind size={18} aria-hidden="true" />
                Breathe for a minute
              </button>
              <button
                onClick={openIntro}
                className="text-sm font-medium text-white underline underline-offset-4 decoration-white/60 hover:decoration-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 rounded"
              >
                What can Bubble do?
              </button>
              <p className="mt-6 max-w-sm text-sm text-white/90">
                Bubble is an AI. It isn't a therapist and can't respond to emergencies. If you're in danger, call 112 or use
                the help button at the top.
              </p>
              {!session && (
                <p className="mt-4 max-w-xs text-sm text-white/90">
                  Want to keep a journal and track your mood?{' '}
                  <button
                    onClick={openAccount}
                    className="font-semibold text-white underline underline-offset-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 rounded"
                  >
                    Create a free account
                  </button>
                </p>
              )}
            </div>
          </motion.div>
        );
    }
  };

  const moodLine = isTyping ? 'Bubble is typing...' : MOOD_LINES[currentMood];
  const isActive = (panel: ActivePanel) =>
    panel === 'home' ? activePanel === 'home' || activePanel === 'welcome' : activePanel === panel;

  // Desktop sidebar: signed out it says "Sign in" in words, so it can't be missed;
  // signed in it's the account icon. Phones have this in the header menu.
  const accountButton = session ? (
    <button
      onClick={openAccount}
      aria-label={`Your account (${session.user.name})`}
      title="Your account"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white surface-soft surface-soft-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
    >
      <UserRound size={20} aria-hidden="true" />
    </button>
  ) : (
    <button
      onClick={openAccount}
      className="flex h-auto w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[11px] font-semibold text-white surface-soft surface-soft-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
    >
      <LogIn size={18} aria-hidden="true" />
      Sign in
    </button>
  );

  return (
    // 100dvh so mobile browser toolbars don't hide the tab bar; h-screen is the fallback
    <div
      className="relative flex flex-col md:flex-row h-screen overflow-hidden bg-[#0b2a4a]"
      style={{ height: '100dvh' }}
    >
      {/* Always reachable in one tap, on every panel (phones get it in the header) */}
      <button
        onClick={openSos}
        aria-haspopup="dialog"
        className={cn(helpButtonClass, 'fixed right-4 top-4 z-40 hidden md:inline-flex')}
      >
        <LifeBuoy size={18} aria-hidden="true" />
        Get help now
      </button>

      <AuthenticationModal />

      <IntroTour onStartChat={() => setActivePanel('chat')} />

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

      {/* Floating breathing button, desktop only. Phones reach breathing from Home, Chat
          and the help screen, so nothing floats over their content */}
      <motion.button
        className="fixed bottom-8 right-8 z-30 hidden rounded-full bg-[#0b6bb8] p-3 text-white shadow-lg md:block"
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

      {/* Phone header: just the name, help and the menu */}
      <header className="md:hidden z-10 flex items-center gap-2 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="min-w-0 flex-1">
          <BubbleLogo size={28} withName />
        </div>
        <button
          onClick={openSos}
          aria-haspopup="dialog"
          className={helpButtonClass}
        >
          <LifeBuoy size={18} aria-hidden="true" />
          Get help
        </button>
        <PhoneMenu onOpenPanel={setActivePanel} />
      </header>

      {/* Desktop sidebar with persistent navigation */}
      <nav
        aria-label="Main"
        className="hidden md:flex w-16 min-w-[4rem] h-full surface-bar flex-col items-center py-6 border-r border-white/10 z-10"
      >
        <div className="mb-10">
          <BubbleLogo size={34} />
        </div>

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
        <div className="mb-8">
          <BubbleLogo size={30} withName />
        </div>

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
        <div className="text-white/90 text-sm mb-8">{moodLine}</div>
      </div>

      {/* Main content area: full width on phones */}
      <main className="z-10 flex min-h-0 flex-1 flex-col md:h-full md:w-2/4 md:flex-none">
        {/* Content header with back button (phones use the tab bar instead) */}
        <div className="hidden md:flex h-16 px-6 items-center">
          {activePanel !== 'home' && activePanel !== 'welcome' && (
            <button
              onClick={() => setActivePanel('home')}
              className="flex items-center text-white hover:text-sky-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Back to home</span>
            </button>
          )}
        </div>

        <div className="px-4 md:px-6">
          <OfflineBanner />
        </div>

        {/* Main content with scrolling */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6">
          {getPanelComponent()}
        </div>
      </main>

      {/* Phone tab bar */}
      <nav
        aria-label="Main"
        className="md:hidden z-20 grid grid-cols-4 border-t border-white/10 surface-bar pb-[env(safe-area-inset-bottom)]"
      >
        {NAV_ITEMS.slice(0, PHONE_TABS).map(({ panel, label, icon: Icon }) => (
          <button
            key={panel}
            onClick={() => setActivePanel(panel)}
            aria-current={isActive(panel) ? 'page' : undefined}
            className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium focus:outline-none focus-visible:bg-white/20 ${
              isActive(panel) ? 'text-white' : 'text-white/75'
            }`}
          >
            <span className={`flex h-7 w-12 items-center justify-center rounded-full ${isActive(panel) ? 'bg-white/20' : ''}`}>
              <Icon size={20} aria-hidden="true" />
            </span>
            {label}
          </button>
        ))}
      </nav>

      {/* The scene sits behind everything; calm visuals stops its movement */}
      <div className="scene-layer absolute inset-0 overflow-hidden pointer-events-none">
        <SceneBackdrop scene={selectedEnvironment} />
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
          ? 'bg-white/20 text-white ring-1 ring-white/40'
          : 'text-white/80 hover:bg-white/10 hover:text-white'
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
