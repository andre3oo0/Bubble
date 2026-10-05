// Starting points for a journal entry. Hand-written, so they cost nothing and never
// say anything odd. Plain and open, nothing that assumes how someone feels.
export const JOURNAL_PROMPTS = [
  "What's taking up the most space in your head today?",
  'Something small that went okay today',
  'What would you tell a friend who was going through what you are?',
  'What do you need more of this week?',
  "Something you're looking forward to, even a little",
  'What drained your energy today, and what gave some back?',
  'A moment today you want to remember',
  "What's one thing you'd like to let go of?",
  'Who made your day a bit better lately, and how?',
  'What are you proud of that nobody else noticed?',
  "If today had a title, what would it be?",
  "What's worrying you, and how much of it is in your control?",
];

export function pickPrompt(exclude?: string): string {
  const options = JOURNAL_PROMPTS.filter((prompt) => prompt !== exclude);
  return options[Math.floor(Math.random() * options.length)];
}
