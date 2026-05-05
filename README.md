# LaTAFU — Learn And Teach Artificially For U

> AI-powered teacher-student marketplace with LeUHaute™ intelligence scoring, real-time AI chat monitor, and smart local discovery.

---

## 🚀 Quick Setup

### 1. Clone & Deploy to Vercel

```bash
# Push to GitHub
git init
git add .
git commit -m "LaTAFU v1.0"
git remote add origin https://github.com/YOUR_USERNAME/latfu.git
git push -u origin main

# Then import repo on vercel.com → Deploy
```

---

### 2. Set Environment Variables on Vercel

Go to your Vercel project → Settings → Environment Variables and add:

#### Firebase (Public — safe in frontend)
```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_DATABASE_URL=
```

#### Firebase Admin (Secret — server only)
```
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

#### AI APIs (Secret)
```
GROQ_API_KEY=
MISTRAL_API_KEY=
HUGGINGFACE_API_KEY=
GEMINI_API_KEY=
```

#### Payments (Secret)
```
STRIPE_SECRET_KEY=
STRIPE_PUBLIC_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STUDENT_PRO_PRICE_ID=
STRIPE_TEACHER_PLUS_PRICE_ID=
```

#### Images
```
IMGBB_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

#### Maps & Email
```
GOOGLE_MAPS_API_KEY=
NODEMAILER_EMAIL=
NODEMAILER_PASSWORD=
```

#### Platform
```
BASE_URL=https://your-domain.vercel.app
```

---

### 3. Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create project → Enable:
   - **Authentication** → Email/Password
   - **Firestore Database** → Start in production mode
   - **Realtime Database** → Start in locked mode
   - **Storage**
3. Copy config values into `js/firebase-config.js`

#### Firestore Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /students/{uid} {
      allow read, write: if request.auth.uid == uid;
      allow read: if request.auth != null;
    }
    match /teachers/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /chats/{chatId} {
      allow read, write: if request.auth != null &&
        (resource.data.studentUid == request.auth.uid ||
         resource.data.teacherUid == request.auth.uid);
    }
    match /payments/{id} {
      allow read: if request.auth != null;
      allow write: if false; // Only server writes
    }
    match /violations/{id} {
      allow read: if false; // Admin only via server
      allow write: if false;
    }
    match /admins/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

#### Realtime Database Rules
```json
{
  "rules": {
    "chats": {
      "$chatId": {
        "messages": {
          ".read": "auth != null",
          ".write": "auth != null"
        }
      }
    }
  }
}
```

---

### 4. Replace Placeholder Keys in Frontend Files

Search and replace in all HTML/JS files:

| Placeholder | Replace With |
|---|---|
| `YOUR_FIREBASE_API_KEY` | Your Firebase API key |
| `YOUR_GOOGLE_MAPS_KEY` | Your Google Maps API key |
| `YOUR_IMGBB_API_KEY` | Your ImgBB API key |

---

### 5. Stripe Setup

