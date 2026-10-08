import { useState, type ReactNode } from 'react';
import { Anchor, ChevronRight, Cloud, Sun, UserRound, Wind, type LucideIcon } from 'lucide-react';
import { GROUNDING_STEPS, KIND_WORDS, MIRROR_STEPS, THOUGHT_LINES } from '@/lib/calmKit';
import { cn } from '@/lib/utils';
import { useBreathing } from '@/store/breathingStore';
import PageHeader from './PageHeader';
import { buttonClass, focusRing } from './ui/controls';

export type CalmKitView = 'list' | 'grounding' | 'thoughts' | 'kind' | 'mirror';
type View = CalmKitView;

const TOOLS: { view: Exclude<View, 'list'> | 'breathe'; icon: LucideIcon; label: string; detail: string }[] = [
  { view: 'breathe', icon: Wind, label: 'Breathe', detail: 'A minute of slow breathing' },
  { view: 'grounding', icon: Anchor, label: 'Ground yourself', detail: '5-4-3-2-1, one sense at a time' },
  { view: 'thoughts', icon: Cloud, label: "When your thoughts won't stop", detail: 'Ways to step out of overthinking' },
  { view: 'kind', icon: Sun, label: 'Kind words', detail: 'Something gentle to hear' },
  { view: 'mirror', icon: UserRound, label: 'Mirror moment', detail: 'Talk to yourself like a friend would' },
];

const TITLES: Record<Exclude<View, 'list'>, string> = {
  grounding: 'Ground yourself',
  thoughts: 'Overthinking',
  kind: 'Kind words',
  mirror: 'Mirror moment',
};

