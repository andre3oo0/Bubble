// Retakes the README screenshots in docs/images from a local Bubble server, with a
// throwaway account and made-up journal entries.
//   PORT=5055 PGLITE_DIR=memory:// npm run dev      (in another terminal)
//   npm run screenshots -- http://localhost:5055
// Uses the installed Chrome (or CHROME_PATH). Only runs against localhost: it creates
// an account, which must never happen on the live site.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
import { randomBytes } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = process.argv[2] ?? 'http://localhost:5000';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(`Refusing to run against ${BASE}: screenshots create an account, so local servers only.`);
  process.exit(1);
}
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs/images');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});

const settle = (page, ms = 1800) => page.waitForTimeout(ms);
const shot = async (page, name) => {
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`saved docs/images/${name}.png`);
};
const setPanel = async (page, panel, scene) => {
  await page.evaluate(([p, s]) => {
    localStorage.setItem('activePanel', p);
    if (s) localStorage.setItem('selectedEnvironment', s);
  }, [panel, scene]);
  await page.reload();
};
const introSeen = (page) =>
  page.evaluate(() => localStorage.setItem('bubble-intro', JSON.stringify({ state: { seen: true }, version: 0 })));

// ---- Phone ---------------------------------------------------------------
const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'dark',
});
const p = await phone.newPage();
p.setDefaultTimeout(150000); // the dev server compiles on the first visit

// First visit: the welcome page
await p.goto(BASE);
await p.evaluate(() => localStorage.setItem('selectedEnvironment', 'ocean'));
await p.reload();
await settle(p);
await p.evaluate(() => document.activeElement?.blur()); // the dialog focuses its first button
await shot(p, 'phone-welcome');

// A throwaway account with a few journal entries and check-ins
const password = randomBytes(16).toString('hex');
await p.evaluate(async ({ password }) => {
  const post = (url, body) =>
    fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  await post('/api/auth/sign-up/email', { name: 'Sam', email: 'sam@example.com', password });
  const entries = [
    { title: 'Before the exam', mood: 'anxious', content: "Couldn't sleep, kept running through algebra in my head. Wrote down the three things I actually know how to do and that helped a bit." },
    { title: 'Sunday walk', mood: 'calm', content: 'Walked to the dam with the dog. Phone stayed in my pocket the whole time. Want to do this more.' },
    { title: 'Finished the project', mood: 'happy', content: 'Handed it in! Weeks of stress and it is just done. Celebrated with pancakes.' },
    { title: 'Long day', mood: 'stressed', content: 'Too many messages, not enough hours. Tomorrow: one thing at a time.' },
  ];
  for (const entry of entries) await post('/api/journal', entry);
  for (const mood of ['calm', 'anxious', 'happy']) await post('/api/moods', { mood });
}, { password });
await introSeen(p);

await setPanel(p, 'home', 'sunset');
await shot(p, 'phone-home');

// Chat: without an AI key these are the canned replies
await setPanel(p, 'chat', 'ocean');
await settle(p);
const say = async (text) => {
  await p.fill('textarea[aria-label="Message Bubble"]', text);
  await p.click('button[aria-label="Send message"]');
  await p.waitForFunction(() => !document.querySelector('[aria-label="Bubble is typing"]'), null, { timeout: 60000 });
};
await say("I can't switch my mind off tonight");
await say("I'm worried about work tomorrow, I keep going over what could go wrong");
await settle(p, 8500); // let the rising mood bubbles finish
await shot(p, 'phone-chat');

await setPanel(p, 'journal', 'forest');
await shot(p, 'phone-journal');

await setPanel(p, 'mood', 'forest');
await shot(p, 'phone-mood');

await setPanel(p, 'home', 'ocean');
await settle(p);
await p.click('button[aria-label="Menu"]');
await shot(p, 'phone-menu');
await p.keyboard.press('Escape');

await settle(p, 600);
await p.click('header button:has-text("Get help")');
await shot(p, 'phone-help');

// ---- Desktop -------------------------------------------------------------
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' });
await desk.addCookies(await phone.cookies()); // same account
const d = await desk.newPage();
d.setDefaultTimeout(150000);
await d.goto(BASE);
await introSeen(d);
await setPanel(d, 'home', 'ocean');
await shot(d, 'desktop-home');
await setPanel(d, 'journal', 'sunset');
await shot(d, 'desktop-journal');

await browser.close();
