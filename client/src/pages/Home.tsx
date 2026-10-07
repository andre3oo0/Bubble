import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Home as HomeIcon, MessageCircle, Book, BarChart3, Settings, Heart, Wind, LifeBuoy, LogIn, UserRound, ChevronRight } from 'lucide-react';
import BubbleAvatar from '@/components/BubbleAvatar';
import BubbleLogo from '@/components/BubbleLogo';
import SceneBackdrop from '@/components/SceneBackdrop';
import ChatPanel from '@/components/ChatPanel';
import JournalPanel from '@/components/JournalPanel';
import MoodPanel from '@/components/MoodPanel';
import SettingsPanel from '@/components/SettingsPanel';
import FeedbackPanel from '@/components/FeedbackPanel';
import BreathingExercise from '@/components/BreathingExercise';
import SosScreen, { helpButtonClass } from '@/components/SosScreen';
import AuthenticationModal from '@/components/AuthenticationModal';
import ConsentGate from '@/components/ConsentGate';
import IntroTour from '@/components/IntroTour';
import OfflineBanner from '@/components/OfflineBanner';
import PhoneMenu from '@/components/PhoneMenu';
import { buttonClass, focusRing } from '@/components/ui/controls';
import { isSceneId, type SceneId } from '@/components/scenes';
import { useSession } from '@/lib/authClient';
import { cn } from '@/lib/utils';
import { fetchJournal, fetchMoods, queryKeys } from '@/lib/api';
import { formatDay, formatTime } from '@/lib/dates';
import { MOOD_LABELS } from '@/lib/moods';
import { clearGoogleReturn, googleSignInProblem } from '@/lib/googleSignIn';
import { useAccountDialog } from '@/store/accountStore';
import { useBreathing } from '@/store/breathingStore';
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

// "today at 15:46", "on Tue 6 Oct at 15:46"
function whenText(iso: string) {
  const date = new Date(iso);
  const day = formatDay(date);
  const on = day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : `on ${day}`;
  return `${on} at ${formatTime(date)}`;
}

