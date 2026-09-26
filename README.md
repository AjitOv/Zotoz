# Zotoz Capture — AI-Powered Business Training Platform

> **Record Once. Train Every Employee.**  
> *AI-powered, voice-first, multilingual business knowledge and frontline employee training platform for Indian SMEs.*

---

## 1. Product Overview

Every Indian business owner has immense operational knowledge locked inside their head. Frontline workers repeatedly ask the same questions, manual training drains the owner's time, procedures drift, and high turnover erodes operational consistency.

**Zotoz Capture** transforms everyday owner demonstrations—recorded via phone camera, microphone, or voice memo—into verified standard operating procedures (SOPs), step-by-step visual training modules, knowledge-check quizzes, and a grounded conversational AI assistant in Indian regional languages (Marathi, Hindi, Tamil, Telugu, Gujarati, and English).

### Target SME Verticals:
- **Cafés, Bakeries, Restaurants & Hotels**: Consistency in recipes, hygiene, espresso preparation, table service, billing, and machine maintenance.
- **Retail Shops & Supermarkets**: Stock replenishment, customer returns, opening/closing cash drawers.
- **Manufacturing Workshops & Small Factories**: Tool calibration, machine safety, PPE protocols, quality checks.
- **Clinics & Healthcare Centers**: Sterilization workflows, patient intake, waste disposal.
- **Coaching & Educational Centers**: Class scheduling, inquiry handling, student records.

---

## 2. Technology Stack & Architecture

- **Frontend**:
  - React 19 + TypeScript
  - Vite for instant hot module reloading
  - Tailwind CSS with curated Midnight Navy (`#0B1220`) & Electric Lime (`#B8F34A`) design system
  - Lucide Icons
  - Web Speech API for voice playback in regional accents
  - Canvas Confetti for quiz certification celebration

- **Backend**:
  - Node.js + Express + TypeScript
  - Official Google Gen AI SDK (`@google/genai`)
  - Zod runtime schema validation for deterministic structured JSON
  - Multer for browser video/audio recording uploads
  - Dual Storage Engine: Built-in local persistent JSON database (`server/data/db.json`) + full Supabase PostgreSQL migration schema (`supabase/schema.sql`)

- **AI Engine**:
  - **Google Gemini Flash** (`gemini-3.5-flash` or `gemini-flash-latest` with automatic dynamic fallback)
  - Server-side API key protection (keys are never exposed to client browsers)
  - Strict grounding & zero-hallucination prompts (unknown questions are deflected with *"I couldn't find that instruction in your approved training. Please ask your manager."*)
  - **Zero-Friction Demo Mode**: The application runs completely without an API key by using labeled high-fidelity Indian SME demonstration data and local pattern matching.

---

## 3. Quick Start (Run Locally)

### Prerequisites:
- Node.js v18+ (tested on v20.20.2)
- npm v9+

### 1. Install Dependencies
```bash
# In the repository root
npm run install:all
```
*(Or install separately: `npm install` in root, `cd server && npm install`, and `cd client && npm install`)*

