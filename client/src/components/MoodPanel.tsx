import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mood } from '@/models/types';
import { Clock, Settings, Plus, Save, X } from 'lucide-react';

interface MoodCheckIn {
  id: string;
  date: string;
  time: string;
  mood: Mood;
}

interface MoodPanelProps {
  currentMood: Mood;
  setCurrentMood: (mood: Mood) => void;
}

export default function MoodPanel({ currentMood, setCurrentMood }: MoodPanelProps) {
  const [selectedMood, setSelectedMood] = useState<Mood>(currentMood);
  const [moodHistory, setMoodHistory] = useState<MoodCheckIn[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [checkInTimes, setCheckInTimes] = useState<string[]>(['12:00', '18:00']);
  const [newCheckInTime, setNewCheckInTime] = useState('');
  const [isEditingTimes, setIsEditingTimes] = useState(false);
  
  const moods: Record<Mood, { label: string, color: string, icon: string }> = {
    happy: { label: 'Happy', color: 'bg-[#4CAF50]', icon: '😊' },
    calm: { label: 'Calm', color: 'bg-[#4FACFE]', icon: '😌' },
    neutral: { label: 'Neutral', color: 'bg-[#9E9E9E]', icon: '😐' },
    sad: { label: 'Sad', color: 'bg-[#7B68EE]', icon: '😔' },
    anxious: { label: 'Anxious', color: 'bg-[#FFA500]', icon: '😰' },
    stressed: { label: 'Stressed', color: 'bg-[#FF6B6B]', icon: '😖' },
    improved: { label: 'Improved', color: 'bg-[#4CAF50]', icon: '😌' }
  };

  // Load mood history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('moodHistory');
    if (savedHistory) {
      setMoodHistory(JSON.parse(savedHistory));
    }
    
    // Load check-in times
    const savedCheckInTimes = localStorage.getItem('checkInTimes');
    if (savedCheckInTimes) {
      setCheckInTimes(JSON.parse(savedCheckInTimes));
    }
  }, []);

  // Save mood when selected
  const saveMood = () => {
    if (selectedMood) {
      // Update current mood
      setCurrentMood(selectedMood);
      
      // Create new check-in
      const now = new Date();
      const newCheckIn: MoodCheckIn = {
        id: now.getTime().toString(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mood: selectedMood
      };
      
      // Update history
      const updatedHistory = [newCheckIn, ...moodHistory];
      setMoodHistory(updatedHistory);
      
      // Save to localStorage
      localStorage.setItem('moodHistory', JSON.stringify(updatedHistory));
    }
  };

  // Add new check-in time
  const addCheckInTime = () => {
    if (newCheckInTime) {
      const updatedTimes = [...checkInTimes, newCheckInTime].sort();
      setCheckInTimes(updatedTimes);
      localStorage.setItem('checkInTimes', JSON.stringify(updatedTimes));
      setNewCheckInTime('');
    }
  };

  // Remove check-in time
  const removeCheckInTime = (time: string) => {
    const updatedTimes = checkInTimes.filter(t => t !== time);
    setCheckInTimes(updatedTimes);
    localStorage.setItem('checkInTimes', JSON.stringify(updatedTimes));
  };

  // Group mood history by date
  const groupedHistory = moodHistory.reduce((groups: Record<string, MoodCheckIn[]>, checkIn) => {
    if (!groups[checkIn.date]) {
      groups[checkIn.date] = [];
    }
    groups[checkIn.date].push(checkIn);
    return groups;
  }, {});

  return (
    <motion.div 
      className="h-full flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="text-white text-4xl font-bold text-center flex-1">MOOD</div>
        <button 
          onClick={() => setShowSettings(!showSettings)} 
          className="text-white hover:text-[#50c8ff] transition-colors"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>
      
      {showSettings ? (
        // Settings panel
        <div className="bg-[#3498db]/30 rounded-3xl p-4 mb-6 glassmorphism">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white text-lg">Check-in Times</h3>
            <button 
              onClick={() => setIsEditingTimes(!isEditingTimes)}
              className="text-white bg-[#50c8ff] rounded-full px-3 py-1 text-sm"
            >
              {isEditingTimes ? 'Done' : 'Edit'}
            </button>
          </div>
          
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {checkInTimes.map((time) => (
                <div 
                  key={time} 
                  className="flex items-center bg-[#9AD9EA]/50 rounded-full px-3 py-1 text-white"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{time}</span>
                  {isEditingTimes && (
                    <button 
                      onClick={() => removeCheckInTime(time)}
                      className="ml-2 text-white hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {isEditingTimes && (
            <div className="flex gap-2 mb-2">
              <input
                type="time"
                value={newCheckInTime}
                onChange={(e) => setNewCheckInTime(e.target.value)}
                className="bg-[#9AD9EA]/30 text-white border-none rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#50c8ff]"
              />
              <button
                onClick={addCheckInTime}
                className="bg-[#50c8ff] text-white rounded-full p-1"
                disabled={!newCheckInTime}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
          
          <p className="text-white/70 text-sm">
            Set times for daily mood check-in reminders
          </p>
        </div>
      ) : (
        // Current mood selector
        <div className="bg-[#3498db]/30 rounded-3xl p-4 mb-6 glassmorphism">
          <div className="text-white text-lg mb-2">How are you feeling right now?</div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(moods).map(([moodKey, { label, color, icon }]) => (
              <motion.button
                key={moodKey}
                onClick={() => setSelectedMood(moodKey as Mood)}
                className={`${color} rounded-full p-3 text-white text-center ${
                  selectedMood === moodKey ? 'ring-4 ring-white' : ''
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="text-2xl">{icon}</div>
                <div className="text-sm">{label}</div>
              </motion.button>
            ))}
          </div>
          
          <div className="mt-4 flex justify-center">
            <motion.button
              onClick={saveMood}
              className="bg-[#50c8ff] text-white rounded-full px-6 py-2 flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={!selectedMood}
            >
              <Save className="w-5 h-5 mr-2" />
              Save Mood
            </motion.button>
          </div>
        </div>
      )}
      
      {/* Mood history */}
      <div className="flex-1 bg-[#3498db]/30 rounded-3xl p-4 overflow-y-auto glassmorphism">
        <div className="text-white text-lg mb-4">Your mood history</div>
        
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="text-white/70 text-center py-8">
            No mood entries yet. Start by saving your current mood!
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedHistory).map(([date, checkIns]) => (
              <div key={date} className="bg-[#9AD9EA]/20 rounded-xl p-3">
                <div className="text-white font-medium mb-2">{date}</div>
                <div className="space-y-2">
                  {checkIns.map((checkIn) => (
                    <div key={checkIn.id} className="flex items-center space-x-4 text-white p-2">
                      <div className="w-16 text-sm">{checkIn.time}</div>
                      <div className={`flex-1 rounded-full h-4 ${moods[checkIn.mood].color} opacity-80`}></div>
                      <div className="text-xl">{moods[checkIn.mood].icon}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}