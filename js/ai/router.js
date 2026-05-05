// LaTAFU - AI Router
// Routes requests through: Groq → Mistral → HuggingFace → Gemini
// All API calls go through /api/ serverless functions (keys never in frontend)

const AI_ENDPOINT = '/api/ai-router';

// =====================
// CORE ROUTER
// =====================
export async function callAI({ prompt, system = '', task = 'general', preferFast = false }) {
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, system, task, preferFast })
    });
    if (!res.ok) throw new Error('AI router failed');
    const data = await res.json();
    return data.text || '';
  } catch (err) {
    console.error('[AI Router]', err);
    return null;
  }
}

// =====================
// CHAT MONITOR
// =====================
export async function monitorMessage(message, context = {}) {
  const system = `You are LaTAFU's AI safety monitor for a teacher-student marketplace.
Your job is to detect if a message contains contact information or attempts to move communication off-platform.

Detect ALL of these:
- Phone numbers (written normally, as words, with spaces, dots, dashes, unicode, or obfuscated)
- Email addresses (written normally, with "dot", "at", "@", "gmail", "yahoo", etc.)
- Social media handles or usernames (WhatsApp, Instagram, Telegram, Snapchat, etc.)
- Requests to communicate outside the platform
- Coded language to share contact info (e.g. "my number starts with 98...")
- Any attempt to bypass the payment system

Respond ONLY in this exact JSON format:
{
  "safe": true/false,
  "reason": "brief reason if not safe, empty string if safe",
  "severity": "low/medium/high",
  "suggestion": "helpful message to show the user"
}`;

  const prompt = `Message to analyze: "${message}"
Sender role: ${context.role || 'unknown'}
Conversation ID: ${context.chatId || 'unknown'}`;

  const result = await callAI({ prompt, system, task: 'monitor', preferFast: true });
  try {
    const clean = result.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    // If parsing fails, default to safe (don't block legitimate messages)
    return { safe: true, reason: '', severity: 'low', suggestion: '' };
  }
}

// =====================
// LEUHAUFE INTERVIEW
// =====================
export async function runLeuhaufeInterview(teacherProfile, previousMessages = []) {
  const system = `You are LaTAFU's LeUHaute AI — an intelligent interviewer that evaluates teachers for a premium tutoring marketplace.

You conduct a professional, conversational interview to assess:
1. Teaching Clarity — How well they explain concepts
2. Subject Mastery — Depth of knowledge in their subject
3. Student Patience — How they handle struggling students
4. Problem Solving Style — Their approach to learning challenges
5. Communication Quality — How they interact and communicate

Ask ONE question at a time. Be professional but conversational.
After exactly 10 exchanges, output your final scoring JSON.

If you have asked 10 questions, respond with ONLY this JSON (no other text):
{
  "complete": true,
  "scores": {
    "teachingClarity": 85,
    "subjectMastery": 90,
    "studentPatience": 78,
    "problemSolvingStyle": 82,
    "communicationQuality": 88
  },
  "overall": 85,
  "tier": "Gold",
  "verdict": "2-3 sentence AI verdict about this teacher"
}

Otherwise just ask the next interview question naturally.`;

  const messages = [
    { role: 'user', content: `Teacher Profile: ${JSON.stringify(teacherProfile)}. Please begin the interview.` },
    ...previousMessages
  ];

  const result = await callAI({
    prompt: JSON.stringify(messages),
    system,
    task: 'leuhaufe'
  });

  // Check if interview is complete
  try {
    const clean = result.replace(/```json|```/g, '').trim();
    if (clean.includes('"complete": true')) {
      return { done: true, data: JSON.parse(clean) };
    }
  } catch {}

  return { done: false, message: result };
}

// =====================
// STUDENT ASSISTANT
// =====================
export async function askStudentAssistant(question, context = {}) {
  const system = `You are LaTAFU's friendly AI student assistant.
You help students:
- Find the right teacher for their needs
- Answer questions about subjects they're studying
- Explain concepts clearly
- Guide them through the platform

Keep responses concise, helpful, and encouraging.
If they ask something very complex, suggest they hire a teacher on LaTAFU.
Platform context: ${JSON.stringify(context)}`;

  return await callAI({ prompt: question, system, task: 'assistant' });
}

// =====================
// LEUHAUFE TIER CALCULATOR
// =====================
export function calculateTier(score) {
  if (score >= 93) return { tier: 'Platinum', color: '#E5E4E2', emoji: '💎' };
  if (score >= 85) return { tier: 'Gold', color: '#F5A623', emoji: '🥇' };
  if (score >= 75) return { tier: 'Silver', color: '#C0C0C0', emoji: '🥈' };
  return { tier: 'Bronze', color: '#CD7F32', emoji: '🥉' };
}
