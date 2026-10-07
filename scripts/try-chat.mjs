// Runs a few scripted conversations against a Bubble server and prints what Bubble
// said, to judge how it talks after changing the prompt or the model.
//   npm run try-chat                      (the live site)
//   npm run try-chat -- http://localhost:5000
// Each message counts towards that server's daily chat limit for your connection.
// It waits 20 seconds between messages, like someone typing, because back-to-back
// messages hit Groq's per-minute limit and the times then measure that instead.
// TRY_CHAT_PAUSE=0 sends them straight away.

const base = process.argv[2] ?? 'https://bubble-1-kafq.onrender.com';
const pauseMs = Number(process.env.TRY_CHAT_PAUSE ?? 20) * 1000;
let first = true;

const conversations = {
  'Exam stress': [
    'hey',
    "exams start next week and I'm kind of freaking out",
    'maths mostly. algebra. I study but my mind goes blank in the test',
    'what do you think I should actually do?',
    'do you ever get nervous about stuff?',
  ],
  'Friend falling out': [
    'my best friend ignored me all day',
    "idk maybe I did something but I can't think what",
    "can you just tell me honestly if I'm overreacting",
  ],
  'Feeling low': [
    "I've been feeling really low lately and I don't even know why",
    'everyone else seems to be doing fine',
    "I don't really want advice, I just needed to say it",
  ],
  Grief: [
    'my gran passed away last week',
    "everyone keeps saying she's in a better place and it makes me so angry",
    'I just miss her',
  ],
  'Good news': [
    'I actually had a really good day today',
    'I finally finished the project I was stressing about for weeks',
    'what should I do to celebrate?',
  ],
};

// Counted like one signed-out device, so a run doesn't use up the allowance of
// everyone else on the same network (the network still has its own cap)
const device = crypto.randomUUID();

for (const [name, messages] of Object.entries(conversations)) {
  console.log(`\n===== ${name} =====`);
  let sessionId;
  for (const message of messages) {
    if (!first) await new Promise((resolve) => setTimeout(resolve, pauseMs));
    first = false;
    console.log(`YOU:    ${message}`);
    try {
      const started = Date.now();
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-bubble-device': device },
        body: JSON.stringify({ message, sessionId }),
      });
      const data = await res.json();
      sessionId = data.sessionId;
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      const flags = [data.fallback && 'FALLBACK', data.limited && 'LIMITED'].filter(Boolean).join(' ');
      console.log(`BUBBLE: ${data.reply ?? data.error}   [${seconds}s mood=${data.mood} risk=${data.risk}${flags ? ' ' + flags : ''}]`);
    } catch (error) {
      console.log(`ERROR:  ${error.message}`);
    }
  }
}
