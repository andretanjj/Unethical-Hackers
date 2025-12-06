// content.js
(function () {
    'use strict';

    // ---------- CONFIG / CONSTANTS ----------

    const STATE_KEY = 'jsCompanionState_v1';
    const MODES = ['Beginner', 'Explorer', 'Trainer'];
    const USER_ID_KEY = 'jsCompanionUserId_v1';
    const BACKEND_URL = 'http://127.0.0.1:5001'; // backend used only for clearing coach history

    // Minimal hint pack; expand with more challenges later.
    // Keys MUST match challenge.key from /api/Challenges
    const HINTS = {
        "scoreBoardChallenge": {
            hints: [
                "Play around with the tabs in the side menu (three lines) & observe how the url in the browser search bar changes.",
                "Now, guess the url of the hidden score board tab.",
                "Try using localhost:3000/#/score-board."
            ]
        },
        "localXssChallenge": {
            hints: [
                "Look for any place where you can type something in.",
                "Test out all possible places where what you type in will appear in the browser search bar.",
                "Paste the given code into the place."
            ]
        },
        "xssBonusChallenge": {
            hints: [
                "First, solve the 'DOM XSS' challenge. Then, do the exact same with the new given code!"
            ]
        },
        "privacyPolicyChallenge": {
            hints: [
                "Where would privacy policy be located?",
                "Login into your account.",
                "Click on your account & click on the Privacy & Security."
            ]
        },
        "bullyChatbotChallenge": {
            hints: [
                "Access the support chat in the side menu (three lines)",
                "Try to ask for a coupon code (can be creative in asking!)",
                "Keep asking until you get it (seriously.)"
            ]
        },
        "directoryListingChallenge": {
            hints: [
                "Play around with the tabs in the side menu, look for any links that direct you to a new webpage.",
                "The link is specifically inside 'About Us'.",
                "After entering the new webpage, play around with the url.",
                "Try to delete the legal.md in the URL in the browser search bar.",
                "Do you now see a bunch of files? Tap into any other file that seems confidential.",
                "Fine. Click on acquisitions.md."
            ]
        },
        "errorHandlingChallenge": {
            hints: [
                "Complete 'Confidential Document' first. (You may have solved this by then).",
                "Else, try to access other files based on the last step of 'Confidential Document'",
                "Fine. Click on coupons_2013.md.bak."
            ]
        }
    };

    // ---------- STATE MANAGEMENT (localStorage) ----------

    function loadState() {
        try {
            const raw = localStorage.getItem(STATE_KEY);
            if (!raw) {
                return { mode: 'Beginner', competencySelected: false, challengeState: {} };
            }
            const s = JSON.parse(raw);
            // Backwards compatibility for v1 types
            if (typeof s.competencySelected === 'undefined') s.competencySelected = false;
            // Backwards compatibility for minimized state
            if (typeof s.minimized === 'undefined') s.minimized = false;
            return s;
        } catch (e) {
            console.error('Failed to load state', e);
            return { mode: 'Beginner', competencySelected: false, minimized: false, challengeState: {} };
        }
    }

    function saveState(state) {
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save state', e);
        }
    }

    let state = loadState();
    let challenges = [];

    function getChallengeState(chKey) {
        if (!state.challengeState[chKey]) {
            state.challengeState[chKey] = { maxHintSeen: 0, notes: '' };
        }
        return state.challengeState[chKey];
    }

    // ---------- BACKEND & USER ID HELPERS ----------

    function getUserId() {
        let id = localStorage.getItem(USER_ID_KEY);
        if (!id) {
            id = 'user-' + Math.random().toString(36).slice(2, 10);
            localStorage.setItem(USER_ID_KEY, id);
        }
        return id;
    }

    const USER_ID = getUserId();

    function backendClearStateForUser(userId) {
        // Best-effort fire-and-forget call; ignore failures in UI
        if (!BACKEND_URL) return;
        fetch(`${BACKEND_URL}/api/state/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        }).catch(err => {
            console.error('Backend clear state failed', err);
        });
    }

    function resetCoachHistory() {
        if (!confirm('This will clear all hints used and notes for this coach on this browser. Continue?')) {
            return;
        }

        // Clear local challengeState only; keep mode/competency settings
        state.challengeState = {};
        saveState(state);

        // Best-effort backend reset
        backendClearStateForUser(USER_ID);

        // Re-render UI to reflect cleared history
        renderOverlay();
    }

    function computeRecommendedChallenge(challenges, state) {
        if (!challenges || !challenges.length) return null;

        const categoryStats = {};

        challenges.forEach(c => {
            const cat = c.category || 'Other';
            const chState = state.challengeState[c.key] || { maxHintSeen: 0, notes: '' };

            if (!categoryStats[cat]) {
                categoryStats[cat] = { totalHintsUsed: 0, solvedCount: 0, challenges: [] };
            }

            categoryStats[cat].totalHintsUsed += chState.maxHintSeen || 0;
            if (c.solved) categoryStats[cat].solvedCount += 1;
            categoryStats[cat].challenges.push(c);
        });

        // Find weakest category with at least one unsolved challenge
        let weakestCategory = null;
        let weakestScore = -Infinity;

        Object.entries(categoryStats).forEach(([cat, stats]) => {
            const hasUnsolved = stats.challenges.some(ch => !ch.solved);
            if (!hasUnsolved) return;

            const score = (stats.totalHintsUsed + 1) / (stats.solvedCount + 1);
            if (score > weakestScore) {
                weakestScore = score;
                weakestCategory = cat;
            }
        });

        let candidates = [];

        if (weakestCategory) {
            candidates = categoryStats[weakestCategory].challenges.filter(ch => !ch.solved);
        } else {
            // fallback: easiest unsolved overall
            candidates = challenges.filter(ch => !ch.solved);
        }

        if (!candidates.length) return null;

        candidates.sort((a, b) => {
            if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
            return a.name.localeCompare(b.name);
        });

        return candidates[0];
    }

    function exportCoachData() {
        const data = {
            challengeState: state.challengeState || {}
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'juice-shop-coach-notes.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }



    // ---------- HINT LIMIT PER MODE ----------

    function maxHintLevelForMode(mode, numHints) {
        // "Beginner should allow more hints, Explorer lesser, and Trainer the least."
        if (mode === 'Beginner') {
            return numHints; // Show all available hints
        }
        if (mode === 'Explorer') {
            // Show first 50% of hints or at least 1 (unless 0 total)
            return Math.ceil(numHints / 2);
        }
        if (mode === 'Trainer') {
            // Least hints (Level 0 Learning Goal is always shown if hints exist)
            // returning 0 means NO entries from the 'hints' array are shown.
            return 0;
        }
        return numHints;
    }

    // ---------- OVERLAY CREATION ----------

    function createOverlayShell() {
        if (document.getElementById('js-overlay')) return; // already injected

        const overlay = document.createElement('div');
        overlay.id = 'js-overlay';
        overlay.innerHTML = `
      <div id="js-overlay-header">
        <span>Juice Shop Coach</span>
        <div style="display:flex; gap:4px;">
            <button id="js-overlay-min-circle" title="Minimize to icon" style="width:20px; font-size:10px;">_</button>
            <button id="js-overlay-toggle" style="width:auto;font-size:10px;">⏵</button>
        </div>
      </div>
      <div id="js-overlay-body">
        <small>Loading challenges...</small>
      </div>
    `;
        document.body.appendChild(overlay);

        // Apply initial minimized state if saved
        if (state.minimized) {
            overlay.classList.add('js-minimized');
        }

        const minBtn = document.getElementById('js-overlay-min-circle');
        minBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.minimized = true; // Set minimized
            saveState(state);
            overlay.classList.add('js-minimized');
        });

        const toggleBtn = document.getElementById('js-overlay-toggle');
        toggleBtn.addEventListener('click', (e) => {
            // Prevent drag when clicking toggle
            e.stopPropagation();
            if (overlay.style.width === '32px') {
                overlay.style.width = '320px';
                toggleBtn.textContent = '⏵';
            } else {
                overlay.style.width = '32px';
                toggleBtn.textContent = '⏴';
            }
        });

        // Draggable Logic
        const overlayElement = document.getElementById('js-overlay'); // Renamed to avoid conflict with 'overlay' variable
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        overlayElement.addEventListener('mousedown', (e) => {
            // Only left click
            if (e.button !== 0) return;

            // Don't drag if clicking on interactive elements
            if (['SELECT', 'BUTTON', 'TEXTAREA', 'INPUT'].includes(e.target.tagName)) {
                return;
            }

            // Don't drag if clicking the resize handle (approx bottom-right 20px)
            const bounds = overlayElement.getBoundingClientRect();
            if (e.clientX > bounds.right - 20 && e.clientY > bounds.bottom - 20) {
                return; // Let native resize handle it
            }

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            // Get current computed position
            // We can reuse 'bounds' here as it represents current state
            initialLeft = bounds.left;
            initialTop = bounds.top;

            // Ensure we are positioning by left/top now, clearing right if set
            overlayElement.style.right = 'auto';
            overlayElement.style.left = `${initialLeft}px`;
            overlayElement.style.top = `${initialTop}px`;

            // Optional: visual feedback
            overlayElement.style.transition = 'none'; // Disable transition during drag
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            overlay.style.left = `${initialLeft + dx}px`;
            overlay.style.top = `${initialTop + dy}px`;
        });

        document.addEventListener('mouseup', (e) => {
            if (isDragging) {
                isDragging = false;
                overlayElement.style.transition = '';

                // If it was a quick click on the minimized circle (not a drag), restore it
                if (state.minimized) {
                    // Check if effective drag distance was small
                    const dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
                    if (dist < 5) {
                        state.minimized = false;
                        saveState(state);
                        overlayElement.classList.remove('js-minimized');
                    }
                }
            }
        });
    }

    // ---------- RENDERING UI ----------

    function renderOverlay() {
        const body = document.getElementById('js-overlay-body');
        if (!body) return;

        body.innerHTML = '';

        // 1. Competency Selection Screen
        if (!state.competencySelected) {
            const h3 = document.createElement('h3');
            h3.textContent = 'Select Competency';
            h3.style.marginTop = '0';
            body.appendChild(h3);

            const desc = document.createElement('p');
            desc.textContent = 'How confident are you with web security?';
            body.appendChild(desc);

            MODES.forEach(m => {
                const btn = document.createElement('button');
                btn.style.display = 'block';
                btn.style.marginBottom = '8px';
                btn.style.padding = '8px';
                btn.style.textAlign = 'left';

                let subtext = '';
                if (m === 'Beginner') subtext = '(Max Hints)';
                if (m === 'Explorer') subtext = '(Fewer Hints)';
                if (m === 'Trainer') subtext = '(Minimal/No Hints)';

                btn.innerHTML = `<strong>${m}</strong> <span style="opacity:0.7;font-size:10px">${subtext}</span>`;

                btn.onclick = () => {
                    state.mode = m;
                    state.competencySelected = true;
                    saveState(state);
                    renderOverlay();
                };
                body.appendChild(btn);
            });
            return;
        }

        // 2. Main Challenge Screen

        // Header: Current Mode + Change Button
        const headerRow = document.createElement('div');
        headerRow.style.display = 'flex';
        headerRow.style.justifyContent = 'space-between';
        headerRow.style.alignItems = 'center';
        headerRow.style.marginBottom = '8px';

        const modeBadge = document.createElement('span');
        modeBadge.textContent = `Mode: ${state.mode}`;
        modeBadge.style.fontSize = '11px';
        modeBadge.style.fontWeight = 'bold';
        modeBadge.style.opacity = '0.9';
        headerRow.appendChild(modeBadge);

        const changeBtn = document.createElement('button');
        changeBtn.textContent = 'Change';
        changeBtn.style.width = 'auto';
        changeBtn.style.fontSize = '10px';
        changeBtn.style.padding = '2px 6px';
        changeBtn.style.margin = '0';
        changeBtn.onclick = () => {
            if (confirm("Changing competency level will refresh the allowable hints. Continue?")) {
                state.competencySelected = false;
                saveState(state);
                renderOverlay();
            }
        };
        headerRow.appendChild(changeBtn);
        body.appendChild(headerRow);

        // Recommended Challenge
        if (challenges.length > 0) {
            const recommended = computeRecommendedChallenge(challenges, state);
            if (recommended) {
                const recBox = document.createElement('div');
                recBox.style.marginBottom = '8px';
                recBox.style.padding = '6px';
                recBox.style.border = '1px solid #444';
                recBox.style.borderRadius = '4px';
                recBox.style.background = 'rgba(255, 255, 255, 0.02)';
                recBox.style.fontSize = '11px';

                recBox.innerHTML = `
                    <div style="font-weight:600; margin-bottom:2px;">Recommended next challenge</div>
                    <div>${recommended.name}</div>
                    <div style="opacity:0.8;">
                        Category: ${recommended.category} | Difficulty: ${recommended.difficulty}★
                    </div>
                `;

                body.appendChild(recBox);
            }
        }


        // Challenge selector
        const chLabel = document.createElement('label');
        chLabel.textContent = 'Challenge:';
        body.appendChild(chLabel);

        const select = document.createElement('select');
        select.id = 'js-challenge-select';

        challenges
            .slice()
            .sort((a, b) => a.difficulty - b.difficulty || a.name.localeCompare(b.name))
            .forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.key;
                const solvedPrefix = c.solved ? '✅ ' : '';
                opt.textContent = `${solvedPrefix}${c.name} [${c.category} | ${c.difficulty}★]`;
                select.appendChild(opt);
            });

        select.addEventListener('change', () => {
            renderChallengeSection(select.value);
        });

        body.appendChild(select);

        const section = document.createElement('div');
        section.id = 'js-challenge-section';
        section.style.marginTop = '8px';
        body.appendChild(section);

        if (challenges.length > 0) {
            renderChallengeSection(select.value || challenges[0].key);
        }

        // Trainer History Section
        if (state.mode === 'Trainer') {
            const historyHeader = document.createElement('div');
            historyHeader.style.marginTop = '16px';
            historyHeader.style.borderTop = '1px solid #ccc';
            historyHeader.style.paddingTop = '8px';
            historyHeader.style.fontWeight = 'bold';
            historyHeader.textContent = 'Trainer History';
            body.appendChild(historyHeader);

            // Coach ID + reset button row
            const trainerInfoRow = document.createElement('div');
            trainerInfoRow.style.display = 'flex';
            trainerInfoRow.style.justifyContent = 'space-between';
            trainerInfoRow.style.alignItems = 'center';
            trainerInfoRow.style.marginBottom = '4px';

            const coachIdSpan = document.createElement('span');
            coachIdSpan.style.fontSize = '10px';
            coachIdSpan.style.opacity = '0.8';
            coachIdSpan.textContent = `Your coach ID: ${USER_ID}`;
            trainerInfoRow.appendChild(coachIdSpan);

            const resetBtn = document.createElement('button');
            resetBtn.textContent = 'Reset coach history';
            resetBtn.style.width = 'auto';
            resetBtn.style.fontSize = '10px';
            resetBtn.style.padding = '2px 6px';
            resetBtn.style.marginLeft = '8px';
            resetBtn.onclick = resetCoachHistory;
            trainerInfoRow.appendChild(resetBtn);

            body.appendChild(trainerInfoRow);

            const historyContainer = document.createElement('div');
            historyContainer.style.fontSize = '11px';
            historyContainer.style.maxHeight = '150px'; // Prevent it from taking too much space
            historyContainer.style.overflowY = 'auto';
            body.appendChild(historyContainer);

            renderHistory(historyContainer);

            // Export Section
            const exportHeader = document.createElement('div');
            exportHeader.style.marginTop = '8px';
            exportHeader.style.fontWeight = '600';
            exportHeader.textContent = 'Export Data';
            body.appendChild(exportHeader);

            const exportBtn = document.createElement('button');
            exportBtn.textContent = 'Export JSON';
            exportBtn.style.fontSize = '10px';
            exportBtn.style.width = '100%';
            exportBtn.style.marginTop = '4px';
            exportBtn.onclick = exportCoachData;
            body.appendChild(exportBtn);
        }
    }

    function renderHistory(section) {
        const entries = Object.entries(state.challengeState);
        if (!entries.length) {
            section.textContent = 'No history yet.';
            return;
        }
        // Filter out empty state entries if any
        const validEntries = entries.filter(([_, info]) => info.maxHintSeen > 0 || info.notes);

        if (!validEntries.length) {
            section.textContent = 'No hints or notes recorded yet.';
            return;
        }

        validEntries.forEach(([key, info]) => {
            const ch = challenges.find(c => c.key === key);
            const name = ch ? ch.name : key;
            const div = document.createElement('div');
            div.style.marginBottom = '8px';
            div.style.paddingBottom = '4px';
            div.style.borderBottom = '1px dotted #eee';

            const noteSnippet = info.notes ? (info.notes.slice(0, 50) + (info.notes.length > 50 ? '...' : '')) : '(none)';

            div.innerHTML = `
                <div style="font-weight:600">${name}</div>
                <div style="padding-left: 8px;">
                    <div>Hints used: ${info.maxHintSeen}</div>
                    <div style="color:#666; font-style:italic">"${noteSnippet}"</div>
                </div>
            `;
            section.appendChild(div);
        });
    }

    function renderChallengeSection(chKey) {
        const section = document.getElementById('js-challenge-section');
        if (!section) return;
        section.innerHTML = '';

        const challenge = challenges.find(c => c.key === chKey);
        const hintData = HINTS[chKey];
        const chState = getChallengeState(chKey);

        // Title
        const title = document.createElement('div');
        title.style.fontWeight = '600';
        title.style.marginBottom = '4px';
        title.textContent = challenge ? challenge.name : chKey;
        section.appendChild(title);

        if (challenge) {
            const meta = document.createElement('div');
            meta.style.fontSize = '11px';
            meta.style.opacity = '0.8';
            meta.textContent = `Category: ${challenge.category} | Difficulty: ${challenge.difficulty}★`;
            section.appendChild(meta);
        }

        // Hints
        const hintsHeader = document.createElement('div');
        hintsHeader.style.marginTop = '8px';
        hintsHeader.style.fontWeight = '600';
        hintsHeader.textContent = 'Hints';
        section.appendChild(hintsHeader);

        if (!hintData) {
            const info = document.createElement('div');
            info.style.fontSize = '12px';
            info.textContent = 'No hints written yet for this challenge.';
            section.appendChild(info);
        } else {
            const learning = document.createElement('div');
            learning.style.fontSize = '12px';
            learning.style.marginBottom = '4px';
            section.appendChild(learning);

            const totalHints = hintData.hints.length;
            const maxLevel = maxHintLevelForMode(state.mode, totalHints);

            const hintContainer = document.createElement('div');
            hintContainer.style.fontSize = '12px';
            section.appendChild(hintContainer);

            function renderHintsList() {
                hintContainer.innerHTML = '';

                // Effective limit is min(maxSeen, maxAllowedForMode)
                const visibleCount = Math.min(chState.maxHintSeen, maxLevel);

                if (visibleCount === 0) {
                    if (maxLevel === 0) {
                        hintContainer.innerHTML = '<em>Hints disabled in Trainer mode.</em>';
                    } else {
                        hintContainer.textContent = 'No hints shown yet.';
                    }
                    return;
                }
                for (let i = 0; i < visibleCount; i++) {
                    const p = document.createElement('p');
                    p.innerHTML = `<strong>Hint ${i + 1}:</strong> ${hintData.hints[i]}`;
                    hintContainer.appendChild(p);
                }
            }

            const btn = document.createElement('button');
            btn.textContent = 'Show next hint';

            // Disable button if reached max level for this mode
            if (maxLevel === 0) {
                btn.disabled = true;
                btn.textContent = 'No hints in Trainer Mode';
            } else if (chState.maxHintSeen >= maxLevel) {
                btn.disabled = true;
                btn.textContent = 'Max hints reached';
            }

            btn.addEventListener('click', () => {
                if (chState.maxHintSeen < maxLevel) {
                    chState.maxHintSeen += 1;
                    saveState(state);
                    renderHintsList();

                    // Re-check button state
                    if (chState.maxHintSeen >= maxLevel) {
                        btn.disabled = true;
                        btn.textContent = 'Max hints reached';
                    }
                }
            });
            section.appendChild(btn);

            renderHintsList();
        }

        // Notes / reflection
        const notesLabel = document.createElement('div');
        notesLabel.style.marginTop = '8px';
        notesLabel.style.fontWeight = '600';
        notesLabel.textContent = 'Your notes';
        section.appendChild(notesLabel);

        const textarea = document.createElement('textarea');
        textarea.value = chState.notes || '';
        textarea.addEventListener('change', () => {
            chState.notes = textarea.value;
            saveState(state);
        });
        section.appendChild(textarea);

        const small = document.createElement('small');
        small.textContent = 'Hint usage & notes stored locally in this browser.';
        section.appendChild(small);
    }

    // ---------- INIT: CREATE OVERLAY + FETCH CHALLENGES ----------

    function init() {
        createOverlayShell();

        fetch('/api/Challenges')
            .then(r => r.json())
            .then(json => {
                challenges = json.data || [];
                renderOverlay();
            })
            .catch(err => {
                console.error('Failed to load challenges', err);
                const body = document.getElementById('js-overlay-body');
                if (body) {
                    body.textContent = 'Error loading /api/Challenges. Is Juice Shop running?';
                }
            });

        // Global listener for "Delete cookie..." button in Juice Shop
        // We use { capture: true } to ensure we catch the event before Angular or other frameworks might stop propagation.
        document.body.addEventListener('click', (e) => {
            // Traverse up to find the button if a child (like a span/icon) was clicked
            const target = e.target;
            // The button text is "Delete cookie to clear hacking progress"
            // We'll check the target or its closest button parent.
            const btn = target.closest ? target.closest('button') : target;

            // Check text of the element or the found button
            const textToCheck = (btn ? btn.textContent : target.textContent) || '';

            if (textToCheck.includes('Delete cookie to clear hacking progress')) {
                // User clicked the reset button.
                console.log('Juice Shop Coach: Resetting extension state due to main app reset.');

                // Reset internal notes/history
                state.challengeState = {};

                // Also reset the 'solved' status for all loaded challenges so the UI (checkmarks) updates immediately
                challenges.forEach(c => c.solved = false);

                saveState(state);

                // Update UI if overlay is open
                renderOverlay();
            }
        }, { capture: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

