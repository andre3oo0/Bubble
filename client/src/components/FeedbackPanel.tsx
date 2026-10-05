import { useState } from 'react';
import { motion } from 'framer-motion';
import { HeartHandshake, Star } from 'lucide-react';

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
      <h1 className="text-white text-2xl md:text-3xl font-semibold tracking-tight mb-4 text-center">Feedback</h1>

      {submitted ? (
        <div className="flex-1 surface rounded-3xl p-8 flex flex-col items-center justify-center text-white">
          <HeartHandshake className="mb-4 h-12 w-12" aria-hidden="true" />
          <h2 className="text-2xl font-semibold mb-2">Thank you</h2>
          <p className="text-center">Thanks for taking the time to tell us how Bubble is working for you.</p>
        </div>
      ) : (
        <div className="flex-1 surface rounded-3xl p-6">
          <div className="mb-6">
            <h3 id="rating-label" className="text-white text-lg mb-3">Rate your experience</h3>
            <div className="flex justify-between" role="radiogroup" aria-labelledby="rating-label">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star} out of 5`}
                  className="rounded-full p-1 text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                >
                  <Star
                    className="h-9 w-9"
                    fill={rating !== null && star <= rating ? 'currentColor' : 'none'}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-white text-lg mb-3">Share your thoughts</h3>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full h-40 bg-white/20 border-none outline-none text-white placeholder-white/80 p-4 rounded-2xl resize-none"
              placeholder="What did you like? How can we improve?"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={rating === null}
            className={`w-full py-3 rounded-full text-white font-medium ${
              rating === null ? 'surface-soft cursor-not-allowed' : 'bg-[#0b6bb8] hover:bg-[#095a9c]'
            }`}
          >
            Send feedback
          </button>
        </div>
      )}
    </motion.div>
  );
}