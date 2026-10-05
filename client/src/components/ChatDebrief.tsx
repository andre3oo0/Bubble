import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowLeft, BookHeart, Feather, Phone, Sparkles, X } from 'lucide-react';
import type { ReflectionResponse } from '@shared/chat';
import { HELPLINES, detectCrisis } from '@shared/safety';
import type { Message } from '@/models/types';
import { reflectOnChat } from '@/lib/chatService';
import { createJournalEntry, queryKeys } from '@/lib/api';
import { useSession } from '@/lib/authClient';
import { useAccountDialog } from '@/store/accountStore';
import { useMoodStore } from '@/store/moodStore';
import { useToast } from '@/hooks/use-toast';

type Step = 'choose' | 'loading' | 'reflection' | 'save';

interface ChatDebriefProps {
  open: boolean;
  messages: Message[];
  onClose: () => void;
  onLetGo: () => void;
  onSaved: () => void;
}

// Same as the server's fallback, for when the request itself fails (offline)
function offlineReflection(messages: Message[]): ReflectionResponse {
  const crisis = messages.some((m) => m.sender === 'user' && detectCrisis(m.content));
  return {
    title: 'Talking it through',
    summary: "You took some time to talk through what's on your mind. That's worth doing, even when it's hard.",
    takeaway: "What's one thing from this chat you'd like to remember?",
    fallback: true,
    ...(crisis ? { helplines: HELPLINES } : {}),
  };
}

const primaryButton =
  'flex w-full items-center justify-center gap-2 rounded-full bg-[#0b6bb8] px-5 py-3 font-semibold text-white hover:bg-[#095a9c] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 disabled:opacity-70';
const secondaryButton =
  'flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-white surface-soft surface-soft-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 disabled:opacity-70';
const fieldClass =
  'w-full rounded-2xl border border-white/20 bg-white/10 p-3 text-white placeholder-white/70 focus:outline-none focus:ring-4 focus:ring-white/40';

function Choice({ icon, title, text, onClick }: { icon: ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl px-2 py-4 text-left hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-white/90">{text}</span>
      </span>
    </button>
  );
}

