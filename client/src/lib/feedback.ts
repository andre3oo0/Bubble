import { LEGAL_CONTACT } from '@shared/legal';

// Feedback goes from the person's own email app, so Bubble's server never sees or
// stores it. The form only fills the email in.
export function feedbackEmailLink(feedback: string, rating: number | null): string {
  const lines = [feedback.trim(), rating ? `Rating: ${rating} out of 5` : ''].filter(Boolean);
  const params = new URLSearchParams({ subject: 'Bubble feedback', body: lines.join('\n\n') });
  // URLSearchParams writes spaces as "+", which email apps show literally
  return `mailto:${LEGAL_CONTACT}?${params.toString().replace(/\+/g, '%20')}`;
}