// The emotional first-aid kit: grounding, breathing, lines for overthinking and kind
// words in one place. Plain content, nothing fetched, so it works offline.
export default function CalmKitPanel({ start = 'list', onTalk }: { start?: View; onTalk: () => void }) {
  const [view, setView] = useState<View>(start);
  const { open: openBreathing } = useBreathing();

  if (view === 'list') {
    return (
      <div className="flex flex-col pb-2">
        <PageHeader title="Calm kit" focusKey="list" />
        <p className="mb-4 text-white/90">Things that help in a hard moment. They work without a connection.</p>

        <ul className="surface divide-y divide-white/10 overflow-hidden rounded-[8px]">
          {TOOLS.map(({ view: target, icon: Icon, label, detail }) => (
            <li key={target}>
              <button
                onClick={() => (target === 'breathe' ? openBreathing() : setView(target))}
                aria-haspopup={target === 'breathe' ? 'dialog' : undefined}
                className={cn('flex w-full items-center gap-3 px-4 py-3.5 text-left text-white hover:bg-white/10 focus-visible:ring-inset', focusRing.dark)}
              >
                <Icon className="h-5 w-5 shrink-0 text-[#9fd3f5]" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{label}</span>
                  <span className="block text-sm text-white/75">{detail}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/60" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-sm text-white/85">
          Still finding it hard?{' '}
          <button onClick={onTalk} className={cn('rounded font-semibold text-white underline underline-offset-4', focusRing.dark)}>
            Talk to Bubble
          </button>
          , or tap Get help to reach someone right away.
        </p>
      </div>
    );
  }

  const back = () => setView('list');
  return (
    <div className="flex flex-col pb-2">
      <PageHeader title={TITLES[view]} onBack={back} backLabel="Back to the calm kit" focusKey={view} />
      {view === 'grounding' && <Grounding onDone={back} onTalk={onTalk} />}
      {view === 'thoughts' && <Thoughts />}
      {view === 'kind' && <KindWords />}
      {view === 'mirror' && <Mirror onDone={back} onTalk={onTalk} />}
    </div>
  );
}

// One frosted panel holding the words, with the buttons underneath it
function Card({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  return (
    <>
      <div className="surface flex min-h-[200px] flex-col justify-center rounded-[8px] px-5 py-6 text-white" aria-live="polite">
        {children}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{footer}</div>
    </>
  );
}

function Finished({ text, onRestart, onDone, onTalk }: { text: string; onRestart: () => void; onDone: () => void; onTalk: () => void }) {
  return (
    <Card
      footer={
        <>
          <button onClick={onDone} className={buttonClass()}>
            Back to the calm kit
          </button>
          <button onClick={onTalk} className={buttonClass({ variant: 'secondary' })}>
            Talk to Bubble
          </button>
          <button onClick={onRestart} className={buttonClass({ variant: 'tertiary' })}>
            Start again
          </button>
        </>
      }
    >
      <p className="text-xl font-semibold leading-snug">{text}</p>
    </Card>
  );
}

// Steps through a list, with Back and Next, then a closing message
function useSteps(count: number) {
  const [step, setStep] = useState(0);
  return {
    step,
    done: step >= count,
    next: () => setStep((s) => s + 1),
    previous: () => setStep((s) => Math.max(0, s - 1)),
    restart: () => setStep(0),
  };
}

function StepButtons({ step, count, onPrevious, onNext }: { step: number; count: number; onPrevious: () => void; onNext: () => void }) {
  return (
    <div className="flex w-full gap-3">
      {step > 0 && (
        <button onClick={onPrevious} className={buttonClass({ variant: 'secondary', className: 'flex-1' })}>
          Back
        </button>
      )}
      <button onClick={onNext} className={buttonClass({ className: 'flex-1' })}>
        {step === count - 1 ? 'Done' : 'Next'}
      </button>
    </div>
  );
}

function Grounding({ onDone, onTalk }: { onDone: () => void; onTalk: () => void }) {
  const { step, done, next, previous, restart } = useSteps(GROUNDING_STEPS.length);

  if (done) {
    return (
      <Finished
        text="Well done. Take a moment to notice how you feel now, compared with when you started."
        onRestart={restart}
        onDone={onDone}
        onTalk={onTalk}
      />
    );
  }

  const { prompt, hint } = GROUNDING_STEPS[step];
  return (
    <>
      <p className="mb-4 text-white/90">Take your time with each one. There's no wrong answer.</p>
      <Card footer={<StepButtons step={step} count={GROUNDING_STEPS.length} onPrevious={previous} onNext={next} />}>
        <p className="text-sm font-medium text-white/80">
          Step {step + 1} of {GROUNDING_STEPS.length}
        </p>
        <p className="mt-2 text-2xl font-semibold leading-snug">{prompt}</p>
        <p className="mt-3 leading-relaxed text-white/90">{hint}</p>
      </Card>
    </>
  );
}

function Thoughts() {
  const [index, setIndex] = useState(0);
  const { text, tryThis } = THOUGHT_LINES[index];

  return (
    <Card
      footer={
        <button onClick={() => setIndex((i) => (i + 1) % THOUGHT_LINES.length)} className={buttonClass()}>
          Another one
        </button>
      }
    >
      <p className="text-xl font-semibold leading-snug">{text}</p>
      {tryThis && (
        <p className="mt-4 border-t border-white/15 pt-4 leading-relaxed text-white/90">
          <span className="font-semibold text-white">Try this: </span>
          {tryThis}
        </p>
      )}
    </Card>
  );
}

function KindWords() {
  // Start somewhere different each time, then go round in order so nothing repeats
  const [index, setIndex] = useState(() => Math.floor(Math.random() * KIND_WORDS.length));

  return (
    <>
      <p className="mb-4 text-white/90">Read it slowly, or say it to yourself.</p>
      <Card
        footer={
          <button onClick={() => setIndex((i) => (i + 1) % KIND_WORDS.length)} className={buttonClass()}>
            Another one
          </button>
        }
      >
        <p className="text-2xl font-semibold leading-snug">{KIND_WORDS[index]}</p>
      </Card>
    </>
  );
}

function Mirror({ onDone, onTalk }: { onDone: () => void; onTalk: () => void }) {
  // The last step is the closing message
  const steps = MIRROR_STEPS.length - 1;
  const { step, done, next, previous, restart } = useSteps(steps);

  if (done) {
    return <Finished text={MIRROR_STEPS[steps]} onRestart={restart} onDone={onDone} onTalk={onTalk} />;
  }

  return (
    <Card footer={<StepButtons step={step} count={steps} onPrevious={previous} onNext={next} />}>
      <p className="text-sm font-medium text-white/80">
        Step {step + 1} of {steps}
      </p>
      <p className="mt-2 text-xl font-semibold leading-snug">{MIRROR_STEPS[step]}</p>
    </Card>
  );
}
