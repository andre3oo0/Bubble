import { useEffect, useState, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Book, LifeBuoy, Mail, MessageCircle, Palette, BarChart3, Wind } from 'lucide-react';
import BubbleAvatar from './BubbleAvatar';
import { useIntroStore } from '@/store/introStore';
import { helpButtonClass } from './SosScreen';
import { cn } from '@/lib/utils';
import { useSosStore } from '@/store/sosStore';
import { useAccountDialog } from '@/store/accountStore';
import { useSession } from '@/lib/authClient';
import GoogleButton, { useGoogleSignIn } from './GoogleButton';
import { buttonClass, darkSheetClass } from './ui/controls';

interface IntroTourProps {
  onStartChat: () => void;
}

interface Step {
  title: string;
  body: ReactNode;
}

const FEATURES = [
  { icon: MessageCircle, name: 'Chat', text: 'Talk things through with Bubble, any time of day.' },
  { icon: Wind, name: 'Breathe', text: 'A guided breathing exercise to slow things down.' },
  { icon: Book, name: 'Journal', text: 'Write your thoughts down and come back to them.' },
  { icon: BarChart3, name: 'Mood', text: "Check in with yourself and look back on how you've felt." },
  { icon: Palette, name: 'Scenes', text: 'Choose a calming scene and sound in Settings.' },
];

const ABOUT_BUBBLE =
  "A calm place to talk when your head feels busy. Tell me what's on your mind and I'll listen, help you untangle it, and find a small next step with you.";

// The first page is the welcome (below); these follow it
const STEPS: Step[] = [
  {
    title: 'What you can do here',
    body: (
      <ul className="space-y-3 text-left">
        {FEATURES.map(({ icon: Icon, name, text }) => (
          <li key={name} className="flex items-start gap-3">
            <Icon size={20} className="mt-0.5 shrink-0 text-[#9fd3f5]" aria-hidden="true" />
            <span>
              <span className="block font-semibold">{name}</span>
              <span className="block text-sm text-white/90">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: 'Here to listen',
    body: (
      <>
        <p>
          Bubble is an AI, so it can't diagnose anything or give medical advice. But it's always here to listen, and if
          things ever feel too heavy, real people are one tap away.
        </p>
        <div className="mt-4 flex items-center gap-3 border-t border-white/15 pt-4 text-left text-sm">
          <span className={cn(helpButtonClass, 'pointer-events-none')}>
            <LifeBuoy size={16} aria-hidden="true" />
            Get help
          </span>
          <span>It's on every screen, for South African helplines open 24 hours.</span>
        </div>
      </>
    ),
  },
  {
    title: 'Your privacy',
    body: (
      <ul className="divide-y divide-white/15 text-left">
        <li className="pb-3">Chats aren't saved. Bubble only keeps your last few messages for an hour so it can follow along.</li>
        <li className="py-3">Your journal and moods are saved only if you make a free account, and only you can see them.</li>
        <li className="pt-3">You can download or delete everything from your account at any time.</li>
      </ul>
    ),
  },
];

export default function IntroTour({ onStartChat }: IntroTourProps) {
  const { seen, isOpen, open, pause, finish } = useIntroStore();
  const { open: openSos } = useSosStore();
  const { isOpen: accountOpen, open: openAccount } = useAccountDialog();
  const { data: session, isPending: sessionPending } = useSession();
  const googleEnabled = useGoogleSignIn();
  const [step, setStep] = useState(0);

  // First visit on this device; also picks up again after "Continue with email" or
  // a trip to Google, since neither counts as having seen it
  useEffect(() => {
    if (!seen && !accountOpen) open();
  }, [seen, accountOpen, open]);

  const signedOut = !session && !sessionPending;
  // Sign-in comes first, but is optional: "Not now" carries on with the tour
  const welcome: Step = session
    ? { title: `Hi ${session.user.name.split(' ')[0]}, I'm Bubble`, body: <p>{ABOUT_BUBBLE}</p> }
    : {
        title: 'Welcome to Bubble',
        body: (
          <p>
            A calm place to talk when your head feels busy. You can start right away, or make a free account to keep a
            journal and see how your moods change.
          </p>
        ),
      };
  const steps = [welcome, ...STEPS];

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  const last = step === steps.length - 1;
  const go = (next: number) => setStep(next);

  const footer =
    step === 0 && signedOut ? (
      // The three ways in, together and in order of how much they keep
      <div className="flex flex-col gap-3">
        {googleEnabled && <GoogleButton />}
        <button
          onClick={() => {
            pause();
            openAccount('register');
          }}
          className={buttonClass({ variant: 'secondary', className: 'min-h-12 w-full' })}
        >
          <Mail size={18} aria-hidden="true" />
          Continue with email
        </button>
        <button onClick={() => go(1)} className={buttonClass({ variant: 'secondary', className: 'min-h-12 w-full' })}>
          Not now, show me around
        </button>
      </div>
    ) : last ? (
      <div className="flex flex-col gap-3">
        <button
          onClick={() => {
            finish();
            onStartChat();
          }}
          className={buttonClass({ className: 'min-h-12 w-full' })}
        >
          <MessageCircle size={18} aria-hidden="true" />
          Start chatting
        </button>
        <button onClick={finish} className={buttonClass({ variant: 'secondary', className: 'min-h-12 w-full' })}>
          Look around first
        </button>
      </div>
    ) : (
      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => go(step - 1)} className={buttonClass({ variant: 'secondary', className: 'min-h-12 flex-1' })}>
            <ArrowLeft size={18} aria-hidden="true" />
            Back
          </button>
        )}
        <button onClick={() => go(step + 1)} className={buttonClass({ className: 'min-h-12 flex-1' })}>
          Next
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    );

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(value) => !value && finish()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#06101f]/60" />
        <DialogPrimitive.Content
          aria-describedby="intro-body"
          className={`fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-[8px] p-6 focus:outline-none ${darkSheetClass}`}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' && !last) go(step + 1);
            if (e.key === 'ArrowLeft' && step > 0) go(step - 1);
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-white/80">
              {step + 1} of {steps.length}
            </span>
            <div className="flex items-center gap-2">
              {/* The intro covers the header, so help stays one tap away here too */}
              <button
                onClick={() => {
                  finish();
                  openSos();
                }}
                className={cn(helpButtonClass, 'py-1')}
              >
                <LifeBuoy size={15} aria-hidden="true" />
                Get help
              </button>
              <button onClick={finish} className={buttonClass({ variant: 'tertiary', size: 'sm' })}>
                Skip
              </button>
            </div>
          </div>

          <div className="mx-auto mb-2 flex h-28 items-center justify-center" aria-hidden="true">
            <BubbleAvatar size="md" mood={step === 2 ? 'calm' : 'happy'} />
          </div>

          {/* A steady height, so Back and Next don't jump between the later steps */}
          <div className={cn('text-center', step > 0 && 'min-h-[19rem]')}>
            <DialogPrimitive.Title className="mb-3 text-2xl font-semibold">{steps[step].title}</DialogPrimitive.Title>
            <div id="intro-body" className="text-base leading-relaxed">
              {steps[step].body}
            </div>
          </div>

          <div className="mt-4">{footer}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
