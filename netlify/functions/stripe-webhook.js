// LaTAFU - Stripe Webhook — Netlify Function
const Stripe = require('stripe');
const admin = require('firebase-admin');

// Init Firebase Admin (singleton)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}
const db = admin.firestore();

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = event.headers['stripe-signature'];

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[Webhook] Signature failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const obj = stripeEvent.data.object;
  const meta = obj.metadata || {};

  try {
    // =====================
    // CHAT UNLOCK
    // =====================
    if (stripeEvent.type === 'checkout.session.completed' && meta.type === 'chat_unlock') {
      await db.collection('chats').doc(meta.chatId).update({
        unlocked: true,
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentSession: obj.id
      });
      await db.collection('payments').add({
        type: 'chat_unlock',
        studentUid: meta.studentUid,
        teacherUid: meta.teacherUid,
        chatId: meta.chatId,
        amount: obj.amount_total,
        currency: obj.currency,
        sessionId: obj.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // =====================
    // STUDENT PRO ACTIVATED
    // =====================
    if (stripeEvent.type === 'checkout.session.completed' && meta.type === 'student_pro') {
      await db.collection('students').doc(meta.studentUid).update({
        subscription: 'pro',
        subscriptionStart: admin.firestore.FieldValue.serverTimestamp(),
        stripeCustomerId: obj.customer
      });
      await db.collection('payments').add({
        type: 'student_pro',
        studentUid: meta.studentUid,
        amount: obj.amount_total,
        currency: obj.currency,
        sessionId: obj.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // =====================
    // TEACHER PLUS ACTIVATED
    // =====================
    if (stripeEvent.type === 'checkout.session.completed' && meta.type === 'teacher_plus') {
      await db.collection('teachers').doc(meta.teacherUid).update({
        subscription: 'plus',
        subscriptionStart: admin.firestore.FieldValue.serverTimestamp(),
        stripeCustomerId: obj.customer
      });
      await db.collection('payments').add({
        type: 'teacher_plus',
        teacherUid: meta.teacherUid,
        amount: obj.amount_total,
        currency: obj.currency,
        sessionId: obj.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // =====================
    // SUBSCRIPTION CANCELLED
    // =====================
    if (stripeEvent.type === 'customer.subscription.deleted') {
      const studSnap = await db.collection('students').where('stripeCustomerId', '==', obj.customer).get();
      studSnap.forEach(d => d.ref.update({ subscription: 'free' }));
      const teachSnap = await db.collection('teachers').where('stripeCustomerId', '==', obj.customer).get();
      teachSnap.forEach(d => d.ref.update({ subscription: 'free' }));
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('[Webhook] Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
