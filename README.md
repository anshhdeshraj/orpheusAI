# Orpheus: Your Personal Civic Safety Companion

**Orpheus** is a React-based AI-powered safety assistant designed to help residents of **Indianapolis, Indiana** stay safe, informed, and alert. From scam detection to personalized health advisories, Orpheus acts as a digital companion that bridges public safety data with individual awareness.

---

## 🚀 Features

### 🛡️ Scam & Fraud Detection
- Upload screenshots or paste text — Orpheus analyzes content using **Perplexity Sonar API** to detect misinformation, fraud, or phishing attempts.
- Displays confidence scores, highlights risky language, and explains why something may be suspicious.

### 🧠 AI Civic Assistant (Gemma)
- Powered by **Gemini API**, Gemma provides:
  - Public safety tips
  - Scam awareness education
  - Local emergency response guidance
  - Community-specific safety information for Indianapolis

### 🌫️ Personalized Safety Alerts
- Onboarding captures user health info (e.g., asthma, allergies).
- On page load, Orpheus checks real-time **Air Quality Index (AQI)**.
- If AQI is poor, users with sensitive conditions receive custom health advisories.

### 📰 Local News and Advisories
- Pulls **Indianapolis news and emergency updates** from curated **RSS feeds**.
- Ensures users are aware of civic alerts, law enforcement updates, and city-wide changes.

### 💬 Smart Chat Experience
- Combines Sonar (fact-checking) and Gemini (general help) seamlessly.
- Automatically routes user queries to the right service based on intent classification.

### 🎨 Clean UX/UI
- Built fully in React for a responsive and snappy experience.
- Session-based history storage, animated modals, form transitions.
- No backend — lightweight, secure, and fast.

---

## 📍 Why Indianapolis?
With over 870,000 residents, Indianapolis deserves a digital safety companion. Proheus focuses hyper-locally, ensuring:
- Civic resources are relevant.
- Alerts are geographically accurate.
- Users receive content tailored to their environment and health needs.

---

## ⚙️ Technologies Used
- **React.js** – Frontend framework
- **Gemini API** – AI conversational assistant
- **Perplexity Sonar API** – Scam/fake news detection
---

## 🧠 Architecture
- Pure frontend architecture (no backend)
- Uses `sessionStorage` for data persistence during session
- Smart routing logic for AI services
- Dynamic UI modals for warnings and advisories

---

## 💡 Future Improvements
- Backend for user auth and persistent settings
- Notification system for real-time advisories
- Integration with city APIs or 311 systems
- Expansion beyond Indianapolis to other cities

---

## 🙌 Built For
[Chatbot for Public Safety Hackathon](https://chatbot-for-public-safety.devpost.com/)

Orpheus was developed as a working demo and proof-of-concept to demonstrate how AI, civic data, and smart UI can come together to help make communities safer.


## 🔒 Disclaimer
Orpheus is a prototype. For emergencies or real-time safety concerns, always refer to official authorities and public services.

---

## 🧑‍💻 Team
Built with ❤️ by Ansh for the Civic Public Safety Hackathon.