export default function ChatDebrief({ open, messages, onClose, onLetGo, onSaved }: ChatDebriefProps) {
  const [step, setStep] = useState<Step>('choose');
  const [wantsToSave, setWantsToSave] = useState(false);
  const [reflection, setReflection] = useState<ReflectionResponse | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { data: session } = useSession();
  const { open: openAccount } = useAccountDialog();
  const { currentMood } = useMoodStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // A new chat gets a new reflection
  useEffect(() => {
    if (open) {
      setStep('choose');
      setReflection(null);
    }
  }, [open]);

  const showReflection = (result: ReflectionResponse, save: boolean) => {
    setReflection(result);
    setTitle(result.title);
    setContent(`${result.summary}\n\nSomething to take with me: ${result.takeaway}`);
    setStep(save ? 'save' : 'reflection');
  };

  const reflect = async (save: boolean) => {
    setWantsToSave(save);
    if (reflection) return showReflection(reflection, save);
    setStep('loading');
    try {
      showReflection(await reflectOnChat(messages), save);
    } catch {
      showReflection(offlineReflection(messages), save);
    }
  };

  const save = useMutation({
    mutationFn: () => createJournalEntry({ title: title.trim(), content: content.trim(), mood: currentMood }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journal });
      toast({ title: 'Saved to your journal', description: 'Only you can see it.' });
      onSaved();
    },
  });

  const helplines = reflection?.helplines && (
    <div className="space-y-2">
      {reflection.helplines.map((line) => (
        <a
          key={line.phone}
          href={`tel:${line.phone.replace(/\s/g, '')}`}
          className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-gray-900"
        >
          <Phone className="h-5 w-5 shrink-0 text-[#0b5394]" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{line.name}</span>
            <span className="block text-xs text-gray-600">{line.hours}</span>
          </span>
          <span className="whitespace-nowrap font-bold text-[#0b5394]">{line.phone}</span>
        </a>
      ))}
    </div>
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#06101f]/45" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="surface fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-3xl p-6 text-white focus:outline-none"
        >
          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-full p-1 text-white/80 hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
            aria-label="Back to the chat"
          >
            <X size={20} aria-hidden="true" />
          </DialogPrimitive.Close>

          {step === 'choose' && (
            <>
              <div className="pr-8">
                <DialogPrimitive.Title className="text-2xl font-semibold tracking-tight">Before you go</DialogPrimitive.Title>
                <p className="mt-1 text-white/90">How would you like to leave this conversation?</p>
              </div>
              {/* Plain rows with dividers, not boxes inside the box */}
              <div className="-mx-2 divide-y divide-white/15">
                <Choice
                  icon={<Feather size={20} aria-hidden="true" />}
                  title="Let go"
                  text="Release it. The conversation floats away and isn't kept anywhere."
                  onClick={onLetGo}
                />
                <Choice
                  icon={<Sparkles size={20} aria-hidden="true" />}
                  title="Reflect"
                  text="Bubble sums up what you talked about, with one thing to take with you."
                  onClick={() => reflect(false)}
                />
                <Choice
                  icon={<BookHeart size={20} aria-hidden="true" />}
                  title="Save to journal"
                  text="Keep a short reflection in your private journal. You can edit it first."
                  onClick={() => reflect(true)}
                />
              </div>
            </>
          )}

          {step === 'loading' && (
            <div className="py-10 text-center" role="status">
              <DialogPrimitive.Title className="sr-only">Reflecting on your chat</DialogPrimitive.Title>
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
              <p>Bubble is thinking back over your chat…</p>
            </div>
          )}

          {step === 'reflection' && reflection && (
            <>
              <div className="pr-8">
                <DialogPrimitive.Title className="text-2xl font-semibold tracking-tight">{reflection.title}</DialogPrimitive.Title>
              </div>
              <p className="leading-relaxed">{reflection.summary}</p>
              <div className="border-l-2 border-white/60 pl-4">
                <p className="mb-1 text-sm font-semibold text-white/85">Something to take with you</p>
                <p className="leading-relaxed">{reflection.takeaway}</p>
              </div>
              {helplines}
              <div className="flex flex-col gap-3">
                <button onClick={() => setStep('save')} className={primaryButton}>
                  <BookHeart size={18} aria-hidden="true" />
                  Save to journal
                </button>
                <button onClick={onLetGo} className={secondaryButton}>
                  <Feather size={18} aria-hidden="true" />
                  Let go
                </button>
                <button onClick={onClose} className="py-2 text-sm font-medium text-white/90 underline underline-offset-4">
                  Back to the chat
                </button>
              </div>
            </>
          )}

          {step === 'save' && reflection && (
            <>
              <div className="pr-8">
                <DialogPrimitive.Title className="text-2xl font-semibold tracking-tight">Save to your journal</DialogPrimitive.Title>
              </div>

              {session ? (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (title.trim() && content.trim()) save.mutate();
                  }}
                >
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Title</span>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required className={fieldClass} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Entry</span>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={7}
                      maxLength={20000}
                      required
                      className={`${fieldClass} resize-y leading-relaxed`}
                    />
                  </label>
                  {helplines}
                  {save.isError && (
                    <p role="alert" className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">
                      Couldn't save it just now. Please try again.
                    </p>
                  )}
                  <button type="submit" disabled={save.isPending} className={primaryButton}>
                    <BookHeart size={18} aria-hidden="true" />
                    {save.isPending ? 'Saving…' : 'Save to journal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(wantsToSave ? 'choose' : 'reflection')}
                    className="flex items-center justify-center gap-1 py-2 text-sm font-medium text-white/90 underline underline-offset-4"
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                    Back
                  </button>
                </form>
              ) : (
                <>
                  <p className="leading-relaxed">
                    Your journal is private and saved to your account, so you'll need a free account to keep this. It only
                    takes a moment, and your reflection will be waiting here.
                  </p>
                  {helplines}
                  <button onClick={openAccount} className={primaryButton}>
                    Sign in or create a free account
                  </button>
                  <button
                    onClick={() => setStep(wantsToSave ? 'choose' : 'reflection')}
                    className="flex items-center justify-center gap-1 py-2 text-sm font-medium text-white/90 underline underline-offset-4"
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                    Back
                  </button>
                </>
              )}
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
