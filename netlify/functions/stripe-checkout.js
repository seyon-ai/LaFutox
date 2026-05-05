// LaTAFU - Stripe Checkout — Netlify Function
const Stripe = require('stripe');

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

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { type, studentUid, teacherUid, chatId } = body;
  const BASE_URL = process.env.BASE_URL || 'https://your-site.netlify.app';

  try {
    // =====================
    // CHAT UNLOCK — $1.99
    // =====================
    if (type === 'chat_unlock') {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'LaTAFU Chat Unlock',
              description: 'Unlock full conversation with your teacher'
            },
            unit_amount: 199
          },
          quantity: 1
        }],
        metadata: { type: 'chat_unlock', studentUid, teacherUid, chatId },
        success_url: `${BASE_URL}/student/chat.html?chatId=${chatId}&unlocked=true`,
        cancel_url: `${BASE_URL}/student/chat.html?chatId=${chatId}`
      });
      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ url: session.url }) };
    }

    // =====================
    // STUDENT PRO — $9/mo
    // =====================
    if (type === 'student_pro') {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{ price: process.env.STRIPE_STUDENT_PRO_PRICE_ID, quantity: 1 }],
        metadata: { type: 'student_pro', studentUid },
        success_url: `${BASE_URL}/student/subscription.html?success=true`,
        cancel_url: `${BASE_URL}/student/subscription.html`
      });
      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ url: session.url }) };
    }

    // =====================
    // TEACHER PLUS — $14/mo
    // =====================
    if (type === 'teacher_plus') {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{ price: process.env.STRIPE_TEACHER_PLUS_PRICE_ID, quantity: 1 }],
        metadata: { type: 'teacher_plus', teacherUid },
        success_url: `${BASE_URL}/teacher/subscription.html?success=true`,
        cancel_url: `${BASE_URL}/teacher/subscription.html`
      });
      return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ url: session.url }) };
    }

    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Unknown payment type' }) };

  } catch (err) {
    console.error('[Stripe Checkout]', err);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}
