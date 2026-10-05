import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Book, LifeBuoy, Lock, MessageCircle, Palette, BarChart3, Wind } from 'lucide-react';
import BubbleAvatar from './BubbleAvatar';
import { useIntroStore } from '@/store/introStore';
import { useSosStore } from '@/store/sosStore';

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
  { icon: BarChart3, name: 'Mood', text: 'Check in with yourself and see how your week is going.' },
  { icon: Palette, name: 'Scenes', text: 'Choose a calming scene and sound in Settings.' },
];

const STEPS: Step[] = [
  {
    title: "Hi, I'm Bubble",
    body: (
      <p>
        A calm place to talk when your head feels busy. Tell me what's on your mind and I'll listen, help you untangle
        it, and find a small next step with you.
      </p>
    ),
  },
  {
    title: 'What you can do here',
    body: (
      <ul className="space-y-3 text-left">
        {FEATURES.map(({ icon: Icon, name, text }) => (
          <li key={name} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full surface-soft">
              <Icon size={18} aria-hidden="true" />
            </span>
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
    title: 'A companion, not a therapist',
    body: (
      <>
        <p>
          Bubble can't diagnose anything or give medical advice. If things feel too heavy, or you're not safe, help is
          one tap away.
        </p>
        <div className="mt-4 flex items-center gap-3 rounded-2xl p-3 text-left text-sm surface-soft">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-bold text-[#b42318]">
            <LifeBuoy size={16} aria-hidden="true" />
            SOS
          </span>
          <span>Tap this at the top of any screen for South African helplines, open 24 hours.</span>
        </div>
      </>
    ),
  },
  {
    title: 'Your privacy',
    body: (
      <ul className="space-y-3 text-left">
        <li className="flex items-start gap-3">
          <Lock size={18} className="mt-1 shrink-0" aria-hidden="true" />
          <span>Chats aren't saved. Bubble only keeps your last few messages for an hour so it can follow along.</span>
        </li>
        <li className="flex items-start gap-3">
          <Lock size={18} className="mt-1 shrink-0" aria-hidden="true" />
          <span>Your journal and moods are saved only if you make a free account, and only you can see them.</span>
        </li>
        <li className="flex items-start gap-3">
          <Lock size={18} className="mt-1 shrink-0" aria-hidden="true" />
          <span>You can download or delete everything from your account at any time.</span>
        </li>
      </ul>
    ),
  },
];

const buttonBase =
  'flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60';

export default function IntroTour({ onStartChat }: IntroTourProps) {
  const { seen, isOpen, open, finish } = useIntroStore();
  const { open: openSos } = useSosStore();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // First visit on this device
  useEffect(() => {
    if (!seen) open();
  }, [seen, open]);

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  const last = step === STEPS.length - 1;
  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(value) => !value && finish()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#06101f]/45" />
        <DialogPrimitive.Content
          aria-describedby="intro-body"
          className="surface fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-3xl p-6 text-white focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' && !last) go(step + 1);
            if (e.key === 'ArrowLeft' && step > 0) go(step - 1);
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-white/80">
              {step + 1} of {STEPS.length}
            </span>
            <div className="flex items-center gap-2">
              {/* The intro covers the header, so help stays one tap away here too */}
              <button
                onClick={() => {
                  finish();
                  openSos();
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-bold text-[#b42318] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              >
                <LifeBuoy size={15} aria-hidden="true" />
                SOS
              </button>
              <button
                onClick={finish}
                className="rounded-full px-3 py-1 text-sm font-medium text-white/90 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              >
                Skip
              </button>
            </div>
          </div>

          <div className="mx-auto mb-2 flex h-28 items-center justify-center" aria-hidden="true">
            <div className="scale-[0.7]">
              <BubbleAvatar size="md" animate={true} mood={step === 2 ? 'calm' : 'happy'} />
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -24 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <DialogPrimitive.Title className="mb-3 text-2xl font-semibold tracking-tight">
                {STEPS[step].title}
              </DialogPrimitive.Title>
              <div id="intro-body" className="text-base leading-relaxed">
                {STEPS[step].body}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex justify-center gap-2" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-white' : 'w-2 bg-white/40'}`} />
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {last ? (
              <>
                <button
                  onClick={() => {
                    finish();
                    onStartChat();
                  }}
                  className={`${buttonBase} bg-[#0b6bb8] text-white hover:bg-[#095a9c]`}
                >
                  <MessageCircle size={18} aria-hidden="true" />
                  Start chatting
                </button>
                <button onClick={finish} className={`${buttonBase} surface-soft surface-soft-hover text-white`}>
                  Look around first
                </button>
              </>
            ) : (
              <div className="flex gap-3">
                {step > 0 && (
                  <button
                    onClick={() => go(step - 1)}
                    className={`${buttonBase} surface-soft surface-soft-hover flex-1 text-white`}
                  >
                    <ArrowLeft size={18} aria-hidden="true" />
                    Back
                  </button>
                )}
                <button
                  onClick={() => go(step + 1)}
                  className={`${buttonBase} flex-1 bg-[#0b6bb8] text-white hover:bg-[#095a9c]`}
                >
                  Next
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
