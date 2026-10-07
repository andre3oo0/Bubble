import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { DoorOpen, RotateCcw, SendHorizontal, Wind } from 'lucide-react';
import { prefersReducedMotion } from '@/lib/motion';
import { Message, Mood } from '@/models/types';
import { useChatStore } from '@/store/chatStore';
import { useMoodStore } from '@/store/moodStore';
import { useSosStore } from '@/store/sosStore';
import { useBreathing } from '@/store/breathingStore';
import { v4 as uuidv4 } from 'uuid';
import { endChat, sendChatMessage } from '@/lib/chatService';
import { chatTermsSeen, rememberChatTerms } from '@/lib/chatConsent';
import { useSession } from '@/lib/authClient';
import { formatDayAndTime } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { LEGAL_VERSION, MIN_AGE } from '@shared/legal';
import ChatDebrief from './ChatDebrief';
import BubbleAvatar from './BubbleAvatar';
import HelplineList from './HelplineList';
import PageHeader from './PageHeader';
import { buttonClass, focusRing } from './ui/controls';
import { CRISIS_REPLY, HELPLINES, detectCrisis } from '@shared/safety';

const BREATHING_OFFER_MOODS: Mood[] = ['anxious', 'stressed'];

// Ways in for someone who doesn't know how to start
const STARTERS = ["I'm feeling stressed", "I can't switch my mind off", 'I just need to vent'];

// Let Bubble's reply appear before the SOS screen covers it
const SOS_OPEN_DELAY_MS = 800;

// How long "Let go" lets the messages float away before clearing them
const LET_GO_MS = 1600;

// A time label goes above a message when this much time has passed since the last one
const TIME_GAP_MS = 10 * 60 * 1000;

// On touch keyboards Enter makes a new line and the button sends; elsewhere Enter sends
const touchKeyboard = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

function openSosForCrisis() {
  setTimeout(() => useSosStore.getState().openForCrisis(), SOS_OPEN_DELAY_MS);
}

// Bubble's own words, as opposed to the app's notices
const isBubbleVoice = (message?: Message) => message?.sender === 'bubble' && message.kind !== 'notice';