1. Create account at [stripe.com](https://stripe.com)
2. Create two recurring products:
   - **Student Pro** — $9/month → copy Price ID to `STRIPE_STUDENT_PRO_PRICE_ID`
   - **Teacher Plus** — $14/month → copy Price ID to `STRIPE_TEACHER_PLUS_PRICE_ID`
3. Set up webhook pointing to `https://your-domain.vercel.app/api/stripe-webhook`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

---

### 6. Create First Admin Account

1. Go to Firebase Console → Authentication → Add User
2. Add admin email + password manually
3. In Firestore → Create collection `admins` → Add document with the UID:
```json
{
  "uid": "FIREBASE_UID_HERE",
  "name": "Admin",
  "email": "admin@yourdomain.com",
  "createdAt": "server timestamp"
}
```
4. Login at `/auth/admin-login.html`

---

## 📁 File Structure

```
latfu/
├── index.html                    # Landing page
├── vercel.json                   # Vercel config
├── package.json                  # API dependencies
│
├── assets/
│   └── css/
│       ├── global.css            # Variables, typography, utilities
│       ├── components.css        # Buttons, cards, navbars, chat UI
│       └── animations.css        # All animations & transitions
│
├── auth/
│   ├── student-login.html
│   ├── student-signup.html
│   ├── teacher-login.html
│   ├── teacher-signup.html
│   └── admin-login.html
│
├── student/
│   ├── dashboard.html
│   ├── search.html               # Find teachers + map
│   ├── teacher-view.html         # Teacher profile + LeUHaute
│   ├── chat.html                 # Chat + payment gate + AI monitor
│   ├── chats.html                # All conversations list
│   ├── profile.html
│   └── subscription.html
│
├── teacher/
│   ├── dashboard.html
│   ├── profile.html
│   ├── chat.html                 # Chat with AI monitor
│   ├── chats.html
│   ├── leuhaufe.html             # ★ LeUHaute AI Interview
│   ├── earnings.html
│   └── subscription.html
│
├── admin/
│   ├── dashboard.html
│   ├── users.html
│   ├── violations.html           # AI flagged messages
│   ├── leuhaufe-scores.html      # All teacher scores
│   ├── payments.html
│   └── settings.html
│
├── js/
│   ├── firebase-config.js        # Firebase init
│   ├── auth.js                   # Auth, sessions, guards
│   └── ai/
│       └── router.js             # AI router + monitor + LeUHaute
│
└── api/                          # Vercel serverless functions
    ├── ai-router.js              # Groq→Mistral→HF→Gemini
    ├── stripe-checkout.js        # Payment sessions
    ├── stripe-webhook.js         # Payment confirmations
    └── send-email.js             # Nodemailer emails
```

---

## ✦ LeUHaute™ System

LeUHaute is LaTAFU's exclusive AI teacher intelligence scoring system.

**How it works:**
1. Teacher visits `/teacher/leuhaufe.html`
2. AI conducts a 10-question interview via Groq/Mistral
3. AI scores 5 dimensions: Teaching Clarity, Subject Mastery, Student Patience, Problem Solving, Communication
4. Score (0–100) + tier (Bronze/Silver/Gold/Platinum) saved to Firestore
5. Pro students see the score on teacher profiles

**Tier thresholds:**
- 🥉 Bronze: 60–74
- 🥈 Silver: 75–84
- 🥇 Gold: 85–92
- 💎 Platinum: 93–100

---

## 🤖 AI Stack

| Provider | Model | Purpose | Cost |
|---|---|---|---|
| Groq | Llama 3.3 70B | Chat monitor (fast) | Free |
| Mistral | mistral-small | LeUHaute interviews | Free |
| HuggingFace | Mixtral-8x7B | Backup AI | Free |
| Gemini | gemini-1.5-flash | Paid fallback | Paid |

Routing: Groq → Mistral → HuggingFace → Gemini

---

## 💰 Revenue Model

| Stream | Amount | Trigger |
|---|---|---|
| Chat Unlock | $1.99/chat | Student hits 10 msg limit |
| Student Pro | $9/month | Student upgrades |
| Teacher Plus | $14/month | Teacher upgrades |

---

## 🛠 Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (ES Modules)
- **Database**: Firebase Firestore + Realtime Database
- **Auth**: Firebase Authentication
- **Chat**: Firebase Realtime Database
- **AI**: Groq + Mistral + HuggingFace + Gemini
- **Payments**: Stripe
- **Images**: ImgBB + Cloudinary
- **Maps**: Google Maps JS API
- **Email**: Nodemailer + Gmail SMTP
- **Hosting**: Vercel (static + serverless functions)

---

## 🔑 Key Replacements Before Deploy

Search entire project for these and replace:

- `YOUR_FIREBASE_API_KEY` → Firebase config values
- `YOUR_GOOGLE_MAPS_KEY` → Google Maps API key
- `YOUR_IMGBB_API_KEY` → ImgBB API key
- `your-latfu-domain.vercel.app` → Your actual Vercel domain

---

Built by AugX — Aug Web Development
