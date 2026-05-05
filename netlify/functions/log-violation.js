// LaTAFU - Log Violation — Netlify Function
const admin = require('firebase-admin');

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

  const { chatId, senderUid, senderName, role, message, reason, severity, blocked } = body;
  if (!chatId || !message) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Missing fields' }) };
  }

  try {
    await db.collection('violations').add({
      chatId, senderUid, senderName, role,
      message, reason, severity: severity || 'medium',
      blocked: blocked || false,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      reviewed: false
    });

    // Check repeat offenders — flag at 3+ violations
    if (senderUid) {
      const snap = await db.collection('violations').where('senderUid', '==', senderUid).get();
      if (snap.size >= 3) {
        const col = role === 'teacher' ? 'teachers' : 'students';
        await db.collection(col).doc(senderUid).update({
          violationCount: snap.size,
          flaggedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ logged: true }) };
  } catch (err) {
    console.error('[Violation Logger]', err);
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
