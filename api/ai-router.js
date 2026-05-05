// LaTAFU - AI Router Serverless Function (Vercel /api/ai-router.js)
// Groq → Mistral → HuggingFace → Gemini fallback chain
// All secret keys stay here, never in frontend

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, system, task, preferFast } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  // Try each provider in order
  const providers = preferFast
    ? ['groq', 'mistral', 'huggingface', 'gemini']
    : ['groq', 'mistral', 'huggingface', 'gemini'];

  for (const provider of providers) {
    try {
      const text = await callProvider(provider, { prompt, system, task });
      if (text) return res.status(200).json({ text, provider });
    } catch (err) {
      console.warn(`[AI Router] ${provider} failed:`, err.message);
      continue;
    }
  }

  return res.status(503).json({ error: 'All AI providers failed' });
}

// =====================
// PROVIDER IMPLEMENTATIONS
// =====================

async function callProvider(provider, { prompt, system, task }) {
  switch (provider) {
    case 'groq':    return await callGroq(prompt, system);
    case 'mistral': return await callMistral(prompt, system);
    case 'huggingface': return await callHuggingFace(prompt, system);
    case 'gemini':  return await callGemini(prompt, system);
    default: throw new Error('Unknown provider');
  }
}

// --- GROQ ---
async function callGroq(prompt, system) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) throw new Error('No Groq key');

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024,
      temperature: 0.7
    })
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

// --- MISTRAL ---
async function callMistral(prompt, system) {
  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
  if (!MISTRAL_API_KEY) throw new Error('No Mistral key');

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages,
      max_tokens: 1024,
      temperature: 0.7
    })
  });

  if (!res.ok) throw new Error(`Mistral error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

// --- HUGGINGFACE ---
async function callHuggingFace(prompt, system) {
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
  if (!HF_API_KEY) throw new Error('No HuggingFace key');

  const fullPrompt = system ? `${system}\n\nUser: ${prompt}\nAssistant:` : prompt;

  const res = await fetch('https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inputs: fullPrompt,
      parameters: { max_new_tokens: 512, temperature: 0.7, return_full_text: false }
    })
  });

  if (!res.ok) throw new Error(`HuggingFace error: ${res.status}`);
  const data = await res.json();
  return data?.[0]?.generated_text || null;
}

// --- GEMINI (paid fallback) ---
async function callGemini(prompt, system) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) throw new Error('No Gemini key');

  const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
      })
    }
  );

  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}