export default function ChatPanel() {
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isBreathingPromptVisible, setIsBreathingPromptVisible] = useState(false);
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const { messages, addMessage, updateMessage, clearMessages } = useChatStore();
  const { open: openBreathing } = useBreathing();
  const { open: openSos } = useSosStore();
  const { data: session } = useSession();
  // Before the first message: who Bubble is for, and what sending means. Account holders
  // agreed at sign-up; on this device it's shown until a message has been sent.
  const [termsSeen, setTermsSeen] = useState(chatTermsSeen);
  const showTermsNote = !termsSeen && session?.user.termsVersion !== LEGAL_VERSION;
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const hasConversation = messages.some((m) => m.sender === 'user');
  const { currentMood, setCurrentMood } = useMoodStore();
  const previousMoodRef = useRef<Mood>(currentMood);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view, otherwise helplines can end up below the fold
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'end' });
  }, [messages, isSending]);

  // Rising bubbles when the mood changes; no chat message, that was confusing
  useEffect(() => {
    if (previousMoodRef.current !== currentMood && !prefersReducedMotion()) {
      createMoodChangeBubbles(currentMood);
    }
    previousMoodRef.current = currentMood;
  }, [currentMood]);

  // Function to create animated bubbles when mood changes
  const createMoodChangeBubbles = (mood: Mood) => {
    // Create a container for the bubbles
    const bubbleContainer = document.createElement('div');
    bubbleContainer.className = 'fixed inset-0 pointer-events-none z-50';
    document.body.appendChild(bubbleContainer);

    // Generate a number of bubbles
    const bubbleCount = 15;
    const sizes = ['bubble-xs', 'bubble-sm', 'bubble-md', 'bubble-lg', 'bubble-xl'];
    const moodColor = getMoodColor(mood);

    for (let i = 0; i < bubbleCount; i++) {
      const bubble = document.createElement('div');
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      const left = 10 + Math.random() * 80; // Keep bubbles within the middle 80% of screen

      bubble.className = `floating-bubble ${size}`;
      bubble.style.position = 'absolute';
      bubble.style.bottom = '-50px';
      bubble.style.left = `${left}%`;
      bubble.style.opacity = '0';
      bubble.style.background = `radial-gradient(circle at 30% 35%,
        rgba(255, 255, 255, 0.8) 0%,
        ${moodColor}99 40%,
        ${moodColor}66 80%)`;

      bubbleContainer.appendChild(bubble);

      // Animate the bubble rising
      setTimeout(() => {
        bubble.style.transition = 'opacity 0.5s ease-in, transform 6s ease-out';
        bubble.style.opacity = '0.9';
        bubble.style.transform = 'translateY(-100vh) translateX(20px)';
      }, i * 100);

      // Remove the bubble after animation
      setTimeout(() => {
        bubble.style.opacity = '0';
      }, 5000 + i * 100);
    }

    // Remove the container after all animations
    setTimeout(() => {
      if (document.body.contains(bubbleContainer)) {
        document.body.removeChild(bubbleContainer);
      }
    }, 8000);
  };

  // One soft tint for every mood: the bubbles mark a change, they don't colour-code it
  const getMoodColor = (_mood: Mood): string => '#cfeaff';

  const offerBreathingOnce = () => {
    const alreadyOffered = useChatStore.getState().messages.some(m => m.kind === 'breathing-offer');
    if (alreadyOffered) return;

    setIsBreathingPromptVisible(true);
    addMessage({
      id: uuidv4(),
      content: "Would you like to try a short breathing exercise together? It can help settle your mind.",
      sender: 'bubble',
      timestamp: new Date(),
      kind: 'breathing-offer'
    });
  };

  // Sends a new message, or resends one that failed (retryId). Problems with the
  // connection are shown on your message, not put in Bubble's mouth.
  const sendMessage = async (text: string, retryId?: string) => {
    if (!text || isSending) return;

    const id = retryId ?? uuidv4();
    if (retryId) {
      updateMessage(retryId, { status: undefined, failure: undefined });
    } else {
      addMessage({ id, content: text, sender: 'user', timestamp: new Date() });
    }
    setIsSending(true);

    try {
      const response = await sendChatMessage(text);

      // The daily limit is the app talking, so it's a notice, unless there's a crisis
      if (response.limited && response.risk !== 'crisis') {
        addMessage({ id: uuidv4(), content: response.reply, sender: 'bubble', timestamp: new Date(), kind: 'notice' });
        return;
      }

      addMessage({
        id: uuidv4(),
        content: response.reply,
        sender: 'bubble',
        timestamp: new Date(),
        helplines: response.helplines
      });

      // Only a clear signal moves Bubble's mood, so a neutral reply doesn't undo a check-in
      if (response.mood !== 'neutral') {
        setCurrentMood(response.mood);
      }

      if (response.risk === 'crisis') {
        openSosForCrisis();
      } else if (BREATHING_OFFER_MOODS.includes(response.mood)) {
        offerBreathingOnce();
      }
    } catch (error) {
      console.error('Error sending message:', error instanceof Error ? error.message : error);
      const tooFast = error instanceof Error && error.message.startsWith('429');
      updateMessage(id, { status: 'failed', failure: tooFast ? 'too-fast' : 'connection' });

      // Even with no connection, a message that needs helplines gets them
      if (detectCrisis(text)) {
        addMessage({ id: uuidv4(), content: CRISIS_REPLY, sender: 'bubble', timestamp: new Date(), helplines: HELPLINES });
        openSosForCrisis();
      } else if (tooFast) {
        addMessage({
          id: uuidv4(),
          content: "You're sending messages quickly. You can send again in about a minute.",
          sender: 'bubble',
          timestamp: new Date(),
          kind: 'notice',
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = (preset?: string) => {
    const text = (preset ?? inputMessage).trim();
    if (!text || isSending || releasing) return;
    if (!preset) {
      setInputMessage('');
      if (composerRef.current) composerRef.current.style.height = '';
    }
    if (!termsSeen) {
      rememberChatTerms();
      setTermsSeen(true);
    }
    sendMessage(text);
  };

  // Grows with the text up to about six lines, then scrolls
  const resizeComposer = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  // End of the debrief: forget the chat here and on the server, then a fresh start
  const finishChat = (closing: string) => {
    endChat();
    clearMessages();
    setIsBreathingPromptVisible(false);
    addMessage({ id: uuidv4(), content: closing, sender: 'bubble', timestamp: new Date() });
  };

  const letGo = () => {
    setDebriefOpen(false);
    setReleasing(true);
    setTimeout(
      () => {
        setReleasing(false);
        finishChat("It's gone. Take a slow breath. I'm here whenever you want to talk again.");
      },
      prefersReducedMotion() ? 0 : LET_GO_MS,
    );
  };

  const saved = () => {
    setDebriefOpen(false);
    finishChat("Saved to your journal. I'm here whenever you want to talk again.");
  };

  const startBreathingExercise = () => {
    openBreathing();
    setIsBreathingPromptVisible(false);
    addMessage({
      id: uuidv4(),
      content: "Great! Let's begin a breathing exercise to help you relax. Take your time with it.",
      sender: 'bubble',
      timestamp: new Date()
    });
  };

  const declineBreathingExercise = () => {
    setIsBreathingPromptVisible(false);
    addMessage({
      id: uuidv4(),
      content: "That's okay. I'm here whenever you need to talk or try a relaxation exercise.",
      sender: 'bubble',
      timestamp: new Date()
    });
  };

  // Who Bubble is and where help is: in full before the first message, then one line
  // so the conversation gets the room
  const helpLink = (
    <button onClick={openSos} aria-haspopup="dialog" className={cn('rounded font-semibold underline underline-offset-2', focusRing.dark)}>
      Get help
    </button>
  );
  const aiNotice = hasConversation ? (
    <>Bubble is an AI and isn't a substitute for a therapist. In danger? Tap {helpLink}.</>
  ) : (
    <>
      Bubble is an AI and isn't a substitute for a therapist. If you're in danger, please tap {helpLink} to reach
      someone right away.
    </>
  );

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Chat" hideOnPhone />

      <div className="surface min-h-0 flex-1 overflow-y-auto rounded-[8px] p-3 md:p-4">
        <p className="mb-3 border-b border-white/15 pb-2.5 text-center text-xs text-white/85">{aiNotice}</p>
        {messages.length === 0 && (
          <div className="flex min-h-[70%] flex-col items-center justify-center px-2 text-center text-white">
            <p className="mb-1 text-lg font-semibold">This is your space</p>
            <p className="mb-5 max-w-sm text-white/90">
              Say whatever's on your mind, in your own words. There's no wrong way to start.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  onClick={() => handleSendMessage(starter)}
                  disabled={isSending}
                  className={buttonClass({ variant: 'secondary', size: 'sm', className: 'font-medium' })}
                >
                  {starter}
                </button>
              ))}
            </div>
            {showTermsNote && (
              <p className="mt-6 max-w-sm text-xs text-white/85">
                Bubble is for people {MIN_AGE} and over. By sending a message you agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener" className="underline underline-offset-2">
                  terms of use
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" rel="noopener" className="underline underline-offset-2">
                  privacy policy
                </a>
                , including your messages going to Bubble's AI provider in the US to get a reply. Chats aren't saved.
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col space-y-3">
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const showTime = !previous || message.timestamp.getTime() - previous.timestamp.getTime() > TIME_GAP_MS;
            const fromBubble = isBubbleVoice(message);
            // Bubble's face sits beside the last message of each of its turns
            const showAvatar = fromBubble && !isBubbleVoice(messages[index + 1]);
            return (
              <motion.div
                key={message.id}
                className="flex flex-col"
                // "Let go": each message drifts up and fades, top first
                animate={releasing ? { y: -140, opacity: 0, scale: 0.92 } : { y: 0, opacity: 1, scale: 1 }}
                transition={releasing ? { duration: 1.1, delay: Math.min(index * 0.06, 0.5), ease: 'easeIn' } : { duration: 0 }}
              >
                {showTime && <p className="mb-2 text-center text-xs text-white/80">{formatDayAndTime(message.timestamp)}</p>}
                {message.kind === 'notice' ? (
                  <p role="status" className="mx-auto max-w-[90%] text-center text-sm text-white/90">
                    {message.content}
                  </p>
                ) : (
                  <div className={`flex items-end gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {fromBubble && (
                      <span className="w-8 shrink-0" aria-hidden="true">
                        {showAvatar && <BubbleAvatar size="xs" mood="calm" />}
                      </span>
                    )}
                    <div className={`flex max-w-[85%] flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          message.sender === 'user'
                            ? 'rounded-tr-none bg-[#0b6bb8] text-white'
                            : 'rounded-tl-none bg-[#C9ECFF] text-[#0b3d66]'
                        }`}
                      >
                        <span className="whitespace-pre-wrap">{message.content}</span>

                        {message.helplines && <HelplineList lines={message.helplines} className="mt-3" />}

                        {message.kind === 'breathing-offer' && isBreathingPromptVisible && (
                          <div className="mt-2 flex gap-2">
                            <button onClick={startBreathingExercise} className={buttonClass({ tone: 'light', size: 'sm' })}>
                              Try it now
                            </button>
                            <button
                              onClick={declineBreathingExercise}
                              className={buttonClass({ tone: 'light', variant: 'secondary', size: 'sm', className: 'border-[#8CCBEB]' })}
                            >
                              No thanks
                            </button>
                          </div>
                        )}
                      </div>
                      {message.status === 'failed' && (
                        <p className="mt-1 flex items-center gap-2 text-xs text-white/90" role="alert">
                          {message.failure === 'too-fast' ? 'Not sent yet.' : 'Not sent. Check your connection.'}
                          <button
                            onClick={() => sendMessage(message.content, message.id)}
                            disabled={isSending}
                            className={buttonClass({ variant: 'secondary', size: 'sm', className: 'min-h-8 gap-1 px-2 text-xs' })}
                          >
                            <RotateCcw size={12} aria-hidden="true" />
                            Retry
                          </button>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
          {isSending && (
            <div className="flex items-end justify-start gap-2" role="status" aria-label="Bubble is typing">
              <BubbleAvatar size="xs" face="thinking" />
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-none bg-[#C9ECFF] px-4 py-3" aria-hidden="true">
                <span className="animated-typing h-1.5 w-1.5 rounded-full bg-[#0b3d66]" />
                <span className="animated-typing h-1.5 w-1.5 rounded-full bg-[#0b3d66] [animation-delay:150ms]" />
                <span className="animated-typing h-1.5 w-1.5 rounded-full bg-[#0b3d66] [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quieter than Send, so there's one obvious thing to press */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <button onClick={openBreathing} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
          <Wind size={16} aria-hidden="true" />
          Breathe
        </button>
        {hasConversation && (
          <button
            onClick={() => setDebriefOpen(true)}
            disabled={releasing || isSending}
            className={buttonClass({ variant: 'secondary', size: 'sm' })}
          >
            <DoorOpen size={16} aria-hidden="true" />
            I'm done for now
          </button>
        )}
      </div>

      <ChatDebrief open={debriefOpen} messages={messages} onClose={() => setDebriefOpen(false)} onLetGo={letGo} onSaved={saved} />

      {/* Input area. The mic button was removed: it did nothing, and browser speech
          recognition sends audio to a third-party service, which needs consent first */}
      <div className="surface mt-2 flex items-end gap-2 rounded-[8px] p-1.5 pl-3">
        <textarea
          ref={composerRef}
          rows={1}
          value={inputMessage}
          onChange={(e) => {
            setInputMessage(e.target.value);
            resizeComposer(e.target);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !touchKeyboard()) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          aria-label="Message Bubble"
          className="max-h-40 flex-1 resize-none bg-transparent py-2 leading-relaxed text-white outline-none placeholder-white/80"
          placeholder="Write to Bubble…"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim() || isSending || releasing}
          aria-label="Send message"
          className={buttonClass({ className: 'h-11 w-11 px-0 disabled:bg-white/15 disabled:text-white/70 disabled:opacity-100' })}
        >
          <SendHorizontal size={20} aria-hidden="true" />
        </button>
      </div>
      {!hasConversation && (
        <p className="mt-1 hidden text-center text-xs text-white/80 md:block">Enter to send · Shift + Enter for a new line</p>
      )}
    </div>
  );
}
