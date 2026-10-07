import { useState } from 'react';
import { Mail, Star } from 'lucide-react';
import { LEGAL_CONTACT } from '@shared/legal';
import { feedbackEmailLink } from '@/lib/feedback';
import { cn } from '@/lib/utils';
import PageHeader from './PageHeader';
import { buttonClass, fieldClass, focusRing, labelClass } from './ui/controls';

export default function FeedbackPanel() {
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [opened, setOpened] = useState(false);
  const ready = feedback.trim() !== '' || rating !== null;

  return (
    <div className="flex flex-col pb-2">
      <PageHeader title="Feedback" />

      <form
        className="surface flex flex-col gap-5 rounded-[8px] p-4 text-white"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          window.location.href = feedbackEmailLink(feedback, rating);
          setOpened(true);
        }}
      >
        <div>
          <label htmlFor="feedback-text" className={labelClass.dark}>
            What's working, and what would make Bubble better?
          </label>
          <textarea
            id="feedback-text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={6}
            className={cn(fieldClass.dark, 'resize-y leading-relaxed')}
          />
        </div>

        <fieldset>
          <legend className={labelClass.dark}>
            How would you rate Bubble? <span className="font-normal text-white/75">(optional)</span>
          </legend>
          <div className="-ml-1.5 flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(rating === star ? null : star)}
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} out of 5`}
                className={cn('inline-flex h-11 w-11 items-center justify-center rounded-[8px] text-white focus:outline-none', focusRing.dark)}
              >
                <Star className="h-7 w-7" fill={rating !== null && star <= rating ? 'currentColor' : 'none'} strokeWidth={1.5} aria-hidden="true" />
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <button type="submit" disabled={!ready} className={buttonClass({ className: 'w-full sm:w-auto' })}>
            <Mail size={18} aria-hidden="true" />
            Send feedback
          </button>
          <p className="mt-2 text-sm text-white/80" role={opened ? 'status' : undefined}>
            {opened ? (
              <>
                Your email app should have opened with your message ready to send. If it didn't, email us at{' '}
                <a href={`mailto:${LEGAL_CONTACT}`} className="font-semibold underline underline-offset-2">
                  {LEGAL_CONTACT}
                </a>
                .
              </>
            ) : (
              'This opens your email app with your message filled in, to send from your own address. Bubble doesn\'t store it.'
            )}
          </p>
        </div>
      </form>
    </div>
  );
}
