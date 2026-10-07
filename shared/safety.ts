import type { Helpline } from "./chat";

// South African lines for now. Verify the numbers before launch and make
// this region-aware once there are users outside SA.
export const HELPLINES: Helpline[] = [
  { name: "SADAG Suicide Crisis Line", phone: "0800 567 567", hours: "24 hours, free" },
  { name: "Lifeline South Africa", phone: "0861 322 322", hours: "24 hours" },
  { name: "Emergency (from any mobile)", phone: "112", hours: "24 hours" },
];

// Also in HELPLINES; the help screen shows it on its own as the danger line
export const EMERGENCY_NUMBER = "112";

export const CRISIS_REPLY =
  "It sounds like you're carrying something really painful right now, and I'm glad you told me. " +
  "You don't have to go through this alone. Please reach out to one of the helplines below or someone you trust right now. " +
  "If you're in immediate danger, call 112.";

// Deliberately broad: a false positive only shows helpline numbers, a miss is far worse.
// This runs without the AI so it still works when OpenAI is down.
const CRISIS_PATTERNS: RegExp[] = [
  /\bsuicid/,
  /\bkill(ing)? my ?self\b/,
  /\bend(ing)? (it all|my life|everything)\b/,
  /\btake my (own )?life\b/,
  /\bwant(ed)? to die\b/,
  /\bwish i (was|were) dead\b/,
  /\b(don'?t|do not) want to (live|be alive|be here|exist)( anymore)?\b/,
  // "no point carrying on with this essay" isn't a crisis
  /\bno (reason|point) (to |in )?(live|living|go on|going on|carry on|carrying on|keep going)\b(?! with)/,
  /\bbetter off (dead|without me)\b/,
  /\b(hurt|harm|cut|cutting|hurting|harming) my ?self\b/,
  /\bself[- ]?harm/,
  /\boverdos/,
  // Slang and softer phrasings people use, especially online
  /\bkms\b/,
  /\bun-?aliv/,
  /\bend(ing)? my ?self\b/,
  /\b(don'?t|do not) want to wake up\b/,
  /\bnot (be|being) (here|around|alive) (tomorrow|anymore|much longer)\b/,
  /\bcan'?t (go on|do this) anymore\b/,
  // Warning signs the AI caught but this list missed (7 October): getting affairs in
  // order, wanting it to stop for good, and feeling nobody would notice they were gone
  /\bgiv(e|ing|en) (away (all )?(of )?my (things|stuff|belongings|possessions)|(all )?(of )?my (things|stuff|belongings|possessions) away)\b/,
  /\b(goodbye|suicide) (letter|note)s?\b/,
  /\b(it all|everything|the pain) to (stop|end) for good\b/,
  /\bstop (it all|everything) for good\b/,
  /\b(nobody|no ?one|no-one) (would|will|'d|'ll)? ?(even )?(notice|care|miss me)\b.*\bif i('m| am| was| were)? ?(gone|dead|died|disappeared|not (here|around))\b/,
  /\b(would|will) (anyone|anybody) (even )?(notice|care|miss me)\b.*\bif i\b/,
  /\bbetter off if i ((was|were) (gone|dead)|(wasn'?t|weren'?t) (here|around|alive))\b/,
];

export function detectCrisis(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    // "kms" is also kilometres: "we drove 40 kms" isn't a crisis
    .replace(/\d\s*kms\b/g, "");
  return CRISIS_PATTERNS.some((pattern) => pattern.test(normalized));
}
