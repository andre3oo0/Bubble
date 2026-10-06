import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { DoorOpen, Phone, RotateCcw, SendHorizontal, Wind } from 'lucide-react';
import { prefersReducedMotion } from '@/lib/motion';
import { Message, Mood } from '@/models/types';
import { useChatStore } from '@/store/chatStore';
import { useMoodStore } from '@/store/moodStore';
import { useSosStore } from '@/store/sosStore';
import { v4 as uuidv4 } from 'uuid';
import { endChat, sendChatMessage } from '@/lib/chatService';
import ChatDebrief from './ChatDebrief';
import { CRISIS_REPLY, HELPLINES, detectCrisis } from '@shared/safety';

interface ChatPanelProps {
  setIsTyping: (typing: boolean) => void;
  showBreathingExercise: boolean;
  setShowBreathingExercise: (show: boolean) => void;
}

const BREATHING_OFFER_MOODS: Mood[] = ['anxious', 'stressed'];

// Ways in for someone who doesn't know how to start
const STARTERS = ["I'm feeling stressed", "I can't switch my mind off", 'I just need to vent'];

// Let Bubble's reply appear before the SOS screen covers it
const SOS_OPEN_DELAY_MS = 800;

// How long "Let go" lets the messages float away before clearing them
const LET_GO_MS = 1600;

// A time label goes above a message when this much time has passed since the last one
const TIME_GAP_MS = 10 * 60 * 1000;

function timeLabel(date: Date) {
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return `Today, ${time}`;
  return `${date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`;
}

// On touch keyboards Enter makes a new line and the button sends; elsewhere Enter sends
const touchKeyboard = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

function openSosForCrisis() {
  setTimeout(() => useSosStore.getState().openForCrisis(), SOS_OPEN_DELAY_MS);
}

