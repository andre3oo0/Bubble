import { useState } from 'react';
import { motion } from 'framer-motion';

export default function FeedbackPanel() {
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating !== null) {
      // In a real app, this would send the feedback to an API
      console.log({ rating, feedback });
      setSubmitted(true);
    }
  };

  return (
    <motion.div 
      className="h-full flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-white text-3xl md:text-4xl font-bold mb-4 text-center">FEEDBACK</div>
      
      {submitted ? (
        <div className="flex-1 bg-[#3498db]/30 rounded-3xl p-8 flex flex-col items-center justify-center text-white">
          <div className="text-6xl mb-4">🙏</div>
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-center">
            Your feedback helps Bubble improve and provide better support for everyone.
          </p>
        </div>
      ) : (
        <div className="flex-1 bg-[#3498db]/30 rounded-3xl p-6">
          <div className="mb-6">
            <h3 className="text-white text-lg mb-3">Rate your experience</h3>
            <div className="flex justify-between">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  onClick={() => setRating(star)}
                  className="text-4xl"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {rating !== null && star <= rating ? '⭐' : '☆'}
                </motion.button>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-white text-lg mb-3">Share your thoughts</h3>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full h-40 bg-white/20 border-none outline-none text-white placeholder-white/70 p-4 rounded-2xl resize-none"
              placeholder="What did you like? How can we improve?"
            />
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={rating === null}
            className={`w-full py-3 rounded-full text-white font-medium ${
              rating === null ? 'bg-[#9AD9EA]/50 cursor-not-allowed' : 'bg-[#50c8ff] hover:bg-[#3498db]'
            }`}
          >
            Submit Feedback
          </button>
        </div>
      )}
    </motion.div>
  );
}