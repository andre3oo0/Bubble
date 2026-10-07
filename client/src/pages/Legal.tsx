import { useEffect, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { HELPLINES } from '@shared/safety';
import { INFORMATION_REGULATOR, LEGAL_CONTACT, LEGAL_UPDATED, MIN_AGE } from '@shared/legal';

// The privacy policy and terms of use: long text, so a plain white page that's easy
// to read and print, in the same flat style as the 404 page

const linkClass = 'font-medium text-[#0b5394] underline underline-offset-2';

function Mail({ to = LEGAL_CONTACT }: { to?: string }) {
  return (
    <a href={`mailto:${to}`} className={linkClass}>
      {to}
    </a>
  );
}

function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 text-lg font-bold text-[#0b3d66]">{children}</h2>;
}

function LegalPage({ title, other, children }: { title: string; other: { href: string; label: string }; children: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · Bubble`;
    window.scrollTo(0, 0);
    return () => {
      document.title = 'Bubble';
    };
  }, [title]);

  return (
    <main className="min-h-screen bg-[#0b2a4a] px-4 py-6 sm:py-10" style={{ minHeight: '100dvh' }}>
      <article className="mx-auto w-full max-w-2xl rounded-[8px] bg-white p-6 leading-relaxed text-gray-800 sm:p-10 [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-[8px] text-sm font-semibold text-[#0b5394] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0b5394]/40"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Bubble
        </Link>
        <h1 className="mt-5 text-3xl font-bold text-[#0b3d66]">{title}</h1>
        <p className="!mt-1 text-sm text-gray-600">Last updated {LEGAL_UPDATED}</p>

        <p className="rounded-[8px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          Bubble is an AI and isn't a substitute for a therapist. If you're in danger, call <strong>112</strong>. In South
          Africa you can also call{' '}
          {HELPLINES.filter((line) => line.phone !== '112')
            .map((line) => `${line.name} on ${line.phone} (${line.hours})`)
            .join(', or ')}
          .
        </p>

        {children}

        <p className="mt-10 border-t border-gray-200 pt-5 text-sm">
          See also the{' '}
          <Link href={other.href} className={linkClass}>
            {other.label}
          </Link>
          .
        </p>
      </article>
    </main>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy policy" other={{ href: '/terms', label: 'terms of use' }}>
      <p>
        Bubble is a place to talk things through, keep a journal and check in on your mood. What you share can be very
        personal, including things about your mental health, so we keep as little as we can and explain all of it here.
      </p>

      <H2>Who we are</H2>
      <p>
        Bubble ("we") is responsible for your information under South Africa's Protection of Personal Information Act
        (POPIA). Contact us about anything in this policy at <Mail />.
      </p>

      <H2>What Bubble keeps</H2>
      <ul>
        <li>
          <strong>Your account</strong>, if you make one: your name, email address and password (stored only as a
          scrambled hash we can't read), or a link to your Google account if you sign in with Google.
        </li>
        <li>
          <strong>Your journal entries and mood check-ins</strong>, if you're signed in. Only you can see them.
        </li>
        <li>
          <strong>When you agreed</strong> to these terms and this policy, and which version.
        </li>
        <li>
          <strong>Sign-in sessions</strong>: when each one started and when it ends. Not your IP address or which device
          you used.
        </li>
        <li>
          <strong>Daily counts</strong> used for fair-use limits, such as how many messages were sent. These are linked to
          a scrambled code instead of your IP or email address, and deleted after 7 days. If you chat without an account,
          your browser keeps a random code so each device gets its own daily allowance. It says nothing about you, isn't
          linked to an account, and signing out clears it.
        </li>
        <li>
          <strong>Emails you send us</strong>, including feedback. The Feedback screen opens your own email app, so it
          reaches us as an ordinary email with your address. We use it only to reply and to improve Bubble.
        </li>
        <li>
          <strong>Settings on your device</strong>, like your scene, sound and theme, kept in your browser and not sent to
          us.
        </li>
      </ul>

      <H2>What Bubble doesn't keep</H2>
      <ul>
        <li>
          <strong>Your chats.</strong> To follow the conversation, Bubble holds the latest part of it in memory for up to
          an hour, then forgets it. Choosing "Let go" forgets it straight away. Chats are never saved to the database
          unless you choose to save a reflection to your journal.
        </li>
        <li>
          <strong>Your IP address.</strong> It's used briefly to stop abuse, but never stored.
        </li>
        <li>
          Our logs record that a request happened and whether it worked, never what you wrote.
        </li>
      </ul>
      <p>There are no ads, no analytics or tracking, and we never sell your information.</p>

      <H2>Why we use it</H2>
      <p>
        Only to run Bubble for you: to reply to you, keep your journal and mood history, sign you in, send account emails
        (like a password reset) and keep the service safe and fair for everyone. Information about your mental health is
        special personal information under POPIA, so we only process it with your consent, which you give when you agree to
        this policy. You can withdraw it at any time by deleting your account and no longer using Bubble.
      </p>

      <H2>Who else handles it</H2>
      <p>These services do work for us, and only for that purpose:</p>
      <ul>
        <li>
          <strong>Render</strong> runs the app, and <strong>Neon</strong> holds the database, both in Frankfurt, Germany.
        </li>
        <li>
          <strong>Groq</strong>, in the United States, generates Bubble's replies. Your chat messages are sent there
          (with the name you gave Bubble, if you're signed in), and so is a journal entry when you tap "Reflect with
          Bubble" on it. They're sent only to write the reply.
        </li>
        <li>
          <strong>Brevo</strong> sends account emails (confirming your address and resetting your password). Your chats
          and journal are never emailed.
        </li>
        <li>
          <strong>Google</strong>, only if you choose "Continue with Google". Bubble asks Google for your name and email,
          nothing else.
        </li>
        <li>
          <strong>Have I Been Pwned</strong> checks new passwords against known data breaches. Only the first 5
          characters of a scrambled version of the password are sent, which can't be turned back into the password.
        </li>
      </ul>
      <p>
        Some of this means your information leaves South Africa: it's stored in Germany, and chat goes to the United
        States. By agreeing to this policy you consent to that transfer. We'd only otherwise share information if the law
        required it.
      </p>

      <H2>How long we keep it</H2>
      <ul>
        <li>Your account, journal and mood history: until you delete them or your account.</li>
        <li>Chat context: up to an hour in memory.</li>
        <li>Sign-in sessions: until they expire (about a week), then they're deleted.</li>
        <li>Daily counts: 7 days.</li>
        <li>
          Deleted information can stay in our database provider's backups for a short time before it's gone for good.
        </li>
      </ul>

      <H2>Keeping it safe</H2>
      <p>
        Everything travels encrypted (HTTPS). Passwords are hashed, Google sign-in details are encrypted, and every
        journal and mood request is checked so you can only ever see your own. No system is perfect: if your information
        is ever exposed, we'll tell you and the Information Regulator as soon as we reasonably can.
      </p>

      <H2>Your rights</H2>
      <ul>
        <li>
          <strong>See what we have:</strong> Settings, then Privacy, then "Download my data" gives you everything as a
          file.
        </li>
        <li>
          <strong>Correct it:</strong> edit your journal entries any time, or ask us to fix your name or email.
        </li>
        <li>
          <strong>Delete it:</strong> Settings, then Privacy, then "Delete my account" removes your account, journal and
          mood history.
        </li>
        <li>
          <strong>Object or complain:</strong> contact us at <Mail />. You can also complain to the Information Regulator
          at{' '}
          <a href={INFORMATION_REGULATOR.website} className={linkClass} target="_blank" rel="noreferrer">
            inforegulator.org.za
          </a>{' '}
          or <Mail to={INFORMATION_REGULATOR.complaints} />.
        </li>
      </ul>

      <H2>Age</H2>
      <p>
        Bubble is for people aged {MIN_AGE} and over. If you're younger, please talk to someone you trust or call one of
        the helplines above. If we learn that an account belongs to someone under {MIN_AGE}, we'll delete it.
      </p>

      <H2>Changes</H2>
      <p>
        If we change this policy in a way that matters, we'll update the date above and ask you to agree again the next
        time you open Bubble.
      </p>
    </LegalPage>
  );
}

export function TermsOfUse() {
  return (
    <LegalPage title="Terms of use" other={{ href: '/privacy', label: 'privacy policy' }}>
      <p>
        These terms are the agreement between you and Bubble ("we"). By using Bubble you agree to them and to the{' '}
        <Link href="/privacy" className={linkClass}>privacy policy</Link>.
      </p>

      <H2>What Bubble is, and isn't</H2>
      <ul>
        <li>Bubble is an AI companion for talking things through, journaling, breathing and noticing your moods.</li>
        <li>
          It isn't a therapist, a doctor or a crisis service, and it doesn't give medical advice or diagnoses. It can't
          call for help for you.
        </li>
        <li>
          Bubble's replies come from an AI. They can be wrong, miss what you meant or not fit your situation. Use your own
          judgement, and talk to a professional about anything serious.
        </li>
        <li>If you're in danger, call 112 or one of the helplines above, or tap Get help in the app.</li>
      </ul>

      <H2>Who can use it</H2>
      <p>
        You must be {MIN_AGE} or older. Chat works without an account; the journal and mood history need one.
      </p>

      <H2>Your account</H2>
      <ul>
        <li>Use your own email address, and keep your password to yourself.</li>
        <li>An account is for one person. You're responsible for what's done with it.</li>
        <li>You can delete it whenever you like, in Settings.</li>
      </ul>

      <H2>Using Bubble fairly</H2>
      <p>Please don't:</p>
      <ul>
        <li>use Bubble to harm, harass or threaten anyone, or to share anything illegal;</li>
        <li>try to get into anyone else's account or information;</li>
        <li>
          try to break, overload or get around Bubble's limits, including with scripts or automated tools, or try to
          make the AI say harmful things;
        </li>
        <li>pretend to be someone else when you sign up.</li>
      </ul>
      <p>
        Bubble has daily limits so the free service stays available for everyone. Helplines and crisis replies keep working
        past them. We may suspend or delete an account that breaks these terms.
      </p>

      <H2>Your words are yours</H2>
      <p>
        What you write belongs to you. You let us store it and process it only to run Bubble for you, as the privacy policy
        explains: for example, sending a message to the AI to get a reply.
      </p>

      <H2>The service</H2>
      <p>
        Bubble is free and is still being built. It's offered as it is: it may change, have mistakes or be unavailable at
        times, and we may stop it. If we ever plan to close it, we'll try to give notice so you can download your data
        first. As far as the law allows, we aren't liable for losses that come from using Bubble or from relying on its
        replies. Nothing in these terms takes away rights you have under South African law, including the Consumer
        Protection Act.
      </p>

      <H2>Changes</H2>
      <p>
        If we change these terms in a way that matters, we'll update the date above and ask you to agree again in the app.
      </p>

      <H2>Law and contact</H2>
      <p>
        These terms are governed by the law of South Africa. Questions or problems: <Mail />.
      </p>
    </LegalPage>
  );
}
