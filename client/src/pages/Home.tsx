import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home as HomeIcon, MessageCircle, Book, BarChart3, Settings, Heart, Wind, LifeBuoy, LogIn, UserRound } from 'lucide-react';
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
import { useSession } from '@/lib/authClient';
import { cn } from '@/lib/utils';
import { clearGoogleReturn, googleSignInProblem } from '@/lib/googleSignIn';
import { useAccountDialog } from '@/store/accountStore';
import { useMoodStore } from '@/store/moodStore';
import { useSosStore } from '@/store/sosStore';
import { useIntroStore } from '@/store/introStore';

type ActivePanel = 'chat' | 'avatar' | 'journal' | 'mood' | 'feedback' | 'welcome' | 'home';

// The desktop sidebar lists them all; phones show the first four as tabs and keep
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

export default function Home() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('welcome');
  const { currentMood, setCurrentMood } = useMoodStore();
  const [selectedEnvironment, setSelectedEnvironment] = useState<SceneId>('ocean');
  const [showBreathingExercise, setShowBreathingExercise] = useState(false);
  const { open: openSos, close: closeSos } = useSosStore();
  const { open: openAccount } = useAccountDialog();
  const { open: openIntro } = useIntroStore();
  const { data: session } = useSession();

  // Back from Google without being signed in: reopen sign-in with the reason, so
  // they can try again or use their email, and tidy the address bar
  useEffect(() => {
    const problem = googleSignInProblem(window.location.search);
    clearGoogleReturn();
    if (problem) openAccount('login', { message: problem });
  }, [openAccount]);

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
        return <ChatInterface />;
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
            {/* Bubble's face, kept still so it's calm to look at */}
            <div className="mb-6" aria-hidden="true">
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
                Bubble is an AI and isn't a substitute for a therapist. If you're in danger, please call 112 or tap Get
                help to reach someone right away.
              </p>
              {!session && (
                <p className="mt-4 max-w-xs text-sm text-white/90">
                  Want to keep a journal and track your mood?{' '}
                  <button
                    onClick={() => openAccount('register')}
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

  const isActive = (panel: ActivePanel) =>
    panel === 'home' ? activePanel === 'home' || activePanel === 'welcome' : activePanel === panel;

  // Bottom of the desktop sidebar. Phones have this in the header menu.
  const sidebarRow =
    'flex h-11 w-full items-center gap-3 rounded-[8px] px-3 text-left text-[15px] font-medium focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60';
  const accountButton = session ? (
    <button onClick={() => openAccount()} className={cn(sidebarRow, 'h-auto py-2 text-white hover:bg-white/10')}>
      <UserRound size={20} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block truncate">{session.user.name}</span>
        <span className="block truncate text-xs font-normal text-white/75">{session.user.email}</span>
      </span>
    </button>
  ) : (
    <button onClick={() => openAccount()} className={cn(sidebarRow, 'text-white hover:bg-white/10')}>
      <LogIn size={20} className="shrink-0" aria-hidden="true" />
      Sign in
    </button>
  );

  return (
    // 100dvh so mobile browser toolbars don't hide the tab bar; h-screen is the fallback
    <div
      className="relative flex flex-col md:flex-row h-screen overflow-hidden bg-[#0b2a4a]"
      style={{ height: '100dvh' }}
    >
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
        <PhoneMenu onOpenPanel={setActivePanel} scene={selectedEnvironment} onSceneChange={setSelectedEnvironment} />
      </header>

      {/* Desktop sidebar: labelled links, help that's always there, and the account */}
      <nav
        aria-label="Main"
        className="z-10 hidden h-full w-60 shrink-0 flex-col border-r border-white/10 px-3 py-5 surface-bar md:flex"
      >
        <div className="mb-6 px-3">
          <BubbleLogo size={30} withName />
        </div>

        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ panel, label, icon: Icon }) => (
            <li key={panel}>
              <button
                onClick={() => setActivePanel(panel)}
                aria-current={isActive(panel) ? 'page' : undefined}
                className={cn(
                  sidebarRow,
                  isActive(panel) ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon size={20} className="shrink-0" aria-hidden="true" />
                {label}
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={openSos}
          aria-haspopup="dialog"
          className={cn(helpButtonClass, 'mt-6 h-11 w-full justify-center text-[15px]')}
        >
          <LifeBuoy size={18} aria-hidden="true" />
          Get help now
        </button>

        <div className="mt-auto border-t border-white/10 pt-3">{accountButton}</div>
      </nav>

      {/* Main content: full width on phones, centred and capped on desktop so lines
          stay readable */}
      <main className="z-10 flex min-h-0 flex-1 flex-col md:h-full">
        <div className="mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col md:pt-8">
          <div className="px-4 md:px-6">
            <OfflineBanner />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6">
            {getPanelComponent()}
          </div>
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
