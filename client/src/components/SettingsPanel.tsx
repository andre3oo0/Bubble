import { useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Download, FileText, Info, KeyRound, LifeBuoy, LogOut, MailCheck, Pause, Play, ScrollText, Trash2, Volume2 } from 'lucide-react';
import PageHeader from './PageHeader';
import SceneBackdrop from './SceneBackdrop';
import { buttonClass, focusRing as focusRings } from './ui/controls';
import { AccountSkeleton } from './Skeleton';
import { SCENES, type SceneId } from './scenes';
import { authClient, sendVerificationEmail, useSession } from '@/lib/authClient';
import { useDeviceReducesMotion } from '@/lib/motion';
import { signOutHere } from '@/lib/signOut';
import { useAccountDialog } from '@/store/accountStore';
import { useIntroStore } from '@/store/introStore';
import { usePreferences, type ThemePreference } from '@/store/preferencesStore';
import { useSosStore } from '@/store/sosStore';
import { useSoundStore } from '@/store/soundStore';

interface SettingsPanelProps {
  selectedEnvironment?: SceneId;
  setSelectedEnvironment?: (env: SceneId) => void;
}

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Automatic' },
  { value: 'day', label: 'Day' },
  { value: 'night', label: 'Night' },
];

const focusRing = `focus:outline-none ${focusRings.dark}`;
const rowClass = `flex w-full items-center gap-3 px-4 py-3 text-left text-white hover:bg-white/10 ${focusRing} focus-visible:ring-inset`;
const rowIcon = 'h-5 w-5 shrink-0 text-[#9fd3f5]';

// One flat panel per topic: a heading, then rows split by hairlines
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`settings-${title}`} className="surface mb-4 overflow-hidden rounded-[8px]">
      <h2 id={`settings-${title}`} className="px-4 pb-1 pt-4 text-sm font-semibold text-white/80">
        {title}
      </h2>
      <div className="divide-y divide-white/10">{children}</div>
    </section>
  );
}