export default function ChatPanel({
  setIsTyping,
  showBreathingExercise,
  setShowBreathingExercise
}: ChatPanelProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isBreathingPromptVisible, setIsBreathingPromptVisible] = useState(false);
  const [debriefOpen, setDebriefOpen] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const { messages, addMessage, updateMessage, clearMessages } = useChatStore();
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
    setIsTyping(true);

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
      setIsTyping(false);
    }
  };

  const handleSendMessage = (preset?: string) => {
    const text = (preset ?? inputMessage).trim();
    if (!text || isSending || releasing) return;
    if (!preset) {
      setInputMessage('');
      if (composerRef.current) composerRef.current.style.height = '';
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

  // Function to start breathing exercise
  const startBreathingExercise = () => {
    setShowBreathingExercise(true);
    setIsBreathingPromptVisible(false);

    // Add confirmation message
    const confirmationMessage: Message = {
      id: uuidv4(),
      content: "Great! Let's begin a breathing exercise to help you relax. Take your time with it.",
      sender: 'bubble',
      timestamp: new Date()
    };

    addMessage(confirmationMessage);
  };

  // Function to decline breathing exercise
  const declineBreathingExercise = () => {
    setIsBreathingPromptVisible(false);

    // Add acknowledgment message
    const acknowledgmentMessage: Message = {
      id: uuidv4(),
      content: "That's okay. I'm here whenever you need to talk or try a relaxation exercise.",
      sender: 'bubble',
      timestamp: new Date()
    };

    addMessage(acknowledgmentMessage);
  };

  return (
    <motion.div
      className="h-full flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-white text-2xl md:text-3xl font-semibold tracking-tight mb-4 text-center">Chat</h1>

      {/* Breathing Exercise is now handled by the parent component */}

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto mb-4 surface rounded-3xl p-4">
        <p className="mb-4 border-b border-white/15 pb-3 text-center text-xs text-white/85">
          Bubble is an AI and isn't a substitute for a therapist. If you're in danger, please tap Get help at the top to
          reach someone right away.
        </p>
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
                  className="rounded-full px-4 py-2 text-sm font-medium text-white surface-soft surface-soft-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col space-y-3">
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const showTime =
              !previous || message.timestamp.getTime() - previous.timestamp.getTime() > TIME_GAP_MS;
            return (
            <motion.div
              key={message.id}
              className="flex flex-col"
              // "Let go": each message drifts up and fades, top first
              animate={releasing ? { y: -140, opacity: 0, scale: 0.92 } : { y: 0, opacity: 1, scale: 1 }}
              transition={releasing ? { duration: 1.1, delay: Math.min(index * 0.06, 0.5), ease: 'easeIn' } : { duration: 0 }}
            >
              {showTime && (
                <p className="mb-2 text-center text-xs text-white/80">{timeLabel(message.timestamp)}</p>
              )}
              {message.kind === 'notice' ? (
                <p role="status" className="mx-auto max-w-[90%] text-center text-sm text-white/90">
                  {message.content}
                </p>
              ) : (
              <div className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.sender === 'user'
                    ? 'bg-[#0b6bb8] text-white rounded-tr-none'
                    : 'bg-[#9AD9EA] text-gray-800 rounded-tl-none'
                }`}
              >
                <span className="whitespace-pre-wrap">{message.content}</span>

                {/* Breathing exercise prompt buttons */}
                {message.helplines && (
                  <div className="mt-3 space-y-2">
                    {message.helplines.map((line) => (
                      <a
                        key={line.phone}
                        href={`tel:${line.phone.replace(/\s/g, '')}`}
                        className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-gray-800"
                      >
                        <Phone className="h-4 w-4 shrink-0 text-[#0077b6]" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{line.name}</span>
                          <span className="block whitespace-nowrap text-base font-bold text-[#0077b6]">{line.phone}</span>
                          <span className="block text-xs text-gray-600">{line.hours}</span>
                        </span>
                      </a>
                    ))}
                  </div>
                )}

                {message.kind === 'breathing-offer' && isBreathingPromptVisible && (
                  <div className="mt-2 flex space-x-2">
                    <button
                      onClick={startBreathingExercise}
                      className="bg-[#0b6bb8] text-white px-3 py-1 rounded-full text-sm"
                    >
                      Try it now
                    </button>
                    <button
                      onClick={declineBreathingExercise}
                      className="bg-[#B8DFFC] text-gray-700 px-3 py-1 rounded-full text-sm"
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
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-white surface-soft surface-soft-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                  >
                    <RotateCcw size={12} aria-hidden="true" />
                    Retry
                  </button>
                </p>
              )}
              </div>
              )}
            </motion.div>
            );
          })}
          {isSending && (
            <div className="flex justify-start" role="status" aria-label="Bubble is typing">
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-none bg-[#9AD9EA] px-4 py-3" aria-hidden="true">
                <span className="animated-typing h-1.5 w-1.5 rounded-full bg-gray-700" />
                <span className="animated-typing h-1.5 w-1.5 rounded-full bg-gray-700 [animation-delay:150ms]" />
                <span className="animated-typing h-1.5 w-1.5 rounded-full bg-gray-700 [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => setShowBreathingExercise(true)}
          className="flex items-center gap-2 rounded-full bg-[#0b6bb8] px-4 py-2 font-medium text-white hover:bg-[#095a9c] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
        >
          <Wind size={20} aria-hidden="true" />
          Breathe
        </button>
        {hasConversation && (
          <button
            onClick={() => setDebriefOpen(true)}
            disabled={releasing || isSending}
            className="flex items-center gap-2 rounded-full px-4 py-2 font-medium text-white surface-soft surface-soft-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 disabled:opacity-60"
          >
            <DoorOpen size={20} aria-hidden="true" />
            I'm done for now
          </button>
        )}
      </div>

      <ChatDebrief
        open={debriefOpen}
        messages={messages}
        onClose={() => setDebriefOpen(false)}
        onLetGo={letGo}
        onSaved={saved}
      />

      {/* Input area. The mic button was removed: it did nothing, and browser speech
          recognition sends audio to a third-party service, which needs consent first */}
      <div className="flex items-end gap-2 surface rounded-3xl p-2 pl-4">
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
          className="shrink-0 rounded-full bg-[#0b6bb8] p-2.5 text-white hover:bg-[#095a9c] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 disabled:bg-white/15 disabled:text-white/70"
        >
          <SendHorizontal size={20} aria-hidden="true" />
        </button>
      </div>
      <p className="mt-1 hidden text-center text-xs text-white/80 md:block">Enter to send · Shift + Enter for a new line</p>
    </motion.div>
  );
}