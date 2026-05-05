// LaTAFU - AI Router — Netlify Function
// Groq → Mistral → HuggingFace → Gemini fallback chain

exports.handler = async function(event, context) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { prompt, system, task, preferFast } = body;
  if (!prompt) return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'No prompt provided' }) };

  const providers = ['groq', 'mistral', 'huggingface', 'gemini'];

  for (const provider of providers) {
    try {
      const text = await callProvider(provider, { prompt, system, task });
      if (text) return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ text, provider })
      };
    } catch (err) {
      console.warn(`[AI Router] ${provider} failed:`, err.message);
      continue;
    }
  }

  return { statusCode: 503, headers: corsHeaders(), body: JSON.stringify({ error: 'All AI providers failed' }) };
};

async function callProvider(provider, { prompt, system }) {
  switch (provider) {
    case 'groq':        return await callGroq(prompt, system);
    case 'mistral':     return await callMistral(prompt, system);
    case 'huggingface': return await callHuggingFace(prompt, system);
    case 'gemini':      return await callGemini(prompt, system);
    default: throw new Error('Unknown provider');
  }
}

async function callGroq(prompt, system) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('No Groq key');
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 1024, temperature: 0.7 })
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callMistral(prompt, system) {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error('No Mistral key');
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'mistral-small-latest', messages, max_tokens: 1024, temperature: 0.7 })
  });
  if (!res.ok) throw new Error(`Mistral ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callHuggingFace(prompt, system) {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) throw new Error('No HuggingFace key');
  const fullPrompt = system ? `${system}\n\nUser: ${prompt}\nAssistant:` : prompt;
  const res = await fetch('https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: fullPrompt, parameters: { max_new_tokens: 512, temperature: 0.7, return_full_text: false } })
  });
  if (!res.ok) throw new Error(`HuggingFace ${res.status}`);
  const data = await res.json();
  return data?.[0]?.generated_text || null;
}

async function callGemini(prompt, system) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('No Gemini key');
  const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }], generationConfig: { maxOutputTokens: 1024, temperature: 0.7 } })
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}