### 2. Configure Environment (Optional)
Copy `.env.example` to `server/.env` or root `.env`:
```bash
cp .env.example server/.env
```
Add your free Gemini API key from [Google AI Studio](https://aistudio.google.com/):
```env
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash
PORT=5001
```
*Note: If no API key is provided, Zotoz automatically boots in **Demo Mode** with full functionality for demonstrations and presentations.*

### 3. Start Frontend & Backend Concurrently
```bash
# From root directory:
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5001`

---

## 4. End-to-End Startup Judge & Investor Demonstration Script

The application includes seeded demonstration data for **Apex Supplies (SME · Business supplies, Pune)**, including owner **Vikram Mehta** and frontline warehouse & dispatch associates **Rahul Sharma** (English), **Priya Patil** (Marathi), and **Amit Kumar** (Hindi).

Follow this step-by-step walkthrough to present the product:

1. **Open the Owner Overview**:
   - Navigate to `http://localhost:5173` as **Vikram Mehta (Owner)**.
   - Inspect the KPI summary: active employees, approved SOPs, average quiz scores, and employee Q&A feed.
2. **Create New Training**:
   - Click **"+ Capture New SOP"**.
   - Test Step 1: Either record a live camera video, record voice with the microphone, or click **"Apex Dispatch Template"** to load the 7-step parcel packaging and dispatch workflow.
   - Click **"Next: Add Training Details"** to specify the target role (*Packaging & Dispatch Associate*), department (*Warehouse & Logistics*), and safety/packaging rules (*Always double-tape boxes weighing over 5kg*).
   - Click **"Generate AI SOP & Quiz"**: Watch the sequential real-time AI stages extract numbered steps, expected outcomes, warnings, and 5 quiz questions.
3. **Owner Review & Localization**:
   - In the **Training Library**, review the draft SOP.
   - Test step refinement: Click **"AI Refine"** on Step 2 or 4 with custom instructions.
   - Click **"मराठी (MR)"** or **"हिन्दी (HI)"** in the language switcher: Observe how the SOP dynamically translates into natural regional Marathi with technical barista terminology and temperatures preserved.
   - Test **"Listen (Marathi)"** to hear browser speech synthesis.
   - Click **"Publish Version"** to certify the SOP.
4. **Assign Training**:
   - Click **"Assign to Staff"**, select **Priya Patil**, and confirm.
5. **Switch to Frontline Employee**:
   - In the sidebar **Demo Persona Switcher**, select **Priya Patil (Marathi Learner)**.
   - The interface switches to the **My Training Portal**.
   - Open **"Cappuccino Preparation"** in Marathi.
   - Step through each card: observe instructions, warnings, and mark steps complete (progress updates in real time).
6. **Take the Assessment Quiz**:
   - Switch to **"2. Knowledge Quiz"**.
   - Answer the 5 scenario questions.
   - Submit: Watch the real-time score evaluation and **celebratory confetti** on passing (>=80%)!
7. **Ask the Grounded AI Knowledge Assistant**:
   - Open **"AI Knowledge Assistant"**.
   - Ask in Marathi: *"दूध किती तापमानापर्यंत वाफवायचे आहे?"* or in English: *"What is the coffee bean dose?"*.
   - See the grounded answer citing **Step 4** and **Step 2**.
   - Ask an unapproved inquiry: *"Can I give 50% discount to friends?"* → Observe the strict deflection *"I couldn't find that instruction in your approved training. Please ask your manager."* and the **Escalate to Owner** action.
8. **Verify Owner Analytics**:
   - Switch back to **Vikram Mehta (Owner)** in the Demo Switcher.
   - Open **Training Analytics**: See Priya's completion status, updated pass score, and compliance audit log!

---

## 5. Database Schema & Supabase Setup

A PostgreSQL schema with UUIDs, foreign keys, and Row Level Security (RLS) policies is located at:
[`supabase/schema.sql`](file:///Users/ajitovhal/Zotoz/supabase/schema.sql)

### Supabase Tables:
- `businesses`: Operational profile and default language
- `users`: Owner, Trainer, and Employee profiles with role check constraints
- `training_modules`: Department, target role, and status (`draft`, `published`, `archived`)
- `training_versions`: Version-controlled SOP JSON and quiz JSON
- `training_assignments`: Employee assignments and deadlines
- `training_progress`: Step completion tracking and last step resumed
- `quiz_attempts`: Score, answers, pass/fail, and attempts history
- `training_translations`: Localized SOPs and quizzes for Indian languages
- `knowledge_questions`: Employee Q&A logs, sources, and escalation flags
- `processing_jobs`: AI background generation status

---

## 6. Deployment Guide

### Option A: Cloud Run / Docker
Deploy using the provided `server` and static frontend build:
```bash
npm run build
```
Serve frontend static files from the Express backend or deploy frontend to Vercel/Netlify with backend on Google Cloud Run.

### Option B: Railway / Render
1. Set Environment Variables in dashboard:
   - `GEMINI_API_KEY`: Your Google Gen AI API key
   - `GEMINI_MODEL`: `gemini-2.5-flash`
   - `PORT`: `5001`
2. Start command:
   ```bash
   node server/dist/index.js
   ```

---

## 7. Current Implementation & Roadmap

### Fully Implemented in this MVP:
- [x] Responsive SaaS dashboard with Midnight Navy & Electric Lime branding
- [x] Demo Persona Switcher (Owner, English, Marathi, Hindi learners)
- [x] Video & voice media capture directly from browser camera/mic
- [x] Gemini Flash structured SOP generator with Zod schema validation
- [x] Step-level AI regeneration with custom owner instructions
- [x] Multilingual SOP translation (Marathi, Hindi, Tamil, etc.)
- [x] 5-Question Knowledge Check Quiz generation and automatic scoring
- [x] Frontline employee learning player with progress persistence
- [x] Audio read-aloud via Web Speech API in localized accents
- [x] Grounded Conversational AI Assistant citing approved SOP steps
- [x] Owner Training Analytics & Audit log with weak topics analysis
- [x] 4-step Business Onboarding Wizard
- [x] Resettable demo state with 1-click reset action
- [x] Dual local JSON persistence + Supabase SQL migration schema

### Future Roadmap:
- [ ] Computer vision frame extraction to auto-generate photo step cards from video clips
- [ ] WhatsApp Business bot integration for frontline employees to receive SOP links and take quizzes directly on WhatsApp
- [ ] Push notifications for overdue compliance deadlines
- [ ] Multi-store franchise dashboard for restaurant chains
