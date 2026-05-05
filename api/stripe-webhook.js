// LaTAFU - Stripe Webhook Handler
import Stripe from 'stripe';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Init Firebase Admin
let adminDb;
try {
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  }, 'admin');
  adminDb = getFirestore(app);
} catch (e) {
  adminDb = getFirestore();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const { type, data } = event;
  const obj = data.object;
  const meta = obj.metadata || {};

  try {
    // =====================
    // CHAT UNLOCK SUCCESS
    // =====================
    if (type === 'checkout.session.completed' && meta.type === 'chat_unlock') {
      await adminDb.collection('chats').doc(meta.chatId).update({
        unlocked: true,
        unlockedAt: new Date(),
        paymentSession: obj.id
      });

      // Record payment
      await adminDb.collection('payments').add({
        type: 'chat_unlock',
        studentUid: meta.studentUid,
        teacherUid: meta.teacherUid,
        chatId: meta.chatId,
        amount: obj.amount_total,
        currency: obj.currency,
        sessionId: obj.id,
        createdAt: new Date()
      });
    }

    // =====================
    // STUDENT PRO
    // =====================
    if (type === 'checkout.session.completed' && meta.type === 'student_pro') {
      await adminDb.collection('students').doc(meta.studentUid).update({
        subscription: 'pro',
        subscriptionStart: new Date(),
        stripeCustomerId: obj.customer
      });
    }

    // =====================
    // TEACHER PLUS
    // =====================
    if (type === 'checkout.session.completed' && meta.type === 'teacher_plus') {
      await adminDb.collection('teachers').doc(meta.teacherUid).update({
        subscription: 'plus',
        subscriptionStart: new Date(),
        stripeCustomerId: obj.customer
      });
    }

    // =====================
    // SUBSCRIPTION CANCELLED
    // =====================
    if (type === 'customer.subscription.deleted') {
      // Find user by stripeCustomerId and downgrade
      const studentsSnap = await adminDb.collection('students')
        .where('stripeCustomerId', '==', obj.customer).get();
      studentsSnap.forEach(d => d.ref.update({ subscription: 'free' }));

      const teachersSnap = await adminDb.collection('teachers')
        .where('stripeCustomerId', '==', obj.customer).get();
      teachersSnap.forEach(d => d.ref.update({ subscription: 'free' }));
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Webhook]', err);
    res.status(500).json({ error: err.message });
  }
}

export const config = { api: { bodyParser: false } };
