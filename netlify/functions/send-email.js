// LaTAFU - Send Email — Netlify Function
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD
  }
});

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { type, to, name, data } = body;
  if (!type || !to) return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Missing fields' }) };

  const BASE_URL = process.env.BASE_URL || 'https://your-site.netlify.app';

  try {
    let subject, html;

    switch (type) {
      case 'welcome_student':
        subject = 'Welcome to LaTAFU 🎓';
        html = base(`<h2>Welcome, ${name}! 🎓</h2><p>You're now part of LaTAFU — the AI-powered platform that connects you with the best local teachers.</p><a href="${BASE_URL}/student/search.html" class="btn">Find Your Teacher →</a>`);
        break;
      case 'welcome_teacher':
        subject = 'Welcome to LaTAFU — Your Teacher Profile is Live!';
        html = base(`<h2>Your Profile is Live, ${name}!</h2><p>Complete your <span style="color:#F5A623;font-weight:700">LeUHaute™ AI Interview</span> to get your score and stand out.</p><a href="${BASE_URL}/teacher/leuhaufe.html" class="btn">Start LeUHaute Interview →</a>`);
        break;
      case 'chat_unlocked':
        subject = 'Chat Unlocked — Continue your conversation!';
        html = base(`<h2>Chat Unlocked! 💬</h2><p>Hi ${name}, a student has unlocked your conversation.</p><a href="${BASE_URL}/teacher/chat.html?chatId=${data?.chatId}" class="btn">Open Conversation →</a>`);
        break;
      case 'leuhaufe_complete':
        subject = `Your LeUHaute Score is Ready — ${data?.score}/100`;
        html = base(`<h2>Your LeUHaute™ Score: <span style="color:#F5A623">${data?.score}/100</span></h2><p>Tier: <strong style="color:#F5A623">${data?.tier}</strong></p><p>${data?.verdict}</p><a href="${BASE_URL}/teacher/leuhaufe.html" class="btn">View Full Score →</a>`);
        break;
      case 'new_message':
        subject = `New message from ${data?.senderName} on LaTAFU`;
        html = base(`<h2>New Message 💬</h2><p>Hi ${name}, you have a new message from <strong>${data?.senderName}</strong>.</p><a href="${BASE_URL}/student/chat.html?chatId=${data?.chatId}" class="btn">View Message →</a>`);
        break;
      case 'subscription_activated':
        subject = `LaTAFU ${data?.plan} — Activated!`;
        html = base(`<h2>${data?.plan} Activated! ⭐</h2><p>Hi ${name}, your <strong>${data?.plan}</strong> subscription is now active.</p><a href="${BASE_URL}" class="btn">Go to Dashboard →</a>`);
        break;
      default:
        return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Unknown email type' }) };
    }

    await transporter.sendMail({
      from: `LaTAFU <${process.env.NODEMAILER_EMAIL}>`,
      to, subject, html
    });

    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ sent: true }) };
  } catch (err) {
    console.error('[Email]', err);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
  }
};

function base(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:'Segoe UI',sans-serif;background:#F4F7FC;margin:0;padding:40px 20px}.container{max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(13,27,75,0.1)}.header{background:linear-gradient(135deg,#0D1B4B,#1A3A7A);padding:32px;text-align:center}.logo{font-size:28px;font-weight:800;color:white}.logo span{color:#1A73E8}.body{padding:36px}h2{color:#0D1B4B;font-size:22px;margin:0 0 12px}p{color:#6B7A99;font-size:15px;line-height:1.6;margin:0 0 16px}.btn{display:inline-block;background:#1A73E8;color:white;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;text-decoration:none;margin:8px 0}.footer{background:#F4F7FC;padding:20px 36px;text-align:center;font-size:12px;color:#9AAAC8}</style></head><body><div class="container"><div class="header"><div class="logo">La<span>TAFU</span></div></div><div class="body">${content}</div><div class="footer">© 2024 LaTAFU — Learn And Teach Artificially For U</div></div></body></html>`;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}
