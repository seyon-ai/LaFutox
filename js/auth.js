// LaTAFU - Auth Module
import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  updatePassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =====================
// SESSION HELPERS
// =====================
export function getCurrentUser() {
  return auth.currentUser;
}

export function getStoredRole() {
  return localStorage.getItem('latfu_role'); // 'student' | 'teacher' | 'admin'
}

export function getStoredUid() {
  return localStorage.getItem('latfu_uid');
}

export function clearSession() {
  localStorage.removeItem('latfu_role');
  localStorage.removeItem('latfu_uid');
  localStorage.removeItem('latfu_name');
}

// =====================
// GUARD: redirect if not logged in
// =====================
export function requireAuth(role = null) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = '/auth/student-login.html';
      return;
    }
    if (role) {
      const storedRole = getStoredRole();
      if (storedRole !== role) {
        await signOut(auth);
        clearSession();
        window.location.href = '/auth/student-login.html';
      }
    }
  });
}

export function requireStudentAuth() { requireAuth('student'); }
export function requireTeacherAuth() { requireAuth('teacher'); }
export function requireAdminAuth() { requireAuth('admin'); }

// =====================
// STUDENT SIGNUP
// =====================
export async function signupStudent({ name, email, password, city, lat, lng }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  await setDoc(doc(db, 'students', uid), {
    uid, name, email, city,
    location: { lat, lng },
    subscription: 'free',
    avatar: '',
    bio: '',
    grade: '',
    subjects: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  localStorage.setItem('latfu_role', 'student');
  localStorage.setItem('latfu_uid', uid);
  localStorage.setItem('latfu_name', name);
  return uid;
}

// =====================
// TEACHER SIGNUP
// =====================
export async function signupTeacher({ name, email, password, city, lat, lng, subjects, fee }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  await setDoc(doc(db, 'teachers', uid), {
    uid, name, email, city,
    location: { lat, lng },
    subjects, fee,
    subscription: 'free',
    avatar: '',
    bio: '',
    experience: '',
    qualifications: [],
    availability: [],
    rating: 0,
    reviewCount: 0,
    leuhaufeScore: null,
    leuhaufeTier: null,
    leuhaufeData: null,
    leuhaufeLastRun: null,
    verified: false,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  localStorage.setItem('latfu_role', 'teacher');
  localStorage.setItem('latfu_uid', uid);
  localStorage.setItem('latfu_name', name);
  return uid;
}

// =====================
// LOGIN (shared)
// =====================
export async function loginUser(email, password, role) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  // Verify role matches
  const collection = role === 'admin' ? 'admins' : role === 'teacher' ? 'teachers' : 'students';
  const snap = await getDoc(doc(db, collection, uid));
  if (!snap.exists()) {
    await signOut(auth);
    throw new Error(`No ${role} account found for this email.`);
  }
  const data = snap.data();
  localStorage.setItem('latfu_role', role);
  localStorage.setItem('latfu_uid', uid);
  localStorage.setItem('latfu_name', data.name || 'User');

  // Update last seen
  await updateDoc(doc(db, collection, uid), { lastSeen: serverTimestamp() });

  return { uid, data };
}

// =====================
// LOGOUT
// =====================
export async function logout() {
  const role = getStoredRole();
  clearSession();
  await signOut(auth);
  if (role === 'teacher') window.location.href = '/auth/teacher-login.html';
  else if (role === 'admin') window.location.href = '/auth/admin-login.html';
  else window.location.href = '/auth/student-login.html';
}

// =====================
// PASSWORD RESET
// =====================
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// =====================
// GET USER PROFILE
// =====================
export async function getProfile(uid, role) {
  const collection = role === 'teacher' ? 'teachers' : role === 'admin' ? 'admins' : 'students';
  const snap = await getDoc(doc(db, collection, uid));
  return snap.exists() ? snap.data() : null;
}

// =====================
// UPDATE PROFILE
// =====================
export async function updateProfile(uid, role, data) {
  const collection = role === 'teacher' ? 'teachers' : 'students';
  await updateDoc(doc(db, collection, uid), { ...data, updatedAt: serverTimestamp() });
}