function RowButton({
  icon: Icon,
  label,
  detail,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: typeof Info;
  label: string;
  detail?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className={`${rowClass} disabled:opacity-60`}>
      <Icon className={danger ? 'h-5 w-5 shrink-0 text-[#ffb4b4]' : rowIcon} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className={`block font-medium ${danger ? 'text-[#ffc9c9]' : ''}`}>{label}</span>
        {detail && <span className="block text-sm text-white/75">{detail}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/60" aria-hidden="true" />
    </button>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-sm text-white/90">{children}</p>;
}

export default function SettingsPanel({ selectedEnvironment = 'ocean', setSelectedEnvironment = () => {} }: SettingsPanelProps) {
  const { data: session, isPending: sessionPending } = useSession();
  const queryClient = useQueryClient();
  const { open: openAccount } = useAccountDialog();
  const { open: openIntro } = useIntroStore();
  const { open: openSos } = useSosStore();
  const { playing, volume, play, stop, setVolume } = useSoundStore();
  const { motion: motionPreference, theme, setMotion, setTheme } = usePreferences();
  const [confirmNotice, setConfirmNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Same query as the account dialog, so they share the answer
  const accounts = useQuery({
    queryKey: ['auth-accounts', session?.user.id],
    queryFn: async () => {
      const { data, error } = await authClient.listAccounts();
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });
  // Google-only accounts have no password to change; assume one until we know
  const hasPassword = accounts.data ? accounts.data.some((account) => account.providerId === 'credential') : true;

  const scene = SCENES.find((s) => s.id === selectedEnvironment) ?? SCENES[0];
  const sceneSoundPlaying = playing === scene.id;
  // The device's own setting already stops the motion, so the switch shows that
  const deviceReducesMotion = useDeviceReducesMotion();
  const calmVisuals = deviceReducesMotion || motionPreference === 'reduced';

  const pickScene = (id: SceneId) => {
    setSelectedEnvironment(id);
    // Keep the sound in step with the scene if it's already playing
    if (playing && playing !== 'breathing') play(id);
  };

  const resendConfirmation = async () => {
    if (!session) return;
    setBusy(true);
    const { error } = await sendVerificationEmail({ email: session.user.email, callbackURL: '/' });
    setBusy(false);
    setConfirmNotice(error ? "Couldn't send it just now. Please try again later." : 'Sent. Check your inbox and spam folder.');
  };

  const signOutNow = async () => {
    setBusy(true);
    await signOutHere(queryClient);
    setBusy(false);
  };

  return (
    <div className="pb-2">
      <PageHeader title="Settings" />

      <Section title="Account">
        {sessionPending ? (
          <AccountSkeleton />
        ) : session ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3 text-white">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0b6bb8] text-lg font-semibold"
                aria-hidden="true"
              >
                {session.user.name.trim().charAt(0).toUpperCase() || '?'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{session.user.name}</span>
                <span className="block truncate text-sm text-white/75">{session.user.email}</span>
              </span>
            </div>
            {!session.user.emailVerified && (
              <RowButton
                icon={MailCheck}
                label="Confirm your email"
                detail={confirmNotice || "So you can reset your password if you ever forget it. We'll send the link again."}
                onClick={resendConfirmation}
                disabled={busy}
              />
            )}
            {hasPassword && (
              <RowButton
                icon={KeyRound}
                label="Change password"
                detail="Signs you out on your other devices"
                onClick={() => openAccount('login', { action: 'change-password' })}
              />
            )}
            <RowButton icon={LogOut} label="Sign out" onClick={signOutNow} disabled={busy} />
          </>
        ) : (
          <div className="px-4 pb-4 pt-2">
            <p className="mb-3 text-sm text-white/90">
              Chat works without an account. Sign in to keep a private journal and see how your moods change.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button onClick={() => openAccount('login')} className={buttonClass()}>
                Sign in
              </button>
              <button onClick={() => openAccount('register')} className={buttonClass({ variant: 'secondary' })}>
                Create a free account
              </button>
            </div>
          </div>
        )}
      </Section>

      <Section title="Privacy">
        <Note>
          Your chats aren't saved. Bubble keeps the latest part of a conversation for up to an hour so it can follow along,
          and forgets it as soon as you choose Let go. Your journal and moods are only ever shown to you.
        </Note>
        <Link href="/privacy" className={rowClass}>
          <FileText className={rowIcon} aria-hidden="true" />
          <span className="min-w-0 flex-1 font-medium">Privacy policy</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/60" aria-hidden="true" />
        </Link>
        <Link href="/terms" className={rowClass}>
          <ScrollText className={rowIcon} aria-hidden="true" />
          <span className="min-w-0 flex-1 font-medium">Terms of use</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/60" aria-hidden="true" />
        </Link>
        {session && (
          <>
            {/* Plain link: same-origin, so the session cookie goes along and the browser saves the file */}
            <a href="/api/me/export" download className={rowClass}>
              <Download className={rowIcon} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">Download my data</span>
                <span className="block text-sm text-white/75">Everything Bubble keeps about you, as a file</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-white/60" aria-hidden="true" />
            </a>
            <RowButton
              icon={Trash2}
              label="Delete my account"
              detail="Removes your journal and mood history for good"
              onClick={() => openAccount('login', { action: 'delete' })}
              danger
            />
          </>
        )}
      </Section>

      <Section title="Safety">
        <Note>
          Bubble is an AI and isn't a substitute for a therapist. If you're in danger, please call 112 or tap Get help to
          reach someone right away.
        </Note>
        <RowButton icon={LifeBuoy} label="Get help" detail="Helplines you can call any time" onClick={openSos} />
        <RowButton icon={Info} label="Show the introduction again" onClick={openIntro} />
      </Section>

      <Section title="Display">
        <div className="px-4 py-3">
          <h3 className="mb-3 font-medium text-white">Scene</h3>
          <div className="grid grid-cols-4 gap-2 md:gap-3">
            {SCENES.map(({ id, name }) => (
              <button
                key={id}
                onClick={() => pickScene(id)}
                aria-pressed={selectedEnvironment === id}
                className={`group rounded-[8px] text-center ${focusRing}`}
              >
                <span
                  className={`relative mb-1.5 block h-16 overflow-hidden rounded-[8px] md:h-20 ${
                    selectedEnvironment === id ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : 'opacity-80 group-hover:opacity-100'
                  }`}
                >
                  <SceneBackdrop scene={id} still />
                </span>
                <span className={`block truncate text-xs md:text-sm ${selectedEnvironment === id ? 'font-semibold text-white' : 'text-white/80'}`}>
                  {name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <button
            onClick={() => (sceneSoundPlaying ? stop() : play(scene.id))}
            aria-pressed={sceneSoundPlaying}
            className={buttonClass({ variant: 'secondary' })}
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

        <div className="flex items-center justify-between gap-4 px-4 py-3 text-white">
          <span>
            <span id="calm-visuals-label" className="block font-medium">
              Calm visuals
            </span>
            <span id="calm-visuals-detail" className="block text-sm text-white/75">
              {deviceReducesMotion
                ? 'On, because your device asks for less motion. Change it in your device settings.'
                : 'Stops the moving scenery and bubble effects.'}
            </span>
          </span>
          {/* Switches keep their rounded shape: it's what makes them read as switches */}
          <button
            role="switch"
            aria-checked={calmVisuals}
            aria-labelledby="calm-visuals-label"
            aria-describedby="calm-visuals-detail"
            disabled={deviceReducesMotion}
            onClick={() => setMotion(calmVisuals ? 'system' : 'reduced')}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${focusRing} ${
              calmVisuals ? 'bg-[#0b6bb8]' : 'bg-white/25'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${calmVisuals ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>

        {/* The divider goes on a wrapper: a legend sits on its fieldset's top border */}
        <div className="px-4 py-3">
          <fieldset>
            <legend className="mb-2 font-medium text-white">Theme</legend>
            <div className="grid grid-cols-3 gap-1 rounded-[8px] border border-white/25 p-1">
              {THEME_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-[6px] py-2 text-center text-sm font-medium focus-within:ring-4 focus-within:ring-white/60 ${
                    theme === option.value ? 'bg-[#0b6bb8] text-white' : 'text-white/85 hover:bg-white/10'
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
            <p className="mt-2 text-sm text-white/75">Night uses darker colours for late evenings. Automatic follows your device.</p>
          </fieldset>
        </div>
      </Section>
    </div>
  );
}
