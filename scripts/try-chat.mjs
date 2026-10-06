// Runs a few scripted conversations against a Bubble server and prints what Bubble
// said, to judge how it talks after changing the prompt or the model.
//   npm run try-chat                      (the live site)
//   npm run try-chat -- http://localhost:5000
// Each message counts towards that server's daily chat limit for your connection.

const base = process.argv[2] ?? 'https://bubble-1-kafq.onrender.com';

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

for (const [name, messages] of Object.entries(conversations)) {
  console.log(`\n===== ${name} =====`);
  let sessionId;
  for (const message of messages) {
    console.log(`YOU:    ${message}`);
    try {
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId }),
      });
      const data = await res.json();
      sessionId = data.sessionId;
      const flags = [data.fallback && 'FALLBACK', data.limited && 'LIMITED'].filter(Boolean).join(' ');
      console.log(`BUBBLE: ${data.reply ?? data.error}   [mood=${data.mood} risk=${data.risk}${flags ? ' ' + flags : ''}]`);
    } catch (error) {
      console.log(`ERROR:  ${error.message}`);
    }
  }
}
