import { createHash } from "crypto";

// Checks a new password against the passwords exposed in known data breaches, using
// Have I Been Pwned's free range API. Only the first 5 characters of the password's
// SHA-1 hash leave the server, so the service never learns the password.
// If the service can't be reached the password is allowed: an outage there
// shouldn't stop anyone signing up.
export async function isBreachedPassword(password: string): Promise<boolean> {
  const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      // Padding hides how many matches there were from anyone watching the traffic
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const body = await res.text();
    // Lines are "SUFFIX:COUNT"; padding lines have a count of 0
    return body.split(/\r?\n/).some((line) => {
      const [candidate, count] = line.trim().split(":");
      return candidate === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}

// On in production; PASSWORD_BREACH_CHECK=on/off overrides (tests never call out)
export function breachCheckEnabled() {
  const setting = process.env.PASSWORD_BREACH_CHECK;
  if (setting) return setting === "on";
  return process.env.NODE_ENV === "production";
}
