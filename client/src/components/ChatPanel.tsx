import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';
import { Message, Mood } from '@/models/types';
import { useChatStore } from '@/store/chatStore';
import { useMoodStore } from '@/store/moodStore';
import { useSosStore } from '@/store/sosStore';
import { v4 as uuidv4 } from 'uuid';
import { sendChatMessage } from '@/lib/chatService';
import { CRISIS_REPLY, HELPLINES, detectCrisis } from '@shared/safety';

interface ChatPanelProps {
  setIsTyping: (typing: boolean) => void;
  showBreathingExercise: boolean;
  setShowBreathingExercise: (show: boolean) => void;
}

const BREATHING_OFFER_MOODS: Mood[] = ['anxious', 'stressed'];

// Let Bubble's reply appear before the SOS screen covers it
const SOS_OPEN_DELAY_MS = 800;

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
  const { messages, addMessage } = useChatStore();
  const { currentMood, setCurrentMood } = useMoodStore();
  const previousMoodRef = useRef<Mood>(currentMood);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view, otherwise helplines can end up below the fold
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Rising bubbles when the mood changes; no chat message, that was confusing
  useEffect(() => {
    if (previousMoodRef.current !== currentMood) {
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
  
  // Helper function to get color based on mood
  const getMoodColor = (mood: Mood): string => {
    switch (mood) {
      case 'happy':
        return '#4ade80'; // green-400
      case 'calm':
        return '#60a5fa'; // blue-400
      case 'anxious':
        return '#facc15'; // yellow-400
      case 'sad':
        return '#818cf8'; // indigo-400
      case 'stressed':
        return '#f87171'; // red-400
      case 'improved':
        return '#a3e635'; // lime-400
      default:
        return '#9ca3af'; // gray-400
    }
  };

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
  
  const handleSendMessage = async () => {
    const text = inputMessage.trim();
    if (!text || isSending) return;
    
    addMessage({
      id: uuidv4(),
      content: text,
      sender: 'user',
      timestamp: new Date()
    });
    setInputMessage('');
    setIsSending(true);
    setIsTyping(true);
    
    try {
      const response = await sendChatMessage(text);
      
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
      console.error('Error sending message:', error);

      // Can't reach the server: still show helplines if the message needs them
      const crisis = detectCrisis(text);
      addMessage({
        id: uuidv4(),
        content: crisis
          ? CRISIS_REPLY
          : "I'm having trouble connecting right now, but I'm still here. Could you try sending that again in a moment?",
        sender: 'bubble',
        timestamp: new Date(),
        helplines: crisis ? HELPLINES : undefined
      });
      if (crisis) openSosForCrisis();
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
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
      <div className="text-white text-3xl md:text-4xl font-bold mb-4 text-center">CHAT</div>
      
      {/* Breathing Exercise is now handled by the parent component */}
      
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto mb-4 bg-[#3498db]/30 rounded-3xl p-4">
        <div className="flex flex-col space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.sender === 'user'
                    ? 'bg-[#50c8ff] text-white rounded-tr-none'
                    : 'bg-[#9AD9EA] text-gray-800 rounded-tl-none'
                }`}
              >
                {message.content}
                
                {/* Breathing exercise prompt buttons */}
                {message.helplines && (
                  <div className="mt-3 space-y-2">
                    {message.helplines.map((line) => (
                      <a
                        key={line.phone}
                        href={`tel:${line.phone.replace(/\s/g, '')}`}
                        className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-gray-800 shadow-sm"
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
                      className="bg-[#50c8ff] text-white px-3 py-1 rounded-full text-sm"
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
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Breathing exercise button - more prominent */}
      <div className="mb-4 flex justify-center">
        <button 
          onClick={() => setShowBreathingExercise(true)}
          className="bg-[#50c8ff] hover:bg-[#38b6ff] text-white px-4 py-2 rounded-full font-medium shadow-lg flex items-center space-x-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <span>Breathing Exercise</span>
        </button>
      </div>
      
      {/* Input area */}
      <div className="flex items-center space-x-2 bg-[#3498db]/30 rounded-full p-2">
        <button className="p-2 text-white rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/70"
          placeholder="Type your message..."
        />
        
        <button 
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || isSending}
          className="p-2 text-white rounded-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </motion.div>
  );
}