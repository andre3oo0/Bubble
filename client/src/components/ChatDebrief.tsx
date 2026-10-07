import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowLeft, BookHeart, Feather, Sparkles, X } from 'lucide-react';
import type { ReflectionResponse } from '@shared/chat';
import { HELPLINES, detectCrisis } from '@shared/safety';
import type { Message } from '@/models/types';
import { reflectOnChat } from '@/lib/chatService';
import { createJournalEntry, queryKeys } from '@/lib/api';
import { useSession } from '@/lib/authClient';
import { cn } from '@/lib/utils';
import { useAccountDialog } from '@/store/accountStore';
import { useMoodStore } from '@/store/moodStore';
import { useToast } from '@/hooks/use-toast';
import HelplineList from './HelplineList';
import { buttonClass, darkSheetClass, fieldClass, focusRing, iconButtonClass, labelClass, noticeClass } from './ui/controls';

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

const primaryButton = buttonClass({ className: 'w-full' });
const secondaryButton = buttonClass({ variant: 'secondary', className: 'w-full' });
const backButton = buttonClass({ variant: 'tertiary', size: 'sm', className: 'self-center' });

function Choice({ icon, title, text, note, onClick }: { icon: ReactNode; title: string; text: string; note?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn('flex w-full items-start gap-3 rounded-[8px] px-2 py-4 text-left hover:bg-white/10 focus:outline-none', focusRing.dark)}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-white/90">{text}</span>
        {note && <span className="mt-1 block text-sm font-medium text-[#9fd3f5]">{note}</span>}
      </span>
    </button>
  );
}

// The summary and the thing to take away, shown before saving and on its own
function ReflectionText({ reflection }: { reflection: ReflectionResponse }) {
  return (
    <>
      <p className="leading-relaxed">{reflection.summary}</p>
      <div className="border-l-2 border-white/60 pl-4">
        <p className="mb-1 text-sm font-semibold text-white/85">Something to take with you</p>
        <p className="leading-relaxed">{reflection.takeaway}</p>
      </div>
    </>
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

  const helplines = reflection?.helplines && <HelplineList lines={reflection.helplines} tone="dark" />;
  const back = () => setStep(wantsToSave ? 'choose' : 'reflection');

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#06101f]/60" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={`fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-[8px] p-6 focus:outline-none ${darkSheetClass}`}
        >
          <DialogPrimitive.Close className={iconButtonClass('dark', 'absolute right-2 top-2')} aria-label="Back to the chat">
            <X size={20} aria-hidden="true" />
          </DialogPrimitive.Close>

          {step === 'choose' && (
            <>
              <div className="pr-10">
                <DialogPrimitive.Title className="text-2xl font-semibold">Before you go</DialogPrimitive.Title>
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
                  note={session ? undefined : 'Needs a free account'}
                  onClick={() => reflect(true)}
                />
              </div>
            </>
          )}

          {step === 'loading' && (
            <div className="py-10 text-center" role="status">
              <DialogPrimitive.Title className="sr-only">Reflecting on your chat</DialogPrimitive.Title>
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
              <p>Bubble is thinking back over your chat.</p>
              <p className="mt-1 text-sm text-white/80">This can take up to half a minute.</p>
            </div>
          )}

          {step === 'reflection' && reflection && (
            <>
              <div className="pr-10">
                <DialogPrimitive.Title className="text-2xl font-semibold">{reflection.title}</DialogPrimitive.Title>
              </div>
              <ReflectionText reflection={reflection} />
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
                <button onClick={onClose} className={backButton}>
                  Back to the chat
                </button>
              </div>
            </>
          )}

          {step === 'save' && reflection && (
            <>
              <div className="pr-10">
                <DialogPrimitive.Title className="text-2xl font-semibold">Save to your journal</DialogPrimitive.Title>
              </div>

              {session ? (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (title.trim() && content.trim()) save.mutate();
                  }}
                >
                  <div>
                    <label htmlFor="debrief-title" className={labelClass.dark}>
                      Title
                    </label>
                    <input id="debrief-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required className={fieldClass.dark} />
                  </div>
                  <div>
                    <label htmlFor="debrief-entry" className={labelClass.dark}>
                      Entry
                    </label>
                    <textarea
                      id="debrief-entry"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={7}
                      maxLength={20000}
                      required
                      className={`${fieldClass.dark} resize-y leading-relaxed`}
                    />
                  </div>
                  {helplines}
                  {save.isError && (
                    <p role="alert" className={noticeClass.error}>
                      Couldn't save it just now. Your reflection is still here, please try again.
                    </p>
                  )}
                  <button type="submit" disabled={save.isPending} className={primaryButton}>
                    <BookHeart size={18} aria-hidden="true" />
                    {save.isPending ? 'Saving…' : 'Save to journal'}
                  </button>
                  <button type="button" onClick={back} className={backButton}>
                    <ArrowLeft size={16} aria-hidden="true" />
                    Back
                  </button>
                </form>
              ) : (
                <>
                  {/* Show what they'd be keeping before asking for an account */}
                  <ReflectionText reflection={reflection} />
                  {helplines}
                  <p className="border-t border-white/15 pt-4 text-sm leading-relaxed text-white/90">
                    Your journal is private and saved to your account, so you'll need a free account to keep this. It only
                    takes a moment, and this reflection will be waiting here.
                  </p>
                  <button onClick={() => openAccount('register', { allowGoogle: false })} className={primaryButton}>
                    Sign in or create a free account
                  </button>
                  <button onClick={back} className={backButton}>
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
