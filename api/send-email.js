// LaTAFU - Email Sender (Nodemailer + Gmail SMTP)
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD
  }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, to, name, data } = req.body;
  if (!type || !to) return res.status(400).json({ error: 'Missing fields' });

  try {
    let subject, html;

    switch (type) {

      case 'welcome_student':
        subject = 'Welcome to LaTAFU 🎓';
        html = welcomeStudentTemplate(name);
        break;

      case 'welcome_teacher':
        subject = 'Welcome to LaTAFU — Your Teacher Profile is Live!';
        html = welcomeTeacherTemplate(name);
        break;

      case 'chat_unlocked':
        subject = 'Chat Unlocked — Continue your conversation!';
        html = chatUnlockedTemplate(name, data);
        break;

      case 'leuhaufe_complete':
        subject = `Your LeUHaute Score is Ready — ${data.score}/100`;
        html = leuhaufeTemplate(name, data);
        break;

      case 'new_message':
        subject = `New message from ${data.senderName} on LaTAFU`;
        html = newMessageTemplate(name, data);
        break;

      case 'subscription_activated':
        subject = `LaTAFU ${data.plan} — Activated!`;
        html = subscriptionTemplate(name, data);
        break;

      default:
        return res.status(400).json({ error: 'Unknown email type' });
    }

    await transporter.sendMail({
      from: `LaTAFU <${process.env.NODEMAILER_EMAIL}>`,
      to, subject, html
    });

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error('[Email]', err);
    return res.status(500).json({ error: err.message });
  }
}

// =====================
// EMAIL TEMPLATES
// =====================
const base = (content) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', sans-serif; background: #F4F7FC; margin: 0; padding: 40px 20px; }
  .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(13,27,75,0.1); }
  .header { background: linear-gradient(135deg, #0D1B4B, #1A3A7A); padding: 32px; text-align: center; }
  .logo { font-size: 28px; font-weight: 800; color: white; letter-spacing: -0.02em; }
  .logo span { color: #1A73E8; }
  .body { padding: 36px; }
  h2 { color: #0D1B4B; font-size: 22px; margin: 0 0 12px; }
  p { color: #6B7A99; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
  .btn { display: inline-block; background: #1A73E8; color: white; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; text-decoration: none; margin: 8px 0; }
  .gold { color: #F5A623; font-weight: 700; }
  .footer { background: #F4F7FC; padding: 20px 36px; text-align: center; font-size: 12px; color: #9AAAC8; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><div class="logo">La<span>TAFU</span></div></div>
  <div class="body">${content}</div>
  <div class="footer">© 2024 LaTAFU — Learn And Teach Artificially For U<br>You're receiving this because you have an account on LaTAFU.</div>
</div>
</body>
</html>`;

function welcomeStudentTemplate(name) {
  return base(`
    <h2>Welcome, ${name}! 🎓</h2>
    <p>You're now part of LaTAFU — the AI-powered platform that connects you with the best local teachers.</p>
    <p>Start by searching for teachers near you, and chat with them directly on the platform.</p>
    <a href="${process.env.BASE_URL}/student/search.html" class="btn">Find Your Teacher</a>
    <p>Need help? Our AI assistant is available inside the platform 24/7.</p>
  `);
}

function welcomeTeacherTemplate(name) {
  return base(`
    <h2>Your Profile is Live, ${name}!</h2>
    <p>Welcome to LaTAFU. Your teacher profile is now visible to students searching for teachers in your area.</p>
    <p>Complete your <span class="gold">LeUHaute AI Interview</span> to get your score and stand out in search results.</p>
    <a href="${process.env.BASE_URL}/teacher/leuhaufe.html" class="btn">Start LeUHaute Interview</a>
  `);
}

function chatUnlockedTemplate(name, data) {
  return base(`
    <h2>Chat Unlocked! 💬</h2>
    <p>Hi ${name}, a student has unlocked your conversation and you can now chat freely.</p>
    <p>Student: <strong>${data.studentName}</strong></p>
    <a href="${process.env.BASE_URL}/teacher/chat.html?chatId=${data.chatId}" class="btn">Open Conversation</a>
  `);
}

function leuhaufeTemplate(name, data) {
  return base(`
    <h2>Your LeUHaute Score: <span class="gold">${data.score}/100</span></h2>
    <p>Hi ${name}, your AI interview is complete. Here's a summary:</p>
    <p><strong>Tier:</strong> <span class="gold">${data.tier}</span><br>
    <strong>Verdict:</strong> ${data.verdict}</p>
    <a href="${process.env.BASE_URL}/teacher/leuhaufe.html" class="btn">View Full Score</a>
    <p>Pro students can now see your score and are more likely to contact you.</p>
  `);
}

function newMessageTemplate(name, data) {
  return base(`
    <h2>New Message 💬</h2>
    <p>Hi ${name}, you have a new message from <strong>${data.senderName}</strong>.</p>
    <a href="${process.env.BASE_URL}/student/chat.html?chatId=${data.chatId}" class="btn">View Message</a>
  `);
}

function subscriptionTemplate(name, data) {
  return base(`
    <h2>${data.plan} Activated! ⭐</h2>
    <p>Hi ${name}, your <strong>${data.plan}</strong> subscription is now active.</p>
    <p>${data.plan === 'Student Pro' ? 'You can now view LeUHaute scores and get unlimited chat access.' : 'You are now featured higher in search results.'}</p>
    <a href="${process.env.BASE_URL}" class="btn">Go to Dashboard</a>
  `);
}
