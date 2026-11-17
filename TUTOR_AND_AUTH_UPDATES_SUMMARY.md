# CodeKnot – AI Tutor, Focus Mode & Auth Updates Summary

**Project Repository:** [https://github.com/Srija682/exam-twin-ai](https://github.com/Srija682/exam-twin-ai)  
**Active Development Branch:** `development` (`origin/development`)  
**Date:** November 17, 2026  
**Status:** Completed, Verified (Backend & Frontend Tests Passing), and Pushed to `origin/development`

---

## 1. Overview

This document summarizes the latest wave of UI, UX, AI Tutor, WebSocket, and Authentication enhancements implemented on top of `FINAL_CHANGES_AND_IMPLEMENTATION_SUMMARY.md` (`6e96fa0` through `6edc147`).

---

## 2. Authentication & Local Database Improvements

- **Email or Username Login (`352e453`, `b35b992`):**
  - Updated `src/api/routers/auth.py` and `src/api/auth.py` so students can sign in using either their **email address** or **username (`external_student_id`)**.
  - Standardized JWT `sub` claims to always use `external_student_id` while allowing `get_current_student` to fall back cleanly to email lookup.
- **Sign-Up Form Polish (`6e96fa0`, `d7ebb59`):**
  - Disabled aggressive browser password autofill on `frontend/src/pages/auth/SignUpPage.tsx`.
  - Hid duplicate Microsoft Edge / IE native password reveal buttons (`input::-ms-reveal`, `input::-ms-clear`) in `frontend/src/index.css`.
- **Clean Local MySQL Setup:**
  - Reset and initialized the local MySQL database (`exam_twin`) with all 11 application tables and removed legacy SQLite test artifacts.

---

## 3. Real-Time WebSocket Chat & Clear Chat

- **Direct Local WebSocket Connection (`e5afe0e`):**
  - Updated `getWsBaseUrl()` in `frontend/src/api/client.ts` to connect directly to `ws://127.0.0.1:8000` in local development, avoiding Windows Vite WebSocket proxy drops and maintaining a stable **Live WebSocket** indicator.
- **Prominent Clear Chat Action (`e5afe0e`):**
  - Added a dedicated **Clear Chat** button in both standard Tutor Workspace and Focus Mode that clears conversation history over WebSocket (`clear_history`) and REST (`DELETE /api/v1/tutor/history`).
- **Local Dev Loader & Fallback Cleanup (`56aaced`):**
  - Updated `frontend/src/components/ui/GlobalApiLoader.tsx` to avoid displaying misleading cloud cold-start messages during local development.
  - Removed offline quota footnotes from `src/llm/gemini_service.py`.

---

## 4. Clean Source Badges (Removed "Grounded / Ungrounded" Jargon)

- **Upgraded Badge Styling & Copy (`abd2aa8`, `b2e0483`):**
  - Redesigned `CitationBadge` in `frontend/src/components/ui/Badge.tsx` with clear icons and modern visual hierarchy.
  - Replaced technical terms (`grounded`, `ungrounded`, `grounding`) across the Tutor UI and backend prompts with intuitive student-facing labels:
    - **From Course Material** (with citation count)
    - **General Academic Knowledge**
    - **Course Library Active** / **Sources: Course Library PDFs**

---

## 5. Functional 3 Tutor Modes & Interactive Practice Drills

- **All 3 Modes Fully Interactive (`097c3ac`):**
  - **Concept Q&A (`qa`):** Thorough conceptual explanations with verified page citations when PDFs are uploaded.
  - **Socratic Hint (`hint`):** Step-by-step guiding clues and probing questions without spoiling the final answer.
  - **Practice Drill (`practice`):** Interactive multiple-choice practice cards rendered directly inside chat via the new `frontend/src/components/tutor/InteractivePracticeDrill.tsx` component—featuring clickable **A / B / C / D** options, instant **Correct / Incorrect** feedback, retry controls, and expandable explanations.
- **Dynamic Mode UI Feedback:**
  - Switching modes updates the active info banner, input placeholder, submit button (`Ask Tutor` / `Get Socratic Hint` / `Generate Drill`), and one-click **Suggestion Chips**.
- **General Academic Practice Fallback (`src/rag/rag_service.py`):**
  - When no specific `document_ids` are passed (in-chat Practice Drill), `generate_practice_question()` generates 3 clean JSON MCQs using Gemini even before PDFs are uploaded, while preserving strict document checks for `QuizPage.tsx`.

---

## 6. Persistent Focus Mode (`DistractionFreeTutorPage.tsx`)

- **Full Conversation Continuity (`097c3ac`):**
  - Upgraded `frontend/src/pages/tutor/DistractionFreeTutorPage.tsx` from a single-response card to a full persistent chat experience synced with MySQL (`api.tutor.getHistory(50)`) and real-time WebSocket (`/api/v1/tutor/ws`).
  - Added the **3-mode toggle**, **Clear Chat**, **Interactive Practice Drills**, `Enter` to submit (`Shift + Enter` for newline), auto-clearing input, and `Esc` key binding to exit Focus Mode back to `/tutor`.

---

## 7. ChatGPT / Gemini-Style Response Rendering & Direct Answers

- **Rich Markdown + KaTeX Math + Code Blocks (`1010b2f`):**
  - Installed `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, and `katex`.
  - Created `frontend/src/components/tutor/MarkdownMessage.tsx` and KaTeX equation card styles in `frontend/src/index.css`.
  - Tutor responses now render formatted headings with indigo accent bars, bold/italic typography, tables, interactive exam checklists (`- [ ]`), centered KaTeX math formulas (`$$...$$`), dark syntax code blocks with language headers + **Copy** buttons, a gradient **CodeKnot AI** avatar, and a per-message **Copy** action bar.
- **Dynamic Greetings & Zero Repetitive Disclaimers (`8a98e9b`, `6edc147`):**
  - Updated `src/rag/rag_service.py` and `src/rag/prompt_builder.py` so greetings only occur on initial welcome or explicit greetings (`"hi"`, `"hello"`).
  - Removed repetitive `"Hello! I am CodeKnot... Even though this topic isn't in your uploaded documents..."` preambles from every Q&A and Hint prompt so answers jump straight into clean educational content.

---

## 8. Key Files Modified / Added

| File | Purpose |
| :--- | :--- |
| `frontend/src/components/tutor/MarkdownMessage.tsx` | ChatGPT/Gemini-style Markdown, KaTeX math, checklists, tables, and copyable code blocks |
| `frontend/src/components/tutor/InteractivePracticeDrill.tsx` | Interactive in-chat multiple-choice quiz cards with instant scoring & explanations |
| `frontend/src/pages/tutor/AITutorWorkspacePage.tsx` | 3-mode UI controls, suggestion chips, Clear Chat, WebSocket sync, and polished AI cards |
| `frontend/src/pages/tutor/DistractionFreeTutorPage.tsx` | Persistent Focus Mode chat history, WebSocket sync, 3 modes, `Esc` shortcut, and Markdown UI |
| `frontend/src/components/ui/Badge.tsx` | Clean `From Course Material` / `General Academic Knowledge` source badges |
| `frontend/src/api/client.ts` | Direct local WebSocket URL routing (`ws://127.0.0.1:8000`) |
| `frontend/src/index.css` | KaTeX display math card styling and Edge password reveal icon cleanup |
| `src/rag/rag_service.py` | Dynamic greetings, Practice Drill general fallback, direct non-repetitive Q&A/Hint prompts |
| `src/rag/prompt_builder.py` | Direct response instructions without repetitive self-introductions |
| `src/api/auth.py` & `src/api/routers/auth.py` | Email or username login and consistent JWT subject lookup |

---

## 9. Verification Summary

- **Frontend TypeScript & Production Build:** `npm run build` (`tsc -b && vite build`) — **Passed (0 errors)**
- **Frontend Unit Tests:** `npm test` (`vitest run`) — **13/13 Passed**
- **Backend Unit & Integration Tests:**
  - `pytest tests/test_api_auth_and_endpoints.py` — **33/33 Passed**
  - `pytest tests/test_prompt_builder.py tests/test_rag_service.py tests/test_tutor_websocket.py` — **13/13 Passed**
- **Local Services Verified:** FastAPI (`http://127.0.0.1:8000/health` → `200 healthy`) and Vite React (`http://localhost:3000` → `200 OK`).
