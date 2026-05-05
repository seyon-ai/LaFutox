// LaTAFU - Violation Logger Serverless Function
// Called by frontend when AI monitor flags a message
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminDb;
try {
  const apps = getApps();
  const app = apps.length ? apps[0] : initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
  adminDb = getFirestore(app);
} catch(e) { adminDb = getFirestore(); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { chatId, senderUid, senderName, role, message, reason, severity, blocked } = req.body;
  if (!chatId || !message) return res.status(400).json({ error: 'Missing fields' });

  try {
    await adminDb.collection('violations').add({
      chatId, senderUid, senderName, role,
      message, reason, severity: severity || 'medium',
      blocked: blocked || false,
      timestamp: new Date(),
      reviewed: false
    });

    // Auto-check repeat offenders
    if (senderUid) {
      const userViolations = await adminDb.collection('violations')
        .where('senderUid', '==', senderUid).get();

      if (userViolations.size >= 3) {
        const collection = role === 'teacher' ? 'teachers' : 'students';
        await adminDb.collection(collection).doc(senderUid).update({
          violationCount: userViolations.size,
          flaggedAt: new Date()
        });
      }
    }

    return res.status(200).json({ logged: true });
  } catch(err) {
    console.error('[Violation Logger]', err);
    return res.status(500).json({ error: err.message });
  }
}
