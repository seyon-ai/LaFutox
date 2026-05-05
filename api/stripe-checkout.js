// LaTAFU - Stripe Checkout Serverless Function
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, studentUid, teacherUid, chatId, planId } = req.body;

  try {
    // =====================
    // CHAT UNLOCK PAYMENT
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
              description: 'Continue chatting with your teacher — unlimited messages'
            },
            unit_amount: 199 // $1.99
          },
          quantity: 1
        }],
        metadata: { type: 'chat_unlock', studentUid, teacherUid, chatId },
        success_url: `${process.env.BASE_URL}/student/chat.html?chatId=${chatId}&unlocked=true`,
        cancel_url: `${process.env.BASE_URL}/student/chat.html?chatId=${chatId}`
      });
      return res.status(200).json({ url: session.url });
    }

    // =====================
    // STUDENT PRO SUBSCRIPTION
    // =====================
    if (type === 'student_pro') {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{
          price: process.env.STRIPE_STUDENT_PRO_PRICE_ID,
          quantity: 1
        }],
        metadata: { type: 'student_pro', studentUid },
        success_url: `${process.env.BASE_URL}/student/subscription.html?success=true`,
        cancel_url: `${process.env.BASE_URL}/student/subscription.html`
      });
      return res.status(200).json({ url: session.url });
    }

    // =====================
    // TEACHER PLUS SUBSCRIPTION
    // =====================
    if (type === 'teacher_plus') {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{
          price: process.env.STRIPE_TEACHER_PLUS_PRICE_ID,
          quantity: 1
        }],
        metadata: { type: 'teacher_plus', teacherUid },
        success_url: `${process.env.BASE_URL}/teacher/subscription.html?success=true`,
        cancel_url: `${process.env.BASE_URL}/teacher/subscription.html`
      });
      return res.status(200).json({ url: session.url });
    }

    return res.status(400).json({ error: 'Unknown payment type' });

  } catch (err) {
    console.error('[Stripe]', err);
    return res.status(500).json({ error: err.message });
  }
}