// For people who've been here before: where they left off, one tap from each
function HomeSummary({ onOpen }: { onOpen: (panel: ActivePanel) => void }) {
  const moods = useQuery({ queryKey: queryKeys.moods, queryFn: fetchMoods });
  const journal = useQuery({ queryKey: queryKeys.journal, queryFn: fetchJournal });

  const latest = <T extends { createdAt: string }>(items: T[] = []) =>
    items.reduce<T | undefined>((a, b) => (!a || b.createdAt > a.createdAt ? b : a), undefined);
  const lastCheckin = latest(moods.data);
  const lastEntry = latest(journal.data);
  const entryCount = journal.data?.length ?? 0;

  const moodDetail = moods.isPending
    ? 'Loading…'
    : moods.isError
      ? "Couldn't load your check-ins"
      : lastCheckin
        ? `Last check-in: ${MOOD_LABELS[lastCheckin.mood]}, ${whenText(lastCheckin.createdAt)}`
        : 'No check-ins yet';
  const journalDetail = journal.isPending
    ? 'Loading…'
    : journal.isError
      ? "Couldn't load your journal"
      : lastEntry
        ? `${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}, latest: ${lastEntry.title}`
        : 'No entries yet';

  const rows = [
    { panel: 'mood' as const, icon: BarChart3, label: lastCheckin ? 'Check in again' : 'Check in', detail: moodDetail },
    { panel: 'journal' as const, icon: Book, label: lastEntry ? 'Your journal' : 'Start your journal', detail: journalDetail },
  ];

  return (
    <ul className="surface w-full divide-y divide-white/10 overflow-hidden rounded-[8px] text-left">
      {rows.map(({ panel, icon: Icon, label, detail }) => (
        <li key={panel}>
          <button
            onClick={() => onOpen(panel)}
            className={cn('flex w-full items-center gap-3 px-4 py-3 text-left text-white hover:bg-white/10 focus-visible:ring-inset', focusRing.dark)}
          >
            <Icon className="h-5 w-5 shrink-0 text-[#9fd3f5]" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{label}</span>
              <span className="block truncate text-sm text-white/75">{detail}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-white/60" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('welcome');
  const [selectedEnvironment, setSelectedEnvironment] = useState<SceneId>('ocean');
  const { open: openSos, close: closeSos } = useSosStore();
  const { open: openBreathing } = useBreathing();
  const { currentMood } = useMoodStore();
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
    switch (activePanel) {
      case 'chat':
        return <ChatPanel />;
      case 'avatar':
        return <SettingsPanel selectedEnvironment={selectedEnvironment} setSelectedEnvironment={setSelectedEnvironment} />;
      case 'journal':
        return <JournalPanel />;
      case 'mood':
        return <MoodPanel />;
      case 'feedback':
        return <FeedbackPanel />;
      case 'home':
      case 'welcome':
      default:
        return (
          <div className="flex min-h-full flex-col items-center py-6 text-center md:py-8">
            <div className="my-auto flex w-full max-w-sm flex-col items-center">
              {/* Bubble's face shows its mood (from check-ins and chat), and stays still */}
              <div className="mb-6" aria-hidden="true">
                <BubbleAvatar size="lg" mood={currentMood} />
              </div>
              <h1 className="text-3xl font-bold text-white">
                {session ? `Hi ${session.user.name.trim().split(' ')[0]}` : "Hi, I'm Bubble"}
              </h1>
              <p className="mt-2 text-lg text-white">A calm place to talk things through</p>

              <div className="mt-8 flex w-full flex-col gap-3">
                <button onClick={() => setActivePanel('chat')} className={buttonClass({ className: 'min-h-12 text-base' })}>
                  Start chatting
                </button>
                <button onClick={openBreathing} className={buttonClass({ variant: 'secondary' })}>
                  <Wind size={18} aria-hidden="true" />
                  Breathe for a minute
                </button>
                <button onClick={openIntro} className={buttonClass({ variant: 'tertiary', size: 'sm', className: 'self-center' })}>
                  What can Bubble do?
                </button>
              </div>

              {session && (
                <div className="mt-6 w-full">
                  <HomeSummary onOpen={setActivePanel} />
                </div>
              )}

              <div className="mt-8 w-full border-t border-white/15 pt-6 text-sm text-white/90">
                <p>
                  Bubble is an AI and isn't a substitute for a therapist. If you're in danger, please call 112 or tap Get
                  help to reach someone right away.
                </p>
                {!session && (
                  <p className="mt-3">
                    Want to keep a journal and track your mood?{' '}
                    <button
                      onClick={() => openAccount('register')}
                      className={cn('rounded font-semibold text-white underline underline-offset-4', focusRing.dark)}
                    >
                      Create a free account
                    </button>
                  </p>
                )}
                <p className="mt-3 text-xs text-white/85">
                  <Link href="/privacy" className={cn('rounded underline underline-offset-4 decoration-white/50 hover:decoration-white', focusRing.dark)}>
                    Privacy policy
                  </Link>
                  <span aria-hidden="true" className="mx-2">·</span>
                  <Link href="/terms" className={cn('rounded underline underline-offset-4 decoration-white/50 hover:decoration-white', focusRing.dark)}>
                    Terms of use
                  </Link>
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  const isActive = (panel: ActivePanel) =>
    panel === 'home' ? activePanel === 'home' || activePanel === 'welcome' : activePanel === panel;

  // Bottom of the desktop sidebar. Phones have this in the header menu.
  const sidebarRow = cn(
    'flex h-11 w-full items-center gap-3 rounded-[8px] px-3 text-left text-[15px] font-medium',
    focusRing.dark,
    'focus:outline-none',
  );
  // Signed in, the account lives in Settings, so the button goes there
  const accountButton = session ? (
    <button
      onClick={() => setActivePanel('avatar')}
      title={`${session.user.name} (${session.user.email})`}
      className={cn(sidebarRow, 'h-auto py-2 text-white hover:bg-white/10')}
    >
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
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#0b2a4a] md:flex-row" style={{ height: '100dvh' }}>
      <AuthenticationModal />
      <ConsentGate />

      <IntroTour onStartChat={() => setActivePanel('chat')} />

      <SosScreen
        onBreathe={() => {
          closeSos();
          openBreathing();
        }}
      />

      <BreathingExercise />

      {/* Phone header: just the name, help and the menu */}
      <header className="z-10 flex items-center gap-2 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)] md:hidden">
        <div className="min-w-0 flex-1">
          <BubbleLogo size={28} withName />
        </div>
        <button onClick={openSos} aria-haspopup="dialog" className={helpButtonClass}>
          <LifeBuoy size={18} aria-hidden="true" />
          Get help
        </button>
        <PhoneMenu onOpenPanel={setActivePanel} scene={selectedEnvironment} onSceneChange={setSelectedEnvironment} />
      </header>

      {/* Desktop sidebar: labelled links, help that's always there, and the account */}
      <nav aria-label="Main" className="surface-bar z-10 hidden h-full w-60 shrink-0 flex-col border-r border-white/10 px-3 py-5 md:flex">
        <div className="mb-6 px-3">
          <BubbleLogo size={30} withName />
        </div>

        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ panel, label, icon: Icon }) => (
            <li key={panel}>
              <button
                onClick={() => setActivePanel(panel)}
                aria-current={isActive(panel) ? 'page' : undefined}
                className={cn(sidebarRow, isActive(panel) ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white')}
              >
                <Icon size={20} className="shrink-0" aria-hidden="true" />
                {label}
              </button>
            </li>
          ))}
        </ul>

        <button onClick={openSos} aria-haspopup="dialog" className={cn(helpButtonClass, 'mt-6 h-11 w-full justify-center text-[15px]')}>
          <LifeBuoy size={18} aria-hidden="true" />
          Get help
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

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 md:px-6 md:pb-6">{getPanelComponent()}</div>
        </div>
      </main>

      {/* Phone tab bar */}
      <nav aria-label="Main" className="surface-bar z-20 grid grid-cols-4 border-t border-white/10 pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV_ITEMS.slice(0, PHONE_TABS).map(({ panel, label, icon: Icon }) => (
          <button
            key={panel}
            onClick={() => setActivePanel(panel)}
            aria-current={isActive(panel) ? 'page' : undefined}
            className={cn(
              'flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium focus:outline-none focus-visible:bg-white/20',
              isActive(panel) ? 'text-white' : 'text-white/75',
            )}
          >
            <span className={cn('flex h-7 w-12 items-center justify-center rounded-[8px]', isActive(panel) && 'bg-white/20')}>
              <Icon size={20} aria-hidden="true" />
            </span>
            {label}
          </button>
        ))}
      </nav>

      {/* The scene sits behind everything; calm visuals stops its movement */}
      <div className="scene-layer pointer-events-none absolute inset-0 overflow-hidden">
        <SceneBackdrop scene={selectedEnvironment} />
      </div>
    </div>
  );
}
