// What's in the calm kit. Hand-written, with no AI and nothing fetched, so it works
// offline and never says anything odd. The two lines marked "design document" are
// Immanah's, word for word.

export interface GroundingStep {
  prompt: string;
  hint: string;
}

// 5-4-3-2-1: one sense at a time, to bring attention back to the room.
// public/offline.html repeats the prompts (offline.test.ts checks).
export const GROUNDING_STEPS: GroundingStep[] = [
  {
    prompt: 'Name five things you can see',
    hint: 'Look around slowly. Small things count: a mark on the wall, the colour of your sleeve.',
  },
  {
    prompt: 'Notice four things you can feel',
    hint: 'Your feet on the floor, the chair under you, the air on your skin, your clothes.',
  },
  {
    prompt: 'Listen for three things you can hear',
    hint: 'Near and far: traffic, a fan, birds, your own breathing.',
  },
  {
    prompt: 'Find two things you can smell',
    hint: "If nothing comes, move closer to something, or think of a smell you like.",
  },
  {
    prompt: 'Notice one thing you can taste',
    hint: 'Take a sip of water, or just notice the taste in your mouth right now.',
  },
];

export interface ThoughtLine {
  text: string;
  // Something small to do with it
  tryThis?: string;
}

// For when thoughts go round and round
export const THOUGHT_LINES: ThoughtLine[] = [
  // Design document
  { text: "Your thoughts don't define you. Let them pass through and remember, you're doing your best." },
  {
    text: 'A thought is not a fact, even when it feels like one.',
    tryThis: 'Say it again starting with "I\'m having the thought that…" and notice whether it feels any different.',
  },
  {
    text: "You don't have to solve this right now.",
    tryThis: 'Write the worry down so it isn\'t only in your head, and pick a time tomorrow to look at it.',
  },
  {
    text: "Some of this is in your control, and some of it isn't.",
    tryThis: 'Pick the smallest thing you can actually do about it, and let the rest wait.',
  },
  {
    text: "Going over it again won't give you a new answer tonight.",
    tryThis: 'Do something with your hands for five minutes: wash a cup, stretch, step outside.',
  },
  // Design document
  { text: "You're in a safe space here, take a deep breath, we'll get through this together." },
  {
    text: "Thoughts are like weather. This one will pass, even if it doesn't feel that way yet.",
    tryThis: 'Picture the thought as a cloud and watch it drift across without following it.',
  },
  {
    text: 'Would you talk to a friend the way your thoughts are talking to you?',
    tryThis: "Answer the thought the way you'd answer that friend.",
  },
];

// Affirmations, one at a time
export const KIND_WORDS: string[] = [
  "You're doing your best, and that is enough.",
  'You deserve care and support, from others and from yourself.',
  'Each breath is a fresh start.',
  "It's okay to rest. You don't have to earn it.",
  "A hard day doesn't undo the progress you've made.",
  "You've got through every difficult day so far.",
  'Asking for help is a brave thing to do.',
  'You can go slowly. Slow is still moving.',
  "This feeling is real, and it won't last forever.",
  "You don't have to have it all worked out today.",
  "Be as gentle with yourself as you'd be with someone you love.",
  "You're allowed to take up space.",
];

// The mirror moment: a short exercise in talking to yourself kindly
export const MIRROR_STEPS: string[] = [
  "Think of something harsh you've been telling yourself lately.",
  'Now imagine a friend you love said that about themselves. What would you tell them?',
  "Say that to yourself, out loud or in your head, using your own name. If there's a mirror nearby, look at yourself while you say it.",
  "However that felt, you've just practised being kind to yourself. It gets easier the more you do it.",
];
