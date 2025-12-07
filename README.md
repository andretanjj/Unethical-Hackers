# Juice Shop Coach 🍊🧠  
_A non-spoiler coaching overlay for OWASP Juice Shop_

## Problem Statement

OWASP Juice Shop is an amazing intentionally vulnerable web app, but for many beginners it’s overwhelming:

- The app exposes **dozens of challenges** without clear sequencing.
- Built-in hints and online writeups often become **full spoilers**, turning learning into copy-paste.
- Instructors and CTF organisers have **no visibility** into where learners struggled (how many hints, which vuln types, etc.).

There is a gap between “here’s a vulnerable app” and “here’s how to think like a web attacker in a structured way”.

## Solution

**Juice Shop Coach** is a Chrome extension that overlays a small “coach panel” on top of OWASP Juice Shop (running locally on `localhost:3000`).

It turns Juice Shop from a free-form playground into a **guided learning experience**:

- Non-spoiler hint ladders per challenge
- Beginner / Explorer / Trainer **competency modes** that control how many hints you’re allowed to see
- Per-challenge notes and hint usage tracking
- A “Recommended next challenge” based on categories where you’re weaker
- A Trainer view with history and JSON export for analysis

Rather than just giving answers, the coach focuses on **how to think**: where to look in the UI, what to inspect, which tools to use (DevTools, Burp, etc.), and how to reason about common web vulnerabilities.

## Future Implementation

Planned extensions beyond this hackathon:

- **Backend sync & dashboards**  
  - Store coach data server-side by an anonymous “coach ID”  
  - Multi-device continuity and instructor dashboards for cohorts
- **Security taxonomy & skills reporting**  
  - Tag challenges with OWASP Top 10 / CWE IDs  
  - Aggregate stats like “XSS: 3 solved, avg 2 hints; Access Control: 1 solved, avg 4 hints”
- **Richer export / reports**  
  - Human-readable learning reports (PDF/HTML) summarising progress and weak areas
- **Deeper tool usage prompts**  
  - More hints that explicitly guide learners to use DevTools, Burp Suite, etc., mirroring real-world workflows

---

## Requirements

- **OWASP Juice Shop** running locally (via Docker or any other method)
  - Must be accessible at `http://localhost:3000`
- **Google Chrome** (or Chromium-based browser with extension Dev Mode)
- No additional runtimes or package managers are required for the extension itself.

> 💡 This project does **not** currently depend on Python libraries or a virtual environment. A backend is optional future work, not required to use the extension.

---

## Getting Started

### 1. Run OWASP Juice Shop (Docker)

If you have Docker installed, you can start Juice Shop with:

```bash
docker pull bkimminich/juice-shop
docker run --rm -p 3000:3000 bkimminich/juice-shop
```
Wait until the container logs show that the app is listening on port 3000, then open: http://localhost:3000 in Chrome.

### 2. Load the Extension in Chrome
1. Open chrome://extensions in Chrome.
2. Turn on Developer mode (toggle in the top-right).
3. Click “Load unpacked”.
4. Select the extension/ folder from this repository (the one containing manifest.json, content.js, style.css).
5. Ensure the extension is enabled.

### 3. Use Juice Shop Coach
1. Refresh http://localhost:3000.
2. You should see the Juice Shop Coach panel appear as a floating overlay on the right.

## Features
- Draggable: Click and drag on the panel to move it.
- Resizable: Drag from the bottom-right corner.
- Minimisable: Use the _ button to collapse into an orange circular “juice cup” icon.

### Competency Modes You Can Choose:
- Beginner: Max hints, step-by-step conceptual guidance.
- Explorer: Fewer hints (about half); encourages more self-exploration.
- Trainer: Minimal / no hints, aimed at experienced users or instructors.
_You can switch competency later with the “Change” button (this refreshes how many hints are available per challenge)._

### Non-Spoiler Hint Ladders
- Hints focus on where to look and how to think, not the final payload.
- The number of hints you can reveal is capped by your mode.

### Per-Challenge Notes & Hint Tracking
For every challenge, the coach stores:
- maxHintSeen: Number of hints the user has revealed
- notes: User's own free-text reflections (“what worked / what didn’t”)
_This is stored in the browser (localStorage) so that:_
_Closing and reopening the app keeps your coach state._
_You can see how heavily you relied on hints, per challenge_

### Recommended Next Challenge
- Analyses your history across categories (e.g. XSS, directory listing, etc.).
- For each category it considers:
    - How many hints you used there.
    - How many challenges you’ve solved there.
- It computes a simple “weakness score” and picks:
    - The weakest category that still has unsolved challenges.
    - Within that category, the easiest unsolved challenge (by difficulty).
_This gently nudges you toward areas where you need more practice, instead of just letting you pick randomly_

### Trainer History View
When you’re in Trainer mode, the panel shows a Trainer History section:
    - A list of challenges where you used hints or wrote notes.
    For each challenge:
        - Name
        - Number of hints used
        - A short snippet of your notes
    - There is also:
        - A Coach ID _(an anonymous ID like user-abc123)_ to identify this learner.
        - A Reset coach history button that clears all hints used and notes for the current browser.
        - An Export JSON button
