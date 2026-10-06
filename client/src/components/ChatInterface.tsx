import { useState } from 'react';
import ChatPanel from './ChatPanel';
import BreathingExercise from './BreathingExercise';

export default function ChatInterface() {
  const [showBreathingExercise, setShowBreathingExercise] = useState(false);

  return (
    <div className="h-full">
      <ChatPanel
        showBreathingExercise={showBreathingExercise}
        setShowBreathingExercise={setShowBreathingExercise}
      />
      <BreathingExercise
        isOpen={showBreathingExercise}
        onClose={() => setShowBreathingExercise(false)}
      />
    </div>
  );
}
